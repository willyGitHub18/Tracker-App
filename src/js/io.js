/**
 * io.js — JSON and CSV import/export
 */

import { getAllRecords, importRecords, getVacancesList, addVacances, setVacances, setProfile } from './store.js';
import { validateImport, safeId, sanitizeDeep, sanitizeImportedProgram,
         sanitizeImportedPlan, sanitizeImportedAssessment, sanitizeImportedLogs } from './security.js';
import { EXERCISES }                    from './data.js';
import { normRecord }                   from './store.js';
import { repaintMuscles }               from './musculaire.js';
import { getPrograms, saveProgram }     from './programs.js';
import { dbGet, dbSet }                 from './db.js';

export function exportJSON() {
  const payload = {
    version: 3,
    exported: new Date().toISOString(),
    data: getAllRecords(),
    vacances: getVacancesList(),
    programs: typeof getPrograms === 'function' ? getPrograms() : [],
    programs_tracking: (typeof dbGet === 'function' ? dbGet('programs_tracking') : null) || {},
    active_programs: (typeof dbGet === 'function' ? dbGet('programs_active') : null) || [],
    active_program: (typeof dbGet === 'function' ? dbGet('program_active') : null) || null,
    nutrition_plans: (typeof dbGet === 'function' ? dbGet('nutrition_plans') : null) || [],
    mobility_assessment: (typeof dbGet === 'function' ? dbGet('mobility_assessment') : null) || null,
    mobility_logs: (typeof dbGet === 'function' ? dbGet('mobility_logs') : null) || [],
    profile: (typeof dbGet === 'function' ? dbGet('profile') : null) || null,
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
        if(s?.kg == null && s?.reps == null) return;  // kg:0 (poids de corps) reste valide
        const delta = plan && s?.kg != null ? Math.round((s.kg - plan) * 10) / 10 : '';
        rows.push([ex.name, ex.day, `S${w}`, `S${i+1}`, s?.kg ?? '', ex.unit, s?.reps ?? '', s?.rpe ?? '', plan, delta, date]);
      });
    }
  });

  const csv = rows.map(r => r.map(v => {
    let s = String(v);
    // Neutralise l'injection de formule CSV (Excel/Sheets exécutent =, +, -, @, tab/CR).
    if(/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g,'""')}"`;
  }).join(',')).join('\n');
  _download('\uFEFF' + csv, `athx_${_dateStr()}.csv`, 'text/csv;charset=utf-8');
}

