/**
 * io.js — JSON and CSV import/export
 */

import { getAllRecords, importRecords, getVacancesList, addVacances } from './store.js';
import { validateImport }               from './security.js';
import { EXERCISES }                    from './data.js';
import { normRecord }                   from './store.js';
import { repaintMuscles }               from './musculaire.js';

export function exportJSON() {
  const payload = {
    version: 3,
    exported: new Date().toISOString(),
    data: getAllRecords(),
    vacances: getVacancesList(),
  };
  _download(JSON.stringify(payload, null, 2), `athx_${_dateStr()}.json`, 'application/json');
}

export function exportCSV() {
  const rows = [['Exercice','Jour','Semaine','Série','Charge','Unité','Reps','RPE','Plan','Delta','Date']];

  EXERCISES.forEach(ex => {
    for(let w = 1; w <= 17; w++) {
      const r    = normRecord(getAllRecords()[`${ex.id}_w${w}`]);
      if(!r) continue;
      const plan = ex.plan[w - 1] || '';
      const date = r.ts ? new Date(r.ts).toLocaleDateString('fr-FR') : '';
      (r.sets || []).forEach((s, i) => {
        if(!s?.kg && !s?.reps) return;
        const delta = plan && s?.kg ? Math.round((s.kg - plan) * 10) / 10 : '';
        rows.push([ex.name, ex.day, `S${w}`, `S${i+1}`, s?.kg || '', ex.unit, s?.reps || '', s?.rpe || '', plan, delta, date]);
      });
    }
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  _download('\uFEFF' + csv, `athx_${_dateStr()}.csv`, 'text/csv;charset=utf-8');
}

export function importJSON(event) {
  const file = event.target.files[0];
  if(!file) return;

  if(file.size > 524_288) {
    alert('Fichier trop volumineux (max 512 Ko).');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const parsed   = JSON.parse(e.target.result);
      const incoming = parsed.data || parsed;
      const result   = validateImport(incoming);

      if(!result.ok) throw new Error(result.error);

      importRecords(result.clean);

      // Restore vacances periods if present
      if(Array.isArray(parsed.vacances)) {
        parsed.vacances.forEach(v => {
          if(v?.debut && v?.fin) addVacances(v.debut, v.fin, v.activite || 'sedentaire');
        });
      }

      const fb = document.getElementById('importFeedback');
      if(fb) { fb.style.display = 'inline'; setTimeout(() => fb.style.display = 'none', 3000); }

      // Refresh all views
      const { renderSaisie } = await import('./tracker.js');
      renderSaisie();
      repaintMuscles();

    } catch(err) {
      alert(`Import échoué : ${err.message}`);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _download(content, filename, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function _dateStr() {
  return new Date().toISOString().slice(0, 10);
}
