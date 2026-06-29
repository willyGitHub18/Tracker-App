/**
 * app.js — Entry point
 * Handles routing, PWA, ATHX migration, and program lifecycle.
 */

import { dbInit, dbGet, dbSet, dbClear } from './db.js';
import { initWeekSel, renderSaisie, renderProgression, renderHistorique, setCurrentProgram, getCurrentProgram } from './tracker.js';
import { renderMusculaire, initBodyDelegation, repaintMuscles, switchBodyView } from './musculaire.js';
import { exportJSON, exportCSV, importJSON } from './io.js';
import { initWizard, renderStep, wizNext, wizBack, wizGenerate, wizSearchEx } from './wizard.js';
import { getPrograms, getActivePrograms, getArchivedPrograms, getProgram, getProgRecord,
         getActiveProgram, getAllActivePrograms, getActiveProgramId,
         setActiveProgram, addActiveProgram, removeActiveProgram, setPrimaryProgram,
         deleteProgram, archiveProgram, closeProgram, newProgramId, saveProgram,
         exportProgramJSON, exportProgramMD, exportAllPrograms, importAllPrograms } from './programs.js';
import { buildAthxProgram, NUTRITION_PLANS } from './data.js';
import { getVacances, setVacances, clearAllVacances, addVacances, removeVacances } from './store.js';

// ── Custom confirm modal (iOS PWA-safe) ─────────────────────────────────────
function _confirmModal(message, actionLabel, onConfirm) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  const sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--surface,#fff);border-radius:16px 16px 0 0;padding:24px 20px;width:100%;max-width:480px';
  const msg = document.createElement('p');
  msg.textContent = message;
  msg.style.cssText = 'font-size:15px;text-align:center;margin:0 0 20px;line-height:1.5;color:var(--text,#111)';
  const b1 = document.createElement('button');
  b1.textContent = actionLabel;
  b1.style.cssText = 'display:block;width:100%;padding:14px;background:#c0392b;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;touch-action:manipulation;margin-bottom:10px';
  const b2 = document.createElement('button');
  b2.textContent = 'Annuler';
  b2.style.cssText = 'display:block;width:100%;padding:14px;background:#e8e6e0;color:#333;border:none;border-radius:12px;font-size:15px;cursor:pointer;touch-action:manipulation';
  b1.onclick = () => { modal.remove(); onConfirm(); };
  b2.onclick = () => modal.remove();
  sheet.append(msg, b1, b2);
  modal.appendChild(sheet);
  document.body.appendChild(modal);
}

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
  if(id === 'tracker')     { initWeekSel(); }
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

export function showProgAthx(id) {
  // Called from ATHX detail view — tabs have prefixed IDs
  const btn = event?.currentTarget || event?.target?.closest('button');
  const nav = btn?.closest('.prog-top-nav');
  const content = nav?.closest('.athx-content') || nav?.parentElement;

  nav?.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  content?.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
  const target = content?.querySelector('#athx-' + id);
  if(target) target.classList.add('active');
}

