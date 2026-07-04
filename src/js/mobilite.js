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
import { MOBILITY_ZONES, MOBILITY_DRILLS, MOBILITY_TESTS, MOBILITY_PROGRAM_FOCUS, MUSCLE_LABELS } from './data.js';
import { calcGlobalMuscleLoad, musclePercent } from './musculaire.js';
import { getAllActivePrograms } from './programs.js';

const ASSESS_KEY = 'mobility_assessment';
const LOGS_KEY   = 'mobility_logs';
const TODAY_KEY  = 'mobility_today';
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

// ── Routine du jour : cache + détection de changement de jour ───────────────────

// Date LOCALE (pas UTC) au format YYYY-MM-DD → sert de clé de « jour ».
function _todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
// Graine déterministe du jour (pour varier les drills d'un jour à l'autre).
function _daySeed() { return parseInt(_todayStr().replace(/-/g, ''), 10) || 0; }

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
let _curDur = 10;

function _drillById(id) { return MOBILITY_DRILLS.find(d => d.id === id) || null; }

// Sélection variée : par méthode (ordre dynamique→statique→PNF→PAILs), la graine du
// jour choisit la variante quand plusieurs drills partagent une méthode → deux jours
// consécutifs proposent des exercices différents.
function _pickFocusDrills(zoneId, lvl, older, maxN, seed) {
  let pool = MOBILITY_DRILLS.filter(d =>
    d.zone === zoneId && d.method !== 'car' && d.method !== 'massage' && d.minLevel <= lvl);
  if(older) pool = pool.filter(d => d.method !== 'pails_rails');  // pas d'end-range chargé
  if(!pool.length) return [];
  // Ordre stable (méthode puis id) → point de départ déterministe…
  const oi = { dynamic: 0, static: 1, pnf: 2, pails_rails: 3 };
  pool.sort((a, b) => (oi[a.method] - oi[b.method]) || (a.id < b.id ? -1 : 1));
  // …puis ROTATION du pool par la graine → les exercices changent réellement d'un
  // jour à l'autre ET à chaque « 🔄 Nouvelle » (dès que la zone a > maxN drills).
  const start   = ((seed % pool.length) + pool.length) % pool.length;
  const rotated = pool.slice(start).concat(pool.slice(0, start));
  return rotated.slice(0, maxN);
}

// Calcule une routine (objets drill complets) pour une durée + un offset de graine.
function _computeRoutine(durMin, genOffset) {
  const { lvl, older } = _userProfile();
  const seed    = _daySeed() + (genOffset || 0);
  const focusN  = durMin <= 5 ? 2 : durMin <= 10 ? 3 : 4;
  const perZone = durMin <= 5 ? 1 : 2;
  const focus   = _zonePriorities().slice(0, focusN);
  const cars    = MOBILITY_ZONES.filter(z => z.car).map(z => _drillById(z.car)).filter(Boolean);
  const blocks  = focus.map(p => ({
    zone:   p.zone,
    score:  p.score ?? null,
    charge: Math.round(p.charge),
    drills: _pickFocusDrills(p.zone.id, lvl, older, perZone, seed),
  }));
  return { durMin, older, cars, blocks };
}

// Snapshot léger (ids) pour persister la routine du jour.
function _toSnapshot(r) {
  return {
    durMin: r.durMin, older: r.older,
    carIds: r.cars.map(d => d.id),
    blocks: r.blocks.map(b => ({ zoneId: b.zone.id, score: b.score ?? null, charge: b.charge, drillIds: b.drills.map(d => d.id) })),
  };
}
function _fromSnapshot(s) {
  return {
    durMin: s.durMin, older: s.older,
    cars: (s.carIds || []).map(_drillById).filter(Boolean),
    blocks: (s.blocks || []).map(b => ({
      zone:   MOBILITY_ZONES.find(z => z.id === b.zoneId),
      score:  b.score, charge: b.charge,
      drills: (b.drillIds || []).map(_drillById).filter(Boolean),
    })).filter(b => b.zone),
  };
}

/**
 * Routine du JOUR, stable sur la journée :
 * - même jour (date locale) + même durée → on réaffiche la routine mémorisée (état « fait » conservé) ;
 * - jour changé → nouvelle routine ;
 * - durMin=null → réutilise la durée mémorisée ;
 * - forceNew → régénère une variante (compteur `gen` → graine différente).
 */
