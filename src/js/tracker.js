/**
 * tracker.js — Generic tracker
 * Works with any program structure (ATHX fixed or wizard-generated).
 * Falls back to legacy ATHX mode if no active program.
 */

import { esc }            from './security.js';
import { EXERCISES, PHASES, PHASE_LABELS, PHASE_STYLE, MUSCLE_MAP } from './data.js';
import { getRecord, setRecord, getExStatus, setExStatus,
         normRecord, bestKg, getLatestWeek,
         getVacancesList, addVacances, removeVacances, clearAllVacances,
         repriseCoeff, vacancesStatus, ACTIVITE_LABELS } from './store.js';
import { parseSets, parseReps, calcAdj, getNextPlan } from './progression.js';
import { repaintMuscles }  from './musculaire.js';
import { renderGrossesseProgram } from './grossesse.js';
import { getActiveProgram, getAllActivePrograms, getActiveProgramById,
         getProgRecord, setProgRecord,
         getProgExStatus, setProgExStatus, getProgLatestWeek, getCurrentWeek } from './programs.js';

// ── Week selector ─────────────────────────────────────────────────────────────

// Currently displayed program (may differ from primary active)
let _currentProgId = null;

// Délégation d'événements sur #saisieContent : liée UNE seule fois (l'élément
// persiste, seul son innerHTML est remplacé). L'état courant (prog/semaine) est
// relu depuis ces variables de module à chaque évènement — évite l'empilement
// de listeners (et donc les sauvegardes multipliées) à chaque renderSaisie().
let _progSaisieBound = false;
let _legacySaisieBound = false;
let _curSaisieProg = null;
let _curLegacyWeek = null;

function _hasAthxData() {
  return ['press','squat','deadlift','gtoh','sandbag','lunges'].some(id => {
    for(let w = 1; w <= 17; w++) { if(getRecord(id, w)) return true; }
    return false;
  });
}

export function getCurrentProgram() {
  // Sentinel spécial : forcer explicitement la vue ATHX legacy
  if(_currentProgId === 'athx-legacy') return null;
  if(_currentProgId) {
    const p = getActiveProgramById(_currentProgId);
    if(p) return p;
  }
  // Si aucun choix explicite ET des données ATHX existent → rester sur ATHX
  // par défaut, plutôt que de basculer silencieusement sur le premier programme
  // généré actif (comportement inattendu quand l'utilisateur n'a rien choisi).
  if(_currentProgId === null && _hasAthxData()) return null;
  return getActiveProgram();
}

export function setCurrentProgram(id) {
  _currentProgId = id;
  initWeekSel();
  renderSaisie();
}