function showProg(id) {
  // Find the container that holds both the nav and the tab
  // This handles both the original #programme panel and the cloned detail view
  const btn = event?.target?.closest('button');
  const nav = btn?.closest('.prog-top-nav') || document.querySelector('.prog-top-nav');
  const section = nav?.closest('.section-panel, [id]') || document;

  // Deactivate all tabs and buttons in this section
  section.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
  nav?.querySelectorAll('button').forEach(b => b.classList.remove('active'));

  // Find the tab by id within this section (not globally)
  const target = section.querySelector('#' + id) || document.getElementById(id);
  target?.classList.add('active');
  btn?.classList.add('active');
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
window.importJSON    = importJSON;
window._NUTRITION_PLANS = NUTRITION_PLANS;
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


// ── Program card click handlers ──────────────────────────────────────────────
window._viewProg = function(id) {
  const prog = getProgram(id);
  if(!prog) return;
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  const detailView = document.getElementById('program-detail-view');
  if(!detailView) return;
  detailView.innerHTML = '';
  detailView.classList.add('active-view');
  requestAnimationFrame(() => _renderProgDetailView(prog, detailView));
};

window._confirmReprise = function(repriseWeek) {
  const prog = getActiveProgram();
  let lastDataWeek = 0;

  if(prog?.semaines) {
    prog.semaines.forEach((sem, i) => {
      sem.jours?.forEach(day => {
        day.exercices?.forEach(ex => {
          const rec = getProgRecord(prog.id, ex.id, i+1);
          if(rec?.sets?.some(s => s?.kg)) lastDataWeek = Math.max(lastDataWeek, i+1);
        });
      });
    });
  } else {
    const MAIN = ['press','squat','deadlift'];
    const total = prog?.totalWeeks || 17;
    for(let w = 1; w <= total; w++) {
      if(MAIN.some(id => getRecord && getRecord(id, w)?.sets?.some(s => s?.kg))) lastDataWeek = w;
    }
  }

  const weeksToSkip = [];
  for(let w = lastDataWeek + 1; w < repriseWeek; w++) weeksToSkip.push(w);

  if(weeksToSkip.length > 0) {
    if(prog?.semaines) {
      weeksToSkip.forEach(w => {
        prog.semaines[w-1]?.jours?.forEach(day => {
          day.exercices?.forEach(ex => setProgExStatus(prog.id, ex.id, w, 'skipped'));
        });
      });
    }
    _showSaveToast(`✓ S${weeksToSkip[0]}–S${weeksToSkip[weeksToSkip.length-1]} sautées · Reprise S${repriseWeek}`);
  } else {
    _showSaveToast(`✓ Reprise confirmée en S${repriseWeek}`);
  }

  const vac = getVacances();
  if(vac.length) { vac[vac.length-1].repriseWeek = repriseWeek; setVacances(vac); }
  renderSaisie();
};

window.showProgramsList = function() {
  // Restore #programme to its original parent if it was moved
  const progSection = document.getElementById('programme');
  const mainDiv = document.querySelector('.main');
  if(progSection && progSection.parentElement !== mainDiv && mainDiv) {
    mainDiv.appendChild(progSection);
  }

  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById('programs-list-view')?.classList.add('active-view');
  const dv = document.getElementById('program-detail-view');
  if(dv) dv.innerHTML = '';
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


window._markGrossesseDone = function(progId, exId, week, checked) {
  if(typeof setProgExStatus === 'function') {
    setProgExStatus(progId, exId, week, checked ? 'done' : 'normal');
  }
};

window._switchProgram = function(id) {
  setCurrentProgram(id);
  initWeekSel();
  renderSaisie();
};

window.activateProgram = function(id) {
  addActiveProgram(id);
  setCurrentProgram(id);
  _showSaveToast('✓ Programme activé');
  renderPrograms();
  initWeekSel();
};

window.setPrimaryProg = function(id) {
  setPrimaryProgram(id);
  setCurrentProgram(id);
  renderPrograms();
  initWeekSel();
  renderSaisie();
};

window.closeProg = function(id, reason) {
  const msg = reason === 'completed'
    ? 'Marquer ce programme comme terminé ?'
    : 'Abandonner ce programme ?';
  _confirmModal(msg, reason === 'completed' ? 'Terminer' : 'Abandonner', () => {
    closeProgram(id, reason);
    const rem = getAllActivePrograms().filter(p => p.id !== id);
    if(rem.length) setCurrentProgram(rem[0].id);
    renderPrograms(); initWeekSel();
  });
};

window.archiveProg = function(id) {
  archiveProgram(id);
  renderPrograms();
};

window.desarchiveProg = function(id) {
  const prog = getProgram(id);
  if(!prog) return;
  prog.status = 'active';
  delete prog.archivedAt;
  saveProgram(prog);
  renderPrograms();
};

window.deleteProg = function(id) {
  _confirmModal('Supprimer définitivement ? Cette action est irréversible.', 'Supprimer', () => {
    deleteProgram(id);
    renderPrograms();
  });
};

window.exportProgMD = function(id) {
  const md = exportProgramMD(id);
  if(!md) return;
  const prog = getProgram(id);
  const name = (prog?.name || 'programme').replace(/[^a-zA-Z0-9]/g,'_').slice(0,30);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], {type:'text/markdown'}));
  a.download = 'just2train_' + name + '_' + new Date().toISOString().slice(0,10) + '.md';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
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
  if(!d || !f || new Date(f) < new Date(d)) { alert('Dates invalides.'); return; }

