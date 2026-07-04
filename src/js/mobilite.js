/**
 * mobilite.js — Section Mobilité (bilan par zone + routine du jour adaptative)
 *
 * Esprit GOWOD : un auto-bilan note chaque zone, puis une routine quotidienne
 * courte cible les zones prioritaires. Le ciblage combine 3 signaux :
 *   1. zones faibles au bilan,
 *   2. zones chargées (tracker muscles SRA, calcGlobalMuscleLoad),
 *   3. type de programme actif (emphase par défaut).
 * Modèle souple : pas de calendrier — « un peu chaque jour ».
 * Réf & décisions : Documentation/mobilite-program-design.md.
 */

import { esc } from './security.js';
import { dbGet, dbSet } from './db.js';
import { MOBILITY_ZONES, MOBILITY_DRILLS, MOBILITY_TESTS, MOBILITY_PROGRAM_FOCUS } from './data.js';
import { calcGlobalMuscleLoad, musclePercent } from './musculaire.js';
import { getAllActivePrograms } from './programs.js';

const ASSESS_KEY = 'mobility_assessment';
const LOGS_KEY   = 'mobility_logs';
const LEVELS     = { debutant: 0, intermediaire: 1, avance: 2 };
const SCORE_LBL  = { 0: 'Faible', 1: 'Limité', 2: 'Bon' };

// ── Stockage ────────────────────────────────────────────────────────────────

function getAssessment() {
  const a = dbGet(ASSESS_KEY);
  return (a && typeof a === 'object') ? a : { date: null, scores: {}, cm: {}, history: [] };
}
function saveAssessment(a) { dbSet(ASSESS_KEY, a); }

function getMobilityLogs() {
  const l = dbGet(LOGS_KEY);
  return Array.isArray(l) ? l : [];
}
function addMobilityLog(entry) {
  const l = getMobilityLogs();
  l.push(entry);
  // Garde borné (les logs anciens ne servent plus au streak récent)
  dbSet(LOGS_KEY, l.slice(-400));
}

// ── Profil (niveau/âge) déduit du programme actif le plus récent ────────────────