export function initWeekSel() {
  const prog  = getCurrentProgram();
  const total = prog ? (prog.totalWeeks || prog.semaines?.length || 17) : 17;
  const sel   = document.getElementById('weekSel');
  if(!sel) return;

  sel.innerHTML = '';
  for(let w = 1; w <= total; w++) {
    const o = document.createElement('option');
    o.value = w;
    // Mark skipped weeks with badge
    try {
      if(prog?.semaines) {
        const sem = prog.semaines[w-1];
        const allSkipped = sem?.jours?.length && sem.jours.every(day =>
          day.exercices?.every(ex => getProgExStatus(prog.id, ex.id, w) === 'skipped')
        );
        o.textContent = allSkipped ? `Semaine ${w} 🏖` : `Semaine ${w}`;
      } else {
        o.textContent = `Semaine ${w}`;
      }
    } catch(e) {
      o.textContent = `Semaine ${w}`;
    }
    sel.appendChild(o);
  }

  // Auto-sélection : semaine courante (startDate) ou dernière avec données
  try {
    let targetWeek;
    if(prog?.startDate) {
      // Programme avec date de démarrage → semaine calculée dynamiquement
      targetWeek = getCurrentWeek(prog);
    } else if(prog) {
      targetWeek = getProgLatestWeek(prog.id, prog);
    } else {
      targetWeek = getLatestWeek(EXERCISES);
    }
    sel.value = Math.min(Math.max(targetWeek, 1), total);
  } catch(e) {
    sel.value = 1;
  }

  renderSaisie();
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderSaisie() {
  const prog = getCurrentProgram();
  if(prog) {
    _renderProgSaisie(prog);
  } else {
    _renderLegacySaisie();
  }
}

// ── Generic program tracker ───────────────────────────────────────────────────

function _renderProgSaisie(prog) {
  // Grossesse programs have their own complete renderer
  if(prog.subtype === 'grossesse') {
    const container = document.getElementById('saisieContent');
    container.innerHTML = _progSelectorUI() + _vacancesUI();
    const inner = document.createElement('div');
    container.appendChild(inner);
    renderGrossesseProgram(prog, 1, inner);
    return;
  }

  const week    = parseInt(document.getElementById('weekSel').value, 10) || 1;
  const semaine = prog.semaines?.[week - 1];
  if(!semaine) {
    // weekSel may not be populated yet — retry after DOM update
    requestAnimationFrame(() => renderSaisie());
    return;
  }

  const badge = document.getElementById('phaseBadge');
  const phaseColors = {
    'Bloc 1 — Base':        { bg:'#e8f0fc', color:'#1a5fb4' },
    'Bloc 2 — Intensité':   { bg:'#fdf0d8', color:'#7c4a00' },
    'Bloc 3 — Simulation':  { bg:'#e0f4eb', color:'#1b6b45' },
    'Base':                 { bg:'#e8f0fc', color:'#1a5fb4' },
    'Construction':         { bg:'#fdf0d8', color:'#7c4a00' },
    'Intensité':            { bg:'#fdeaea', color:'#9c2222' },
    'Pic':                  { bg:'#e0f4eb', color:'#1b6b45' },
    'Taper':                { bg:'#f1efe8', color:'#444441' },
    'Deload':               { bg:'#e8e6e0', color:'#444441' },
  };
  const pStyle = phaseColors[semaine.phase] || { bg:'var(--surface2)', color:'var(--text2)' };
  badge.textContent      = semaine.phase;
  badge.style.background = pStyle.bg;
  badge.style.color      = pStyle.color;

  let html = _progSelectorUI() + _vacancesUI();

  // Deload / taper info banner
  if(semaine.isDeload) {
    html += `<div class="day-status-banner day-status-hyrox">
      🔵 Semaine de Deload — charges réduites (~60%). Aucune analyse de progression.
      Saisie normale possible pour le suivi musculaire.
    </div>`;
  } else if(semaine.isTaper) {
    html += `<div class="day-status-banner day-status-hyrox">
      📉 Semaine de Taper — volume réduit avant compétition. RPE cible : ${semaine.rpeTarget}.
    </div>`;
  }

  semaine.jours.forEach(day => {
    html += `<div class="day-card">
      <div class="day-header">
        <span class="day-name">${esc(day.nom)}</span>
        ${day.split && day.split !== day.nom ? `<span style="font-size:11px;color:var(--text3)">${esc(day.split)}</span>` : ''}
      </div>
      <div class="ex-wrap">`;

    day.exercices.forEach(ex => {
      const exStatus = getProgExStatus(prog.id, ex.id, week);
      const rec      = normRecord(getProgRecord(prog.id, ex.id, week));
      // Plan dynamique : utilise la recommandation S issue de S-1 si elle existe
      // (logique Lafay adaptative), sinon retombe sur le kgPlan théorique (1RM × % phase)
      let plan = ex.kgPlan;
      if(week > 1) {
        const prevSemaine = prog.semaines?.[week - 2];
        const prevEx = prevSemaine?.jours?.flatMap(d => d.exercices).find(e => e.id === ex.id);
        if(prevSemaine && prevEx && !prevSemaine.isDeload) {
          const prevNxt = _getNextPlanGeneric(prog, prevEx, week - 1, prevSemaine);
          if(prevNxt?.kg) plan = prevNxt.kg;
        }
      }
      const scheme   = ex.scheme;
      const nSets    = _parseSetsGeneric(scheme);
      const planReps = parseReps(scheme);

      const btnN = exStatus === 'normal'  ? ' active-normal'  : '';
      const btnH = exStatus === 'hyrox'   ? ' active-hyrox'   : '';
      const btnD = exStatus === 'deload'  ? ' active-deload'  : '';
      const btnS = exStatus === 'skipped' ? ' active-skipped' : '';

      html += `<div class="ex-block" data-exid="${ex.id}">
        <div class="ex-top">
          <span class="ex-name-t">${esc(ex.nom)}</span>
          <span class="ex-scheme">${esc(scheme || '—')}</span>
          <span class="ex-status-btns">
            <button class="session-status-btn${btnN}" data-progex="${prog.id}" data-ex="${ex.id}" data-week="${week}" data-status="normal">Normale</button>
            <button class="session-status-btn${btnH}" data-progex="${prog.id}" data-ex="${ex.id}" data-week="${week}" data-status="hyrox">⚡ Post-compét</button>
            <button class="session-status-btn${btnD}" data-progex="${prog.id}" data-ex="${ex.id}" data-week="${week}" data-status="deload">🔵 Deload</button>
            <button class="session-status-btn${btnS}" data-progex="${prog.id}" data-ex="${ex.id}" data-week="${week}" data-status="skipped">Sautée</button>
          </span>
        </div>`;

      if(plan) {
        html += `<div class="ex-plan-txt">Plan : <strong>${plan} ${ex.unit || 'kg'}</strong>${planReps ? ` × <strong>${planReps} reps</strong>` : ''} <span class="ex-ref">${esc(ex.refText || '')}</span></div>`;
      }

      // Deload: show grid but with reduced plan hint
      const showGrid = exStatus !== 'skipped';
      const deloadKg = plan ? Math.round(plan * 0.60 / 1.25) * 1.25 : null;

      if(exStatus === 'deload' && deloadKg) {
        html += `<div class="ex-plan-txt" style="color:var(--blue)">🔵 Charge deload suggérée : <strong>${deloadKg} ${ex.unit || 'kg'}</strong> (~60%)</div>`;
      }

      // Analysis (skip for deload)
      const bk = bestKg(rec);
      if(bk != null && exStatus !== 'deload' && exStatus !== 'skipped') {
        const adj = _calcAdjGeneric(prog, ex, week, semaine);
        if(adj?.signals?.length) {
          const cls = adj.type === 'ok' ? 'adj-ok'
            : adj.type === 'ahead' ? 'adj-ahead'
            : adj.type === 'behind' ? 'adj-behind' : 'adj-slight';
          html += `<div class="adj-box ${cls}" style="padding:8px 12px">
            ${adj.signals.map(s => {
              const ic  = s.type==='good'?'✓ ':s.type==='warn'?'⚠ ':s.type==='danger'?'✗ ':'· ';
              const col = s.type==='good'?'var(--green)':s.type==='warn'?'var(--amber)':s.type==='danger'?'var(--red)':'var(--text2)';
              return `<div style="display:flex;gap:6px;margin-bottom:2px"><span style="color:${col};font-weight:600;flex-shrink:0">${ic}</span><span>${esc(s.text)}</span></div>`;
            }).join('')}
          </div>`;
        }

        // S+1 recommendation
        const nxt = _getNextPlanGeneric(prog, ex, week, semaine);
        if(nxt && !semaine.isDeload) {
          const nextSem     = prog.semaines?.[week];
          const nextPlanKg  = nextSem?.jours?.flatMap(d=>d.exercices).find(e=>e.id===ex.id)?.kgPlan;
          const delta       = nextPlanKg ? Math.round((nxt.kg - nextPlanKg)*10)/10 : null;
          const deltaStr    = delta != null ? (delta > 0 ? `+${delta} vs plan` : delta < 0 ? `${delta} vs plan` : 'conforme') : '';
          const deltaCls    = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text2)';
          const outcomeClass = nxt.outcome === 'success' ? 'next-rec-success'
            : nxt.outcome === 'deload' || nxt.outcome === 'vacances' ? 'next-rec-back'
            : 'next-rec-hold';
          html += `<div class="next-rec-block ${outcomeClass}">
            <div class="rec-line">S${week+1} recommandé : <strong>${nxt.kg} ${ex.unit||'kg'}</strong>
              ${delta != null ? `<span style="color:${deltaCls};font-size:11px;margin-left:6px">(${deltaStr})</span>` : ''}
            </div>
            <div class="reason">${esc(nxt.rule)}</div>
          </div>`;
        }
      }

      // Grossesse: no kg grid, show desc + video + completion checkbox
      if(prog.subtype === 'grossesse') {
        if(!ex.supprime) {
          html += `<div class="grossesse-ex-body">`;
          if(ex.desc) html += `<div class="grossesse-ex-desc">${esc(ex.desc)}</div>`;
          if(ex.note) html += `<div class="grossesse-ex-note">⚠️ ${esc(ex.note)}</div>`;
          if(ex.ballon) html += `<span class="ballon-badge">🎈 Ballon</span>`;
          if(ex.video) html += `<a class="grossesse-video-btn" href="https://www.youtube.com/watch?v=${esc(ex.video)}" target="_blank" rel="noopener">▶ Voir la démonstration</a>`;
          const done = getProgRecord(prog.id, ex.id, week)?.done;
          html += `<label class="grossesse-check"><input type="checkbox" ${done?'checked':''} onchange="window._markGrossesseDone('${prog.id}','${ex.id}',${week},this.checked)"> Exercice réalisé</label>`;
          html += `</div>`;
        } else {
          html += `<div class="grossesse-supprime">⛔ ${esc(ex.supprime_msg||'Exercice suspendu ce mois.')}</div>`;
        }
        html += '</div>'; // ex-block
        return; // skip normal grid
      }

      // Cardio : pas de grille kg/reps — carte séance (zone/scheme) + log durée/RPE/distance
      if(ex.kind === 'cardio') {
        const craw = getProgRecord(prog.id, ex.id, week) || {};
        const durVal  = craw.durationMin != null ? craw.durationMin : '';
        const distVal = craw.distance != null ? craw.distance : '';
        html += `<div class="cardio-ex-body">
          <div class="cardio-zone-badge" style="background:${ex.zoneBg||'var(--surface2)'};color:${ex.zoneCol||'var(--text2)'}">${esc(ex.zoneLabel||'')}</div>
          <div class="cardio-scheme">${esc(ex.scheme||'—')}</div>
          <div class="cardio-target">RPE cible <strong>${esc(ex.rpeTarget||'—')}</strong>${ex.hrPct?` · <span style="color:var(--text3)">${esc(ex.hrPct)}</span>`:''}</div>`;
        if(ex.detail) html += `<div class="cardio-detail">${esc(ex.detail)}</div>`;
        if(ex.feel)   html += `<div class="cardio-detail"><strong>Allure / ressenti :</strong> ${esc(ex.feel)}</div>`;
        if(ex.cue)    html += `<div class="cardio-detail"><strong>Technique :</strong> ${esc(ex.cue)}</div>`;
        html += `<div class="cardio-log">
          <label class="cardio-log-field">Durée réelle
            <span><input type="number" id="cdur_${ex.id}" min="0" max="600" step="1" value="${durVal}" placeholder="${ex.duration||''}"> min</span>
          </label>
          <label class="cardio-log-field">RPE ressenti
            <select id="crpe_${ex.id}"><option value="">—</option>${_rpeOptions(craw.rpe)}</select>
          </label>
          ${ex.dist ? `<label class="cardio-log-field">Distance
            <span><input type="number" id="cdist_${ex.id}" min="0" step="0.1" value="${distVal}" placeholder="opt."> ${esc(ex.dist)}</span>
          </label>` : ''}
          <label class="cardio-check"><input type="checkbox" id="cdone_${ex.id}" ${craw.done?'checked':''}> Séance réalisée</label>
        </div>`;
        if(craw.done || craw.durationMin != null) {
          html += `<div class="sets-summary">${craw.done?'✓ Réalisée':''}${craw.durationMin!=null?` · ${craw.durationMin} min`:''}${craw.rpe?` · RPE ${esc(String(craw.rpe))}`:''}${craw.distance!=null?` · ${craw.distance} ${esc(ex.dist||'')}`:''}</div>`;
        }
        html += `</div></div>`; // cardio-ex-body + ex-block
        return; // skip normal grid
      }

      // Sets grid (show for all statuses except skipped)
      if(showGrid) {
        const placeholder = exStatus === 'deload' && deloadKg ? deloadKg : (plan || '');
        html += `<table class="sets-table">
          <thead><tr><th>Série</th><th>Charge (${ex.unit||'kg'})</th><th>Reps</th><th>RPE</th><th></th><th>Sautée</th></tr></thead>
          <tbody>`;
        for(let s = 0; s < Math.max(nSets, 4); s++) {
          const sr  = rec?.sets?.[s] || {};
          const isSkipped = sr.skipped === true;
          const chk = !isSkipped && sr.kg != null && sr.reps != null ? '✓' : (isSkipped ? '❌' : '');
          const chkColor = isSkipped ? 'var(--red)' : (chk ? 'var(--green)' : 'var(--border)');
          // Pré-remplit avec le plan (figé ou dynamique) si aucune saisie existante.
          // L'utilisateur peut toujours modifier — ce n'est qu'une valeur de départ.
          const kgVal   = sr.kg   != null && sr.kg   !== '' ? sr.kg   : (placeholder || '');
          const repsVal = sr.reps != null && sr.reps !== '' ? sr.reps : (planReps || '');
          const dis = isSkipped ? 'disabled' : '';
          html += `<tr class="${isSkipped?'set-row-skipped':''}">
            <td class="set-num">S${s+1}</td>
            <td><input class="set-inp" type="number" id="pkg_${ex.id}_${s}" step="1.25" min="0" ${dis}
                value="${isSkipped?'':kgVal}" placeholder="${placeholder}" data-ex="${ex.id}" data-idx="${s}" data-nsets="${Math.max(nSets,3)}"></td>
            <td><input class="set-inp reps-inp" type="number" id="preps_${ex.id}_${s}" ${dis}
                min="0" max="30" step="1" value="${isSkipped?'':repsVal}" placeholder="${planReps||'—'}"></td>
            <td><select class="set-rpe" id="prpe_${ex.id}_${s}" ${dis}>
              <option value="">—</option>${_rpeOptions(sr.rpe)}
            </select></td>
            <td class="set-status" style="color:${chkColor}">${chk}</td>
            <td><label class="set-skip-toggle" title="Série non effectuée">
              <input type="checkbox" id="pskip_${ex.id}_${s}" ${isSkipped?'checked':''} onchange="window._toggleSetSkipped(this,'p','${ex.id}',${s})">
            </label></td>
          </tr>`;
        }
        html += '</tbody></table>';

        if(rec?.sets?.some(s=>s?.kg)) {
          const done   = (rec.sets||[]).filter(s=>s?.reps);
          const avgRpe = done.length ? Math.round(done.reduce((a,s)=>a+(parseFloat(s.rpe)||0),0)/done.length*10)/10 : null;
          html += `<div class="sets-summary" data-ex="${ex.id}"><strong>${done.length}</strong> série${done.length>1?'s':''} · ${avgRpe?`RPE moy. <strong>${avgRpe}</strong> · `:''}Meilleure : <strong>${bestKg(rec)} ${ex.unit||'kg'}</strong></div>`;
        }
      }

      html += '</div>'; // ex-block
    });

    html += `</div></div>
      <div class="save-row">
        <button class="save-btn" data-prog-day="${day.nom}" data-prog-week="${week}">Enregistrer ${day.nom}</button>
        <span class="save-ok" id="pok_${day.nom}">&#x2713; Enregistré</span>
      </div>`;
  });

  document.getElementById('saisieContent').innerHTML = html;
  _bindProgSaisieEvents(prog, week);
}