window._removeVacances = function(idx) {
  removeVacances(idx);
  renderSaisie();
};

window._clearVacances = function() {
  clearAllVacances();
  renderSaisie();
};

  addVacances(d, f, a);

  // Find last week with data to suggest reprise week
  const prog = getActiveProgram();
  const totalWeeks = prog?.totalWeeks || (prog?.semaines?.length) || 17;
  let lastDataWeek = 0;

  if(prog?.semaines) {
    // Generated program
    prog.semaines.forEach((sem, i) => {
      sem.jours?.forEach(day => {
        day.exercices?.forEach(ex => {
          const rec = getProgRecord(prog.id, ex.id, i+1);
          if(rec?.sets?.some(s => s?.kg)) lastDataWeek = Math.max(lastDataWeek, i+1);
        });
      });
    });
  } else {
    // ATHX legacy
    const MAIN_LIFTS = ['press','squat','deadlift'];
    for(let w = 1; w <= totalWeeks; w++) {
      const hasData = MAIN_LIFTS.some(id => {
        const rec = getRecord(id, w);
        return rec?.sets?.some(s => s?.kg);
      });
      if(hasData) lastDataWeek = w;
    }
  }

  const suggestedReprise = Math.min(lastDataWeek + 1, totalWeeks);

  // Show reprise dialog
  _showRepriseDialog(suggestedReprise, totalWeeks, lastDataWeek, prog);
};

function _showRepriseDialog(suggested, total, lastData, prog) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';

  const sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--surface,#fff);border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 16px 48px rgba(0,0,0,.3)';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:6px';
  title.textContent = '🏖 Vacances enregistrées';

  const subtitle = document.createElement('div');
  subtitle.style.cssText = 'font-size:13px;color:var(--text2,#666);margin-bottom:16px';
  subtitle.innerHTML = "Quelle semaine reprends-tu l'entraînement ?<br><span style='font-size:11px;color:var(--text3,#999)'>" + (lastData > 0 ? 'Dernière saisie : S' + lastData : 'Aucune saisie précédente') + '</span>';

  const sel = document.createElement('select');
  sel.style.cssText = 'width:100%;font-size:14px;padding:8px;border:1.5px solid var(--border-md,#ddd);border-radius:8px;background:var(--surface,#fff);color:var(--text,#111);margin-bottom:16px';
  for(let w = 1; w <= total; w++) {
    const o = document.createElement('option');
    o.value = w;
    o.textContent = w === suggested ? 'S' + w + ' (suggérée)' : 'S' + w;
    if(w === suggested) o.selected = true;
    sel.appendChild(o);
  }

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px';

  const btnIgnore = document.createElement('button');
  btnIgnore.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border-md,#ddd);border-radius:8px;background:transparent;color:var(--text2,#666);cursor:pointer;font-size:13px;touch-action:manipulation';
  btnIgnore.textContent = 'Ignorer';
  btnIgnore.onclick = () => { modal.remove(); renderSaisie(); };

  const btnConfirm = document.createElement('button');
  btnConfirm.style.cssText = 'flex:2;padding:10px;background:var(--text,#111);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;touch-action:manipulation';
  btnConfirm.textContent = 'Confirmer la reprise';
  btnConfirm.onclick = () => {
    const week = parseInt(sel.value);
    modal.remove();
    window._confirmReprise(week);
  };

  row.append(btnIgnore, btnConfirm);
  sheet.append(title, subtitle, sel, row);
  modal.appendChild(sheet);
  document.body.appendChild(modal);
}