function _getTodayRoutine(durMin, forceNew) {
  const stored = dbGet(TODAY_KEY);
  const today  = _todayStr();
  const isToday = stored && stored.date === today;
  const sameDur = stored && stored.snapshot && (durMin == null || stored.snapshot.durMin === durMin);

  if(!forceNew && isToday && stored.snapshot && sameDur) {
    return { routine: _fromSnapshot(stored.snapshot), done: !!stored.done };
  }
  let gen = isToday ? (stored.gen || 0) : 0;
  if(forceNew) gen += 1;
  const r = _computeRoutine(durMin || (isToday ? stored.snapshot?.durMin : null) || 10, gen);
  const rec = { date: today, gen, snapshot: _toSnapshot(r), done: isToday ? !!stored.done : false };
  dbSet(TODAY_KEY, rec);
  return { routine: r, done: rec.done };
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
  else        { _showMobView('mob-routine-view'); _renderRoutine(null, false); }
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

function _renderRoutine(durMin, forceNew) {
  const el = document.getElementById('mobRoutineContent');
  if(!el) return;
  const { routine: r, done } = _getTodayRoutine(durMin, !!forceNew);
  _currentRoutine = r;
  _curDur = r.durMin;
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

  const action = done
    ? `<div class="mob-done">✓ Fait aujourd'hui</div>`
    : `<button class="save-btn" style="width:100%;margin-top:12px" onclick="_mobLogDone()">✓ J'ai fait ma routine</button>`;

  el.innerHTML = `
    ${noAssess}
    <div class="mob-dur-row"><span class="mob-dur-lbl">Durée</span>${_durSelector(r.durMin)}
      <button class="mob-regen" onclick="_mobNewRoutine()">🔄 Nouvelle</button></div>
    <div class="mob-focus-note">🎯 Zones du jour : ${whyBits}</div>
    ${holdNote}
    <div class="mob-block mob-block-cars">
      <div class="mob-block-title">🔄 CARs — réveil articulaire (tout le corps)</div>
      <div class="mob-cars-sub">Rotations articulaires contrôlées, lentes, en début de routine.</div>
      ${carsHtml}
    </div>
    ${blocksHtml}
    ${action}
    <div class="mob-disclaimer">Routine du jour : elle reste la même toute la journée et se renouvelle demain (bouton « 🔄 Nouvelle » pour en changer). La mobilité est peu fatigante — à faire un peu chaque jour. Aucun mouvement ne doit être douloureux : en cas de douleur, arrête et consulte si besoin.</div>`;
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

// ── Rendu : récup post-séance ──────────────────────────────────────────────────

let _currentRecup = null;

const RECUP_THRESH = 10;  // % de charge résiduelle au-delà duquel une zone est « sollicitée »

// Muscles les plus chargés (mêmes valeurs que l'onglet Muscles) — pour la transparence.
// Tous ceux ≥ 5 % (cap de sûreté à n) → un muscle nouvellement travaillé apparaît
// toujours, pas seulement les 3 premiers.
function _topLoadedMuscles(load, n) {
  return Object.keys(MUSCLE_LABELS)
    .map(m => ({ label: MUSCLE_LABELS[m], pct: musclePercent(m, load) }))
    .filter(e => e.pct >= 5)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}

const RECUP_MAX_ZONES = 5;  // garde-fou pour que la récup ne devienne pas interminable

// Récup : cible les zones les plus sollicitées → statique doux + auto-massage
// (down-regulating, façon GOWOD Recover). Recalculée en direct (contextuelle).
//
// Toutes les zones réellement chargées (≥ RECUP_THRESH) sont retenues — plus de
// coupe arbitraire au top-3 qui masquait une région distincte (ex. quadriceps)
// derrière plusieurs zones du haut du corps. Comme les zones se chevauchent
// (le trapèze ∈ cou/épaules/thoracique, le dorsaux ∈ thoracique…), on DÉDUPLIQUE :
// une zone n'est gardée que si elle introduit au moins un muscle chargé pas déjà
// couvert par une zone mieux classée → une séance d'épaules ne remplit plus à elle
// seule 3 emplacements (Épaules + Cou + Thoracique).
function _computeRecup() {
  const seed = _daySeed();
  const load = calcGlobalMuscleLoad();

  const ranked = MOBILITY_ZONES.map(z => {
    let charge = 0;
    const hot = [];  // muscles de la zone effectivement chargés (≥ seuil)
    z.muscles.forEach(m => {
      const p = musclePercent(m, load);
      if(p > charge) charge = p;
      if(p >= RECUP_THRESH) hot.push(m);
    });
    return { zone: z, charge, hot };
  }).sort((a, b) => b.charge - a.charge);

  const loaded = ranked.filter(r => r.charge >= RECUP_THRESH);

  let picks;
  if(loaded.length) {
    const covered = new Set();
    picks = [];
    loaded.forEach(r => {
      if(!r.hot.some(m => !covered.has(m))) return;  // n'apporte aucun muscle neuf
      r.hot.forEach(m => covered.add(m));
      picks.push(r);
    });
    picks = picks.slice(0, RECUP_MAX_ZONES);
  } else {
    picks = ranked.slice(0, 3);  // aucune charge → récup générale douce
  }

  const blocks = picks.map(p => {
    const statics = MOBILITY_DRILLS.filter(d => d.zone === p.zone.id && d.method === 'static');
    const mass    = MOBILITY_DRILLS.filter(d => d.zone === p.zone.id && d.method === 'massage');
    const drills  = [];
    if(statics.length) drills.push(statics[seed % statics.length]);
    if(mass.length)    drills.push(mass[seed % mass.length]);
    return { zone: p.zone, charge: Math.round(p.charge), drills };
  }).filter(b => b.drills.length);
  return { blocks, hasLoad: loaded.length > 0, topMuscles: _topLoadedMuscles(load, 6) };
}

function _renderRecup() {
  const el = document.getElementById('mobRecupContent');
  if(!el) return;
  const r = _computeRecup();
  _currentRecup = r;

  const intro = r.topMuscles.length
    ? `<div class="mob-focus-note">💆 Récup ciblée d'après le suivi muscles — les plus chargés : ${r.topMuscles.map(t => `${esc(t.label)} ${t.pct}%`).join(' · ')}.</div>`
    : `<div class="wiz-note" style="margin-bottom:10px">Aucune charge récente détectée dans le suivi muscles — récup générale douce. Respiration lente tout du long.</div>`;

  const blocksHtml = r.blocks.map(b => `
    <div class="mob-block">
      <div class="mob-block-title">${b.zone.icon} ${esc(b.zone.label)}${b.charge >= RECUP_THRESH ? ` <span class="mob-why-tag">${b.charge}% chargée</span>` : ''}</div>
      ${b.drills.map(_drillCard).join('')}
    </div>`).join('');

  el.innerHTML = `
    ${intro}
    ${blocksHtml || '<div class="wiz-note">Rien à afficher.</div>'}
    <button class="save-btn" style="width:100%;margin-top:12px" onclick="_mobLogRecup()">✓ Récup faite</button>
    <div class="mob-disclaimer">Objectif : détente et amplitude après l'effort. Le bénéfice sur la récupération est modeste (preuve limitée) — pas de forçage, respiration lente. En cas de douleur, arrête.</div>`;
}

// ── Handlers exposés (onclick inline) ──────────────────────────────────────────

window.showMobiliteTab = function(tab) {
  if(tab === 'routine') { _showMobView('mob-routine-view'); _renderRoutine(null, false); }
  else if(tab === 'recup') { _showMobView('mob-recup-view'); _renderRecup(); }
  else if(tab === 'bilan') { _showMobView('mob-bilan-view'); _renderBilan(); }
  else if(tab === 'progres') { _showMobView('mob-progres-view'); _renderProgres(); }
};

window._mobLogRecup = function() {
  const zones = _currentRecup ? _currentRecup.blocks.map(b => b.zone.id) : [];
  addMobilityLog({ ts: Date.now(), duree: 8, zones, type: 'recovery' });
  if(typeof window._showSaveToast === 'function') window._showSaveToast('✓ Récup enregistrée');
};

window._mobSetDuration = function(d) { _renderRoutine(d, false); };

window._mobNewRoutine = function() {
  _renderRoutine(_curDur, true);
  if(typeof window._showSaveToast === 'function') window._showSaveToast('🔄 Nouvelle routine');
};

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
  const stored = dbGet(TODAY_KEY);
  const today  = _todayStr();
  if(stored && stored.date === today && stored.done) return;  // déjà fait aujourd'hui
  const r = _currentRoutine;
  const zones = r ? r.blocks.map(b => b.zone.id) : [];
  addMobilityLog({ ts: Date.now(), duree: r?.durMin || 10, zones, type: 'daily' });
  if(stored && stored.date === today) { stored.done = true; dbSet(TODAY_KEY, stored); }
  if(typeof window._showSaveToast === 'function') window._showSaveToast('✓ Routine mobilité enregistrée');
  _renderRoutine(_curDur, false);
};
