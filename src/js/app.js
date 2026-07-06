/**
 * app.js — Entry point
 * Handles routing, PWA, ATHX migration, and program lifecycle.
 */

import { dbInit, dbGet, dbSet, dbClear } from './db.js';
import { initWeekSel, renderSaisie, renderProgression, renderHistorique, setCurrentProgram, getCurrentProgram } from './tracker.js';
import { renderMusculaire, initBodyDelegation, repaintMuscles, switchBodyView } from './musculaire.js';
import { exportJSON, exportCSV, importJSON } from './io.js';
import { initWizard, renderStep, wizNext, wizBack, wizGenerate, wizSearchEx, setMoisGrossesse } from './wizard.js';
import { getPrograms, getActivePrograms, getArchivedPrograms, getProgram, getProgRecord,
         getActiveProgram, getAllActivePrograms, getActiveProgramId,
         setActiveProgram, addActiveProgram, removeActiveProgram, setPrimaryProgram,
         deleteProgram, archiveProgram, closeProgram, newProgramId, saveProgram,
         exportProgramJSON, exportProgramMD, exportAllPrograms, importAllPrograms,
         setProgExStatus, getCurrentWeek, setStartDate } from './programs.js';
import { buildAthxProgram, EXERCISE_CUES } from './data.js';
import { getRecord, getVacances, setVacances, clearAllVacances, addVacances, removeVacances } from './store.js';
import { renderNutritionSection, bindNutritionEvents } from './nutrition-plan.js';
import { renderMobiliteSection } from './mobilite.js';
import { renderResources } from './resources.js';

// ── Custom confirm modal (iOS PWA-safe) ─────────────────────────────────────

// ── Toggle "série non effectuée" (kg/reps/rpe → null, skipped=true) ─────────
window._setMoisGrossesse = setMoisGrossesse;

window._toggleSetSkipped = function(checkbox, kind, exId, setIdx) {
  const isSkipped = checkbox.checked;
  const prefix = kind === 'p' ? 'p' : '';
  const kgEl   = document.getElementById(`${prefix}kg_${exId}_${setIdx}`);
  const repsEl = document.getElementById(`${prefix}reps_${exId}_${setIdx}`);
  const rpeEl  = document.getElementById(`${prefix}rpe_${exId}_${setIdx}`);

  if(isSkipped) {
    if(kgEl)   { kgEl.value = '';   kgEl.disabled = true; }
    if(repsEl) { repsEl.value = ''; repsEl.disabled = true; }
    if(rpeEl)  { rpeEl.value = '';  rpeEl.disabled = true; }
  } else {
    if(kgEl)   kgEl.disabled = false;
    if(repsEl) repsEl.disabled = false;
    if(rpeEl)  rpeEl.disabled = false;
  }

  // Update visual row state
  const row = checkbox.closest('tr');
  if(row) row.classList.toggle('set-row-skipped', isSkipped);
  const statusCell = row?.querySelector('.set-status');
  if(statusCell) {
    statusCell.textContent = isSkipped ? '❌' : '';
    statusCell.style.color = isSkipped ? 'var(--red)' : 'var(--border)';
  }

  // Store the skipped flag immediately so it survives without waiting for "Enregistrer"
  // (the actual save button will read these disabled/empty fields and persist skipped:true)
  checkbox.dataset.skipped = isSkipped ? '1' : '0';
};

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
const PROG_TABS  = ['warmup','mardi','mercredi','jeudi','vendredi','vacances'];

export function showSection(id) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  // Activate bottom tab
  document.querySelector(`.bottom-nav-btn[data-section="${id}"]`)?.classList.add('active');
  if(id === 'tracker') {
    // Toujours revenir à l'onglet "Saisie semaine" — comportement standard tab-bar
    showTracker('saisie');
    initWeekSel();
  }
  if(id === 'musculaire')  renderMusculaire();
  if(id === 'nutrition-section') renderNutritionSection();
  if(id === 'mobilite-section') renderMobiliteSection();
  if(id === 'doc')         renderResources();
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

export function showWeekAthx(day, bloc) {
  ['b1','b1d','b2','b2d','b3','b3d'].forEach(b => {
    const el = document.getElementById(`athx-${day}-${b}`);
    if(el) el.style.display = 'none';
  });
  const el = document.getElementById(`athx-${day}-${bloc}`);
  if(el) el.style.display = 'block';
  const nav = document.getElementById(`athx-${day}Weeks`);
  if(nav) ['b1','b1d','b2','b2d','b3','b3d'].forEach((b,i) =>
    nav.querySelectorAll('button')[i]?.classList.toggle('active', b === bloc)
  );
}

function showProgAthx(id) {
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
  document.querySelector(`.doc-nav-item[data-doc="${id}"]`)?.classList.add('active');
}

// ── Window exposures ──────────────────────────────────────────────────────────

window.showSection   = showSection;
window.importJSON    = importJSON;
window._confirmModal = _confirmModal;
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