function _renderProgDetailView(prog, container) {
  if(!prog || !container) return;

  const DOMAINES_LABELS = { hyrox:'🏟 Hyrox', force:'🏋 Force', gym:'💪 Gym', cardio:'🏃 Cardio', mobilite:'🧘 Mobilité', mixte:'⚡ Mixte', grossesse:'🤰 Grossesse' };
  const NUTRITION_LABELS = { masse:'💪 Prise de masse', perte:'🔥 Perte de poids', healthy:'🥗 Santé / Équilibre', performance:'⚡ Performance', maintien:'⚖️ Maintien' };

  // For ATHX fixed program — inject the full programme.html content
    if(prog.migratedFrom === 'athx_legacy' || prog.subtype === 'fixed') {
    // Get ATHX HTML and prefix all IDs to avoid duplicates with hidden #programme
    const progSection = document.getElementById('programme');
    if(!progSection) return;

    // Get raw HTML and prefix all id= and targets
    let athxHtml = progSection.innerHTML;
    // Prefix IDs: id="nutrition" → id="athx-nutrition"
    athxHtml = athxHtml.replace(/ id="/g, ' id="athx-');
    // Prefix showProg calls: showProg('nutrition') → showProgAthx('nutrition')
    athxHtml = athxHtml.replace(/showProg\('([^']+)'\)/g, "showProgAthx('$1')");

    container.innerHTML =
      '<div style="padding:12px 16px 8px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);margin-bottom:8px">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700">' + esc(prog.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text3)">Programme compétition · 17 semaines</div>' +
        '</div>' +
        '<button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>' +
      '</div>' +
      '<div class="athx-content">' + athxHtml + '</div>';

    // Show first tab
    requestAnimationFrame(() => {
      const tabs = container.querySelectorAll('.prog-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tabs[0]?.classList.add('active');
      const btns = container.querySelectorAll('.prog-top-nav button');
      btns.forEach(b => b.classList.remove('active'));
      btns[0]?.classList.add('active');
    });
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

  // ── Generated program — rich view ────────────────────────────────────────────
  const nutritionPlan = prog.nutrition ? window._NUTRITION_PLANS?.[prog.nutrition] : null;

  // Phase colors
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

  // Build tabs: Programme | Nutrition
  const tabs = ['programme', nutritionPlan ? 'nutrition' : null].filter(Boolean);

  // Semaine type = first non-deload week as reference
  const refWeek = prog.semaines?.find(s => !s.isDeload && !s.isTaper) || prog.semaines?.[0];

  // Week nav
  const weekNav = prog.semaines?.map((w,i) => {
    const cls = ['prog-week-btn', w.isDeload?'deload':'', w.isTaper?'taper':''].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="window._showDetailWeek(${i+1})">${'S'+(i+1)}</button>`;
  }).join('') || '';

  // Phase summary
  const phasesHtml = prog.phases?.map(p => {
    const bg  = phaseColors[p.nom]  || '#f0f0ee';
    const col = phaseTextColors[p.nom] || '#444';
    return `<div class="prog-phase-row">
      <span class="prog-phase-badge-sm" style="background:${bg};color:${col}">${esc(p.nom)}</span>
      <span class="prog-phase-weeks">S${p.debut} → S${p.fin}</span>
      <span class="prog-phase-int">${Math.round(p.intensite*100)}% · RPE ${esc(p.rpeTarget||'—')}</span>
    </div>`;
  }).join('') || '';

  // Semaine type detail
  const semaineTypeHtml = refWeek ? refWeek.jours.map(day => {
    const exHtml = day.exercices.map(ex => `
      <div class="prog-ex-detail-item">
        <div class="prog-ex-detail-name">${esc(ex.nom||ex.id)}</div>
        <div class="prog-ex-detail-scheme">
          ${ex.series ? `<span class="prog-ex-tag">${ex.series} séries</span>` : ''}
          ${ex.reps   ? `<span class="prog-ex-tag">${ex.reps} reps</span>` : ''}
          ${ex.kgPlan ? `<span class="prog-ex-tag">${ex.kgPlan} kg</span>` : ex.pct1rm ? `<span class="prog-ex-tag">${ex.pct1rm}% 1RM</span>` : ''}
        </div>
        ${ex.muscles?.length ? `<div class="prog-ex-muscles">${ex.muscles.slice(0,3).map(m=>esc(m)).join(' · ')}</div>` : ''}
      </div>`).join('');
    return `<div class="prog-day-detail-card">
      <div class="prog-day-detail-header">
        <span class="prog-day-detail-name">${esc(day.nom)}</span>
        <span class="prog-day-detail-split">${esc(day.split||'')}</span>
      </div>
      <div class="prog-ex-detail-list">${exHtml}</div>
    </div>`;
  }).join('') : '';

  container.innerHTML = `
    <div class="wiz-header">
      <div class="wiz-header-top">
        <div>
          <div class="wiz-header-title">${esc(prog.name)}</div>
          <div class="wiz-header-sub">${DOMAINES_LABELS[prog.config?.domaine]||''} · ${prog.totalWeeks} sem. · ${prog.config?.seancesParSemaine||'?'}×/sem · ${prog.config?.niveau||''}</div>
        </div>
        <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="g-tabs" style="margin-bottom:16px">
      <button class="g-tab active" data-ptab="programme">📋 Programme</button>
      ${nutritionPlan ? '<button class="g-tab" data-ptab="nutrition">🍽 Nutrition</button>' : ''}
    </div>

    <!-- Programme tab -->
    <div id="pd-programme" class="pd-panel active">

      <!-- Phases -->
      <div class="prog-section-title">Phases du programme</div>
      <div class="prog-phases-summary" style="margin-bottom:16px">${phasesHtml}</div>

      <!-- Semaine type -->
      <div class="prog-section-title">Semaine type</div>
      <div class="prog-section-sub">Structure de référence · les charges s'adaptent à chaque phase</div>
      <div style="margin-bottom:16px">${semaineTypeHtml}</div>

      <!-- Navigation semaine par semaine -->
      <div class="prog-section-title">Semaine par semaine</div>
      <div class="prog-week-nav" id="detailWeekNav" style="margin-bottom:12px">${weekNav}</div>
      <div id="detailWeekContent"></div>
    </div>

    <!-- Nutrition tab -->
    ${nutritionPlan ? `<div id="pd-nutrition" class="pd-panel">
      <div class="nutri-header">
        <div class="nutri-title">${NUTRITION_LABELS[prog.nutrition]||''}</div>
        <div class="nutri-macros">
          <div class="nutri-macro-item"><span class="nutri-macro-label">Protéines</span><span class="nutri-macro-val">${esc(nutritionPlan.proteines)}</span></div>
          <div class="nutri-macro-item"><span class="nutri-macro-label">Glucides</span><span class="nutri-macro-val">${esc(nutritionPlan.glucides)}</span></div>
          <div class="nutri-macro-item"><span class="nutri-macro-label">Lipides</span><span class="nutri-macro-val">${esc(nutritionPlan.lipides)}</span></div>
          <div class="nutri-macro-item"><span class="nutri-macro-label">Calories</span><span class="nutri-macro-val">${esc(nutritionPlan.surplus)}</span></div>
        </div>
      </div>

      <div class="nutri-block">
        <div class="nutri-block-title">⏰ ${esc(nutritionPlan.preSeance.timing)} — Pré-séance</div>
        ${nutritionPlan.preSeance.conseils.map(t=>`<div class="nutri-tip">${esc(t)}</div>`).join('')}
      </div>

      <div class="nutri-block">
        <div class="nutri-block-title">💪 ${esc(nutritionPlan.postSeance.timing)} — Post-séance</div>
        ${nutritionPlan.postSeance.conseils.map(t=>`<div class="nutri-tip">${esc(t)}</div>`).join('')}
      </div>

      <div class="nutri-block">
        <div class="nutri-block-title">🛋 Jours de repos</div>
        ${nutritionPlan.reposActif.conseils.map(t=>`<div class="nutri-tip">${esc(t)}</div>`).join('')}
      </div>

      <div class="nutri-block nutri-tips-block">
        <div class="nutri-block-title">💡 À retenir</div>
        ${nutritionPlan.tips.map(t=>`<div class="nutri-tip">${esc(t)}</div>`).join('')}
      </div>
    </div>` : ''}`;

  // Tab switching
  container.querySelectorAll('[data-ptab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-ptab]').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.pd-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#pd-${btn.dataset.ptab}`)?.classList.add('active');
    });
  });

  // Week detail
  window._showDetailWeek = function(weekNum) {
    const week = prog.semaines?.[weekNum-1];
    if(!week) return;
    document.querySelectorAll('#detailWeekNav .prog-week-btn').forEach((b,i) =>
      b.classList.toggle('active', i+1===weekNum)
    );
    const bg  = phaseColors[week.phase]  || 'var(--surface2)';
    const col = phaseTextColors[week.phase] || 'var(--text2)';
    const daysHtml = week.jours?.map(day => `
      <div class="prog-day-detail-card">
        <div class="prog-day-detail-header">
          <span class="prog-day-detail-name">${esc(day.nom)}</span>
          <span class="prog-day-detail-split">${esc(day.split&&day.split!==day.nom?day.split:'')}</span>
        </div>
        <div class="prog-ex-detail-list">
          ${(day.exercices||[]).map(ex=>`
            <div class="prog-ex-detail-item">
              <div class="prog-ex-detail-name">${esc(ex.nom||ex.id)}</div>
              <div class="prog-ex-detail-scheme">
                ${ex.series?`<span class="prog-ex-tag">${ex.series}×</span>`:''}
                ${ex.reps?`<span class="prog-ex-tag">${ex.reps} reps</span>`:''}
                ${ex.kgPlan?`<span class="prog-ex-tag">${ex.kgPlan} kg</span>`:ex.pct1rm?`<span class="prog-ex-tag">${ex.pct1rm}% 1RM</span>`:''}
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');
    document.getElementById('detailWeekContent').innerHTML = `
      <span class="prog-phase-badge" style="background:${bg};color:${col};display:inline-block;margin-bottom:8px">
        ${week.isDeload?'🔵 Deload · ':week.isTaper?'📉 Taper · ':`${week.phase}`}
      </span>
      <div class="prog-rpe-target" style="margin-bottom:12px">RPE cible : ${week.rpeTarget} · ${Math.round(week.intensite*100)}%</div>
      ${daysHtml}`;
  };
  window._showDetailWeek(1);
}


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
  const current  = document.querySelector('.prog-view.active-view');
  const listView = document.getElementById('programs-list-view');
  const detailView = document.getElementById('program-detail-view');

  // If already showing list or detail, just re-render current view
  if(current === listView) { _renderProgramsList(); return; }
  if(current === detailView) return; // don't interrupt detail view

  // Always show list — let list handle empty state
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  listView?.classList.add('active-view');
  _renderProgramsList();
}