function _bindProgSaisieEvents(prog, week) {
  // État courant relu par les handlers délégués (liés une seule fois).
  _curSaisieProg = prog;
  if(_progSaisieBound) return;
  _progSaisieBound = true;
  const content = document.getElementById('saisieContent');

  // Status buttons
  content.addEventListener('click', e => {
    const btn = e.target.closest('[data-status][data-progex]');
    if(!btn) return;
    const { progex, ex, status } = btn.dataset;
    setProgExStatus(progex, ex, parseInt(btn.dataset.week), status);
    // Update button styles without re-rendering the whole form
    btn.closest('.ex-status-btns')?.querySelectorAll('.session-status-btn').forEach(b => {
      b.className = 'session-status-btn' + (b.dataset.status === status ? ' active-' + status : '');
    });
  });

  // Auto-fill
  content.addEventListener('input', e => {
    const inp = e.target.closest('.set-inp[data-idx="0"]');
    if(!inp) return;
    const val = parseFloat(inp.value);
    if(!val || val <= 0) return; // Only auto-fill with valid numeric values
    const { ex, nsets } = inp.dataset;
    for(let i = 1; i < parseInt(nsets); i++) {
      const el = document.getElementById(`pkg_${ex}_${i}`);
      if(el && !el.value) el.value = inp.value;
    }
  });

  // Save buttons
  content.addEventListener('click', e => {
    const btn = e.target.closest('[data-prog-day]');
    if(!btn) return;
    _saveProgSaisie(_curSaisieProg, parseInt(btn.dataset.progWeek), btn.dataset.progDay);
  });

  // Vacances
  _bindVacancesEvents();
}

function _saveProgSaisie(prog, week, dayName) {
  const semaine = prog.semaines?.[week - 1];
  if(!semaine) return;
  const day = semaine.jours.find(d => d.nom === dayName);
  if(!day) return;

  day.exercices.forEach(ex => {
    // Cardio : log durée / RPE / distance / réalisée (pas de séries kg/reps)
    if(ex.kind === 'cardio') {
      const durEl  = document.getElementById(`cdur_${ex.id}`);
      const rpeEl  = document.getElementById(`crpe_${ex.id}`);
      const distEl = document.getElementById(`cdist_${ex.id}`);
      const doneEl = document.getElementById(`cdone_${ex.id}`);
      const durationMin = durEl && durEl.value !== '' ? parseFloat(durEl.value) : null;
      const rpe         = rpeEl?.value || '';
      const distance    = distEl && distEl.value !== '' ? parseFloat(distEl.value) : null;
      const done        = doneEl?.checked === true;
      if(durationMin == null && !rpe && distance == null && !done) return;
      setProgRecord(prog.id, ex.id, week, {
        cardio: true, durationMin, rpe, distance, done, ts: Date.now(),
        sessionStatus: getProgExStatus(prog.id, ex.id, week),
      });
      return;
    }

    // Lire autant de séries que la grille en affiche (cohérence render ↔ save)
    const nSets = Math.max(_parseSetsGeneric(ex.scheme), 4);
    const sets  = [];
    let anyData = false;

    for(let s = 0; s < nSets; s++) {
      const skipCheckbox = document.getElementById(`pskip_${ex.id}_${s}`);
      const skipped = skipCheckbox?.checked === true;
      if(skipped) {
        sets.push({ kg: null, reps: null, rpe: null, skipped: true });
        anyData = true;
        continue;
      }
      const kgRaw = document.getElementById(`pkg_${ex.id}_${s}`)?.value;
      const kg    = kgRaw !== '' && kgRaw != null ? parseFloat(kgRaw) : null;
      const reps  = parseInt(document.getElementById(`preps_${ex.id}_${s}`)?.value, 10) || null;
      const rpe   = document.getElementById(`prpe_${ex.id}_${s}`)?.value || '';
      sets.push({ kg, reps, rpe, skipped: false });
      if(kg != null || reps) anyData = true;
    }
    if(!anyData) return;

    const _bkVals = sets.map(s=>s.kg||0).filter(v=>v>0);
    const bk     = _bkVals.length ? Math.max(..._bkVals) : null;
    const filled = sets.find(s=>s.rpe);
    setProgRecord(prog.id, ex.id, week, {
      sets, kg: bk, rpe: filled?.rpe||'', ts: Date.now(),
      sessionStatus: getProgExStatus(prog.id, ex.id, week),
    });
  });

  _showSaveToast(`✓ ${dayName} enregistré`);
  repaintMuscles();
  // Re-render complet pour afficher l'analyse post-sauvegarde
  renderSaisie();
}

// ── Generic analysis helpers ──────────────────────────────────────────────────

function _calcAdjGeneric(prog, ex, week, semaine) {
  const rec = normRecord(getProgRecord(prog.id, ex.id, week));
  if(!rec?.sets?.some(s=>s && (s.kg != null || s.skipped))) return null;

  const planKg   = ex.kgPlan;
  const scheme   = ex.scheme;
  const planReps = parseReps(scheme) || 5;
  const nSets    = _parseSetsGeneric(scheme) || 4;
  const status   = getProgExStatus(prog.id, ex.id, week);

  // ── Séries "non effectuées" — signal explicite (cohérent avec calcAdj ATHX) ──
  const skippedSets = rec.sets.filter(s => s?.skipped === true);
  if(skippedSets.length > 0 && !rec.sets.some(s => s && s.kg != null)) {
    const ratio  = skippedSets.length / (nSets || rec.sets.length || 1);
    const severe = ratio >= 0.5;
    return {
      type: severe ? 'injury_suspected' : 'partial_skip',
      signals: [{
        type: 'danger',
        text: severe
          ? `${skippedSets.length} série(s) non effectuée(s) — possible blessure ou manque de force. Recul prudent recommandé.`
          : `${skippedSets.length} série(s) non effectuée(s) sur ${nSets} — à surveiller.`,
      }],
      skipped: false, hyrox: false, deload: false, injurySuspected: severe,
    };
  }
  if(status === 'skipped') return { type:'skipped', signals:[], skipped:true };
  if(status === 'deload')  return { type:'deload', signals:[{type:'neutral',text:'Séance deload — aucune analyse.'}], deload:true };

  const sets = rec.sets.filter(s=>s && s.kg != null);
  const done = sets.filter(s=>s?.reps&&s.reps>0);
  const _bkValsAdj = sets.map(s=>s.kg||0);
  const bk   = _bkValsAdj.length ? Math.max(..._bkValsAdj) : 0;
  const avgRpe  = done.length ? done.reduce((a,s)=>a+(parseFloat(s.rpe)||7),0)/done.length : null;
  const avgReps = done.length ? done.reduce((a,s)=>a+(s.reps||0),0)/done.length : null;

  const signals = [];
  if(avgRpe != null) {
    if(avgRpe >= 9.5) signals.push({type:'danger', text:`RPE ${Math.round(avgRpe*10)/10} — intensité maximale.`});
    else if(avgRpe >= 9) signals.push({type:'warn', text:`RPE ${Math.round(avgRpe*10)/10} — proche limite.`});
    else if(avgRpe <= 7) signals.push({type:'good', text:`RPE ${Math.round(avgRpe*10)/10} — zone optimale.`});
    else signals.push({type:'neutral', text:`RPE ${Math.round(avgRpe*10)/10} — bon calibrage.`});
  }
  if(avgReps != null && planReps > 0) {
    const ratio = avgReps / planReps;
    if(ratio < 0.8) signals.push({type:'danger', text:`${Math.round(avgReps*10)/10} reps/série — insuffisant.`});
    else if(ratio >= 0.95) signals.push({type:'good', text:`${Math.round(avgReps*10)/10} reps/série ✓`});
    else signals.push({type:'warn', text:`${Math.round(avgReps*10)/10} reps/série (plan: ${planReps}).`});
  }
  if(planKg && Math.abs(bk - planKg) >= 1.25) {
    const d = Math.round((bk-planKg)*10)/10;
    signals.push({type: d>0?'good':'warn', text:`${d>0?'+':''}${d} kg vs plan.`});
  }

  const hasDanger = signals.some(s=>s.type==='danger');
  const hasWarn   = signals.some(s=>s.type==='warn');
  return { type: hasDanger?'behind':hasWarn?'slight_behind':'ahead', signals, bk, avgRpe, avgReps };
}