function _userProfile() {
  let niveau = 'intermediaire', age = '30-39';
  const progs = getAllActivePrograms();
  if(progs.length) {
    const p = [...progs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    niveau = p.config?.niveau || niveau;
    age    = p.config?.age || age;
  }
  return { niveau, age, lvl: LEVELS[niveau] ?? 1, older: age === '50-59' || age === '60+' };
}

function _activeFocusSet() {
  const set = new Set();
  getAllActivePrograms().forEach(p => {
    (MOBILITY_PROGRAM_FOCUS[p.config?.domaine] || []).forEach(z => set.add(z));
  });
  return set;
}

// ── Priorités par zone (3 signaux pondérés) ────────────────────────────────────

function _zonePriorities() {
  const a        = getAssessment();
  const load     = calcGlobalMuscleLoad();
  const focusSet = _activeFocusSet();

  return MOBILITY_ZONES.map(z => {
    const score  = a.scores?.[z.id];
    // Bilan : score bas → priorité haute. Inconnu → neutre (0.5).
    const bilan  = (score == null) ? 0.5 : (2 - score) / 2;
    // SRA : charge max des muscles de la zone (0–1).
    let charge = 0;
    z.muscles.forEach(m => { charge = Math.max(charge, musclePercent(m, load)); });
    const sra    = Math.min(1, charge / 100);
    const typ    = focusSet.has(z.id) ? 1 : 0;
    const priority = 1.0 * bilan + 0.6 * sra + 0.4 * typ;
    return { zone: z, score, charge, priority };
  }).sort((x, y) => y.priority - x.priority);
}

// ── Génération de la routine du jour ───────────────────────────────────────────

let _currentRoutine = null;

function _drillById(id) { return MOBILITY_DRILLS.find(d => d.id === id) || null; }

function _pickFocusDrills(zoneId, lvl, older, maxN) {
  let pool = MOBILITY_DRILLS.filter(d =>
    d.zone === zoneId && d.method !== 'car' && d.method !== 'massage' && d.minLevel <= lvl);
  // Personnes âgées : privilégier statique/CARs, écarter le end-range chargé.
  if(older) pool = pool.filter(d => d.method !== 'pails_rails');
  // Diversité : un dynamique, un statique, puis la méthode la plus avancée dispo.
  const order = { dynamic: 0, static: 1, pnf: 2, pails_rails: 3 };
  pool.sort((a, b) => (order[a.method] ?? 9) - (order[b.method] ?? 9));
  const out = [];
  const seenMethod = new Set();
  pool.forEach(d => {
    if(out.length >= maxN) return;
    if(seenMethod.has(d.method)) return;
    seenMethod.add(d.method);
    out.push(d);
  });
  return out.length ? out : pool.slice(0, maxN);
}

function generateDailyRoutine(durMin) {
  const { lvl, older } = _userProfile();
  const focusN     = durMin <= 5 ? 2 : durMin <= 10 ? 3 : 4;
  const perZone    = durMin <= 5 ? 1 : 2;
  const prio       = _zonePriorities();
  const focus      = prio.slice(0, focusN);

  // Socle CARs : toutes les zones qui ont un CAR dédié.
  const cars = MOBILITY_ZONES.filter(z => z.car).map(z => _drillById(z.car)).filter(Boolean);

  const blocks = focus.map(p => ({
    zone:   p.zone,
    score:  p.score,
    charge: Math.round(p.charge),
    drills: _pickFocusDrills(p.zone.id, lvl, older, perZone),
  }));

  _currentRoutine = { durMin, cars, blocks, older, ts: Date.now() };
  return _currentRoutine;
}

// ── Rendu : navigation par onglets ─────────────────────────────────────────────

function _showMobView(id) {
  const sec = document.getElementById('mobilite-section');
  if(!sec) return;
  sec.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(id)?.classList.add('active-view');
  sec.querySelectorAll('.mob-tab').forEach(b => b.classList.remove('active'));
  sec.querySelector(`.mob-tab[data-mob-tab="${id.replace('mob-', '').replace('-view', '')}"]`)?.classList.add('active');
}

/** Point d'entrée appelé par showSection('mobilite-section'). */
export function renderMobiliteSection() {
  const a = getAssessment();
  // Sans bilan → démarrer sur le Bilan ; sinon Routine du jour.
  if(!a.date) { _showMobView('mob-bilan-view'); _renderBilan(); }
  else        { _showMobView('mob-routine-view'); _renderRoutine(10); }
}

// ── Rendu : routine du jour ────────────────────────────────────────────────────

function _durSelector(cur) {
  return [5, 10, 15].map(d =>
    `<button class="mob-dur-btn ${d === cur ? 'active' : ''}" onclick="_mobSetDuration(${d})">${d} min</button>`).join('');
}

function _drillCard(d) {
  const cau = d.caution ? `<div class="mob-caution">⚠️ ${esc(d.caution)}</div>` : '';
  return `<div class="mob-drill">
      <div class="mob-drill-head"><span class="mob-drill-name">${esc(d.nom)}</span><span class="mob-drill-scheme">${esc(d.scheme)}</span></div>
      <div class="mob-drill-cue">${esc(d.cue)}</div>${cau}
    </div>`;
}

function _renderRoutine(durMin) {
  const el = document.getElementById('mobRoutineContent');
  if(!el) return;
  const r = generateDailyRoutine(durMin);
  const a = getAssessment();
  const { older } = r;

  const whyBits = r.blocks.map(b => {
    const bits = [];
    if(b.score != null && b.score <= 1) bits.push('bilan');
    if(b.charge >= 40) bits.push('chargée');
    return `${b.zone.icon} ${esc(b.zone.label)}${bits.length ? ` <span class="mob-why-tag">${bits.join(' · ')}</span>` : ''}`;
  }).join(' · ');

  const holdNote = older
    ? `<div class="wiz-note" style="margin-top:8px">👴 50 ans + : tiens les étirements statiques <strong>30–60 s</strong> et évite le end-range chargé.</div>`
    : '';

  const carsHtml = r.cars.map(_drillCard).join('');
  const blocksHtml = r.blocks.map(b => `
    <div class="mob-block">
      <div class="mob-block-title">${b.zone.icon} ${esc(b.zone.label)}</div>
      ${b.drills.map(_drillCard).join('')}
    </div>`).join('');

  const noAssess = !a.date
    ? `<div class="wiz-note" style="margin-bottom:10px">💡 Fais le <button class="mob-inline-link" onclick="showMobiliteTab('bilan')">bilan</button> pour personnaliser la sélection selon tes zones faibles.</div>`
    : '';

  el.innerHTML = `
    ${noAssess}
    <div class="mob-dur-row"><span class="mob-dur-lbl">Durée</span>${_durSelector(durMin)}</div>
    <div class="mob-focus-note">🎯 Zones du jour : ${whyBits}</div>
    ${holdNote}
    <div class="mob-block mob-block-cars">
      <div class="mob-block-title">🔄 CARs — réveil articulaire (tout le corps)</div>
      <div class="mob-cars-sub">Rotations articulaires contrôlées, lentes, en début de routine.</div>
      ${carsHtml}
    </div>
    ${blocksHtml}
    <button class="save-btn" style="width:100%;margin-top:12px" onclick="_mobLogDone()">✓ J'ai fait ma routine</button>
    <div class="mob-disclaimer">La mobilité est peu fatigante : à faire un peu chaque jour. Aucun mouvement ne doit être douloureux — en cas de douleur, arrête et consulte si besoin.</div>`;
}

// ── Rendu : bilan ──────────────────────────────────────────────────────────────

function _scoreChip(score) {
  if(score == null) return `<span class="mob-chip mob-chip-none">Non testé</span>`;
  const cls = score === 2 ? 'mob-chip-good' : score === 1 ? 'mob-chip-mid' : 'mob-chip-poor';
  return `<span class="mob-chip ${cls}">${SCORE_LBL[score]}</span>`;
}

function _renderBilan() {
  const el = document.getElementById('mobBilanContent');
  if(!el) return;
  const a = getAssessment();
  const done = Object.keys(a.scores || {}).length;

  const intro = `<div class="wiz-note" style="margin-bottom:12px">
    📋 Auto-teste chaque zone et note-toi. Le programme ciblera d'abord tes zones les plus faibles.
    Refais le bilan toutes les ~4 semaines pour suivre tes progrès.
    ${a.date ? `<br><span style="color:var(--text3)">Dernier bilan : ${esc(a.date)} · ${done}/${MOBILITY_ZONES.length} zones</span>` : ''}
  </div>`;

  const rows = MOBILITY_ZONES.map(z => {
    const t = MOBILITY_TESTS[z.id];
    const score = a.scores?.[z.id];
    const cm = a.cm?.[z.id];
    const cmField = t?.cm
      ? `<div class="mob-cm"><label>Mesure (cm, optionnel)</label><input type="number" inputmode="decimal" class="mob-cm-input" value="${cm != null ? esc(String(cm)) : ''}" onchange="_mobSetCm('${z.id}', this.value)" placeholder="ex : 10"></div>`
      : '';
    return `
    <div class="mob-zone">
      <div class="mob-zone-head">
        <span class="mob-zone-name">${z.icon} ${esc(z.label)}</span>
        ${_scoreChip(score)}
      </div>
      <div class="mob-test-name">${esc(t?.name || '')}</div>
      <div class="mob-test-proto">${esc(t?.protocol || '')}</div>
      <div class="mob-test-criteria">
        <span class="mob-crit mob-crit-good">Bon : ${esc(t?.good || '')}</span>
        <span class="mob-crit mob-crit-mid">Limité : ${esc(t?.limited || '')}</span>
        <span class="mob-crit mob-crit-poor">Faible : ${esc(t?.poor || '')}</span>
      </div>
      <div class="mob-score-btns">
        <button class="mob-score-btn ${score === 0 ? 'sel-poor' : ''}" onclick="_mobSetScore('${z.id}',0)">Faible</button>
        <button class="mob-score-btn ${score === 1 ? 'sel-mid' : ''}" onclick="_mobSetScore('${z.id}',1)">Limité</button>
        <button class="mob-score-btn ${score === 2 ? 'sel-good' : ''}" onclick="_mobSetScore('${z.id}',2)">Bon</button>
      </div>
      ${cmField}
    </div>`;
  }).join('');

  const cta = done >= MOBILITY_ZONES.length
    ? `<button class="save-btn" style="width:100%;margin-top:12px" onclick="showMobiliteTab('routine')">🧘 Voir ma routine du jour</button>`
    : '';

  el.innerHTML = intro + rows + cta +
    `<div class="mob-disclaimer">Ces tests sont des repères d'auto-dépistage (pass/limité/faible), pas un diagnostic. En cas de douleur pendant un test : note « Faible » et consulte un professionnel si elle persiste.</div>`;
}

// ── Rendu : progrès ────────────────────────────────────────────────────────────

function _streakDays() {
  const days = new Set(getMobilityLogs().map(l => new Date(l.ts).toISOString().slice(0, 10)));
  return days.size;
}

function _renderProgres() {
  const el = document.getElementById('mobProgresContent');
  if(!el) return;
  const a = getAssessment();
  const logs = getMobilityLogs();
  const streak = _streakDays();
  const last7 = logs.filter(l => l.ts >= Date.now() - 7 * 864e5).length;

  const bars = MOBILITY_ZONES.map(z => {
    const s = a.scores?.[z.id];
    const pct = s == null ? 0 : (s / 2) * 100;
    const col = s == null ? 'var(--surface2)' : s === 2 ? 'var(--green)' : s === 1 ? 'var(--amber)' : 'var(--red)';
    return `<div class="mob-prog-row">
        <span class="mob-prog-name">${z.icon} ${esc(z.label)}</span>
        <div class="mob-prog-track"><div class="mob-prog-fill" style="width:${pct}%;background:${col}"></div></div>
        <span class="mob-prog-val">${s == null ? '—' : SCORE_LBL[s]}</span>
      </div>`;
  }).join('');

  const staleNote = a.date && (Date.now() - new Date(a.date).getTime() > 28 * 864e5)
    ? `<div class="wiz-note" style="margin-top:10px">⏰ Ton bilan date de plus de 4 semaines — <button class="mob-inline-link" onclick="showMobiliteTab('bilan')">refais-le</button> pour objectiver tes gains.</div>`
    : '';

  el.innerHTML = `
    <div class="mob-stats">
      <div class="mob-stat"><div class="mob-stat-val">🔥 ${streak}</div><div class="mob-stat-lbl">jours de mobilité</div></div>
      <div class="mob-stat"><div class="mob-stat-val">${last7}</div><div class="mob-stat-lbl">routines (7 j)</div></div>
    </div>
    <div class="p-sec-title" style="margin-top:14px">Niveau de mobilité par zone</div>
    ${a.date ? bars : '<div class="wiz-note">Fais le bilan pour voir ton profil de mobilité.</div>'}
    ${staleNote}`;
}

// ── Handlers exposés (onclick inline) ──────────────────────────────────────────

window.showMobiliteTab = function(tab) {
  if(tab === 'routine') { _showMobView('mob-routine-view'); _renderRoutine(10); }
  else if(tab === 'bilan') { _showMobView('mob-bilan-view'); _renderBilan(); }
  else if(tab === 'progres') { _showMobView('mob-progres-view'); _renderProgres(); }
};

window._mobSetDuration = function(d) { _renderRoutine(d); };

window._mobSetScore = function(zoneId, score) {
  const a = getAssessment();
  a.scores = a.scores || {};
  a.scores[zoneId] = score;
  a.date = new Date().toISOString().slice(0, 10);
  saveAssessment(a);
  _renderBilan();
};

window._mobSetCm = function(zoneId, val) {
  const a = getAssessment();
  a.cm = a.cm || {};
  const n = parseFloat(val);
  if(isNaN(n)) delete a.cm[zoneId]; else a.cm[zoneId] = n;
  a.date = new Date().toISOString().slice(0, 10);
  saveAssessment(a);
};

window._mobLogDone = function() {
  const r = _currentRoutine;
  const zones = r ? r.blocks.map(b => b.zone.id) : [];
  addMobilityLog({ ts: Date.now(), duree: r?.durMin || 10, zones, type: 'daily' });
  if(typeof window._showSaveToast === 'function') window._showSaveToast('✓ Routine mobilité enregistrée');
};
