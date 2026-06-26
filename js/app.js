/**
 * app.js — Entry point
 * Handles routing, PWA, ATHX migration, and program lifecycle.
 */

import { dbInit, dbGet, dbSet, dbClear } from './db.js';
import { initWeekSel, renderSaisie, renderProgression, renderHistorique, setCurrentProgram, getCurrentProgram } from './tracker.js';
import { renderMusculaire, initBodyDelegation, repaintMuscles, switchBodyView } from './musculaire.js';
import { exportJSON, exportCSV, importJSON } from './io.js';
import { initWizard, renderStep, wizNext, wizBack, wizGenerate, wizSearchEx } from './wizard.js';
import { getPrograms, getActivePrograms, getArchivedPrograms, getProgram,
         getActiveProgram, getAllActivePrograms, getActiveProgramId,
         setActiveProgram, addActiveProgram, removeActiveProgram, setPrimaryProgram,
         deleteProgram, closeProgram, newProgramId, saveProgram,
         exportProgramJSON, exportAllPrograms, importAllPrograms } from './programs.js';
import { buildAthxProgram } from './data.js';
import { setVacances, clearAllVacances, addVacances, removeVacances } from './store.js';

// ── Routing ───────────────────────────────────────────────────────────────────

const SECTIONS   = ['tracker','musculaire','programme','programmes','doc'];
const TRACK_TABS = ['saisie','progression','historique'];
const PROG_TABS  = ['nutrition','warmup','mardi','mercredi','jeudi','vendredi','vacances'];
const DOC_TABS   = ['doc-intro','doc-tracker','doc-progression','doc-statut','doc-musculaire','doc-rpe','doc-export','doc-grossesse'];

export function showSection(id) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const idx = SECTIONS.indexOf(id);
  if(idx >= 0) document.querySelectorAll('.top-nav-btn')[idx]?.classList.add('active');
  if(id === 'musculaire')  renderMusculaire();
  if(id === 'programmes')  renderPrograms();
  if(id === 'programme') {
    // Redirect to Programmes tab — Programme tab is hidden
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('programmes')?.classList.add('active');
    const idx = SECTIONS.indexOf('programmes');
    if(idx >= 0) document.querySelectorAll('.top-nav-btn')[idx]?.classList.add('active');
    renderPrograms();
    return;
  }
}