function _getNextPlanGeneric(prog, ex, week, semaine) {
  if(week >= (prog.totalWeeks || 17)) return null;
  const rec = normRecord(getProgRecord(prog.id, ex.id, week));
  if(!rec?.sets?.some(s=>s && (s.kg != null || s.skipped))) return null;

  // ── Séries "non effectuées" — recul de précaution (cohérent avec getNextPlan ATHX) ──
  const skippedSets = rec.sets.filter(s => s?.skipped === true);
  if(skippedSets.length > 0 && !rec.sets.some(s => s && s.kg != null)) {
    const nSets0 = _parseSetsGeneric(ex.scheme) || 4;
    const ratio  = skippedSets.length / nSets0;
    const severe = ratio >= 0.5;
    const p0     = ex.id === 'squat' || ex.id === 'deadlift' ? 2.5 : 1.25;
    // Référence : dernière charge connue (semaine actuelle théorique ou semaine antérieure)
    let refKg = ex.kgPlan || null;
    for(let w = week - 1; w >= 1 && !refKg; w--) {
      const prevRec = normRecord(getProgRecord(prog.id, ex.id, w));
      const prevVals = (prevRec?.sets||[]).map(s=>s?.kg||0).filter(v=>v>0);
      if(prevVals.length) refKg = Math.max(...prevVals);
    }
    if(!refKg) return null;
    const reduction = severe ? 2 * p0 : p0;
    const nextKg = Math.max(refKg - reduction, p0);
    return {
      kg: Math.round(nextKg / 1.25) * 1.25,
      rule: severe
        ? `${skippedSets.length} série(s) non effectuée(s) — possible blessure/manque de force. Recul de 2 paliers par précaution.`
        : `${skippedSets.length} série(s) non effectuée(s) — recul d'un palier par précaution.`,
      outcome: severe ? 'injury_suspected' : 'partial_skip',
    };
  }

  const rc = repriseCoeff();
  if(rc) {
    const _bkValsRc = (rec.sets||[]).map(s=>s?.kg||0).filter(v=>v>0);
    const bk = _bkValsRc.length ? Math.max(..._bkValsRc) : 0;
    const repriseKg = Math.round(bk * rc.coeff / 1.25) * 1.25;
    return { kg:repriseKg, rule:`${rc.label} · ${Math.round(rc.coeff*100)}% · RPE ${rc.rpeTarget}`, outcome:'vacances' };
  }

  const status   = getProgExStatus(prog.id, ex.id, week);
  const _bkVals3 = (rec.sets||[]).map(s=>s?.kg||0).filter(v=>v>0);
  const bk       = _bkVals3.length ? Math.max(..._bkVals3) : 0;
  const p        = ex.id === 'squat' || ex.id === 'deadlift' ? 2.5 : 1.25;

  if(status === 'skipped') return { kg:bk, rule:'Séance sautée — même charge.', outcome:'skipped' };
  if(status === 'deload')  return { kg: ex.kgPlan || bk, rule:'Retour au plan S+1.', outcome:'deload' };

  const avgRpe  = (() => {
    const done = (rec.sets||[]).filter(s=>s?.reps);
    return done.length ? done.reduce((a,s)=>a+(parseFloat(s.rpe)||7),0)/done.length : null;
  })();
  const avgReps = (() => {
    const done = (rec.sets||[]).filter(s=>s?.reps);
    return done.length ? done.reduce((a,s)=>a+(s.reps||0),0)/done.length : null;
  })();
  const planReps = parseReps(ex.scheme) || 5;

  if(avgRpe != null && avgRpe > 9.5) return { kg:Math.max(bk-p,p), rule:'RPE > 9.5 — recul d\'un palier.', outcome:'overload' };
  if(avgReps != null && planReps > 0 && avgReps/planReps < 0.8) return { kg:Math.max(bk-2*p,p), rule:'Reps insuffisantes — recul 2 paliers.', outcome:'crush' };
  if(avgRpe != null && avgRpe <= 8.5 && avgReps != null && avgReps/planReps >= 0.95) return { kg:bk+p, rule:'Toutes séries validées ✓ — progression d\'un palier.', outcome:'success' };
  if(avgRpe != null && avgRpe > 8.5) return { kg:bk, rule:'RPE élevé — consolide à la même charge.', outcome:'high_rpe' };
  return { kg:bk, rule:'Séries incomplètes — même charge.', outcome:'partial' };
}

// ── Legacy ATHX tracker (unchanged logic) ────────────────────────────────────

function _renderLegacySaisie() {
  const week  = parseInt(document.getElementById('weekSel').value, 10) || 1;
  const ph    = PHASES[week - 1] || PHASES[0];
  const badge = document.getElementById('phaseBadge');
  badge.textContent      = PHASE_LABELS[ph];
  badge.style.background = PHASE_STYLE[ph].bg;
  badge.style.color      = PHASE_STYLE[ph].color;

  const days = ['Mercredi', 'Jeudi'];
  let html = _progSelectorUI() + _vacancesUI();

  days.forEach(day => {
    const exs = EXERCISES.filter(e => e.day === day);
    if(!exs.length) return;

    html += `<div class="day-card">
      <div class="day-header"><span class="day-name">${day}</span></div>
      <div class="ex-wrap">`;

    exs.forEach(ex => {
      const staticPlan = ex.plan[week - 1];
      const scheme     = ex.repScheme[week - 1];
      const rec        = normRecord(getRecord(ex.id, week));

      // Plan dynamique : utilise la recommandation Lafay de la dernière semaine NORMALE
      // (pas deload) pour ajuster le poids de départ de chaque nouveau bloc
      let plan = staticPlan;
      if(week > 1) {
        // Trouver la dernière semaine normale (non-deload) avant cette semaine
        for(let pw = week - 1; pw >= 1; pw--) {
          const prevScheme = ex.repScheme[pw - 1];
          if(prevScheme === 'Deload' || prevScheme === 'Taper' || prevScheme === 'Repos') continue;
          const nxt = getNextPlan(ex, pw);
          if(nxt?.kg) { plan = nxt.kg; break; }
          break; // si la semaine précédente n'a pas de données, garder le plan statique
        }
      }
      // For deload/taper: use previous normal week's set count
      const nSets = (() => {
        if(scheme === 'Deload' || scheme === 'Taper' || scheme === 'Repos') {
          // Find last non-null sets count for this exercise
          if(ex.sets) {
            for(let w = week-2; w >= 0; w--) {
              if(ex.sets[w] != null) return ex.sets[w];
            }
          }
          return 4;
        }
        return parseSets(scheme) || 4;
      })();
      const planReps = parseReps(scheme);
      const exStatus = getExStatus(ex.id, week);

      const btnN = exStatus==='normal' ?' active-normal' :'';
      const btnH = exStatus==='hyrox'  ?' active-hyrox'  :'';
      const btnD = exStatus==='deload' ?' active-deload' :'';
      const btnS = exStatus==='skipped'?' active-skipped':'';

      html += `<div class="ex-block" data-exid="${ex.id}">
        <div class="ex-top">
          <span class="ex-name-t">${ex.name}</span>
          <span class="ex-scheme">${scheme}</span>
          <span class="ex-status-btns">
            <button class="session-status-btn${btnN}" data-ex="${ex.id}" data-week="${week}" data-status="normal">Normale</button>
            <button class="session-status-btn${btnH}" data-ex="${ex.id}" data-week="${week}" data-status="hyrox">⚡ Post-Hyrox</button>
            <button class="session-status-btn${btnD}" data-ex="${ex.id}" data-week="${week}" data-status="deload">🔵 Deload</button>
            <button class="session-status-btn${btnS}" data-ex="${ex.id}" data-week="${week}" data-status="skipped">Sautée</button>
          </span>
        </div>`;

      if(plan) {
        html += `<div class="ex-plan-txt">Plan : <strong>${plan} ${ex.unit}</strong>${planReps?` × <strong>${planReps} reps</strong>`:''} <span class="ex-ref">${ex.refText}</span></div>`;

        const bk = bestKg(rec);
        const deloadKg = exStatus === 'deload' ? Math.round(plan * 0.60 / 1.25) * 1.25 : null;

        if(exStatus === 'deload') {
          html += `<div class="ex-plan-txt" style="color:var(--blue)">🔵 Charge deload suggérée : <strong>${deloadKg} ${ex.unit}</strong> (~60%) — saisie normale ci-dessous</div>`;
        }

        if(bk != null && exStatus !== 'deload') {
          const adj = calcAdj(ex, week);
          if(adj?.signals?.length) {
            const cls = adj.type==='ok'?'adj-ok':adj.type.includes('ahead')?'adj-ahead':(adj.type.includes('behind')&&!adj.type.includes('slight'))?'adj-behind':'adj-slight';
            html += `<div class="adj-box ${cls}" style="padding:8px 12px">
              ${adj.signals.map(s=>{
                const ic  = s.type==='good'?'✓ ':s.type==='warn'?'⚠ ':s.type==='danger'?'✗ ':'· ';
                const col = s.type==='good'?'var(--green)':s.type==='warn'?'var(--amber)':s.type==='danger'?'var(--red)':'var(--text2)';
                return `<div style="display:flex;gap:6px;margin-bottom:2px"><span style="color:${col};font-weight:600;flex-shrink:0">${ic}</span><span>${esc(s.text)}</span></div>`;
              }).join('')}
            </div>`;
          }
          if(!adj?.skipped && !adj?.hyrox && !adj?.deload) {
            const nxt = getNextPlan(ex, week);
            if(nxt) {
              const planNext    = ex.plan[week];
              const planRepsNext= parseReps(ex.repScheme[week]) || planReps;
              const delta       = planNext ? Math.round((nxt.kg-planNext)*10)/10 : 0;
              const deltaStr    = delta>0?`+${delta} vs plan`:delta<0?`${delta} vs plan`:'conforme au plan';
              const deltaCls    = delta>0?'var(--green)':delta<0?'var(--red)':'var(--text2)';
              const rpeTarget   = adj?.avgRpe!=null?(adj.avgRpe>8.5?'≤ 8':adj.avgRpe<7?'7.5–8.5':'7–8'):'7–8';
              const outcomeClass= nxt.outcome==='success'?'next-rec-success':nxt.outcome==='high_rpe'||nxt.outcome==='partial'?'next-rec-hold':'next-rec-back';
              html += `<div class="next-rec-block ${outcomeClass}">
                <div class="rec-line">S${week+1} recommandé : <strong>${nxt.kg} ${ex.unit}</strong> × <strong>${planRepsNext} reps</strong>
                  ${planNext?`<span style="color:${deltaCls};font-size:11px;margin-left:6px">(${deltaStr})</span>`:''}
                </div>
                <div class="reason">${esc(nxt.rule)}</div>
                <div class="reason" style="margin-top:2px">RPE cible : <strong>${rpeTarget}</strong>${nxt.plateauCount>0?` · Plateau : ${nxt.plateauCount}/3 sem.`:''}</div>
              </div>`;
            }
          }
        }
      } else {
        html += `<div class="ex-plan-txt ex-ref">${scheme}</div>`;
      }

      // Grid: show for all except skipped
      if(exStatus !== 'skipped') {
        const deloadKg = exStatus==='deload'&&plan ? Math.round(plan*0.60/1.25)*1.25 : null;
        html += `<table class="sets-table">
          <thead><tr><th>Série</th><th>Charge (${ex.unit})</th><th>Reps</th><th>RPE</th><th></th><th>Sautée</th></tr></thead><tbody>`;
        for(let s = 0; s < nSets; s++) {
          const sr  = rec?.sets?.[s] || {};
          const isSkipped = sr.skipped === true;
          const chk = !isSkipped && sr.kg != null && sr.reps != null ? '✓' : (isSkipped ? '❌' : '');
          const chkColor = isSkipped ? 'var(--red)' : (chk ? 'var(--green)' : 'var(--border)');
          const phKg    = deloadKg || plan || '';
          const kgVal   = sr.kg   != null && sr.kg   !== '' ? sr.kg   : phKg;
          const repsVal = sr.reps != null && sr.reps !== '' ? sr.reps : (planReps || '');
          const dis = isSkipped ? 'disabled' : '';
          html += `<tr class="${isSkipped?'set-row-skipped':''}">
            <td class="set-num">S${s+1}</td>
            <td><input class="set-inp" type="number" id="kg_${ex.id}_${s}" step="1.25" min="0" ${dis}
                value="${isSkipped?'':kgVal}" placeholder="${phKg}"
                data-ex="${ex.id}" data-idx="${s}" data-nsets="${nSets}"></td>
            <td><input class="set-inp reps-inp" type="number" id="reps_${ex.id}_${s}" ${dis}
                min="0" max="30" step="1" value="${isSkipped?'':repsVal}" placeholder="${planReps||'—'}"></td>
            <td><select class="set-rpe" id="rpe_${ex.id}_${s}" ${dis}>
              <option value="">—</option>${_rpeOptions(sr.rpe)}
            </select></td>
            <td class="set-status" style="color:${chkColor}">${chk}</td>
            <td><label class="set-skip-toggle" title="Série non effectuée">
              <input type="checkbox" id="skip_${ex.id}_${s}" ${isSkipped?'checked':''} onchange="window._toggleSetSkipped(this,'l','${ex.id}',${s})">
            </label></td>
          </tr>`;
        }
        html += '</tbody></table>';
        if(rec?.sets?.some(s=>s?.kg)) {
          const done   = (rec.sets||[]).filter(s=>s?.reps);
          const avgRpe = done.length?Math.round(done.reduce((a,s)=>a+(parseFloat(s.rpe)||0),0)/done.length*10)/10:null;
          html += `<div class="sets-summary" data-ex="${ex.id}"><strong>${done.length}</strong> série${done.length>1?'s':''} · ${avgRpe?`RPE moy. <strong>${avgRpe}</strong> · `:''}Meilleure charge : <strong>${bestKg(rec)} ${ex.unit}</strong></div>`;
        }
      }

      html += '</div>'; // ex-block
    });

    html += `</div></div>
      <div class="save-row">
        <button class="save-btn" data-day="${day}" data-week="${week}">Enregistrer ${day}</button>
        <span class="save-ok" id="ok_${day}">&#x2713; Enregistré</span>
      </div>`;
  });

  document.getElementById('saisieContent').innerHTML = html;
  _bindLegacyEvents(week);
}