function _renderProgramsList(showArchived = false) {
  const all = getPrograms();
  let show;
  if(showArchived === false) {
    show = all.filter(p => p.status === 'active');
  } else if(showArchived === 'completed') {
    show = all.filter(p => p.status === 'completed');
  } else if(showArchived === 'abandoned') {
    show = all.filter(p => p.status === 'abandoned');
  } else if(showArchived === 'archived') {
    show = all.filter(p => p.status === 'archived');
  } else {
    show = all.filter(p => p.status !== 'active');
  }
  const el       = document.getElementById('programsListContent');
  if(!el) return;

  const DOMAINES_LABELS = { hyrox:'🏟 Hyrox', force:'🏋 Force', gym:'💪 Gym', cardio:'🏃 Cardio', mobilite:'🧘 Mobilité' };
  const NIVEAUX_LABELS  = { debutant:'Débutant', intermediaire:'Intermédiaire', avance:'Avancé' };
  const STATUS_LABELS   = { active:'Actif', completed:'✓ Terminé', abandoned:'✕ Abandonné' };
  const STATUS_COLORS   = { active:'var(--green)', completed:'var(--blue)', abandoned:'var(--text3)' };
  const activeId        = getActiveProgramId();
  const activeIds       = new Set(getAllActivePrograms().map(p=>p.id));

  const activeCount    = getPrograms().filter(p => p.status === 'active').length;
  const completedCount = getPrograms().filter(p => p.status === 'completed').length;
  const abandonedCount = getPrograms().filter(p => p.status === 'abandoned').length;
  const archivedCount  = getPrograms().filter(p => p.status === 'archived').length;

  const tabHtml = `<div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
    <button class="wiz-chip ${showArchived===false?'selected':''}" onclick="_renderProgramsList(false)">Actifs (${activeCount})</button>
    <button class="wiz-chip ${showArchived==='completed'?'selected':''}" onclick="_renderProgramsList('completed')">✓ Terminés (${completedCount})</button>
    <button class="wiz-chip ${showArchived==='abandoned'?'selected':''}" onclick="_renderProgramsList('abandoned')">✗ Abandonnés (${abandonedCount})</button>
    <button class="wiz-chip ${showArchived==='archived'?'selected':''}" onclick="_renderProgramsList('archived')">📦 Archivés (${archivedCount})</button>
  </div>`;

  if(!show.length) {
    el.innerHTML = tabHtml + `<div class="programs-empty">
      <div class="programs-empty-icon">${showArchived === false ? '🎯' : '📦'}</div>
      <div class="programs-empty-text">${showArchived === false ? 'Aucun programme actif' : 'Aucun programme dans cette catégorie'}</div>
      ${showArchived === false ? `<button class="wiz-btn-next" onclick="showWizard()">Créer un programme</button>` : ''}
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

      return `<div class="program-card ${isActive?'active-program':''}">
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
            <button class="prog-action-btn primary" onclick="event.stopPropagation();window._viewProg('${p.id}')">📋 Voir</button>
            ${isActive
  ? `<button class="prog-action-btn" style="background:var(--green-bg,#e0f4eb);color:var(--green,#1b6b45);border-color:var(--green,#1b6b45);cursor:default" onclick="event.stopPropagation()">✓ Actif</button>`
  : `<button class="prog-action-btn primary" onclick="event.stopPropagation();activateProgram('${p.id}')">+ Activer</button>`
}
            ${isActive && activeIds.size > 1 ? `<button class="prog-action-btn" onclick="event.stopPropagation();setPrimaryProg('${p.id}')">⭐</button>` : ''}
            <button class="prog-action-btn" onclick="event.stopPropagation();closeProg('${p.id}','completed')">✓ Terminer</button>
            <button class="prog-action-btn" onclick="event.stopPropagation();archiveProg('${p.id}')">📦 Archiver</button>
          ` : `
            <button class="prog-action-btn" onclick="event.stopPropagation();desarchiveProg('${p.id}')">↩ Réactiver</button>
            <button class="prog-action-btn primary" onclick="event.stopPropagation();exportProgJSON('${p.id}')">⬇ JSON</button>
            <button class="prog-action-btn" onclick="event.stopPropagation();exportProgMD('${p.id}')">⬇ MD</button>
            <button class="prog-action-btn danger" onclick="event.stopPropagation();deleteProg('${p.id}')">🗑 Supprimer</button>
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
  initWeekSel(); // initWeekSel calls renderSaisie() internally

  // Init body SVG
  initBodyDelegation();
  repaintMuscles();

  // Data toolbar
  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
  document.getElementById('btnExportCSV')?.addEventListener('click',  exportCSV);
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