export function showTracker(id) {
  document.querySelectorAll('.tracker-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`t-${id}`)?.classList.add('active');
  const idx = TRACK_TABS.indexOf(id);
  if(idx >= 0) document.querySelectorAll('.tab-btn')[idx]?.classList.add('active');
  if(id === 'progression') renderProgression();
  if(id === 'historique')  renderHistorique();
}

export function showProg(id) {
  document.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#progNav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const idx = PROG_TABS.indexOf(id);
  if(idx >= 0) document.querySelectorAll('#progNav button')[idx]?.classList.add('active');
}

export function showWeek(day, bloc) {
  ['b1','b1d','b2','b2d','b3','b3d'].forEach(b => {
    const el = document.getElementById(`${day}-${b}`);
    if(el) el.style.display = 'none';
  });
  const el = document.getElementById(`${day}-${bloc}`);
  if(el) el.style.display = 'block';
  const nav = document.getElementById(`${day}Weeks`);
  if(nav) ['b1','b1d','b2','b2d','b3','b3d'].forEach((b,i) =>
    nav.querySelectorAll('button')[i]?.classList.toggle('active', b === bloc)
  );
}

export function showDoc(id) {
  document.querySelectorAll('.doc-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.doc-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const idx = DOC_TABS.indexOf(id);
  if(idx >= 0) document.querySelectorAll('.doc-nav-item')[idx]?.classList.add('active');
}

// ── Window exposures ──────────────────────────────────────────────────────────

window.showSection   = showSection;
window._dbClear      = dbClear;
window.showTracker   = showTracker;
window.showProg      = showProg;
window.showWeek      = showWeek;
window.showDoc       = showDoc;
window.exportJSON    = exportJSON;
window.exportCSV     = exportCSV;
window.importJSON    = importJSON;
window.switchBodyView = switchBodyView;

// Wizard
window.wizNext     = wizNext;
window.wizBack     = wizBack;
window.wizGenerate = wizGenerate;
window.wizSearchEx = wizSearchEx;

// Programs
window.showWizard = function() {
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('wizard-view')?.classList.add('active-view');
  initWizard();
};

window.showProgramsList = function() {
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('programs-list-view')?.classList.add('active-view');
  _renderProgramsList();
};

window.showActiveProgram = function(weekNum) {
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('program-active-view')?.classList.add('active-view');
  renderActiveProgramDetail(weekNum || 1);
};

window.showArchivedPrograms = function() {
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('programs-list-view')?.classList.add('active-view');
  _renderProgramsList(true);
};

window.activateProgram = function(id) {
  addActiveProgram(id);
  setCurrentProgram(id);
  window.showActiveProgram(1);
};

window.setPrimaryProg = function(id) {
  setPrimaryProgram(id);
  setCurrentProgram(id);
  renderPrograms();
  initWeekSel();
  renderSaisie();
};

window.closeProg = function(id, reason) {
  const label = reason === 'completed' ? 'terminé' : 'abandonné';
  if(confirm(`Marquer ce programme comme ${label} ? Les données seront archivées.`)) {
    closeProgram(id, reason);
    // Switch to another active program if available
    const remaining = getAllActivePrograms().filter(p => p.id !== id);
    if(remaining.length) setCurrentProgram(remaining[0].id);
    initWeekSel();
    renderSaisie();
    renderPrograms();
  }
};

window.deleteProg = function(id) {
  if(confirm('Supprimer définitivement ce programme et toutes ses données ?')) {
    deleteProgram(id);
    renderPrograms();
  }
};

window.exportProgJSON = function(id) {
  const data = exportProgramJSON(id);
  if(!data) return;
  const prog = getProgram(id);
  const name = (prog?.name || 'programme').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'}));
  a.download = `athx_${name}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

window.renderPrograms  = renderPrograms;
window.renderActiveProgramDetail = renderActiveProgramDetail;

// Vacances
window._saveVacances = function() {
  const d = document.getElementById('vacDebut')?.value;
  const f = document.getElementById('vacFin')?.value;
  const a = document.getElementById('vacActivite')?.value || 'sedentaire';
  if(d && f && new Date(f) >= new Date(d)) { addVacances(d,f,a); renderSaisie(); }
  else alert('Dates invalides.');
};
window._removeVacances = function(idx) { removeVacances(idx); renderSaisie(); };
window._clearVacances  = function() { if(confirm('Effacer toutes les périodes ?')){ clearAllVacances(); renderSaisie(); } };

// Program switcher (from tracker selector)
window._switchProgram = function(id) { setCurrentProgram(id); };

// Open program card — navigate to Programme tab showing this program
window._openProgCard = function(e, id, status) {
  if(e.target.closest('.prog-card-actions')) return; // let button handle it
  window._viewProg(id);
};

window._viewProg = function(id) {
  const prog = getProgram(id);
  if(!prog) return;

  // Show programme detail inside Programmes tab (not Programme tab)
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  const detailView = document.getElementById('program-detail-view');
  if(detailView) {
    detailView.classList.add('active-view');
    _renderProgDetailView(prog, detailView);
  } else {
    // Fallback: show in active program view
    showActiveProgram(1);
  }
};

function _renderProgDetailView(prog, container) {
  if(!prog || !container) return;

  const DOMAINES_LABELS = { hyrox:'🏟 Hyrox', force:'🏋 Force', gym:'💪 Gym', cardio:'🏃 Cardio', mobilite:'🧘 Mobilité', mixte:'⚡ Mixte', grossesse:'🤰 Grossesse' };

  // For ATHX fixed program — inject the full programme.html content
  if(prog.migratedFrom === 'athx_legacy' || prog.subtype === 'fixed') {
    const athxContent = document.getElementById('programme')?.innerHTML || '';
    container.innerHTML = `
      <div class="wiz-header">
        <div class="wiz-header-top">
          <div>
            <div class="wiz-header-title">${esc(prog.name)}</div>
            <div class="wiz-header-sub">Programme compétition · 17 semaines</div>
          </div>
          <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
        </div>
      </div>
      <div>${athxContent}</div>`;
    return;
  }

  // Grossesse
  if(prog.subtype === 'grossesse') {
    container.innerHTML = `
      <div class="wiz-header">
        <div class="wiz-header-top">
          <div class="wiz-header-title">${esc(prog.name)}</div>
          <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
        </div>
      </div>`;
    const inner = document.createElement('div');
    container.appendChild(inner);
    renderGrossesseProgram(prog, 1, inner);
    return;
  }

  // Generated programs — week-by-week schedule
  const phasesHtml = prog.phases?.map(p =>
    `<div class="prog-phase-row">
      <span class="prog-phase-name">${esc(p.nom)}</span>
      <span class="prog-phase-weeks">S${p.debut}–S${p.fin}</span>
      <span class="prog-phase-int">${Math.round(p.intensite*100)}%</span>
    </div>`
  ).join('') || '';

  const weekNav = prog.semaines?.map((w,i) => {
    const cls = ['prog-week-btn', w.isDeload?'deload':'', w.isTaper?'taper':''].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="window._showDetailWeek(${i+1})">${'S'+(i+1)}</button>`;
  }).join('') || '';

  container.innerHTML = `
    <div class="wiz-header">
      <div class="wiz-header-top">
        <div>
          <div class="wiz-header-title">${esc(prog.name)}</div>
          <div class="wiz-header-sub">${DOMAINES_LABELS[prog.config?.domaine]||''} · ${prog.totalWeeks} semaines · ${prog.config?.seancesParSemaine||'?'}×/sem</div>
        </div>
        <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
      </div>
    </div>
    ${phasesHtml ? `<div class="prog-phases-summary">${phasesHtml}</div>` : ''}
    <div class="prog-week-nav" id="detailWeekNav">${weekNav}</div>
    <div id="detailWeekContent"></div>`;

  window._showDetailWeek = function(weekNum) {
    const week = prog.semaines?.[weekNum-1];
    if(!week) return;
    document.querySelectorAll('#detailWeekNav .prog-week-btn').forEach((b,i) =>
      b.classList.toggle('active', i+1===weekNum)
    );
    const phaseColors = { 'Base':'#e8f0fc','Construction':'#fdf0d8','Intensité':'#fdeaea','Pic':'#e0f4eb','Taper':'#f1efe8','Deload':'#e8e6e0','Bloc 1 — Base':'#e8f0fc','Bloc 2 — Intensité':'#fdf0d8','Bloc 3 — Simulation':'#e0f4eb' };
    const phaseTextColors = { 'Base':'#1a5fb4','Construction':'#7c4a00','Intensité':'#9c2222','Pic':'#1b6b45','Taper':'#444441','Deload':'#444441','Bloc 1 — Base':'#1a5fb4','Bloc 2 — Intensité':'#7c4a00','Bloc 3 — Simulation':'#1b6b45' };
    const bg  = phaseColors[week.phase]  || 'var(--surface2)';
    const col = phaseTextColors[week.phase] || 'var(--text2)';
    const daysHtml = week.jours?.map(day => `
      <div class="prog-day-card">
        <div class="prog-day-header">
          <span class="prog-day-name">${day.nom}</span>
          <span class="prog-day-split">${day.split&&day.split!==day.nom?esc(day.split):''}</span>
        </div>
        <div class="prog-ex-list">
          ${(day.exercices||[]).map(ex => `
            <div class="prog-ex-item">
              <span class="prog-ex-item-name">${esc(ex.nom||ex.name||ex.id)}</span>
              <span class="prog-ex-item-scheme">${ex.series?ex.series+'×':'' }${ex.reps||ex.scheme||'?'}</span>
              ${ex.kgPlan?`<span class="prog-ex-item-kg">${ex.kgPlan} kg</span>`:ex.pct1rm?`<span class="prog-ex-item-kg">${ex.pct1rm}% 1RM</span>`:''}
            </div>`).join('')}
        </div>
      </div>`).join('');
    document.getElementById('detailWeekContent').innerHTML = `
      <span class="prog-phase-badge" style="background:${bg};color:${col}">
        ${week.isDeload?'🔵 Deload · ':week.isTaper?'📉 Taper · `':`${week.phase}`}
      </span>
      <div class="prog-rpe-target">RPE cible : ${week.rpeTarget} · ${Math.round(week.intensite*100)}%</div>
      ${daysHtml}`;
  };
  window._showDetailWeek(1);
}
window._markGrossesseDone = function(progId, exId, week, done) {
  const { setProgRecord, getProgRecord } = window._programs_mod || {};
  // Direct import not possible here — use global programs tracking via dbSet
  const all = window._db?.dbGet('programs_tracking') || {};
  if(!all[progId]) all[progId] = {};
  all[progId][`${exId}_w${week}`] = { done, ts: Date.now() };
  window._db?.dbSet('programs_tracking', all);
};

window._setMoisGrossesse = function(m) {
  // Update wizard config mois_grossesse and re-render step
  if(typeof _config !== 'undefined') { _config.mois_grossesse = m; }
  // Re-render via wizard renderStep
  if(typeof renderStep === 'function') renderStep();
};

// ── Programs rendering ────────────────────────────────────────────────────────

// Programme tab = active program full schedule view
function _showProgrammeTab() {
  const active = getActiveProgram();
  // If an ATHX/fixed program is active, show its HTML schedule
  // Otherwise show a redirect message to Programmes tab
  if(!active) {
    const el = document.getElementById('programme');
    if(el) el.innerHTML = `<div style="padding:32px 16px;text-align:center;color:var(--text3)">
      <div style="font-size:32px;margin-bottom:12px">📋</div>
      <div style="font-size:14px;font-weight:500;margin-bottom:8px">Aucun programme actif</div>
      <div style="font-size:12px;margin-bottom:16px">Crée ou active un programme dans l'onglet Programmes</div>
      <button class="wiz-btn-next" onclick="showSection('programmes')">Aller dans Programmes →</button>
    </div>`;
  }
  // If active program is ATHX (fixed/subtype), keep existing HTML view
  // For generated programs, show week-by-week schedule
  if(active && active.subtype !== 'fixed') {
    _renderProgrammeSchedule(active);
  }
  // For ATHX fixed program, the existing programme.html content is shown as-is
}

function _renderProgrammeSchedule(prog) {
  const el = document.getElementById('programme');
  if(!el || !prog) return;

  const DOMAINES_LABELS = { hyrox:'🏟 Hyrox', force:'🏋 Force', gym:'💪 Gym', cardio:'🏃 Cardio', mobilite:'🧘 Mobilité', mixte:'⚡ Mixte', grossesse:'🤰 Grossesse' };

  // Phase summary
  const phasesHtml = prog.phases?.map(p =>
    `<div class="prog-phase-row">
      <span class="prog-phase-name">${p.nom}</span>
      <span class="prog-phase-weeks">S${p.debut}–S${p.fin}</span>
      <span class="prog-phase-int">${Math.round(p.intensite*100)}%</span>
    </div>`
  ).join('') || '';

  // Week navigation
  const weekNav = prog.semaines?.map((w,i) => {
    const cls = ['prog-week-btn', w.isDeload?'deload':'', w.isTaper?'taper':''].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="window._showProgWeek(${i+1})">${'S'+(i+1)}</button>`;
  }).join('') || '';

  el.innerHTML = `
    <div class="prog-schedule-header">
      <div class="prog-schedule-title">${esc(prog.name)}</div>
      <div class="prog-schedule-meta">
        ${DOMAINES_LABELS[prog.config?.domaine]||''} · ${prog.totalWeeks} semaines · ${prog.config?.seancesParSemaine||'?'}×/sem
        <button class="prog-action-btn" style="margin-left:8px" onclick="showSection('programmes')">Gérer →</button>
      </div>
    </div>
    <div class="prog-phases-summary">${phasesHtml}</div>
    <div class="prog-week-nav" id="progWeekNav">${weekNav}</div>
    <div id="progWeekDetail"></div>`;

  window._showProgWeek = function(weekNum) {
    const week = prog.semaines?.[weekNum-1];
    if(!week) return;
    // highlight active week btn
    document.querySelectorAll('#progWeekNav .prog-week-btn').forEach((b,i) =>
      b.classList.toggle('active', i+1===weekNum)
    );
    const phaseColors = {
      'Base':'#e8f0fc','Construction':'#fdf0d8','Intensité':'#fdeaea',
      'Pic':'#e0f4eb','Taper':'#f1efe8','Deload':'#e8e6e0',
      'Bloc 1 — Base':'#e8f0fc','Bloc 2 — Intensité':'#fdf0d8','Bloc 3 — Simulation':'#e0f4eb',
    };
    const phaseTextColors = {
      'Base':'#1a5fb4','Construction':'#7c4a00','Intensité':'#9c2222',
      'Pic':'#1b6b45','Taper':'#444441','Deload':'#444441',
      'Bloc 1 — Base':'#1a5fb4','Bloc 2 — Intensité':'#7c4a00','Bloc 3 — Simulation':'#1b6b45',
    };
    const bg  = phaseColors[week.phase]  || 'var(--surface2)';
    const col = phaseTextColors[week.phase] || 'var(--text2)';

    const daysHtml = week.jours?.map(day => `
      <div class="prog-day-card">
        <div class="prog-day-header">
          <span class="prog-day-name">${day.nom}</span>
          <span class="prog-day-split">${day.split&&day.split!==day.nom?esc(day.split):''}</span>
        </div>
        <div class="prog-ex-list">
          ${(day.exercices||[]).map(ex => `
            <div class="prog-ex-item">
              <span class="prog-ex-item-name">${esc(ex.nom||ex.name||ex.id)}</span>
              <span class="prog-ex-item-scheme">${ex.series||'?'}×${ex.reps||ex.scheme||'?'}</span>
              ${ex.kgPlan?`<span class="prog-ex-item-kg">${ex.kgPlan} kg</span>`:ex.pct1rm?`<span class="prog-ex-item-kg">${ex.pct1rm}% 1RM</span>`:''}
            </div>`).join('')}
        </div>
      </div>`).join('') || '';

    document.getElementById('progWeekDetail').innerHTML = `
      <span class="prog-phase-badge" style="background:${bg};color:${col}">
        ${week.isDeload?'🔵 Deload · ':week.isTaper?'📉 Taper · ':`${week.phase}`}
      </span>
      <div class="prog-rpe-target">RPE cible : ${week.rpeTarget} · ${Math.round(week.intensite*100)}%</div>
      ${daysHtml}`;
  };
  // Show first week by default
  window._showProgWeek(1);
}