function _bindLegacyEvents(week) {
  // État courant relu par les handlers délégués (liés une seule fois).
  _curLegacyWeek = week;
  if(_legacySaisieBound) return;
  _legacySaisieBound = true;
  const content = document.getElementById('saisieContent');

  content.addEventListener('click', e => {
    const btn = e.target.closest('[data-status]:not([data-progex])');
    if(!btn) return;
    const { ex, status } = btn.dataset;
    setExStatus(ex, _curLegacyWeek, status);
    // Update button styles without re-rendering
    btn.closest('.ex-status-btns')?.querySelectorAll('.session-status-btn').forEach(b => {
      b.className = 'session-status-btn' + (b.dataset.status === status ? ' active-' + status : '');
    });
  });

  content.addEventListener('input', e => {
    const inp = e.target.closest('.set-inp[data-idx="0"]');
    if(!inp) return;
    const val = parseFloat(inp.value);
    if(!val || val <= 0) return;
    const { ex, nsets } = inp.dataset;
    for(let i=1;i<parseInt(nsets);i++) {
      const el = document.getElementById(`kg_${ex}_${i}`);
      if(el && !el.value) el.value = inp.value;
    }
  });

  content.addEventListener('click', e => {
    const btn = e.target.closest('.save-btn[data-day]');
    if(!btn) return;
    saveSaisie(parseInt(btn.dataset.week), btn.dataset.day);
  });

  _bindVacancesEvents();
}

export function saveSaisie(week, day) {
  const exs = EXERCISES.filter(e => e.day === day);
  exs.forEach(ex => {
    const scheme = ex.repScheme[week - 1];
    // Pour Deload/Taper : même nSets que la grille affichée (semaine précédente non-null)
    let nSets;
    if(scheme === 'Deload' || scheme === 'Taper' || scheme === 'Repos') {
      nSets = 4;
      if(ex.sets) { for(let w = week-2; w >= 0; w--) { if(ex.sets[w] != null) { nSets = ex.sets[w]; break; } } }
    } else {
      nSets = parseSets(scheme) || 4;  // aligné sur la grille affichée (renderer: || 4)
    }
    const sets = [];
    let anyData = false;
    for(let s=0;s<nSets;s++) {
      const skipCheckbox = document.getElementById(`skip_${ex.id}_${s}`);
      const skipped = skipCheckbox?.checked === true;
      if(skipped) {
        sets.push({ kg: null, reps: null, rpe: null, skipped: true });
        anyData = true;
        continue;
      }
      const kgRaw = document.getElementById(`kg_${ex.id}_${s}`)?.value;
      const kg    = kgRaw !== '' && kgRaw != null ? parseFloat(kgRaw) : null;
      const reps  = parseInt(document.getElementById(`reps_${ex.id}_${s}`)?.value, 10) || null;
      const rpe   = document.getElementById(`rpe_${ex.id}_${s}`)?.value || '';
      sets.push({ kg, reps, rpe, skipped: false });
      if(kg != null || reps) anyData = true;
    }
    if(!anyData) return;
    const _bkVals2 = sets.map(s=>s.kg||0).filter(v=>v>0);
    const bk     = _bkVals2.length ? Math.max(..._bkVals2) : null;
    const filled = sets.find(s=>s.rpe);
    setRecord(ex.id, week, { sets, kg:bk, rpe:filled?.rpe||'', ts:Date.now(), sessionStatus:getExStatus(ex.id,week) });
  });

  _showSaveToast(`✓ ${day} enregistré`);
  repaintMuscles();
  // Re-render complet pour afficher l'analyse post-sauvegarde (RPE, recommandation S+1)
  renderSaisie();
}

// ── Vacances UI (shared) ──────────────────────────────────────────────────────

function _progSelectorUI() {
  const all = getAllActivePrograms();
  const hasAthxData = _hasAthxData();

  // Rien à afficher si un seul programme généré ET pas de données ATHX
  if(all.length <= 1 && !hasAthxData) return '';
  // Rien à afficher si un seul programme généré ET pas de données ATHX à proposer
  if(all.length === 0 && !hasAthxData) return '';

  const current = getCurrentProgram();
  const isAthxActive = current === null && !hasAthxData ? false : (current === null);

  let options = '';
  if(hasAthxData) {
    options += `<option value="athx-legacy" ${isAthxActive ? 'selected' : ''}>🏆 ATHX — Compétition (legacy)</option>`;
  }
  options += all.map(p => {
    const cw = p.startDate ? getCurrentWeek(p) : null;
    const weekLabel = cw ? ` (S${cw}/${p.totalWeeks||'?'})` : '';
    return `<option value="${p.id}" ${p.id === current?.id ? 'selected' : ''}>${esc(p.name)}${weekLabel}</option>`;
  }).join('');

  const total = all.length + (hasAthxData ? 1 : 0);
  if(total <= 1) return '';

  return `<div class="prog-selector-bar">
    <label class="prog-selector-label">Programme actif</label>
    <select class="prog-selector-select" onchange="window._switchProgram(this.value)">
      ${options}
    </select>
    <span class="prog-selector-hint">${(() => {
      if(current?.startDate) {
        const cw = getCurrentWeek(current);
        return 'Semaine ' + cw + '/' + (current.totalWeeks||'?');
      }
      return total + ' programme' + (total > 1 ? 's' : '') + ' en cours';
    })()}</span>
  </div>`;
}


