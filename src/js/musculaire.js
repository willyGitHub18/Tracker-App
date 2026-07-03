/**
 * musculaire.js — Muscle fatigue tracking & SVG body painting
 */

import { EXERCISES, MUSCLE_LABELS, RECOVERY_HALFLIFE, MUSCLE_MAP, MUSCLE_THRESH } from './data.js';
import { getRecord, getExStatus, normRecord } from './store.js';
import { getAllActivePrograms, getProgRecord } from './programs.js';

let _currentLoad      = {};
let _selectedMuscleId = null;
let _currentBodyView  = 'front';

// Échelle de charge cardio : convertit (durée min × RPE/10) en unités de volume
// comparables aux séries de force. ~0.2 → une sortie facile compte modérément,
// une séance d'intervalles dure compte davantage, sans écraser la carte musculaire.
const CARDIO_LOAD_SCALE = 0.2;

// ── Load calculation ────────────────────────────────────────────────────────

/**
 * Compute residual muscle load across all sessions using SRA decay:
 *   load = Σ (reps × RPE/10 × factor) × 2^(-Δt / halflife)
 */
export function calcGlobalMuscleLoad() {
  const now  = Date.now();
  const load = {};
  Object.keys(MUSCLE_LABELS).forEach(m => { load[m] = 0; });

  const activeProgs = getAllActivePrograms();

  // Toujours inclure les programmes générés actifs
  if(activeProgs.length > 0) {
    // Un enregistrement est clé par exId_week (sans jour) : si un exercice figure
    // sur plusieurs jours d'une même semaine, ne le compter qu'une fois.
    const counted = new Set();
    activeProgs.forEach(prog => {
      prog.semaines?.forEach((sem, wi) => {
        sem.jours?.forEach(day => {
          day.exercices?.forEach(ex => {
            const dedupKey = `${prog.id}|${ex.id}|${wi + 1}`;
            if(counted.has(dedupKey)) return;
            counted.add(dedupKey);
            const raw = getProgRecord(prog.id, ex.id, wi + 1);
            const ts = raw?.ts || 0;
            if(!ts) return;
            const hoursAgo = (now - ts) / 3_600_000;
            const factors = MUSCLE_MAP[ex.id] || _buildFactors(ex.muscles || []);

            // Cardio : charge = durée × (RPE/10) × échelle (pas de séries kg/reps).
            if(raw.cardio || ex.kind === 'cardio') {
              const dur = raw.durationMin || 0;
              if(!dur) return;
              const rpe = parseFloat(raw.rpe) || 4;
              const vol = dur * (rpe / 10) * CARDIO_LOAD_SCALE;
              Object.entries(factors).forEach(([mid, factor]) => {
                const hl = RECOVERY_HALFLIFE[mid] || 48;
                load[mid] = (load[mid] || 0) + vol * factor * Math.pow(2, -hoursAgo / hl);
              });
              return;
            }

            const rec = normRecord(raw);
            if(!rec?.sets) return;
            rec.sets.forEach(s => {
              if(!s?.kg || !s?.reps) return;
              const rpe = parseFloat(s.rpe) || 7;
              const vol = s.reps * (rpe / 10);
              Object.entries(factors).forEach(([mid, factor]) => {
                const hl = RECOVERY_HALFLIFE[mid] || 48;
                load[mid] = (load[mid] || 0) + vol * factor * Math.pow(2, -hoursAgo / hl);
              });
            });
          });
        });
      });
    });
  }

  // Toujours inclure les données ATHX legacy (pas mutuellement exclusif)
  {
    EXERCISES.filter(e => ['press','squat','deadlift'].includes(e.id)).forEach(ex => {
      const factors = MUSCLE_MAP[ex.id];
      if(!factors) return;
      for(let w = 1; w <= 17; w++) {
        const rec = normRecord(getRecord(ex.id, w));
        if(!rec?.sets) continue;
        const ts = rec.ts || 0;
        if(!ts) continue;
        const hoursAgo = (now - ts) / 3_600_000;
        rec.sets.forEach(s => {
          if(!s?.kg || !s?.reps) return;
          const rpe = parseFloat(s.rpe) || 7;
          const vol = s.reps * (rpe / 10);
          Object.entries(factors).forEach(([mid, factor]) => {
            const hl = RECOVERY_HALFLIFE[mid] || 48;
            load[mid] = (load[mid] || 0) + vol * factor * Math.pow(2, -hoursAgo / hl);
          });
        });
      }
    });
  }
  return load;
}