export function importJSON(event) {
  const file = event.target.files[0];
  if(!file) return;

  if(file.size > 524_288) {
    if(typeof _showSaveToast === 'function') _showSaveToast('⚠️ Fichier trop volumineux (max 512 Ko)');
    else alert('Fichier trop volumineux (max 512 Ko).');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed   = JSON.parse(e.target.result);
      const incoming = parsed.data || parsed;
      const result   = validateImport(incoming);

      // Debug visible — aide à diagnostiquer sans accès aux devtools
      console.log('[import] fichier parsé, clés:', Object.keys(incoming).length);
      console.log('[import] validateImport résultat:', result.ok, result.ok ? Object.keys(result.clean).length + ' entrées nettoyées' : result.error);
      if(result.ok) {
        const sample = Object.entries(result.clean)[0];
        console.log('[import] échantillon:', sample ? JSON.stringify(sample) : 'aucune donnée');
      }

      if(!result.ok) {
        if(typeof _showSaveToast === 'function') _showSaveToast('⚠️ Import échoué : ' + result.error);
        else alert('Import échoué : ' + result.error);
        event.target.value = '';
        return;
      }

      importRecords(result.clean);

      // Restore generated programs if present
      if(Array.isArray(parsed.programs) && parsed.programs.length > 0) {
        const existing = typeof getPrograms === 'function' ? getPrograms() : [];
        // Déduplication par nom + date de création (les IDs wizard sont timestampés → diffèrent à chaque génération)
        const existingKeys = new Set(existing.map(p => `${p.name}|${p.createdAt||''}`));
        parsed.programs.forEach(raw => {
          if(typeof saveProgram !== 'function') return;
          // Sanitisation complète : id strict, texte sans HTML, structure bornée.
          const p = sanitizeImportedProgram(raw);
          if(!p) { console.log('[import] programme rejeté (id/format invalide)'); return; }
          const key = `${p.name}|${p.createdAt||''}`;
          // Si un programme avec le même nom ET la même date existe déjà → skip
          if(existingKeys.has(key)) {
            console.log('[import] programme dupliqué ignoré:', p.name, p.createdAt);
            return;
          }
          existingKeys.add(key);
          saveProgram(p);
        });
      }
      if(parsed.programs_tracking && typeof parsed.programs_tracking === 'object'
         && !Array.isArray(parsed.programs_tracking) && typeof dbSet === 'function') {
        dbSet('programs_tracking', sanitizeDeep(parsed.programs_tracking));
      }
      if(Array.isArray(parsed.nutrition_plans) && typeof dbSet === 'function') {
        dbSet('nutrition_plans', parsed.nutrition_plans.map(sanitizeImportedPlan).filter(Boolean));
      }
      if(parsed.mobility_assessment && typeof dbSet === 'function') {
        const a = sanitizeImportedAssessment(parsed.mobility_assessment);
        if(a) dbSet('mobility_assessment', a);
      }
      if(Array.isArray(parsed.mobility_logs) && typeof dbSet === 'function') {
        dbSet('mobility_logs', sanitizeImportedLogs(parsed.mobility_logs));
      }
      if(parsed.profile && typeof parsed.profile === 'object' && typeof setProfile === 'function') {
        setProfile(parsed.profile);  // setProfile valide sexe (H/F) + poids (30-300) et ignore le reste
      }
      if(Array.isArray(parsed.active_programs) && parsed.active_programs.length > 0 && typeof dbSet === 'function') {
        dbSet('programs_active', parsed.active_programs.map(id => safeId(id)).filter(Boolean));
      }
      if(parsed.active_program && typeof dbSet === 'function') {
        const ap = safeId(parsed.active_program);
        if(ap) dbSet('program_active', ap);
      }

      // Restore vacances periods if present (including repriseWeek + firstSkippedWeek)
      if(Array.isArray(parsed.vacances)) {
        // Assainissement (règle security.md §5.3) : dates ISO strictes, semaines
        // coercées en entiers bornés. Ces clés pilotent le coefficient de reprise
        // et les bannières — une valeur non numérique les rendait muets (NaN).
        const _isISO = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
                            && !isNaN(new Date(s).getTime());
        const _week  = n => {
          // Primitifs seuls : sans ce garde, ['11'] ou {toString:()=>'11'} passent par Number()
          if(typeof n !== 'number' && typeof n !== 'string') return null;
          const w = Math.floor(Number(n));
          return (w >= 1 && w <= 520) ? w : null;
        };
        parsed.vacances.slice(0, 200).forEach(v => {
          if(!_isISO(v?.debut) || !_isISO(v?.fin)) return;
          addVacances(v.debut, v.fin, v.activite || 'sedentaire');
          // Restore week metadata if present
          const rw = _week(v.repriseWeek), fsw = _week(v.firstSkippedWeek);
          if(rw || fsw) {
            const list = getVacancesList();
            // addVacances TRIE par debut : cibler par dates, jamais par index —
            // un import non chronologique attachait les métadonnées à la mauvaise
            // période (même classe de bug que le fix §33 dans _confirmReprise).
            const target = list.find(p => p.debut === v.debut && p.fin === v.fin);
            if(target) {
              if(rw)  target.repriseWeek = rw;
              if(fsw) target.firstSkippedWeek = fsw;
              setVacances(list);
            }
          }
        });
      }

      if(typeof _showSaveToast === 'function') _showSaveToast('✓ Import réussi — ' + Object.keys(result.clean).length + ' entrées');
      const fb = document.getElementById('importFeedback');
      if(fb) { fb.style.display = 'inline'; setTimeout(() => fb.style.display = 'none', 3000); }

      // Vérification post-import : relit une clé au hasard depuis le store pour confirmer la persistance
      const checkKey = Object.keys(result.clean)[0];
      if(checkKey) {
        const reread = typeof getAllRecords === 'function' ? getAllRecords()[checkKey] : null;
        console.log('[import] vérification post-écriture pour', checkKey, ':', JSON.stringify(reread));
      }

      // Refresh all views — forcer un re-render complet après un court délai
      // pour laisser le temps à IndexedDB de terminer l'écriture asynchrone
      setTimeout(() => {
        if(typeof initWeekSel === 'function') initWeekSel();
        else if(typeof renderSaisie === 'function') renderSaisie();
        repaintMuscles();
        console.log('[import] renderSaisie/initWeekSel relancé après import');
      }, 50);

    } catch(err) {
      if(typeof _showSaveToast === 'function') _showSaveToast('⚠️ Import échoué : ' + err.message.slice(0, 60));
      else alert('Import échoué : ' + err.message);
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