function _getFirstSkippedWeek(vac) {
  if(!vac) return null;
  const rw = vac.repriseWeek || null;
  if(!rw) return null;

  // Use directly stored value if available (set by _confirmReprise)
  if(vac.firstSkippedWeek) return vac.firstSkippedWeek;

  // Fallback: scan ATHX statuses
  const MAIN = ['press','squat','deadlift','gtoh','sandbag','lunges'];
  for(let w = 1; w < rw; w++) {
    const anySkipped = MAIN.some(id => getExStatus ? getExStatus(id, w) === 'skipped' : false);
    if(anySkipped) return w;
  }

  // Last fallback: estimate from vacation dates
  if(vac.debut && vac.fin) {
    const dur = Math.max(1, Math.round((new Date(vac.fin) - new Date(vac.debut)) / 86400000 / 7));
    return Math.max(1, rw - dur);
  }

  return rw - 1;
}

function _getVacBannerForWeek(list, week) {
  if(!list.length) return null;
  for(const vac of list) {
    const rw = vac.repriseWeek;
    if(!rw) continue;
    const sw = _getFirstSkippedWeek(vac) ?? rw;
    if(week === rw) return 'reprise';
    if(week >= sw && week < rw) return 'en_cours';
    if(week === sw - 1 || week === sw - 2) return 'a_venir';
  }
  return null;
}

function _vacancesUI() {
  const _rc   = repriseCoeff();
  const _stat = vacancesStatus();
  const _list = getVacancesList();
  const _prog = getCurrentProgram ? getCurrentProgram() : null;
  const _totalWeeks = _prog ? (_prog.totalWeeks || _prog.semaines?.length || 17) : 17;
  const _fmt  = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '';
  const _dur  = (d1,d2) => Math.max(0,Math.round((new Date(d2)-new Date(d1))/86400000));

  let html = '';
  // Week-based banner logic (not calendar-based)
  const _currentWeek = parseInt(document.getElementById('weekSel')?.value || '1', 10);
  const _vacBanner = _getVacBannerForWeek(_list, _currentWeek);

  if(_vacBanner === 'reprise') {
    // Use cumulative deconditioning coefficient
    const _rc = (typeof repriseCoeffForWeek === 'function')
      ? repriseCoeffForWeek(_currentWeek, _list)
      : null;
    const _coeff = _rc?.coeff || 0.85;
    const _rpe   = _rc?.rpeTarget || '≤ 7';
    const _lbl   = _rc?.label || 'Reprise progressive';
    const _skipped = _rc?.totalSkippedWeeks;
    html += `<div class="reprise-panel">
      <div class="reprise-panel-title">⚡ ${esc(_lbl)}</div>
      <div class="reprise-panel-coeff">Coefficient : <strong>${Math.round(_coeff*100)}%</strong>${_rc?.actBonus>0?` (+${_rc.actBonus}% activité)`:''} · RPE cible : <strong>${_rpe}</strong></div>
      <div class="reprise-note">Basé sur ${_skipped ? _skipped + ' semaine(s) de repos cumulé' : 'tes périodes de repos'}. Reco S+1 ajustée sur ta dernière perf avant les vacances.</div>
    </div>`;
  } else if(_vacBanner === 'en_cours') {
    const _vac = _list.find(v => {
      const rw = v.repriseWeek || 999;
      const sw = _getFirstSkippedWeek(v);
      return _currentWeek >= sw && _currentWeek < rw;
    });
    const _repriseW = _vac?.repriseWeek;
    html += `<div class="reprise-banner" style="background:#f0e8fc;border-color:#c0a0e8;color:#5a0090">🏖 Semaine de vacances${_repriseW ? ` — reprise prévue en S${_repriseW}` : ''}</div>`;
  } else if(_vacBanner === 'a_venir') {
    const _vac = _list.slice().sort((a,b)=>new Date(a.debut)-new Date(b.debut))
      .find(v => (_getFirstSkippedWeek(v) || 999) > _currentWeek);
    const _sw = _vac ? _getFirstSkippedWeek(_vac) : null;
    if(_sw) html += `<div class="reprise-banner" style="background:#fff8e1;border-color:#f9a825;color:#7c4a00">📅 Vacances à venir — ${_fmt(_vac.debut)} → ${_fmt(_vac.fin)} · Séances sautées à partir de S${_sw}</div>`;
  } else if(_stat?.reprise) {
    // Calendar fallback for reprise within 14 days
    html += `<div class="reprise-panel">
      <div class="reprise-panel-title">⚡ ${esc(_stat.label)}</div>
      <div class="reprise-panel-coeff">Coefficient : <strong>${Math.round(_stat.coeff*100)}%</strong> · RPE cible : <strong>${_stat.rpeTarget}</strong></div>
      <div class="reprise-note">Les recommandations S+1 sont automatiquement ajustées.</div>
    </div>`;
  }

  html += `<div class="vacances-setup">
    <div class="vacances-setup-title">🏖 Vacances / Congés</div>
    ${_list.length?`<div class="vac-list">${_list.map((v,i)=>`
      <div class="vac-list-item">
        <span class="vac-list-dates">${_fmt(v.debut)} → ${_fmt(v.fin)}</span>
        <span class="vac-list-dur">${_dur(v.debut,v.fin)}j</span>
        <span class="vac-list-act">${{sedentaire:'Sédentaire',leger:'Léger',vacances:'PdC',sport:'Sport',muscu:'Muscu'}[v.activite]||'Sédentaire'}</span>
        <button class="vac-remove-btn" onclick="window._removeVacances(${i})">✕</button>
      </div>`).join('')}</div>`:''}
    <div class="vacances-row">
      <label>Début</label><input type="date" id="vacDebut">
      <label>Fin</label><input type="date" id="vacFin">
    </div>
    <div class="vacances-row" style="margin-top:6px">
      <label>Activité</label>
      <select id="vacActivite" style="font-size:12px;padding:5px 8px;border:1px solid var(--border-md);border-radius:var(--radius);background:var(--surface);color:var(--text)">
        ${Object.entries(ACTIVITE_LABELS).map(([k,v])=>`<option value="${k}">${v.label}${v.bonus>0?' (+'+Math.round(v.bonus*100)+'%)':''}</option>`).join('')}
      </select>
    </div>
    <div class="vacances-row" style="margin-top:6px;align-items:center">
      <label style="white-space:nowrap">Dernière sem. entraînement</label>
      <select id="vacFirstSkip" style="font-size:12px;padding:5px 8px;border:1px solid var(--border-md);border-radius:var(--radius);background:var(--surface);color:var(--text)">
        <option value="">Auto (détection)</option>
        <option value="0">Aucune (reprise directe)</option>
        ${Array.from({length: _totalWeeks}, (_,i)=>`<option value="${i+1}">S${i+1}</option>`).join('')}
      </select>
      <button class="save-btn" style="padding:5px 14px;font-size:12px" onclick="window._saveVacances()">+ Ajouter</button>
      ${_list.length?`<button class="vac-clear-btn" onclick="window._clearVacances()">Tout effacer</button>`:''}
    </div>
  </div>`;
  return html;
}

function _bindVacancesEvents() {
  // handled via window.* in app.js
}

// ── Progression ───────────────────────────────────────────────────────────────

