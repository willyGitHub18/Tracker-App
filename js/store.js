/**
 * store.js — App-level storage helpers
 * Wraps db.js with typed accessors for records and session status.
 */

import { dbGet, dbSet, dbGetAll, dbSetAll } from './db.js';
import { sanitizeRecord } from './security.js';

// ── Record accessors ─────────────────────────────────────────────────────────

export function getRecord(exId, week) {
  return dbGet(`${exId}_w${week}`) || null;
}

export function setRecord(exId, week, data) {
  const clean = sanitizeRecord(data);
  if(clean) dbSet(`${exId}_w${week}`, clean);
}

export function getExStatus(exId, week) {
  return dbGet(`status_${exId}_w${week}`) || 'normal';
}

export function setExStatus(exId, week, status) {
  const VALID = ['normal', 'hyrox', 'skipped', 'deload'];
  if(!VALID.includes(status)) return;
  dbSet(`status_${exId}_w${week}`, status);
}

export function getAllRecords() {
  return dbGetAll();
}

export function importRecords(cleanObj) {
  const current = dbGetAll();
  dbSetAll({ ...current, ...cleanObj });
}

/** Find the highest week that has any data */
export function getLatestWeek(exercises) {
  let max = 1;
  exercises.forEach(ex => {
    for(let w = 1; w <= 17; w++) {
      if(getRecord(ex.id, w)) max = Math.max(max, w);
    }
  });
  return Math.min(max, 17);
}

// ── Record normalisation (v1 → v2 compat) ───────────────────────────────────

export function normRecord(rec) {
  if(!rec) return null;
  if(rec.sets && Array.isArray(rec.sets)) return rec;
  // v1 format {kg, rpe, ts} → v2
  return { sets: [{ kg: rec.kg, reps: null, rpe: rec.rpe || '' }], kg: rec.kg, rpe: rec.rpe, ts: rec.ts };
}

export function bestKg(rec) {
  if(!rec) return null;
  const nr = normRecord(rec);
  if(!nr || !nr.sets) return nr?.kg || null;
  const vals = nr.sets.map(s => s?.kg).filter(v => v != null && v > 0);
  return vals.length ? Math.max(...vals) : (nr.kg || null);
}

// ── Vacances — liste de périodes ─────────────────────────────────────────────

export function getVacancesList() {
  return dbGet('vacances_list') || [];
}

// Niveaux d'activité et leurs corrections sur le déconditionnement
export const ACTIVITE_LABELS = {
  sedentaire:  { label: 'Sédentaire',               bonus: 0    },
  leger:       { label: 'Activité légère (marche…)', bonus: 0.03 },
  vacances:    { label: 'Programme vacances (PdC)',  bonus: 0.07 },
  sport:       { label: 'Sport régulier (cardio…)',  bonus: 0.05 },
  muscu:       { label: 'Musculation légère',        bonus: 0.08 },
};

export function addVacances(debut, fin, activite='sedentaire') {
  if(!debut || !fin || new Date(fin) < new Date(debut)) return;
  if(!(activite in ACTIVITE_LABELS)) activite = 'sedentaire';
  const list = getVacancesList();
  if(list.some(v => v.debut === debut && v.fin === fin)) return;
  list.push({ debut, fin, activite });
  list.sort((a,b) => new Date(a.debut) - new Date(b.debut));
  dbSet('vacances_list', list);
}

export function removeVacances(idx) {
  const list = getVacancesList();
  list.splice(idx, 1);
  dbSet('vacances_list', list);
}

export function clearAllVacances() {
  dbSet('vacances_list', []);
}

// Compat legacy (single period)
export function getVacances() { return null; }
export function vacancesDuree() { return 0; }

/**
 * Retourne le coefficient de reprise basé sur la DERNIÈRE période terminée.
 * - Période en cours → null (pas encore de reprise)
 * - Période terminée il y a moins de 7 jours → coefficient actif
 * - Période terminée il y a plus de 7 jours → null (déjà repris)
 * - Périodes consécutives ou proches (< 7 jours d'écart) → cumulées
 */