// Build muscle factors from a flat muscles array (for wizard-generated exercises)
function _buildFactors(muscles) {
  const factors = {};
  muscles.forEach((mid, i) => {
    factors[mid] = i === 0 ? 1.0 : i === 1 ? 0.6 : 0.3;
  });
  return factors;
}

export function calcRawContribsByMuscle() {
  const contrib = {};
  Object.keys(MUSCLE_LABELS).forEach(m => { contrib[m] = []; });

  EXERCISES.filter(e => ['press','squat','deadlift'].includes(e.id)).forEach(ex => {
    const factors = MUSCLE_MAP[ex.id];
    if(!factors) return;
    let totalRaw = 0;

    for(let w = 1; w <= 17; w++) {
      const rec = normRecord(getRecord(ex.id, w));
      if(!rec?.sets) continue;
      rec.sets.forEach(s => {
        if(s?.kg && s?.reps) {
          const rpe = parseFloat(s.rpe) || 7;
          totalRaw += s.reps * (rpe / 10);
        }
      });
    }
    if(!totalRaw) return;

    Object.entries(factors).forEach(([mid, factor]) => {
      if(factor >= 0.2) contrib[mid].push({ name: ex.name, factor, raw: Math.round(totalRaw * factor * 10) / 10 });
    });
  });
  return contrib;
}

// ── Colour helpers ──────────────────────────────────────────────────────────

export function musclePercent(mid, load) {
  const thresh = MUSCLE_THRESH[mid] || 15;
  return Math.min(130, Math.round((load[mid] || 0) / thresh * 100));
}

function muscleColor(mid, load) {
  const thresh = MUSCLE_THRESH[mid] || 15;
  const raw    = load[mid] || 0;
  if(raw < 0.001) return '#d8d3cc';
  const pct = raw / thresh;
  if(pct < 0.4)  return _lerp('#d8d3cc', '#52b888', pct / 0.4);
  if(pct < 0.75) return _lerp('#52b888', '#f09820', (pct - 0.4) / 0.35);
  if(pct < 1.0)  return _lerp('#f09820', '#d4530a', (pct - 0.75) / 0.25);
  return _lerp('#c0392b', '#7b0000', Math.min((pct - 1.0) / 0.3, 1));
}

function _lerp(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1,3),16), g1 = parseInt(hex1.slice(3,5),16), b1 = parseInt(hex1.slice(5,7),16);
  const r2 = parseInt(hex2.slice(1,3),16), g2 = parseInt(hex2.slice(3,5),16), b2 = parseInt(hex2.slice(5,7),16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2,'0')).join('');
}

function _darken(hex, amount) {
  if(!hex || hex.length < 7) return '#c8c4bc';
  const r = Math.max(0, parseInt(hex.slice(1,3),16) - Math.round(255 * amount));
  const g = Math.max(0, parseInt(hex.slice(3,5),16) - Math.round(255 * amount));
  const b = Math.max(0, parseInt(hex.slice(5,7),16) - Math.round(255 * amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2,'0')).join('');
}

// ── SVG painting ─────────────────────────────────────────────────────────────

