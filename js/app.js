/**
 * app.js — Entry point
 * Handles routing between sections, PWA registration, and app init.
 */

import { dbInit }                        from './db.js';
import { initWeekSel, renderSaisie, renderProgression, renderHistorique } from './tracker.js';
import { renderMusculaire, initBodyDelegation, repaintMuscles }           from './musculaire.js';
import { exportJSON, exportCSV, importJSON }                              from './io.js';

// ── Routing ──────────────────────────────────────────────────────────────────

const SECTIONS   = ['tracker','musculaire','programme','doc'];
const PROG_TABS  = ['nutrition','warmup','mardi','mercredi','jeudi','vendredi'];
const TRACK_TABS = ['saisie','progression','historique'];
const DOC_TABS   = ['doc-intro','doc-tracker','doc-progression','doc-statut','doc-musculaire','doc-rpe','doc-export'];

export function showSection(id) {
  document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const idx = SECTIONS.indexOf(id);
  if(idx >= 0) document.querySelectorAll('.top-nav-btn')[idx]?.classList.add('active');
  if(id === 'musculaire') renderMusculaire();
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
  if(nav) {
    ['b1','b1d','b2','b2d','b3','b3d'].forEach((b, i) =>
      nav.querySelectorAll('button')[i]?.classList.toggle('active', b === bloc)
    );
  }
}

export function showDoc(id) {
  document.querySelectorAll('.doc-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.doc-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  const idx = DOC_TABS.indexOf(id);
  if(idx >= 0) document.querySelectorAll('.doc-nav-item')[idx]?.classList.add('active');
}

// ── Expose to inline HTML handlers ───────────────────────────────────────────
// (HTML onclick attributes can't import modules directly)

window.showSection  = showSection;
window.showTracker  = showTracker;
window.showProg     = showProg;
window.showWeek     = showWeek;
window.showDoc      = showDoc;
window.exportJSON   = exportJSON;
window.exportCSV    = exportCSV;
window.importJSON   = importJSON;

// switchBodyView exposed by musculaire module
import { switchBodyView } from './musculaire.js';
window.switchBodyView = switchBodyView;

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  // 1. Boot IndexedDB (loads all data into cache)
  await dbInit();

  // 2. Init tracker
  initWeekSel();
  renderSaisie();

  // 3. Init body SVG delegation
  initBodyDelegation();

  // 4. Initial muscle paint (runs even before user visits musculaire tab)
  repaintMuscles();

  // 5. Bind data toolbar buttons
  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
  document.getElementById('btnExportCSV')?.addEventListener('click',  exportCSV);
  document.getElementById('fileImport')?.addEventListener('change',   importJSON);

  // 6. Register Service Worker + notify on update
  if('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      console.log('[SW] registered:', reg.scope);

      // Detect when a new SW is waiting (new version available)
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if(newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            _showUpdateBanner();
          }
        });
      });

      // Check for updates every time the app gains focus
      document.addEventListener('visibilitychange', () => {
        if(document.visibilityState === 'visible') reg.update();
      });

    } catch(err) {
      console.warn('[SW] registration failed:', err);
    }
  }

  console.log('[ATHX] App ready');
}

function _showUpdateBanner() {
  const banner = document.createElement('div');
  banner.style.cssText = [
    'position:fixed','bottom:16px','left:50%','transform:translateX(-50%)',
    'background:#1a1a18','color:#fff','padding:10px 18px','border-radius:24px',
    'font-size:13px','font-weight:500','display:flex','gap:12px','align-items:center',
    'box-shadow:0 4px 20px rgba(0,0,0,.3)','z-index:9999','white-space:nowrap',
  ].join(';');
  banner.innerHTML = '⬆ Nouvelle version disponible <button style="background:#fff;color:#1a1a18;border:none;border-radius:12px;padding:3px 12px;font-size:12px;font-weight:600;cursor:pointer" onclick="window.location.reload()">Mettre à jour</button>';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 30000); // auto-dismiss after 30s
}

document.addEventListener('DOMContentLoaded', init);
