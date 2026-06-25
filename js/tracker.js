/**
 * tracker.js — Tracker UI: saisie, progression, historique
 */

import { esc }                       from './security.js';
import { EXERCISES, PHASES, PHASE_LABELS, PHASE_STYLE } from './data.js';
import { getRecord, setRecord, getExStatus, setExStatus, normRecord, bestKg, getLatestWeek, getVacancesList, addVacances, removeVacances, clearAllVacances, repriseCoeff, vacancesStatus, ACTIVITE_LABELS } from './store.js';
import { parseSets, parseReps, calcAdj, getNextPlan } from './progression.js';
import { repaintMuscles }            from './musculaire.js';

// ── Week selector ──────────────────────────────────────────────────────────

export function initWeekSel() {
  const sel = document.getElementById('weekSel');
  if(!sel) return;
  sel.innerHTML = '';
  for(let w = 1; w <= 17; w++) {
    const o = document.createElement('option');
    o.value = w;
    o.textContent = `Semaine ${w}`;
    sel.appendChild(o);
  }
  sel.value = getLatestWeek(EXERCISES);
}

// ── Saisie ─────────────────────────────────────────────────────────────────

export function renderSaisie() {
  const week = parseInt(document.getElementById('weekSel').value, 10);
  const ph   = PHASES[week - 1];
  const badge = document.getElementById('phaseBadge');
  badge.textContent       = PHASE_LABELS[ph];
  badge.style.background  = PHASE_STYLE[ph].bg;
  badge.style.color       = PHASE_STYLE[ph].color;

  const days = ['Mercredi', 'Jeudi'];
  let html = '';

  /* ── Vacances / Congés — liste de périodes ── */
  const _rc   = repriseCoeff();
  const _stat = vacancesStatus();
  const _list = getVacancesList();
  const _fmt  = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '';
  const _dur  = (d1,d2) => Math.max(0, Math.round((new Date(d2)-new Date(d1))/86400000));

  if(_stat?.reprise) {
    // Calcul des charges de reprise par exercice
    const recoRows = EXERCISES
      .filter(ex => ['press','squat','deadlift'].includes(ex.id))
      .map(ex => {
        let lastKg = null;
        for(let w = 17; w >= 1; w--) {
          const bk = bestKg(normRecord(getRecord(ex.id, w)));
          if(bk) { lastKg = bk; break; }
        }
        if(!lastKg) return '';
        const reprise = Math.round(lastKg * _stat.coeff / 1.25) * 1.25;
        const delta   = Math.round((reprise - lastKg) * 10) / 10;
        return `<div class="reprise-ex-row">
          <span class="reprise-ex-name">${esc(ex.name)}</span>
          <span class="reprise-ex-val">${lastKg} ${ex.unit}</span>
          <span class="reprise-ex-arrow">→</span>
          <span class="reprise-ex-rec">${reprise} ${ex.unit}</span>
          <span class="reprise-ex-delta" style="color:var(--amber)">${delta} kg</span>
        </div>`;
      }).join('');

    html += `<div class="reprise-panel">
      <div class="reprise-panel-title">⚡ ${esc(_stat.label)}</div>
      <div class="reprise-panel-coeff">
        Coefficient : <strong>${Math.round(_stat.coeff * 100)}%</strong>
        ${_stat.actBonus > 0 ? `<span class="reprise-bonus">+${_stat.actBonus}% activité</span>` : ''}
        · RPE cible : <strong>${_stat.rpeTarget}</strong>
      </div>
      ${recoRows ? `<div class="reprise-ex-list">${recoRows}</div>` : ''}
      <div class="reprise-note">Les recommandations S+1 sont automatiquement ajustées dans la saisie.</div>
    </div>`;
  } else if(_stat?.en_cours) {
    html += `<div class="reprise-banner" style="background:#f0e8fc;border-color:#c0a0e8;color:#5a0090">🏖 Vacances en cours — retour dans ${_stat.joursRestants} jour${_stat.joursRestants > 1 ? 's' : ''}</div>`;
  }

  html += `<div class="vacances-setup">
    <div class="vacances-setup-title">🏖 Vacances / Congés</div>
    ${_list.length ? `<div class="vac-list">${_list.map((v,i)=>
      `<div class="vac-list-item">
        <span class="vac-list-dates">${_fmt(v.debut)} → ${_fmt(v.fin)}</span>
        <span class="vac-list-dur">${_dur(v.debut,v.fin)}j</span>
        <span class="vac-list-act">${(ACTIVITE_LABELS[v.activite]||ACTIVITE_LABELS.sedentaire).label.split(' ')[0]}</span>
        <button class="vac-remove-btn" onclick="window._removeVacances(${i})">✕</button>
      </div>`
    ).join('')}</div>` : ''}
    <div class="vacances-row">
      <label>Début</label>
      <input type="date" id="vacDebut">
      <label>Fin</label>
      <input type="date" id="vacFin">
    </div>
    <div class="vacances-row" style="margin-top:6px">
      <label>Activité</label>
      <select id="vacActivite" style="font-size:12px;padding:5px 8px;border:1px solid var(--border-md);border-radius:var(--radius);background:var(--surface);color:var(--text)">
        ${Object.entries(ACTIVITE_LABELS).map(([k,v])=>`<option value="${k}">${v.label}${v.bonus>0?' (+'+Math.round(v.bonus*100)+'%)':''}</option>`).join('')}
      </select>
      <button class="save-btn" style="padding:5px 14px;font-size:12px" onclick="window._saveVacances()">+ Ajouter</button>
      ${_list.length ? `<button class="vac-clear-btn" onclick="window._clearVacances()">Tout effacer</button>` : ''}
    </div>
  </div>`;

  days.forEach(day => {
    const exs = EXERCISES.filter(e => e.day === day);
    if(!exs.length) return;

    html += `<div class="day-card">
      <div class="day-header"><span class="day-name">${day}</span></div>
      <div class="ex-wrap">`;

    exs.forEach(ex => {
      const plan      = ex.plan[week - 1];
      const scheme    = ex.repScheme[week - 1];
      const rec       = normRecord(getRecord(ex.id, week));
      const nSets     = parseSets(scheme) || 3;
      const planReps  = parseReps(scheme);
      const exStatus  = getExStatus(ex.id, week);

      const btnN = exStatus === 'normal'  ? ' active-normal'  : '';
      const btnH = exStatus === 'hyrox'   ? ' active-hyrox'   : '';
      const btnD = exStatus === 'deload'  ? ' active-deload'  : '';
      const btnS = exStatus === 'skipped' ? ' active-skipped' : '';

      html += `<div class="ex-block">
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
        html += `<div class="ex-plan-txt">Plan : <strong>${plan} ${ex.unit}</strong>${planReps ? ` × <strong>${planReps} reps</strong>` : ''} <span class="ex-ref">${ex.refText}</span></div>`;

        const bk = bestKg(rec);
        if(bk != null || exStatus === 'skipped' || exStatus === 'deload') {
          const adj = calcAdj(ex, week);
          if(adj && adj.signals.length) {
            const cls = adj.type === 'ok' ? 'adj-ok'
              : adj.type.includes('ahead') ? 'adj-ahead'
              : (adj.type.includes('behind') && !adj.type.includes('slight')) ? 'adj-behind'
              : 'adj-slight';
            const sigHtml = adj.signals.map(s => {
              const ic  = s.type === 'good' ? '✓ ' : s.type === 'warn' ? '⚠ ' : s.type === 'danger' ? '✗ ' : '· ';
              const col = s.type === 'good' ? 'var(--green)' : s.type === 'warn' ? 'var(--amber)' : s.type === 'danger' ? 'var(--red)' : 'var(--text2)';
              return `<div style="display:flex;gap:6px;margin-bottom:2px"><span style="color:${col};font-weight:600;flex-shrink:0">${ic}</span><span>${esc(s.text)}</span></div>`;
            }).join('');
            html += `<div class="adj-box ${cls}" style="padding:8px 12px">${sigHtml}</div>`;
          }

          if(!adj?.skipped && !adj?.hyrox && !adj?.deload) {
            const nxt = getNextPlan(ex, week);
            if(nxt) {
              const planNext     = ex.plan[week];
              const planRepsNext = parseReps(ex.repScheme[week]) || planReps;
              const delta        = planNext ? Math.round((nxt.kg - planNext) * 10) / 10 : 0;
              const deltaStr     = delta > 0 ? `+${delta} vs plan` : delta < 0 ? `${delta} vs plan` : 'conforme au plan';
              const deltaCls     = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text2)';
              const rpeTarget    = adj?.avgRpe != null ? (adj.avgRpe > 8.5 ? '≤ 8' : adj.avgRpe < 7 ? '7.5–8.5' : '7–8') : '7–8';
              const outcomeClass = nxt.outcome === 'success' ? 'next-rec-success' : nxt.outcome === 'high_rpe' || nxt.outcome === 'partial' ? 'next-rec-hold' : 'next-rec-back';
              html += `<div class="next-rec-block ${outcomeClass}">
                <div class="rec-line">S${week + 1} recommandé : <strong>${nxt.kg} ${ex.unit}</strong> × <strong>${planRepsNext} reps</strong>
                  ${planNext ? `<span style="color:${deltaCls};font-size:11px;font-weight:500;margin-left:6px">(${deltaStr})</span>` : ''}
                </div>
                <div class="reason">${esc(nxt.rule)}</div>
                <div class="reason" style="margin-top:2px">RPE cible : <strong>${rpeTarget}</strong>${nxt.plateauCount > 0 ? ` · Plateau : ${nxt.plateauCount}/3 sem.` : ''}</div>
              </div>`;
            }
          }
        }

        // Sets grid
        if(exStatus !== 'skipped' && exStatus !== 'deload') {
          html += `<table class="sets-table">
            <thead><tr><th>Série</th><th>Charge (${ex.unit})</th><th>Reps</th><th>RPE</th><th></th></tr></thead><tbody>`;
          for(let s = 0; s < nSets; s++) {
            const sr  = rec?.sets?.[s] || {};
            const done = sr.kg && sr.reps ? '✓' : '';
            const doneCls = done ? 'color:var(--green)' : 'color:var(--border)';
            html += `<tr>
              <td class="set-num">S${s + 1}</td>
              <td><input class="set-inp" type="number" id="kg_${ex.id}_${s}" step="1.25" min="0" value="${sr.kg || ''}" placeholder="${plan}" data-ex="${ex.id}" data-idx="${s}" data-nsets="${nSets}"></td>
              <td><input class="set-inp reps-inp" type="number" id="reps_${ex.id}_${s}" min="0" max="30" step="1" value="${sr.reps || ''}" placeholder="${planReps || '—'}"></td>
              <td><select class="set-rpe" id="rpe_${ex.id}_${s}"><option value="">—</option>${_rpeOptions(sr.rpe)}</select></td>
              <td class="set-status" style="${doneCls}">${done}</td>
            </tr>`;
          }
          html += '</tbody></table>';
        }

        // Summary if data exists
        if(rec?.sets?.some(s => s?.kg)) {
          const done       = (rec.sets || []).filter(s => s?.reps);
          const avgRpe     = done.length ? Math.round(done.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / done.length * 10) / 10 : null;
          html += `<div class="sets-summary"><strong>${done.length}</strong> série${done.length > 1 ? 's' : ''} · ${avgRpe ? `RPE moy. <strong>${avgRpe}</strong> · ` : ''}Meilleure charge : <strong>${bestKg(rec)} ${ex.unit}</strong></div>`;
        }
      } else {
        html += `<div class="ex-plan-txt ex-ref">${scheme}</div>`;
      }
      html += '</div>'; // ex-block
    });

    html += `</div></div><!-- day-card end -->
      <div class="save-row">
        <button class="save-btn" data-day="${day}" data-week="${week}">Enregistrer ${day}</button>
        <span class="save-ok" id="ok_${day}">&#x2713; Enregistré</span>
      </div>`;
  });

  document.getElementById('saisieContent').innerHTML = html;
  _bindSaisieEvents(week);
}

function _rpeOptions(selected) {
  return [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]
    .map(r => `<option value="${r}"${String(selected) === String(r) ? ' selected' : ''}>${r}</option>`)
    .join('');
}

function _bindSaisieEvents(week) {
  // Status buttons (event delegation)
  document.getElementById('saisieContent').addEventListener('click', e => {
    const btn = e.target.closest('[data-status]');
    if(!btn) return;
    const { ex, status } = btn.dataset;
    setExStatus(ex, week, status);
    renderSaisie();
  }, { once: true });

  // Auto-fill charge from S1
  document.getElementById('saisieContent').addEventListener('input', e => {
    const inp = e.target.closest('.set-inp[data-idx="0"]');
    if(!inp) return;
    const { ex, nsets } = inp.dataset;
    const n = parseInt(nsets, 10);
    for(let i = 1; i < n; i++) {
      const el = document.getElementById(`kg_${ex}_${i}`);
      if(el && !el.value) el.value = inp.value;
    }
  });

  // Save buttons
  document.getElementById('saisieContent').addEventListener('click', e => {
    const btn = e.target.closest('.save-btn');
    if(!btn) return;
    saveSaisie(parseInt(btn.dataset.week, 10), btn.dataset.day);
  });
}

export function saveSaisie(week, day) {
  const exs = EXERCISES.filter(e => e.day === day);
  exs.forEach(ex => {
    const scheme = ex.repScheme[week - 1];
    const nSets  = parseSets(scheme) || 3;
    const sets   = [];
    let anyData  = false;

    for(let s = 0; s < nSets; s++) {
      const kgEl   = document.getElementById(`kg_${ex.id}_${s}`);
      const repsEl = document.getElementById(`reps_${ex.id}_${s}`);
      const rpeEl  = document.getElementById(`rpe_${ex.id}_${s}`);
      const kg     = kgEl?.value  ? parseFloat(kgEl.value)    : null;
      const reps   = repsEl?.value ? parseInt(repsEl.value, 10) : null;
      const rpe    = rpeEl?.value  || '';
      sets.push({ kg, reps, rpe });
      if(kg || reps) anyData = true;
    }

    if(!anyData) return;

    const bk           = Math.max(...sets.map(s => s.kg || 0).filter(v => v > 0)) || null;
    const filledRpe    = sets.find(s => s.rpe);
    const sessionStatus = getExStatus(ex.id, week);

    setRecord(ex.id, week, {
      sets, kg: bk, rpe: filledRpe ? filledRpe.rpe : '', ts: Date.now(), sessionStatus,
    });
  });

  const ok = document.getElementById(`ok_${day}`);
  if(ok) { ok.style.display = 'inline'; setTimeout(() => ok.style.display = 'none', 2200); }

  renderSaisie();
  repaintMuscles();
}

// ── Progression ────────────────────────────────────────────────────────────

export function renderProgression() {
  let html = '<div class="prog-grid">';
  EXERCISES.forEach(ex => {
    let best = null, lastW = null;
    for(let w = 1; w <= 17; w++) {
      const bk = bestKg(normRecord(getRecord(ex.id, w)));
      if(bk) { if(!best || bk > best) best = bk; lastW = w; }
    }
    const maxPlan = Math.max(...ex.plan.filter(Boolean));
    const pct = best ? Math.min(100, Math.round(best / maxPlan * 100)) : 0;
    html += `<div class="prog-card">
      <div class="prog-card-name">${ex.name}</div>
      <div class="prog-card-day">${ex.day} — ${ex.refText}</div>
      <div class="prog-current">${best ? `${best} ${ex.unit}` : '—'}</div>
      <div class="prog-pct">${pct}% de l'objectif</div>
      <div class="prog-bar-wrap"><div class="prog-bar" style="width:${pct}%;background:${ex.color}"></div></div>
      <div class="prog-nums"><span>0</span><span>${maxPlan} ${ex.unit}</span></div>
      <div class="prog-last">${lastW ? `Dernière saisie : S${lastW}` : 'Aucune donnée'}</div>
    </div>`;
  });
  html += '</div>';
  document.getElementById('progressionContent').innerHTML = html;
}

// ── Historique ─────────────────────────────────────────────────────────────

export function renderHistorique() {
  let html = '';
  let hasData = false;

  EXERCISES.forEach(ex => {
    const rows = [];
    for(let w = 1; w <= 17; w++) {
      const r = normRecord(getRecord(ex.id, w));
      if(!r) continue;
      const bk   = bestKg(r);
      if(!bk) continue;
      const plan = ex.plan[w - 1];
      const delta = plan ? Math.round((bk - plan) * 10) / 10 : null;
      const done  = (r.sets || []).filter(s => s?.reps);
      const avgRpe  = done.length ? Math.round(done.reduce((a, s) => a + (parseFloat(s.rpe) || 0), 0) / done.length * 10) / 10 : null;
      const avgReps = done.length ? Math.round(done.reduce((a, s) => a + (s.reps || 0), 0) / done.length * 10) / 10 : null;
      rows.push({ w, bk, plan, delta, sets: r.sets || [], done, avgRpe, avgReps, ts: r.ts });
    }

    if(!rows.length) return;
    hasData = true;

    html += `<div class="hist-block"><div class="hist-title">${ex.name} — ${ex.day}</div>
      <table><thead><tr><th>Sem.</th><th>Charge</th><th>Plan</th><th>Δkg</th><th>Reps/s</th><th>RPE</th><th>Séries</th><th>Signal</th><th>S+1</th></tr></thead><tbody>`;

    rows.forEach(r => {
      const dc = r.delta === null ? 'delta-neu' : r.delta > 0 ? 'delta-pos' : r.delta < 0 ? 'delta-neg' : 'delta-neu';
      const dt = r.delta === null ? '—' : r.delta > 0 ? `+${r.delta}` : r.delta === 0 ? '±0' : `${r.delta}`;

      const adj    = calcAdj(ex, r.w);
      const topSig = adj?.signals?.length ? (adj.signals.find(s => s.type === 'danger') || adj.signals.find(s => s.type === 'warn') || adj.signals[0]) : null;
      const sigCol = topSig ? (topSig.type === 'good' ? 'var(--green)' : topSig.type === 'warn' ? 'var(--amber)' : topSig.type === 'danger' ? 'var(--red)' : 'var(--text3)') : 'var(--text3)';

      const nxt      = getNextPlan(ex, r.w);
      const setsStr  = r.sets.filter(s => s?.kg).map(s => `${esc(String(s.reps || '?'))}×${esc(String(s.kg))}`).join(' | ') || '—';

      html += `<tr>
        <td>S${r.w}</td>
        <td><strong>${r.bk}</strong> ${ex.unit}</td>
        <td>${r.plan || '—'}</td>
        <td class="${dc}">${dt}</td>
        <td style="font-family:var(--mono);font-size:11px;text-align:center">${r.avgReps || '—'}</td>
        <td style="font-family:var(--mono);font-size:11px;text-align:center">${r.avgRpe || '—'}</td>
        <td style="font-size:10px;color:var(--text2)">${setsStr}</td>
        <td style="font-size:11px;color:${sigCol}">${topSig ? esc(topSig.text) : '—'}</td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--blue)">${nxt ? `${nxt.kg} ${ex.unit}` : '—'}</td>
      </tr>`;
    });

    html += '</tbody></table></div>';
  });

  if(!hasData) html = '<div class="empty">Aucune donnée saisie.</div>';
  else html += `<button class="reset-btn" id="resetDataBtn">Effacer toutes les données</button>`;

  document.getElementById('historiqueContent').innerHTML = html;

  document.getElementById('resetDataBtn')?.addEventListener('click', () => {
    if(confirm('Effacer toutes les données ?')) {
      import('./db.js').then(({ dbClear }) => {
        dbClear().then(() => { renderHistorique(); renderProgression(); });
      });
    }
  });
}