export function paintAllViews(load) {
  _currentLoad = load;
  document.querySelectorAll('polygon.fm-group').forEach(p => {
    const mid = p.getAttribute('data-muscle');
    if(!mid) return;
    const color      = muscleColor(mid, load);
    const pct        = musclePercent(mid, load);
    const label      = MUSCLE_LABELS[mid] || mid;
    const isSelected = mid === _selectedMuscleId;

    p.setAttribute('fill',         color);
    p.setAttribute('stroke',       isSelected ? '#1a1a18' : _darken(color, 0.18));
    p.setAttribute('stroke-width', isSelected ? '1' : '0.4');
    p.style.opacity = _selectedMuscleId && !isSelected ? '0.72' : '1';

    // Native SVG tooltip
    let title = p.querySelector('title');
    if(!title) { title = document.createElementNS('http://www.w3.org/2000/svg','title'); p.appendChild(title); }
    title.textContent = `${label} — ${pct > 0 ? pct + '% charge résiduelle' : 'Au repos'}`;
  });
}

/** Called from outside to repaint after a save/import */
export function repaintMuscles() {
  const load = calcGlobalMuscleLoad();
  paintAllViews(load);
  renderMusculaireSummary(load);
}

// ── Interaction ─────────────────────────────────────────────────────────────

export function initBodyDelegation() {
  ['svg-front','svg-back'].forEach(id => {
    const svg = document.getElementById(id);
    if(!svg) return;
    svg.addEventListener('click', e => {
      const poly = e.target.closest('polygon.fm-group');
      if(!poly) return;
      const mid = poly.getAttribute('data-muscle');
      if(!mid || !/^[a-zA-Z]+$/.test(mid)) return;
      _selectedMuscleId = mid;
      paintAllViews(_currentLoad);
      renderMuscleDetail(mid, _currentLoad);
    });
  });
}

export function switchBodyView(view) {
  _currentBodyView = view;
  document.getElementById('btnFront').classList.toggle('active', view === 'front');
  document.getElementById('btnBack').classList.toggle('active',  view === 'back');
  document.getElementById('body-front').classList.toggle('active-view', view === 'front');
  document.getElementById('body-back').classList.toggle('active-view',  view === 'back');
  paintAllViews(_currentLoad);
}

// ── Render ──────────────────────────────────────────────────────────────────

export function renderMusculaire() {
  const load = calcGlobalMuscleLoad();
  paintAllViews(load);
  renderMusculaireSummary(load);
  if(_selectedMuscleId) renderMuscleDetail(_selectedMuscleId, load);
}