window._confirmReprise = function(repriseWeek, manualFirstSkip) {
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
  if(vac.length) {
    const lastVac = vac[vac.length-1];
    lastVac.repriseWeek = repriseWeek;
    // Use manual firstSkippedWeek if provided, otherwise auto-detect
    lastVac.firstSkippedWeek = (manualFirstSkip === -1) ? repriseWeek : (manualFirstSkip || (weeksToSkip.length > 0 ? weeksToSkip[0] : repriseWeek));
    setVacances(vac);
  }
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
  const prog = getProgram(id);
  if(prog && !prog.startDate) {
    // Proposer la date de démarrage
    _promptStartDate(id, () => {
      addActiveProgram(id);
      _showSaveToast('✓ Programme activé');
      renderPrograms();
    });
  } else {
    addActiveProgram(id);
    _showSaveToast('✓ Programme activé');
    renderPrograms();
  }
};

function _promptStartDate(progId, callback) {
  const today = new Date().toISOString().split('T')[0];
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  const sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--surface,#fff);border-radius:16px 16px 0 0;padding:24px 20px;width:100%;max-width:480px';

  sheet.innerHTML = `
    <p style="font-size:15px;font-weight:600;margin:0 0 8px;color:var(--text)">📅 Date de démarrage</p>
    <p style="font-size:13px;color:var(--text2);margin:0 0 16px;line-height:1.5">Quand commences-tu ce programme ?<br>La semaine courante sera calculée automatiquement.</p>
    <input type="date" id="sdInput" value="${today}" style="display:block;width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;font-size:15px;margin-bottom:16px;box-sizing:border-box">
    <button id="sdConfirm" style="display:block;width:100%;padding:14px;background:var(--text,#1a1a18);color:var(--bg,#fff);border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px">Confirmer</button>
    <button id="sdToday" style="display:block;width:100%;padding:14px;background:#e8e6e0;color:#333;border:none;border-radius:12px;font-size:15px;cursor:pointer">Aujourd'hui</button>`;

  modal.appendChild(sheet);
  document.body.appendChild(modal);

  sheet.querySelector('#sdConfirm').onclick = () => {
    const val = sheet.querySelector('#sdInput').value || today;
    setStartDate(progId, val);
    modal.remove();
    callback();
  };
  sheet.querySelector('#sdToday').onclick = () => {
    setStartDate(progId, today);
    modal.remove();
    callback();
  };
}

// Programme fraîchement créé par le wizard : le rendre actif ET affiché dans le tracker
// (sinon getCurrentProgram reste sur ATHX legacy → le nouveau n'apparaît jamais), puis
// proposer la date de démarrage (le wizard contournait ce flux → aucune date saisie).
window._activateNewProgram = function(id) {
  addActiveProgram(id);
  setCurrentProgram(id);
  _promptStartDate(id, () => {
    _showSaveToast('✓ Programme créé et activé');
    window.showSection('programmes');
    renderPrograms();
    initWeekSel();
  });
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
window._removeVacances = function(idx) {
  removeVacances(idx);
  renderSaisie();
};

window._clearVacances = function() {
  clearAllVacances();
  renderSaisie();
};

window._saveVacances = function() {
  const d = document.getElementById('vacDebut')?.value;
  const f = document.getElementById('vacFin')?.value;
  const a = document.getElementById('vacActivite')?.value || 'sedentaire';
  if(!d || !f || new Date(f) < new Date(d)) { alert('Dates invalides.'); return; }

  // Sélecteur "Dernière sem. entraînement" → première semaine sautée
  //   ""  = Auto (détection)          → null
  //   "0" = Aucune (reprise directe)  → -1 (sentinelle : firstSkippedWeek = repriseWeek)
  //   "N" = dernière sem. entraînée   → première sautée = N+1
  const fsRaw = document.getElementById('vacFirstSkip')?.value;
  let manualFirstSkip = null;
  if(fsRaw === '0')      manualFirstSkip = -1;
  else if(fsRaw)         manualFirstSkip = parseInt(fsRaw, 10) + 1;

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
  _showRepriseDialog(suggestedReprise, totalWeeks, lastDataWeek, prog, manualFirstSkip);
};

function _showRepriseDialog(suggested, total, lastData, prog, manualFirstSkip) {
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
    window._confirmReprise(week, manualFirstSkip);
  };

  row.append(btnIgnore, btnConfirm);
  sheet.append(title, subtitle, sel, row);
  modal.appendChild(sheet);
  document.body.appendChild(modal);
}