function renderPrograms() {
  const active   = getActiveProgram();
  const current  = document.querySelector('.prog-view.active-view');
  const listView = document.getElementById('programs-list-view');

  if(current === listView) { _renderProgramsList(); return; }

  if(active) {
    document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
    document.getElementById('program-active-view')?.classList.add('active-view');
    renderActiveProgramDetail(1);
  } else {
    const programs = getPrograms().filter(p => p.status === 'active');
    document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
    if(programs.length) {
      listView?.classList.add('active-view');
      _renderProgramsList();
    } else {
      document.getElementById('wizard-view')?.classList.add('active-view');
      initWizard();
    }
  }
}

function _renderProgramsList(showArchived = false) {
  const active   = getActivePrograms();
  const archived = getArchivedPrograms();
  const show     = showArchived ? archived : active;
  const el       = document.getElementById('programsListContent');
  if(!el) return;

  const DOMAINES_LABELS = { hyrox:'🏟 Hyrox', force:'🏋 Force', gym:'💪 Gym', cardio:'🏃 Cardio', mobilite:'🧘 Mobilité' };
  const NIVEAUX_LABELS  = { debutant:'Débutant', intermediaire:'Intermédiaire', avance:'Avancé' };
  const STATUS_LABELS   = { active:'Actif', completed:'✓ Terminé', abandoned:'✕ Abandonné' };
  const STATUS_COLORS   = { active:'var(--green)', completed:'var(--blue)', abandoned:'var(--text3)' };
  const activeId        = getActiveProgramId();
  const activeIds       = new Set(getAllActivePrograms().map(p=>p.id));

  const tabHtml = `<div style="display:flex;gap:8px;margin-bottom:16px">
    <button class="wiz-chip ${!showArchived?'selected':''}" onclick="showProgramsList()">Actifs (${active.length})</button>
    <button class="wiz-chip ${showArchived?'selected':''}" onclick="showArchivedPrograms()">Archivés (${archived.length})</button>
  </div>`;

  if(!show.length) {
    el.innerHTML = tabHtml + `<div class="programs-empty">
      <div class="programs-empty-icon">${showArchived ? '📦' : '🎯'}</div>
      <div class="programs-empty-text">${showArchived ? 'Aucun programme archivé' : 'Aucun programme actif'}</div>
      ${!showArchived ? `<button class="wiz-btn-next" onclick="showWizard()">Créer un programme</button>` : ''}
    </div>`;
    return;
  }

  el.innerHTML = tabHtml + `<div class="programs-grid">
    ${show.map(p => {
      const isActive = p.id === activeId;
      const dom    = DOMAINES_LABELS[p.config?.domaine] || p.config?.domaine || '—';
      const niv    = NIVEAUX_LABELS[p.config?.niveau] || '—';
      const weeks  = p.totalWeeks || '?';
      const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—';
      const closedAt = p.closedAt ? new Date(p.closedAt).toLocaleDateString('fr-FR') : null;
      const statusLabel = STATUS_LABELS[p.status] || p.status;
      const statusColor = STATUS_COLORS[p.status] || 'var(--text3)';
      const compet = p.config?.competition?.type ? ` · 🏆 ${p.config.competition.type}` : '';

      return `<div class="program-card ${isActive?'active-program':''}" onclick="window._openProgCard(event,'${p.id}','${p.status}')">
        <div class="prog-card-top">
          <div class="prog-card-name">${esc(p.name||'Programme')}</div>
          <span style="font-size:11px;font-weight:600;color:${statusColor}">${statusLabel}</span>
        </div>
        <div class="prog-card-meta">
          <span class="prog-meta-tag">${dom}</span>
          <span class="prog-meta-tag">${niv}</span>
          <span class="prog-meta-tag">${weeks} sem.</span>
          <span class="prog-meta-tag">${p.config?.seancesParSemaine||'?'}×/sem.</span>
          ${compet ? `<span class="prog-meta-tag">${compet}</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px">
          Créé le ${created}${closedAt ? ` · Clôturé le ${closedAt}` : ''}
        </div>
        <div class="prog-card-actions" onclick="event.stopPropagation()">
          ${p.status === 'active' ? `
            <button class="prog-action-btn primary" onclick="event.stopPropagation();window._viewProg('${p.id}')">📋 Programme</button>
            <button class="prog-action-btn" onclick="event.stopPropagation();activateProgram('${p.id}')">${isActive ? '✓ Actif' : '+ Activer'}</button>
            ${isActive && activeIds.size > 1 ? `<button class="prog-action-btn" onclick="event.stopPropagation();setPrimaryProg('${p.id}')">⭐</button>` : ''}
            <button class="prog-action-btn" onclick="event.stopPropagation();closeProg('${p.id}','completed')">Terminer</button>
            <button class="prog-action-btn danger" onclick="event.stopPropagation();deleteProg('${p.id}')">✕</button>
          ` : `
            <button class="prog-action-btn primary" onclick="event.stopPropagation();exportProgJSON('${p.id}')">⬇ JSON</button>
            <button class="prog-action-btn danger" onclick="event.stopPropagation();deleteProg('${p.id}')">✕</button>
          `}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderActiveProgramDetail(weekNum) {
  const prog = getActiveProgram();
  if(!prog) return;

  const el      = document.getElementById('activeProgramContent');
  const titleEl = document.getElementById('activeProgramTitle');
  if(!el) return;

  if(titleEl) {
    const compet = prog.config?.competition?.date
      ? ` · 🏆 ${esc(prog.config.competition.type || 'Compétition')} ${new Date(prog.config.competition.date).toLocaleDateString('fr-FR')}`
      : '';
    titleEl.innerHTML = `
      <div class="wiz-header-title">${esc(prog.name)}${compet}</div>
      <div class="wiz-header-sub">${prog.totalWeeks} semaines · ${prog.config?.seancesParSemaine||'?'}×/sem.
        <button class="prog-action-btn" style="margin-left:8px;font-size:11px" onclick="closeProg('${prog.id}','completed')">✓ Terminer</button>
        <button class="prog-action-btn" style="font-size:11px" onclick="closeProg('${prog.id}','abandoned')">Abandonner</button>
      </div>`;
  }

  const week = prog.semaines?.[weekNum - 1];
  if(!week) return;

  const phaseColors = {
    'Bloc 1 — Base':{'bg':'#e8f0fc','color':'#1a5fb4'},
    'Bloc 2 — Intensité':{'bg':'#fdf0d8','color':'#7c4a00'},
    'Bloc 3 — Simulation':{'bg':'#e0f4eb','color':'#1b6b45'},
    'Base':{'bg':'#e8f0fc','color':'#1a5fb4'},
    'Construction':{'bg':'#fdf0d8','color':'#7c4a00'},
    'Intensité':{'bg':'#fdeaea','color':'#9c2222'},
    'Pic':{'bg':'#e0f4eb','color':'#1b6b45'},
    'Taper':{'bg':'#f1efe8','color':'#444441'},
    'Deload':{'bg':'#e8e6e0','color':'#444441'},
  };
  const pStyle = phaseColors[week.phase] || {bg:'var(--surface2)',color:'var(--text2)'};

  const weekNav = prog.semaines.map((w,i) => {
    const cls = ['prog-week-btn', i+1===weekNum?'active':'', w.isDeload?'deload':'', w.isTaper?'taper':''].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="renderActiveProgramDetail(${i+1})">S${i+1}</button>`;
  }).join('');

  const daysHtml = week.jours.map(day => `
    <div class="prog-day-card">
      <div class="prog-day-header">
        <span class="prog-day-name">${day.nom}</span>
        <span class="prog-day-split">${day.split&&day.split!==day.nom?day.split:''}</span>
      </div>
      <div class="prog-ex-list">
        ${day.exercices.map(ex => `
          <div class="prog-ex-item">
            <span class="prog-ex-item-name">${esc(ex.nom)}</span>
            <span class="prog-ex-item-scheme">${ex.series||'?'}×${ex.reps||'?'}</span>
            ${ex.kgPlan
              ? `<span class="prog-ex-item-kg">${ex.kgPlan} kg</span>`
              : `<span class="prog-ex-item-kg">${ex.pct1rm||'?'}% 1RM</span>`}
          </div>`).join('')}
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div class="prog-week-nav">${weekNav}</div>
    <span class="prog-phase-badge" style="background:${pStyle.bg};color:${pStyle.color}">
      ${week.isDeload?'🔵 Deload · ':week.isTaper?'📉 Taper · ':`${week.phase}`}
    </span>
    <div class="prog-rpe-target">RPE cible : ${week.rpeTarget} · Intensité : ${Math.round(week.intensite*100)}%</div>
    ${daysHtml}`;
}