export function renderProgression() {
  const prog = getActiveProgram();
  const container = document.getElementById('progressionContent');

  const MAIN_LIFTS = ['press','squat','deadlift'];
  let _progChart = null, _benchChart = null;

  const BENCH_DATA = {
    M: { press:[0.62,0.80,1.00,1.22], squat:[1.05,1.32,1.62,1.95], deadlift:[1.32,1.65,2.00,2.40] },
    F: { press:[0.30,0.40,0.52,0.66], squat:[0.68,0.88,1.10,1.34], deadlift:[0.80,1.02,1.26,1.52] },
  };
  const EX_COLORS = { press:'#1a5fb4', squat:'#7c4a00', deadlift:'#1b6b45' };
  const EX_NAMES  = { press:'Strict Press', squat:'Back Squat', deadlift:'Deadlift' };
  const BW = 73;

  container.innerHTML = `
    <div class="prog-filters">
      <div class="prog-filter-group">
        <label>Sexe</label>
        <select id="benchSex"><option value="M" selected>Homme</option><option value="F">Femme</option></select>
      </div>
      <div class="prog-filter-note">Source : Strength Level · population générale entraînée</div>
    </div>
    <div class="prog-pct-row" id="progPctRow"></div>
    <div class="prog-chart-card">
      <div class="prog-chart-label">Courbe de progression</div>
      <div class="prog-chart-sub">Charge max réalisée par semaine · ligne pleine = réalisé · pointillé = plan</div>
      <div class="prog-legend">
        <span><i class="pleg-line" style="background:#1a5fb4"></i>Press</span>
        <span><i class="pleg-line" style="background:#7c4a00"></i>Squat</span>
        <span><i class="pleg-line" style="background:#1b6b45"></i>Deadlift</span>
        <span><i class="pleg-dash"></i>Plan</span>
      </div>
      <div style="position:relative;width:100%;height:260px">
        <canvas id="progChartCanvas" role="img" aria-label="Courbes de progression"></canvas>
      </div>
    </div>
    <div class="prog-chart-card">
      <div class="prog-chart-label">Benchmark population</div>
      <div class="prog-chart-sub">Percentiles de force par rapport à la population</div>
      <div class="prog-legend">
        <span><i class="pleg-box" style="background:rgba(160,160,160,0.35)"></i>Population P25→P90</span>
        <span><i class="pleg-box" style="background:#1a5fb4cc"></i>Press</span>
        <span><i class="pleg-box" style="background:#7c4a00cc"></i>Squat</span>
        <span><i class="pleg-box" style="background:#1b6b45cc"></i>Deadlift</span>
      </div>
      <div style="position:relative;width:100%;height:300px">
        <canvas id="benchChartCanvas" role="img" aria-label="Benchmark force"></canvas>
      </div>
    </div>`;

  document.getElementById('benchSex').addEventListener('change', refreshBench);

  // Build progression chart
  const totalWeeks = prog ? prog.totalWeeks : 17;
  const labels = Array.from({length:totalWeeks},(_,i)=>`S${i+1}`);
  const datasets = [];

  MAIN_LIFTS.forEach(id => {
    const kgs  = [];
    const plans = [];
    for(let w=1;w<=totalWeeks;w++) {
      const rec = prog
        ? normRecord(getProgRecord(prog.id, id, w))
        : normRecord(getRecord(id, w));
      kgs.push(bestKg(rec)||null);

      if(prog) {
        const ex = prog.semaines?.[w-1]?.jours?.flatMap(d=>d.exercices)?.find(e=>e.id===id);
        plans.push(ex?.kgPlan||null);
      } else {
        const ex = EXERCISES.find(e=>e.id===id);
        plans.push(ex?.plan?.[w-1]||null);
      }
    }
    datasets.push({ label:EX_NAMES[id], data:kgs, borderColor:EX_COLORS[id], borderWidth:2.5, pointBackgroundColor:EX_COLORS[id], pointRadius:kgs.map(v=>v?4:0), tension:0.35, fill:false, spanGaps:true });
    datasets.push({ label:'_plan_'+id, data:plans, borderColor:EX_COLORS[id], borderWidth:1.5, borderDash:[5,4], pointRadius:0, fill:false, spanGaps:true });
  });

  if(_progChart) _progChart.destroy();
  _progChart = new Chart(document.getElementById('progChartCanvas'), {
    type:'line', data:{labels,datasets},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{filter:i=>!i.dataset.label.startsWith('_plan_'), callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.parsed.y??'—'} kg`}} },
      scales:{ x:{grid:{display:false},ticks:{font:{size:11},maxRotation:0}}, y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11},callback:v=>v+'kg'}} }
    }
  });

  function refreshBench() {
    const sex = document.getElementById('benchSex').value;
    const b   = BENCH_DATA[sex];
    const userBest = {};
    MAIN_LIFTS.forEach(id => {
      let best = null;
      for(let w=1;w<=totalWeeks;w++) {
        const rec = prog ? normRecord(getProgRecord(prog.id,id,w)) : normRecord(getRecord(id,w));
        const bk  = bestKg(rec);
        if(bk && (!best||bk>best)) best = bk;
      }
      userBest[id] = best;
    });

    document.getElementById('progPctRow').innerHTML = MAIN_LIFTS.map(id => {
      const u = userBest[id];
      if(!u) return `<div class="pct-card"><div class="pct-name">${EX_NAMES[id]}</div><div class="pct-val" style="color:#9b9b94">—</div><div class="pct-sub">Aucune donnée</div></div>`;
      const pts = b[id].map(r=>Math.round(r*BW*10)/10);
      let pct, col;
      if(u<pts[0]){pct='< P25';col='#9b9b94';}
      else if(u<pts[1]){pct='P25–50';col='#7c4a00';}
      else if(u<pts[2]){pct='P50–75';col='#1b6b45';}
      else if(u<pts[3]){pct='P75–90';col='#1a5fb4';}
      else{pct='Top 10%';col='#6b00c2';}
      return `<div class="pct-card"><div class="pct-dot" style="background:${col}"></div><div class="pct-name">${EX_NAMES[id]}</div><div class="pct-val" style="color:${col}">${pct}</div><div class="pct-sub">${u} kg · ×${(u/BW).toFixed(2)} BW</div></div>`;
    }).join('');

    const seg1=MAIN_LIFTS.map(id=>Math.round(b[id][0]*BW));
    const seg2=MAIN_LIFTS.map(id=>Math.round((b[id][1]-b[id][0])*BW));
    const seg3=MAIN_LIFTS.map(id=>Math.round((b[id][2]-b[id][1])*BW));
    const seg4=MAIN_LIFTS.map(id=>Math.round((b[id][3]-b[id][2])*BW));

    const toiPlugin = { id:'toiBar', afterDatasetsDraw(chart){
      const {ctx,scales:{x,y}} = chart;
      MAIN_LIFTS.forEach((id,i) => {
        const u = userBest[id]; if(!u) return;
        const bw = (x.getPixelForValue(1)-x.getPixelForValue(0))*0.14;
        const cx = x.getPixelForValue(i);
        const top = y.getPixelForValue(u), bottom = y.getPixelForValue(0);
        const r=3; ctx.save(); ctx.fillStyle=EX_COLORS[id]+'dd'; ctx.strokeStyle=EX_COLORS[id]; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx-bw+r,top); ctx.lineTo(cx+bw-r,top); ctx.quadraticCurveTo(cx+bw,top,cx+bw,top+r);
        ctx.lineTo(cx+bw,bottom); ctx.lineTo(cx-bw,bottom); ctx.lineTo(cx-bw,top+r); ctx.quadraticCurveTo(cx-bw,top,cx-bw+r,top);
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      });
    }};

    if(_benchChart) _benchChart.destroy();
    _benchChart = new Chart(document.getElementById('benchChartCanvas'), {
      type:'bar', plugins:[toiPlugin],
      data:{ labels:MAIN_LIFTS.map(id=>EX_NAMES[id]),
        datasets:[
          {label:'< P25',data:seg1,backgroundColor:'rgba(200,198,192,0.45)',borderWidth:0,stack:'pop',borderRadius:0},
          {label:'P25–50',data:seg2,backgroundColor:'rgba(168,165,155,0.55)',borderWidth:0,stack:'pop'},
          {label:'P50–75',data:seg3,backgroundColor:'rgba(138,135,125,0.60)',borderWidth:0,stack:'pop'},
          {label:'P75–90',data:seg4,backgroundColor:'rgba(108,105,95,0.40)',borderWidth:0,stack:'pop',borderRadius:{topLeft:3,topRight:3}},
        ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{title:i=>EX_NAMES[MAIN_LIFTS[i[0].dataIndex]],label:ctx=>{const id=MAIN_LIFTS[ctx.dataIndex];const[p25,p50,p75,p90]=b[id].map(r=>Math.round(r*BW));const ranges={'< P25':`0–${p25} kg`,'P25–50':`${p25}–${p50} kg`,'P50–75':`${p50}–${p75} kg`,'P75–90':`${p75}–${p90} kg`};return ranges[ctx.dataset.label]||'';},footer:i=>{const id=MAIN_LIFTS[i[0].dataIndex];const u=userBest[id];return u?`Toi : ${u} kg`:[];} }}},
        scales:{ x:{stacked:true,grid:{display:false},ticks:{font:{size:12}}}, y:{stacked:true,grid:{color:'rgba(0,0,0,0.05)'},ticks:{font:{size:11},callback:v=>v+'kg'},beginAtZero:true} }
      }
    });
  }

  refreshBench();
}

// ── Historique ────────────────────────────────────────────────────────────────

export function renderHistorique() {
  const prog = getActiveProgram();
  let html = '', hasData = false;

  const exercises = prog
    ? [...new Map(prog.semaines.flatMap(s=>s.jours.flatMap(d=>d.exercices)).map(e=>[e.id,e])).values()]
    : EXERCISES;

  exercises.forEach(ex => {
    const rows = [];
    const totalWeeks = prog ? prog.totalWeeks : 17;
    for(let w=1;w<=totalWeeks;w++) {
      const r = prog
        ? normRecord(getProgRecord(prog.id, ex.id||ex, w))
        : normRecord(getRecord(ex.id, w));
      if(!r) continue;
      const bk = bestKg(r); if(!bk) continue;
      const plan  = prog
        ? prog.semaines?.[w-1]?.jours?.flatMap(d=>d.exercices)?.find(e=>e.id===(ex.id||ex))?.kgPlan
        : ex.plan?.[w-1];
      const delta = plan ? Math.round((bk-plan)*10)/10 : null;
      const done  = (r.sets||[]).filter(s=>s?.reps);
      const avgRpe  = done.length?Math.round(done.reduce((a,s)=>a+(parseFloat(s.rpe)||0),0)/done.length*10)/10:null;
      const avgReps = done.length?Math.round(done.reduce((a,s)=>a+(s.reps||0),0)/done.length*10)/10:null;
      rows.push({ w, bk, plan, delta, sets:r.sets||[], done, avgRpe, avgReps });
    }
    if(!rows.length) return;
    hasData = true;

    const name = ex.nom || ex.name || ex.id;
    html += `<div class="hist-block"><div class="hist-title">${esc(name)}</div>
      <table><thead><tr><th>Sem.</th><th>Charge</th><th>Plan</th><th>Δkg</th><th>Reps/s</th><th>RPE</th></tr></thead><tbody>`;
    rows.forEach(r => {
      const dc = r.delta===null?'delta-neu':r.delta>0?'delta-pos':'delta-neg';
      const dt = r.delta===null?'—':r.delta>0?`+${r.delta}`:r.delta===0?'±0':`${r.delta}`;
      html += `<tr>
        <td>S${r.w}</td><td><strong>${r.bk}</strong> ${ex.unit||'kg'}</td>
        <td>${r.plan||'—'}</td><td class="${dc}">${dt}</td>
        <td style="font-family:var(--mono);font-size:11px;text-align:center">${r.avgReps||'—'}</td>
        <td style="font-family:var(--mono);font-size:11px;text-align:center">${r.avgRpe||'—'}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  });

  if(!hasData) html = '<div class="empty">Aucune donnée saisie.</div>';
  else html += `<button class="reset-btn" id="resetDataBtn">Effacer toutes les données</button>`;
  document.getElementById('historiqueContent').innerHTML = html;

  document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    if(confirm('Effacer toutes les données ?')) {
      import('./db.js').then(({dbClear}) => dbClear().then(()=>{renderHistorique();renderProgression();}));
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _rpeOptions(selected) {
  return [6,6.5,7,7.5,8,8.5,9,9.5,10]
    .map(r=>`<option value="${r}"${String(selected)===String(r)?' selected':''}>${r}</option>`)
    .join('');
}

function _parseSetsGeneric(scheme) {
  if(!scheme || scheme === '—' || scheme === 'Repos') return 3;
  // Deload/Taper: use scheme's set count but allow override
  const m = scheme.match(/^(\d+)[×x]/);
  return m ? parseInt(m[1],10) : 3;
}

// ── Save toast ────────────────────────────────────────────────────────────────
function _showSaveToast(msg) {
  let toast = document.getElementById('saveToast');
  if(!toast) {
    toast = document.createElement('div');
    toast.id = 'saveToast';
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#1b6b45;color:#fff;padding:10px 20px;border-radius:24px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:all .25s;pointer-events:none;white-space:nowrap';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// ── Lightweight post-save updates (avoid full re-render) ─────────────────────
function _updateSetCheckmarks(prog, week, dayName) {
  const semaine = prog.semaines?.[week - 1];
  const day = semaine?.jours?.find(d => d.nom === dayName);
  if(!day) return;
  day.exercices.forEach(ex => {
    const nSets = Math.max(_parseSetsGeneric(ex.scheme), 4);
    let filled = 0;
    for(let s = 0; s < nSets; s++) {
      const kgEl   = document.getElementById(`pkg_${ex.id}_${s}`);
      const repsEl = document.getElementById(`preps_${ex.id}_${s}`);
      const cell   = kgEl?.closest('tr')?.querySelector('.set-status');
      if(cell && kgEl?.value && repsEl?.value) {
        cell.textContent = '✓';
        cell.style.color = 'var(--green)';
        filled++;
      }
    }
    // Update summary
    const rec = normRecord(getProgRecord(prog.id, ex.id, week));
    const bk  = bestKg(rec);
    if(bk && filled > 0) {
      const summary = document.querySelector(`.sets-summary[data-ex="prog_${ex.id}"]`);
      if(summary) summary.innerHTML = `<strong>${filled}</strong> série${filled>1?'s':''} · Meilleure : <strong>${bk} kg</strong>`;
    }

    // Refresh analysis blocks
    const adj = _calcAdjGeneric(prog, ex, week, semaine);
    const exBlock = document.querySelector(`.ex-block[data-exid="prog_${ex.id}"]`);
    if(!exBlock || !adj?.signals?.length) return;

    const adjContainer = exBlock.querySelector('.adj-box');
    if(adjContainer) {
      const cls = adj.type==='behind'?'adj-behind':adj.type==='slight_behind'?'adj-slight':'adj-ahead';
      adjContainer.className = `adj-box ${cls}`;
      adjContainer.style.padding = '8px 12px';
      adjContainer.innerHTML = adj.signals.map(s=>{
        const ic  = s.type==='good'?'✓ ':s.type==='warn'?'⚠ ':s.type==='danger'?'✗ ':'· ';
        const col = s.type==='good'?'var(--green)':s.type==='warn'?'var(--amber)':s.type==='danger'?'var(--red)':'var(--text2)';
        return `<div style="display:flex;gap:6px;margin-bottom:2px"><span style="color:${col};font-weight:600;flex-shrink:0">${ic}</span><span>${esc(s.text)}</span></div>`;
      }).join('');
    }
  });
}

function _updateLegacyCheckmarks(week, dayName) {
  const exs = EXERCISES.filter(e => e.day === dayName);
  exs.forEach(ex => {
    const scheme = ex.repScheme[week - 1];
    // For deload/taper: use previous non-null sets count (matches grid rendering)
    let nSets;
    if(scheme === 'Deload' || scheme === 'Taper' || scheme === 'Repos') {
      nSets = 4;
      if(ex.sets) { for(let w = week-2; w >= 0; w--) { if(ex.sets[w] != null) { nSets = ex.sets[w]; break; } } }
    } else {
      nSets = parseSets(scheme) || 4;
    }
    let filledSets = 0;

    for(let s = 0; s < nSets; s++) {
      const kgEl   = document.getElementById(`kg_${ex.id}_${s}`);
      const repsEl = document.getElementById(`reps_${ex.id}_${s}`);
      const cell   = kgEl?.closest('tr')?.querySelector('.set-status');
      if(cell && kgEl?.value && repsEl?.value) {
        cell.textContent = '✓';
        cell.style.color = 'var(--green)';
        filledSets++;
      }
    }

    // Update summary line
    const summary = document.querySelector(`.sets-summary[data-ex="${ex.id}"]`);
    if(summary && filledSets > 0) {
      const rec = normRecord(getRecord(ex.id, week));
      const bk  = bestKg(rec);
      summary.textContent = `${filledSets} série${filledSets>1?'s':''} · Meilleure charge : ${bk} ${ex.unit}`;
    }

    // Re-render analysis block
    _refreshAnalysisBlock(ex.id, week, ex);
  });
}

function _refreshAnalysisBlock(exId, week, ex) {
  const adjBox  = document.querySelector(`.adj-box[data-ex="${exId}"]`);
  const recBox  = document.querySelector(`.next-rec-block[data-ex="${exId}"]`);
  // If analysis elements exist and have data-ex, update them
  // They don't have data-ex currently — use a wrapper div approach
  // For now just trigger a partial re-render of the ex-block analysis section
  const exBlock = document.querySelector(`.ex-block[data-exid="${exId}"]`);
  if(!exBlock) return;

  // Re-render only analysis portion
  const rec = normRecord(getRecord(exId, week));
  if(!rec?.sets?.some(s=>s?.kg)) return;

  const adj = calcAdj(ex, week);
  const adjContainer = exBlock.querySelector('.adj-box');
  const recContainer = exBlock.querySelector('.next-rec-block');

  if(adj?.signals?.length && adjContainer) {
    const cls = adj.type==='ok'?'adj-ok':adj.type.includes('ahead')?'adj-ahead':(adj.type.includes('behind')&&!adj.type.includes('slight'))?'adj-behind':'adj-slight';
    adjContainer.className = `adj-box ${cls}`;
    adjContainer.style.padding = '8px 12px';
    adjContainer.innerHTML = adj.signals.map(s=>{
      const ic  = s.type==='good'?'✓ ':s.type==='warn'?'⚠ ':s.type==='danger'?'✗ ':'· ';
      const col = s.type==='good'?'var(--green)':s.type==='warn'?'var(--amber)':s.type==='danger'?'var(--red)':'var(--text2)';
      return `<div style="display:flex;gap:6px;margin-bottom:2px"><span style="color:${col};font-weight:600;flex-shrink:0">${ic}</span><span>${esc(s.text)}</span></div>`;
    }).join('');
  }

  // Update next-rec-block (suggestion S+1)
  if(recContainer && adj) {
    try {
      const nxt = getNextPlan(ex, week);
      if(nxt?.kg) {
        const delta = nxt.kg - (ex.plan?.[week-1] || nxt.kg);
        const deltaStr = delta > 0 ? `+${delta} kg` : delta < 0 ? `${delta} kg` : '=';
        const deltaCls = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text3)';
        const outcomeClass = adj.type?.includes('behind') ? 'next-rec-back'
          : adj.type?.includes('ahead') ? 'next-rec-ok' : 'next-rec-hold';
        recContainer.className = `next-rec-block ${outcomeClass}`;
        recContainer.innerHTML =
          `<div class="rec-line">S${week+1} recommandé : <strong>${nxt.kg} ${ex.unit||'kg'} × ${ex.repScheme?.[week]||'?'} reps</strong>` +
          (delta !== 0 ? `<span style="color:${deltaCls};font-size:11px;margin-left:6px">(${deltaStr} vs plan)</span>` : '') +
          `</div><div class="reason">${esc(nxt.rule||'')}</div>`;
      }
    } catch(e) { /* silently skip if getNextPlan not available */ }
  }
}