function _renderProgDetailView(prog, container) {
  if(!prog || !container) return;

  const DOMAINES_LABELS = { hyrox:'🏟 Hyrox', force:'🏋 Force', gym:'💪 Gym', cardio:'🏃 Cardio', mobilite:'🧘 Mobilité', mixte:'⚡ Mixte', grossesse:'🤰 Grossesse' };

  // For ATHX fixed program — inject the full programme.html content
    if(prog.migratedFrom === 'athx_legacy' || prog.subtype === 'fixed') {
    // Get ATHX HTML and prefix all IDs to avoid duplicates with hidden #programme
    const progSection = document.getElementById('programme');
    if(!progSection) return;

    // Get raw HTML and prefix all id= and targets
    let athxHtml = progSection.innerHTML;
    // Prefix IDs: id="warmup" → id="athx-warmup"
    athxHtml = athxHtml.replace(/ id="/g, ' id="athx-');
    // Prefix showProg calls: showProg('warmup') → showProgAthx('warmup')
    athxHtml = athxHtml.replace(/showProg\('([^']+)'\)/g, "showProgAthx('$1')");
    athxHtml = athxHtml.replace(/showWeek\('([^']+)','([^']+)'\)/g, "showWeekAthx('$1','$2')");

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

  // Cardio / endurance — vue détail dédiée (séances par semaine, pas de charges)
  if(prog.subtype === 'cardio') { _renderCardioDetailView(prog, container); return; }

  // Mobilité — vue détail dédiée (séances de mobilité, pas de charges)
  if(prog.subtype === 'mobilite') { _renderMobiliteDetailView(prog, container); return; }

  // ── Generated program — rich view (pills par jour comme ATHX) ──────────────

  // Phase colors
  const phaseColors = {
    'Base aérobie':'#e8f0fc','Construction':'#fdf0d8','Intensité':'#fdeaea',
    'Pic intensité':'#e0f4eb','Pic':'#e0f4eb','Taper':'#f1efe8',
  };
  const phaseTextColors = {
    'Base aérobie':'#1a5fb4','Construction':'#7c4a00','Intensité':'#9c2222',
    'Pic intensité':'#1b6b45','Pic':'#1b6b45','Taper':'#444441',
  };

  // Extraire les jours uniques du programme
  const refWeek = prog.semaines?.find(s => !s.isDeload && !s.isTaper) || prog.semaines?.[0];
  const dayNames = refWeek?.jours?.map(j => j.nom) || [];

  // Build pills
  let pillsHtml = '';
  dayNames.forEach((day, di) => {
    const split = refWeek.jours[di]?.split || '';
    const label = split && split !== day ? `${day} — ${split}` : day;
    pillsHtml += `<button class="${di===0?'active':''}" onclick="_showGenTab(this,'gday-${di}')">${esc(label)}</button>`;
  });
  pillsHtml += `<button onclick="_showGenTab(this,'gwarmup')">🔥 Échauffements</button>`;
  // Phases tab removed — info already visible in bloc sub-navigation
  pillsHtml += `<button onclick="_showGenTab(this,'gvacances')">🏖 Vacances</button>`;

  // Identifier les blocs (phases groupées)
  const blocs = [];
  let currentBloc = null;
  prog.semaines.forEach(sem => {
    const blocKey = sem.isDeload ? `deload-${sem.num}` : (sem.isTaper ? 'taper' : sem.phase);
    if(!currentBloc || currentBloc.key !== blocKey) {
      currentBloc = { key: blocKey, label: sem.isDeload ? `S${sem.num} Deload` : (sem.isTaper ? `S${sem.num} Taper` : sem.phase), start: sem.num, end: sem.num, weeks: [sem], isDeload: sem.isDeload, isTaper: sem.isTaper, phase: sem.phase };
      blocs.push(currentBloc);
    } else {
      currentBloc.end = sem.num;
      currentBloc.weeks.push(sem);
    }
  });

  // Objectifs par phase
  const PHASE_OBJECTIVES = {
    'Base aérobie':  'Volume et technique — progression linéaire des charges',
    'Construction':  'Intensité croissante — charges modérées à lourdes',
    'Intensité':     'Travail lourd — séries courtes, récup longue',
    'Pic intensité': 'Force maximale — charges lourdes, séries courtes',
    'Pic':           'Performance maximale — intensité au sommet',
    'Taper':         'Affûtage — volume minimal, maintien des acquis',
  };

  // Phase bar colors
  const PHASE_BAR = {
    'Base aérobie':  { bg:'#E6F1FB', col:'#185FA5' },
    'Construction':  { bg:'#FAEEDA', col:'#854F0B' },
    'Intensité':     { bg:'#FDEAEA', col:'#9c2222' },
    'Pic intensité': { bg:'#E1F5EE', col:'#0F6E56' },
    'Pic':           { bg:'#E1F5EE', col:'#0F6E56' },
    'Taper':         { bg:'#F1EFE8', col:'#444441' },
  };

  // Nombre d'exercices compounds par jour (les premiers sont toujours les compounds)
  // Basé sur SPLIT_COMPOUNDS du générateur : 2-4 compounds en premier, le reste = accessoires
  const COMPOUNDS_PER_DAY = 3; // les 3 premiers exercices de chaque jour sont considérés "Primaire"
  const CORE_MUSCLES = new Set(['core','lombaires','abdominaux','obliques']);
  // Exercices compounds (union de SPLIT_COMPOUNDS du générateur) → badge "Primaire".
  const COMPOUND_IDS = new Set(['bench','press','ohp','dips','deadlift','row_barre','pullup',
    'rdl','squat','squat_fs','lunges','leg_press','thruster','burpee','box_jump','wall_ball']);
  // Map des 1RM du programme (utilisée pour estimer l'incrément de charge par bloc).
  const orm = prog.orm || {};

  // Helper: estimate session duration (sets × (time_per_set + rest))
  function _estimateMinutes(exercises) {
    let total = 0;
    exercises.forEach(ex => {
      // Séances cardio / drills mobilité (jours Mixte) : durée propre, pas de séries.
      if(ex.kind === 'cardio')   { total += (ex.totalMin || ex.duration || 30) * 60; return; }
      if(ex.kind === 'mobility') { total += 150; return; } // ~2 min 30 par drill
      const sets = ex.series || 4;
      const reps = ex.reps || 6;
      const secPerSet = Math.max(20, reps * 3); // ~3 sec per rep
      const rest = ex.pct1rm >= 85 ? 210 : ex.pct1rm >= 75 ? 150 : 90; // 3.5/2.5/1.5 min
      total += sets * (secPerSet + rest);
    });
    return Math.round(total / 60);
  }

  // Helper: build weekly weight progression text for an exercise across bloc weeks
  function _weekProgression(blocWeeks, dayIdx, exId) {
    return blocWeeks.map(sem => {
      const ex = sem.jours?.[dayIdx]?.exercices?.find(e => e.id === exId);
      return ex?.kgPlan ? `S${sem.num}:${ex.kgPlan}kg` : null;
    }).filter(Boolean).join(', ');
  }


  // Repères techniques par exercice : partagés (data.js), affichés par ligne d'exercice.
  const EX_CUES = EXERCISE_CUES;

  // Progression description par exercice dans un bloc
  const EX_PROG_DESC = {
    'Base aérobie':  'Programme linéaire — augmentation progressive des charges chaque semaine.',
    'Construction':  'Intensité croissante — charges modérées à lourdes, volume maintenu.',
    'Intensité':     'Travail lourd — séries courtes, récupération longue entre les séries.',
    'Pic intensité': 'Peak force — charges proches du max, focus technique sous charge.',
    'Pic':           'Performance maximale — test de force.',
    'Taper':         'Affûtage — volume minimal, charges légères, récupération complète.',
  };

  // Build per-day content with ATHX-style design
  let daysContentHtml = '';
  dayNames.forEach((day, di) => {
    const refDay = refWeek.jours[di];
    const split = refDay?.split || '';
    // Jours cardio/mobilité (Mixte) : n'afficher que la séance cardio en en-tête.
    const exNames = (refDay?.exercices?.some(e => e.kind)
      ? refDay.exercices.filter(e => e.kind === 'cardio')
      : refDay?.exercices || []).slice(0,2).map(e => e.nom || e.id).join(' + ') || '';
    const estMin = _estimateMinutes(refDay?.exercices || []);

    // Sous-pills par bloc (format ATHX: Bloc X (S1-5), S6 Deload)
    let blocNum = 0;
    let subPills = blocs.map((bloc, bi) => {
      let label;
      if(bloc.isDeload) {
        label = `S${bloc.start} Récup (deload)`;
      } else if(bloc.isTaper) {
        label = `S${bloc.start} Taper`;
      } else {
        blocNum++;
        label = bloc.start === bloc.end ? `Bloc ${blocNum} (S${bloc.start})` : `Bloc ${blocNum} (S${bloc.start}–${bloc.end})`;
      }
      return `<button class="prog-bloc-btn${bi===0?' active':''}" onclick="_showGenBloc(${di},${bi},this)">${esc(label)}</button>`;
    }).join('');

    // Contenu par bloc
    blocNum = 0;
    let blocsHtml = blocs.map((bloc, bi) => {
      if(!bloc.isDeload && !bloc.isTaper) blocNum++;

      // Phase bar
      const barStyle = bloc.isDeload ? { bg:'#F1EFE8', col:'#444441' }
        : bloc.isTaper ? { bg:'#F1EFE8', col:'#444441' }
        : (PHASE_BAR[bloc.phase] || { bg:'#E6F1FB', col:'#185FA5' });
      const phaseLabel = bloc.isDeload ? `Semaine ${bloc.start} — Deload`
        : bloc.isTaper ? `Semaine ${bloc.start} — Taper`
        : `Bloc ${blocNum} — ${PHASE_OBJECTIVES[bloc.phase] || bloc.phase}`;
      let html = `<span class="p-phase-bar" style="background:${barStyle.bg};color:${barStyle.col}">${esc(phaseLabel)}</span>`;

      if(bloc.isDeload || bloc.isTaper) {
        // Deload/Taper: simple card
        const sem = bloc.weeks[0];
        const deloadExs = sem.jours?.[di]?.exercices || [];
        const exList = deloadExs.map(ex =>
          ex.kind ? `${ex.nom} — ${ex.scheme || '—'}`
                  : `${ex.scheme} ${ex.nom} @ ${ex.kgPlan ? ex.kgPlan+'kg' : ex.pct1rm+'%'}`
        ).join('. ');
        const dMin = deloadExs.some(e => e.kind)
          ? _estimateMinutes(deloadExs)
          : Math.max(15, Math.round(estMin*0.6));
        html += `<div class="p-card"><div class="p-card-body">${esc(exList)}. Durée estimée : ~${dMin} min.</div></div>`;
      } else if((refWeek.jours?.[di]?.exercices || []).some(e => e.kind === 'cardio' || e.kind === 'mobility')) {
        // Jour cardio / mobilité (programme Mixte) : fiche séance + drills
        const firstWeek = bloc.weeks[0];
        const dayExercises = firstWeek.jours?.[di]?.exercices || [];

        dayExercises.filter(e => e.kind === 'cardio').forEach(ex => {
          const prog_ = bloc.weeks.map(sem => {
            const e = sem.jours?.[di]?.exercices?.find(x => x.kind === 'cardio');
            return e ? `S${sem.num}: ${e.scheme}` : null;
          }).filter(Boolean).join(' · ');
          html += `<div class="p-card">
            <div class="p-card-title">${esc(ex.nom)} — ${esc(ex.scheme || '—')}</div>
            <span class="p-ex-tag" style="background:${ex.zoneBg||'var(--surface2)'};color:${ex.zoneCol||'var(--text2)'};display:inline-block;margin-bottom:6px">${esc(ex.zoneLabel||'')}</span>
            <div class="p-card-body"><strong>Intensité :</strong> RPE ${esc(ex.rpeTarget||'—')}${ex.hrPct?` · ${esc(ex.hrPct)}`:''}${ex.feel?`<br><strong>Allure / ressenti :</strong> ${esc(ex.feel)}`:''}${ex.detail?`<br>${esc(ex.detail)}`:''}${ex.cue?`<br><strong>Technique :</strong> ${esc(ex.cue)}`:''}${prog_?`<br><strong>Progression du bloc :</strong> ${esc(prog_)}`:''}</div>
          </div>`;
        });

        const drills = dayExercises.filter(e => e.kind === 'mobility');
        if(drills.length) {
          const withCardio = dayExercises.some(e => e.kind === 'cardio');
          html += `<div class="p-card"><div class="p-card-title">🧘 Mobilité${withCardio ? ' — fin de séance' : ''}</div>`;
          drills.forEach((ex, gi) => {
            html += `<div class="p-ex-row">
              <div class="p-ex-num">${gi + 1}</div>
              <div class="p-ex-name">${esc(ex.nom)}</div>
              <div class="p-ex-detail">${esc(ex.scheme || '')}${ex.cue ? `<br><span style="color:var(--text3)">${esc(ex.cue)}</span>` : ''}</div>
            </div>`;
          });
          html += `</div>`;
          if(withCardio) html += `<div class="p-note">Durée estimée : ~${_estimateMinutes(dayExercises)} min. Mobilité en fin de séance, au calme.</div>`;
          else html += `<div class="p-note">Durée estimée : ~${_estimateMinutes(dayExercises)} min. Aucun drill ne doit être douloureux.</div>`;
        } else {
          html += `<div class="p-note">Durée estimée : ~${_estimateMinutes(dayExercises)} min.</div>`;
        }
      } else {
        // Training bloc: rich exercise cards grouped by compound
        const firstWeek = bloc.weeks[0];
        const dayExercises = firstWeek.jours?.[di]?.exercices || [];
        let currentCard = [];
        let cards = [];

        dayExercises.forEach((ex, ei) => {
          const isCompound = COMPOUND_IDS.has(ex.id);
          if(isCompound && currentCard.length > 0) {
            cards.push(currentCard);
            currentCard = [];
          }
          currentCard.push({ ...ex, idx: ei });
        });
        if(currentCard.length) cards.push(currentCard);

        cards.forEach(group => {
          const mainEx = group[0];
          const prog_ = _weekProgression(bloc.weeks, di, mainEx.id);
          html += `<div class="p-card">`;
          const endPct = bloc.weeks.length > 1 ? (bloc.weeks[bloc.weeks.length-1].jours?.[di]?.exercices?.find(e=>e.id===mainEx.id)?.pct1rm||mainEx.pct1rm) : mainEx.pct1rm;
          const incr = mainEx.kgPlan && orm ? '+' + Math.round((endPct - mainEx.pct1rm) * (orm[mainEx.id]||orm.squat||orm.press||80) / 100 / 1.25) * 1.25 + ' kg/bloc' : '';
          html += `<div class="p-card-title">${esc(mainEx.nom)} — ${mainEx.scheme} @ ${mainEx.pct1rm}–${endPct}%${incr ? ' (' + incr + ')' : ''}</div>`;
          if(prog_) html += `<div class="p-card-body" style="margin-bottom:6px">${prog_}</div>`;

          group.forEach((ex, gi) => {
            const role = gi === 0 ? 'Primaire' : (ex.muscles?.some(m => CORE_MUSCLES.has(m)) ? 'Core' : 'Accessoire');
            const roleClass = role === 'Primaire' ? 'p-tag-f' : (role === 'Core' ? 'p-tag-r' : 'p-tag-f');
            const rest = ex.pct1rm >= 85 ? 'Repos 3–4 min.' : ex.pct1rm >= 75 ? 'Repos 2–3 min.' : 'Repos 1–2 min.';
            const cue  = EX_CUES[ex.id];
            html += `<div class="p-ex-row">
              <div class="p-ex-num">${ex.idx + 1}</div>
              <div class="p-ex-name">${esc(ex.nom)}</div>
              <div class="p-ex-detail">${ex.scheme} @ ${ex.kgPlan ? ex.kgPlan+'kg' : ex.pct1rm+'%'}. ${rest}${cue ? `<br><span style="color:var(--text3)">${esc(cue)}</span>` : ''}</div>
              <div class="p-ex-tag ${roleClass}">${role}</div>
            </div>`;
          });
          html += `</div>`;
        });

        // Time footer
        const blocMin = _estimateMinutes(dayExercises);
        html += `<div class="p-note">${dayExercises.map(e => `${esc(e.nom)} ${esc(e.scheme)}`).join(', ')} = ~${blocMin} min. Accessoires en super-set pour gagner du temps.</div>`;
      }

      return `<div class="prog-bloc-content ${bi===0?'active':''}" data-day="${di}" data-bloc="${bi}">${html}</div>`;
    }).join('');

    daysContentHtml += `<div id="gday-${di}" class="prog-tab ${di===0?'active':''}">
      <div class="p-section">
        <div class="p-sec-title">${esc(day)} — ${esc(split)}${exNames ? ` (${esc(exNames)})` : ''}</div>
        <span class="p-time-badge">~${estMin} min total · Échauffement + séance + retour au calme</span>
        <div class="p-week-sel">${subPills}</div>
        ${blocsHtml}
      </div>
    </div>`;
  });


  // Échauffements tab
  daysContentHtml += `<div id="gwarmup" class="prog-tab">
    <div class="p-section">
      <div class="p-sec-title">Échauffement recommandé</div>
      <span class="p-time-badge">8–12 min avant chaque séance</span>
      <div class="p-card">
        <div class="p-card-title">Phase 1 — Activation cardiovasculaire (3 min)</div>
        <div class="p-ex-row"><div class="p-ex-num">1</div><div class="p-ex-name">Vélo / rameur léger</div><div class="p-ex-detail">3 min à allure légère. Objectif : élever la température musculaire.</div></div>
      </div>
      <div class="p-card">
        <div class="p-card-title">Phase 2 — Mobilité articulaire (3–5 min)</div>
        <div class="p-ex-row"><div class="p-ex-num">1</div><div class="p-ex-name">Rotations thoraciques</div><div class="p-ex-detail">10 reps/côté en quadrupédie. Essentiel pour le squat et le press.</div></div>
        <div class="p-ex-row"><div class="p-ex-num">2</div><div class="p-ex-name">Étirement fléchisseurs hanche</div><div class="p-ex-detail">30 sec/côté. Profondeur de squat et position de deadlift.</div></div>
        <div class="p-ex-row"><div class="p-ex-num">3</div><div class="p-ex-name">Dislocations épaules (bande)</div><div class="p-ex-detail">10 reps. Amplitude overhead pour le press.</div></div>
        <div class="p-ex-row"><div class="p-ex-num">4</div><div class="p-ex-name">Mobilité chevilles</div><div class="p-ex-detail">10 reps/côté genou au mur. Dorsiflexion = profondeur squat.</div></div>
      </div>
      <div class="p-card">
        <div class="p-card-title">Phase 3 — Activation musculaire (2–3 min)</div>
        <div class="p-ex-row"><div class="p-ex-num">1</div><div class="p-ex-name">Banded clamshells</div><div class="p-ex-detail">2×15 avec bande légère. Activation fessiers moyens.</div></div>
        <div class="p-ex-row"><div class="p-ex-num">2</div><div class="p-ex-name">Face pulls bande</div><div class="p-ex-detail">2×15. Activation rotateurs externes épaule.</div></div>
        <div class="p-ex-row"><div class="p-ex-num">3</div><div class="p-ex-name">Séries montantes</div><div class="p-ex-detail">Barre vide ×10 → 50% ×5 → 70% ×3. Ne jamais commencer à charge max à froid.</div></div>
      </div>
      <div class="p-note">Adapter selon le jour : jours Push → insister mobilité épaules. Jours Legs → insister hanches + chevilles. Si temps limité : garder mobilité + séries montantes (5 min).</div>
    </div>
  </div>`;

  // Vacances tab
  daysContentHtml += `<div id="gvacances" class="prog-tab">
    <div class="p-section">
      <div class="p-sec-title">🏖 Gestion des vacances et absences</div>
      <div class="p-card">
        <div class="p-card-body">
          Les vacances sont gérées depuis l'onglet <strong>Tracker</strong> → section <strong>Vacances</strong> en bas de page.<br><br>
          Le système applique automatiquement un <strong>coefficient de reprise</strong> progressif après chaque période d'absence :<br>
          • 1 semaine d'absence → reprise à ~90% des charges<br>
          • 2 semaines → ~80%<br>
          • 3+ semaines → ~70% avec remontée progressive<br><br>
          Les recommandations de charge S+1 tiennent compte de ce coefficient.
        </div>
      </div>
    </div>
  </div>`;

  // Phases tab removed
  // Nutrition tab retirée — la nutrition vit désormais dans la section top-level 🥗 Nutrition

  container.innerHTML = `
    <div style="padding:12px 16px 8px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);margin-bottom:8px">
      <div>
        <div style="font-size:15px;font-weight:700">${esc(prog.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${DOMAINES_LABELS[prog.config?.domaine]||''} · ${prog.totalWeeks} sem. · ${prog.config?.seancesParSemaine||'?'}×/sem · ${prog.config?.niveau||''}</div>
      </div>
      <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
    </div>
    <div class="prog-top-nav">${pillsHtml}</div>
    ${daysContentHtml}`;

  // Bloc sub-navigation within a day tab
  window._showGenBloc = function(dayIdx, blocIdx, btn) {
    const dayTab = container.querySelector('#gday-' + dayIdx);
    if(!dayTab) return;
    dayTab.querySelectorAll('.prog-bloc-btn').forEach(b => b.classList.remove('active'));
    dayTab.querySelectorAll('.prog-bloc-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    dayTab.querySelector(`.prog-bloc-content[data-day="${dayIdx}"][data-bloc="${blocIdx}"]`)?.classList.add('active');
  };

  // Tab switching (same pattern as ATHX)
  window._showGenTab = function(btn, tabId) {
    container.querySelectorAll('.prog-top-nav button').forEach(b => b.classList.remove('active'));
    container.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    container.querySelector('#' + tabId)?.classList.add('active');
  };
}

// ── Vue détail cardio / endurance ──────────────────────────────────────────────
// Navigation façon ATHX : pills par JOUR → sous-boutons par SEMAINE → fiche séance riche.
function _renderMobiliteDetailView(prog, container) {
  const sems = prog.semaines || [];
  const ref  = sems[0];
  const days = ref?.jours || [];

  const drillCard = d => `<div class="mob-drill">
      <div class="mob-drill-head"><span class="mob-drill-name">${esc(d.nom || '')}</span><span class="mob-drill-scheme">${esc(d.scheme || '')}</span></div>
      ${d.cue ? `<div class="mob-drill-cue">${esc(d.cue)}</div>` : ''}
      ${d.caution ? `<div class="mob-caution">⚠️ ${esc(d.caution)}</div>` : ''}
    </div>`;

  const sessionsHtml = days.map(j => `
    <div class="p-section">
      <div class="p-sec-title">${esc(j.nom || '')}</div>
      <div class="p-card">${(j.exercices || []).map(drillCard).join('')}</div>
    </div>`).join('');

  container.innerHTML = `
    <div style="padding:12px 16px 8px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);margin-bottom:8px">
      <div>
        <div style="font-size:15px;font-weight:700">${esc(prog.name)}</div>
        <div style="font-size:11px;color:var(--text3)">🧘 Mobilité · ${prog.totalWeeks} sem. · ${prog.config?.seancesParSemaine || '?'}×/sem · ${esc(prog.zoneLabel || 'Toutes zones')}</div>
      </div>
      <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
    </div>
    <div class="p-note" style="margin:0 12px 8px">Programme <strong>souple</strong> : répartis ces séances dans la semaine (idéalement un peu chaque jour). Progression douce sur ${prog.totalWeeks} semaines — le PNF puis le travail de fin d'amplitude sont introduits progressivement selon ton niveau. Suis-les dans le Tracker. Aucun mouvement ne doit être douloureux.</div>
    ${sessionsHtml || '<div class="wiz-note" style="margin:12px">Aucune séance générée.</div>'}`;
}

function _renderCardioDetailView(prog, container) {
  const PHASE_BAR = {
    'Base aérobie':        { bg:'#E1F5EE', col:'#0F6E56' },
    'Développement seuil': { bg:'#FAEEDA', col:'#854F0B' },
    'Pic VO₂max':          { bg:'#FDEAEA', col:'#9C2222' },
    'Affûtage':            { bg:'#F1EFE8', col:'#444441' },
  };
  const _phaseBar = sem => sem.isDeload ? { bg:'#F1EFE8', col:'#444441' }
    : sem.isTaper ? { bg:'#F1EFE8', col:'#444441' }
    : (PHASE_BAR[sem.phase] || { bg:'#E6F1FB', col:'#185FA5' });

  const sems = prog.semaines || [];
  const refWeek = sems.find(s => !s.isDeload && !s.isTaper) || sems[0];
  const dayNames = refWeek?.jours?.map(j => j.nom) || [];

  // Fiche riche d'une séance (jour, semaine)
  const _sessionCard = (sem, s) => {
    const bar = _phaseBar(sem);
    const phaseLabel = sem.isDeload ? `Semaine ${sem.num} — Décharge (assimilation)`
      : sem.isTaper ? `Semaine ${sem.num} — Affûtage`
      : `Semaine ${sem.num} — ${sem.phase}`;
    let body = `<strong>Intensité :</strong> ${esc(s.zoneLabel||'')} · RPE ${esc(s.rpeTarget||'—')}${s.hrPct?` · ${esc(s.hrPct)}`:''}`;
    if(s.feel)   body += `<br><strong>Allure / ressenti :</strong> ${esc(s.feel)}`;
    if(s.detail) body += `<br>${esc(s.detail)}`;
    if(s.cue)    body += `<br><strong>Technique :</strong> ${esc(s.cue)}`;
    if(s.totalMin) body += `<br><strong>Durée estimée :</strong> ~${s.totalMin} min (échauffement + retour au calme inclus)`;
    return `<span class="p-phase-bar" style="background:${bar.bg};color:${bar.col}">${esc(phaseLabel)}${sem.distribution?` · ${esc(sem.distribution)}`:''}</span>
      <div class="p-card">
        <div class="p-card-title">${esc(s.nom||'')} — ${esc(s.scheme||'—')}</div>
        <span class="p-ex-tag" style="background:${s.zoneBg||'var(--surface2)'};color:${s.zoneCol||'var(--text2)'};display:inline-block;margin-bottom:6px">${esc(s.zoneLabel||'')}</span>
        <div class="p-card-body">${body}</div>
      </div>`;
  };

  // Pills par jour (+ rôle dominant)
  const pills = dayNames.map((dn, di) => {
    const s0 = refWeek?.jours?.[di]?.exercices?.[0];
    const role = s0 ? (s0.zone >= 3 ? 'Qualité' : (s0.typeLabel || '')) : '';
    return `<button class="${di===0?'active':''}" onclick="_showCardioTab(this,'cday-${di}')">${esc(dn)}${role?` — ${esc(role)}`:''}</button>`;
  }).join('');

  // Contenu par jour : sous-boutons semaine + fiche de chaque semaine
  const daysHtml = dayNames.map((dn, di) => {
    const weekBtns = sems.map((sem, wi) => {
      const bar = _phaseBar(sem);
      return `<button class="prog-bloc-btn${wi===0?' active':''}" style="border-color:${bar.col}55"
        onclick="_showCardioWeek(${di},${wi},this)">S${sem.num}</button>`;
    }).join('');
    const weekContent = sems.map((sem, wi) => {
      const s = sem.jours?.[di]?.exercices?.[0] || {};
      return `<div class="prog-bloc-content${wi===0?' active':''}" data-cday="${di}" data-cweek="${wi}">${_sessionCard(sem, s)}</div>`;
    }).join('');
    const s0 = refWeek?.jours?.[di]?.exercices?.[0];
    const role = s0 ? (s0.zone >= 3 ? 'séance qualité' : (s0.typeLabel || '')) : '';
    return `<div id="cday-${di}" class="prog-tab ${di===0?'active':''}">
      <div class="p-section">
        <div class="p-sec-title">${esc(dn)}${role?` — ${esc(role)}`:''}</div>
        <div class="p-week-sel">${weekBtns}</div>
        ${weekContent}
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div style="padding:12px 16px 8px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);margin-bottom:8px">
      <div>
        <div style="font-size:15px;font-weight:700">${esc(prog.name)}</div>
        <div style="font-size:11px;color:var(--text3)">🏃 Endurance · ${prog.totalWeeks} sem. · ${prog.config?.seancesParSemaine||'?'}×/sem · ${esc(prog.modalityLabel || 'Course')}</div>
      </div>
      <button class="wiz-show-list-btn" onclick="showProgramsList()">← Retour</button>
    </div>
    <div class="p-note" style="margin:0 12px 8px">Distribution <strong>polarisée ~80/20</strong> : l'essentiel du volume en zone facile (Z1–Z2, test de la parole possible), une minorité en qualité (seuil/VO₂max). Progression ~8 %/sem, décharge entre les blocs, affûtage final. <em>Choisis un jour, puis une semaine.</em></div>
    <div class="prog-top-nav">${pills}</div>
    ${daysHtml}`;

  window._showCardioTab = function(btn, tabId) {
    container.querySelectorAll('.prog-top-nav button').forEach(b => b.classList.remove('active'));
    container.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    container.querySelector('#' + tabId)?.classList.add('active');
  };

  // Sous-navigation semaine au sein d'un jour
  window._showCardioWeek = function(di, wi, btn) {
    const dayTab = container.querySelector('#cday-' + di);
    if(!dayTab) return;
    dayTab.querySelectorAll('.prog-bloc-btn').forEach(b => b.classList.remove('active'));
    dayTab.querySelectorAll('.prog-bloc-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    dayTab.querySelector(`.prog-bloc-content[data-cday="${di}"][data-cweek="${wi}"]`)?.classList.add('active');
  };
}

function renderPrograms() {
  // Toujours revenir à la liste racine — comportement standard tab-bar :
  // un clic explicite sur l'icône de navigation ramène à l'accueil de la section.
  document.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  const listView = document.getElementById('programs-list-view');
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
      const isActive = activeIds.has(p.id);
      const dom    = DOMAINES_LABELS[p.config?.domaine] || p.config?.domaine || '—';
      const niv    = NIVEAUX_LABELS[p.config?.niveau] || '—';
      const weeks  = p.totalWeeks || '?';
      const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—';
      const closedAt = p.closedAt ? new Date(p.closedAt).toLocaleDateString('fr-FR') : null;
      const statusLabel = STATUS_LABELS[p.status] || p.status;
      const statusColor = STATUS_COLORS[p.status] || 'var(--text3)';
      const compet = p.config?.competition?.type ? ` · 🏆 ${esc(p.config.competition.type)}` : '';

      return `<div class="program-card ${isActive?'active-program':''}">
        <div class="prog-card-top">
          <div class="prog-card-name">${esc(p.name||'Programme')}</div>
          <span style="font-size:11px;font-weight:600;color:${statusColor}">${esc(statusLabel)}</span>
        </div>
        <div class="prog-card-meta">
          <span class="prog-meta-tag">${esc(dom)}</span>
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
            <button class="prog-action-btn danger" onclick="event.stopPropagation();deleteProg('${p.id}')" style="margin-left:auto">🗑</button>
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
        <span class="prog-day-name">${esc(day.nom)}</span>
        <span class="prog-day-split">${day.split&&day.split!==day.nom?esc(day.split):''}</span>
      </div>
      <div class="prog-ex-list">
        ${day.exercices.map(ex => `
          <div class="prog-ex-item">
            <span class="prog-ex-item-name">${esc(ex.nom)}</span>
            <span class="prog-ex-item-scheme">${esc(ex.series||'?')}×${esc(ex.reps||'?')}</span>
            ${ex.kgPlan
              ? `<span class="prog-ex-item-kg">${esc(ex.kgPlan)} kg</span>`
              : `<span class="prog-ex-item-kg">${esc(ex.pct1rm||'?')}% 1RM</span>`}
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

  // Nutrition : délégation d'événements du wizard (chips/cards)
  bindNutritionEvents();

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
      // Listen for SW_UPDATED message from new service worker
      navigator.serviceWorker.addEventListener('message', e => {
        if(e.data?.type === 'SW_UPDATED') _showUpdateBanner();
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