export function repriseCoeff() {
  const list = getVacancesList();
  if(!list.length) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  // Fusionner les périodes qui se chevauchent ou sont proches (< 7 jours d'écart)
  const merged = _mergePeriods(list, 7);

  // Trouver la dernière période pertinente pour la reprise
  // = période terminée ET fin dans les 14 derniers jours (fenêtre de reprise)
  let repriseTarget = null;
  for(const p of merged) {
    const fin = new Date(p.fin);
    fin.setHours(0,0,0,0);
    const debut = new Date(p.debut);
    debut.setHours(0,0,0,0);

    if(fin < today) {
      // Période passée — dans la fenêtre de reprise de 14 jours ?
      const joursSinceFin = Math.round((today - fin) / 86400000);
      if(joursSinceFin <= 14) {
        repriseTarget = { ...p, joursSinceFin };
      }
    }
    // Si période en cours → afficher info mais pas de coeff
  }

  if(!repriseTarget) return null;

  const jours = Math.round((new Date(repriseTarget.fin) - new Date(repriseTarget.debut)) / 86400000);

  // Coefficient de base selon durée
  let baseCoeff, rpeTarget, labelBase;
  if(jours <= 14) { baseCoeff = 0.95; rpeTarget = '≤ 7.5'; labelBase = 'Reprise légère'; }
  else if(jours <= 28) { baseCoeff = 0.85; rpeTarget = '≤ 7'; labelBase = 'Reprise progressive'; }
  else { baseCoeff = 0.75; rpeTarget = '≤ 6.5'; labelBase = 'Reprise prudente'; }

  // Bonus activité — moyenne pondérée sur les périodes fusionnées (selon leur durée)
  const srcPeriods = list.filter(p => {
    const d = new Date(p.debut), f = new Date(p.fin);
    return f >= new Date(repriseTarget.debut) && d <= new Date(repriseTarget.fin);
  });
  let totalDays = 0, weightedBonus = 0;
  srcPeriods.forEach(p => {
    const dur = Math.max(1, Math.round((new Date(p.fin) - new Date(p.debut)) / 86400000));
    const bonus = (ACTIVITE_LABELS[p.activite] || ACTIVITE_LABELS.sedentaire).bonus;
    weightedBonus += bonus * dur;
    totalDays += dur;
  });
  const actBonus = totalDays > 0 ? weightedBonus / totalDays : 0;
  const actLabel = srcPeriods.length === 1
    ? (ACTIVITE_LABELS[srcPeriods[0].activite] || ACTIVITE_LABELS.sedentaire).label
    : 'Activité mixte';

  const finalCoeff = Math.min(1, Math.round((baseCoeff + actBonus) * 100) / 100);
  // Ajuster RPE cible si le bonus remonte le coeff
  const rpe = finalCoeff >= 0.95 ? '≤ 7.5' : finalCoeff >= 0.88 ? '≤ 7' : '≤ 6.5';

  return {
    coeff: finalCoeff,
    rpeTarget: rpe,
    label: `${labelBase} (${jours}j · ${actLabel})`,
    jours,
    actBonus: Math.round(actBonus * 100),
  };
}

/** Statut de la période en cours (pour affichage dans le tracker) */
export function vacancesStatus() {
  const list = getVacancesList();
  if(!list.length) return null;

  const today = new Date(); today.setHours(0,0,0,0);
  const merged = _mergePeriods(list, 7);

  for(const p of merged) {
    const debut = new Date(p.debut); debut.setHours(0,0,0,0);
    const fin   = new Date(p.fin);   fin.setHours(0,0,0,0);
    if(debut <= today && today <= fin) {
      const joursRestants = Math.round((fin - today) / 86400000);
      return { en_cours: true, joursRestants, debut: p.debut, fin: p.fin };
    }
  }

  const rc = repriseCoeff();
  if(rc) return { reprise: true, ...rc };

  return null;
}

function _mergePeriods(list, gapDays) {
  if(!list.length) return [];
  const sorted = [...list].sort((a,b) => new Date(a.debut) - new Date(b.debut));
  const merged = [{ ...sorted[0] }];
  for(let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur  = sorted[i];
    const gap  = Math.round((new Date(cur.debut) - new Date(prev.fin)) / 86400000);
    if(gap <= gapDays) {
      // Fusionner : étendre la période précédente
      if(new Date(cur.fin) > new Date(prev.fin)) prev.fin = cur.fin;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}