export function renderMuscleDetail(mid, load) {
  const label    = MUSCLE_LABELS[mid] || mid;
  const pct      = musclePercent(mid, load);
  const hl       = RECOVERY_HALFLIFE[mid] || 48;
  const residual = load[mid] || 0;
  const thresh   = MUSCLE_THRESH[mid] || 15;
  const barColor = muscleColor(mid, load);

  let recoverMsg = '';
  if(residual > 0) {
    const target = thresh * 0.05;
    const hours  = residual > target ? Math.round(hl * Math.log2(residual / target)) : 0;
    if(hours > 0) {
      const d = Math.floor(hours / 24);
      const h = hours % 24;
      recoverMsg = `Récup. estimée : ${d > 0 ? d + 'j ' : ''}${h > 0 ? h + 'h' : ''}`;
    } else {
      recoverMsg = 'Récupéré';
    }
  }

  let alertHtml;
  if(pct === 0 || residual < thresh * 0.05) {
    alertHtml = '<div class="musc-alert ok">Muscle récupéré — prêt pour une nouvelle stimulation.</div>';
  } else if(pct >= 100) {
    alertHtml = '<div class="musc-alert danger">Charge résiduelle élevée. Évite de sur-solliciter ce muscle.</div>';
  } else if(pct >= 75) {
    alertHtml = '<div class="musc-alert warn">Fatigue encore présente. Priorité récupération.</div>';
  } else {
    alertHtml = '<div class="musc-alert ok">Dans la fenêtre de surcompensation — bon moment pour restimuler.</div>';
  }

  const contribs = (calcRawContribsByMuscle()[mid] || []).sort((a, b) => b.raw - a.raw);
  const roleLabel = { 1.0: 'Primaire', 0.8: 'Primaire', 0.6: 'Secondaire', 0.4: 'Secondaire', 0.35: 'Secondaire', 0.3: 'Secondaire', 0.2: 'Secondaire', 0.15: 'Stabilisateur' };
  const roleBg    = f => f >= 0.5 ? '#e8f0fc' : f >= 0.25 ? '#fdf0d8' : '#f1efe8';
  const roleClr   = f => f >= 0.5 ? '#1a5fb4' : f >= 0.25 ? '#7c4a00' : '#444441';

  const exRows = contribs.map(c =>
    `<div class="musc-ex-row">
      <span class="musc-ex-name">${c.name}</span>
      <span class="musc-ex-role" style="background:${roleBg(c.factor)};color:${roleClr(c.factor)}">${roleLabel[c.factor] || 'Secondaire'}</span>
      <span class="musc-ex-vol">${c.raw} vol.</span>
    </div>`
  ).join('');

  document.getElementById('muscDetailPanel').innerHTML =
    `<div class="musc-detail">
      <div class="musc-detail-title">${label}</div>
      <div class="musc-bar-row">
        <span class="musc-bar-label">Charge résiduelle</span>
        <div class="musc-bar-track"><div class="musc-bar-fill" style="width:${Math.min(pct,100)}%;background:${barColor}"></div></div>
        <span class="musc-bar-val">${pct}%</span>
      </div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px">Demi-vie : <strong>${hl}h</strong>${recoverMsg ? ' · ' + recoverMsg : ''}</div>
      ${alertHtml}
      ${exRows ? `<div class="musc-ex-label">Exercices contributeurs</div>${exRows}` : ''}
    </div>`;
}

export function renderMusculaireSummary(load) {
  const entries = Object.keys(MUSCLE_LABELS)
    .map(mid => ({ mid, label: MUSCLE_LABELS[mid], pct: musclePercent(mid, load) }))
    .filter(e => e.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const fatigued   = entries.filter(e => e.pct >= 75);
  const recovering = entries.filter(e => e.pct > 0 && e.pct < 75);

  let html = '<div class="musc-summary"><div class="musc-summary-title">Bilan global</div>';

  if(!entries.length) {
    html += '<div class="empty" style="padding:16px 0">Saisis tes séances dans le Tracker.</div>';
  } else {
    if(fatigued.length) {
      html += '<div class="musc-group-label musc-group-red">En fatigue</div>';
      fatigued.forEach(e => {
        const col = e.pct >= 100 ? 'var(--red)' : 'var(--amber)';
        html += _summaryRow(e, col);
      });
    }
    if(recovering.length) {
      html += '<div class="musc-group-label musc-group-green" style="margin-top:10px">En récupération</div>';
      recovering.forEach(e => html += _summaryRow(e, '#52b888'));
    }
  }
  html += '</div>';
  document.getElementById('muscSummaryPanel').innerHTML = html;
}

function _summaryRow(e, col) {
  return `<div class="musc-ex-row" style="cursor:pointer" onclick="window._selectMuscle('${e.mid}')">
    <span class="musc-ex-name">${e.label}</span>
    <div class="musc-bar-track" style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;margin:0 6px">
      <div style="height:6px;border-radius:3px;background:${col};width:${Math.min(e.pct,100)}%"></div>
    </div>
    <span class="musc-ex-vol" style="color:${col}">${e.pct}%</span>
  </div>`;
}

// Expose for inline onclick in summary (can't use module import there)
window._selectMuscle = (mid) => {
  _selectedMuscleId = mid;
  paintAllViews(_currentLoad);
  renderMuscleDetail(mid, _currentLoad);
};