// ── ATHX migration ────────────────────────────────────────────────────────────

function _migrateAthxIfNeeded() {
  const MIGRATION_KEY = 'athx_migrated_v1';
  if(dbGet(MIGRATION_KEY)) return;

  // Check if legacy ATHX data exists
  let hasLegacyData = false;
  const EXIDS = ['press','squat','deadlift','gtoh','sandbag','lunges'];
  for(let w=1;w<=17;w++) {
    for(const id of EXIDS) {
      if(dbGet(`${id}_w${w}`)) { hasLegacyData = true; break; }
    }
    if(hasLegacyData) break;
  }

  // Create ATHX program regardless (template always useful)
  const id   = newProgramId();
  const prog = buildAthxProgram(id);

  if(!hasLegacyData) {
    // No data — just create as a template, don't activate
    prog.status = 'active';
    saveProgram(prog);
    // Don't set as active — let user choose
  } else {
    // Has legacy data — migrate and activate
    prog.status = 'active';
    saveProgram(prog);
    addActiveProgram(id);
    setActiveProgram(id);

    // Note: legacy data stays in its original keys (press_w1, etc.)
    // tracker.js reads from original store.js for legacy programs
    // For the migrated ATHX program we keep using legacy keys via the fallback
    // We mark it so tracker knows to use legacy storage
    prog.migratedFrom = 'athx_legacy';
    saveProgram(prog);
  }

  dbSet(MIGRATION_KEY, true);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  await dbInit();

  // Migrate ATHX legacy data
  _migrateAthxIfNeeded();

  // Init tracker
  initWeekSel();
  renderSaisie();

  // Init body SVG
  initBodyDelegation();
  repaintMuscles();

  // Data toolbar
  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
  document.getElementById('btnExportCSV')?.addEventListener('click',  exportCSV);
  document.getElementById('fileImport')?.addEventListener('change',   importJSON);

  // Init wizard
  initWizard();

  // SW
  const isDeployed = location.hostname.includes('github.io') || (location.protocol==='https:'&&!location.hostname.includes('claudeusercontent'));
  if('serviceWorker' in navigator && isDeployed) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if(nw.state==='installed'&&navigator.serviceWorker.controller) _showUpdateBanner();
        });
      });
      document.addEventListener('visibilitychange', () => {
        if(document.visibilityState==='visible') reg.update();
      });
    } catch(err) { console.warn('[SW] failed:', err); }
  }
}

function _showUpdateBanner() {
  const b = document.createElement('div');
  b.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#1a1a18;color:#fff;padding:10px 18px;border-radius:24px;font-size:13px;font-weight:500;display:flex;gap:12px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,.3);z-index:9999;white-space:nowrap';
  b.innerHTML = '⬆ Nouvelle version disponible <button style="background:#fff;color:#1a1a18;border:none;border-radius:12px;padding:3px 12px;font-size:12px;font-weight:600;cursor:pointer" onclick="window.location.reload()">Mettre à jour</button>';
  document.body.appendChild(b);
  setTimeout(()=>b.remove(), 30000);
}

document.addEventListener('DOMContentLoaded', init);
