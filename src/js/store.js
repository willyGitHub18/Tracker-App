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
  // Only return ATHX-format exercise/status keys — NOT the whole DB
  // (the DB also contains programs_list, vacances_list, programs_tracking, etc.)
  const EX_KEY = /^(press|squat|deadlift|gtoh|sandbag|lunges)_w([1-9]|1[0-7])$/;
  const ST_KEY = /^status_(press|squat|deadlift|gtoh|sandbag|lunges)_w([1-9]|1[0-7])$/;
  const all = dbGetAll();
  const filtered = {};
  for(const [k, v] of Object.entries(all)) {
    if(EX_KEY.test(k) || ST_KEY.test(k)) filtered[k] = v;
  }
  return filtered;
}

export function importRecords(cleanObj) {
  // Merge only the clean ATHX keys — never touch other store keys
  // (dbSet is per-key, safe to call individually)
  for(const [k, v] of Object.entries(cleanObj || {})) {
    dbSet(k, v);
  }
}

// ── Profil utilisateur (global, persisté — source unique sexe + poids) ────────
const _VALID_SEXE = ['H', 'F'];
/** Lecture normalisée : { sexe:'H'|'F', bodyWeight:number|null }. Défaut sexe 'H'. */
export function getProfile() {
  const p = dbGet('profile') || {};
  const bw = Number(p.bodyWeight);
  return {
    sexe: _VALID_SEXE.includes(p.sexe) ? p.sexe : 'H',
    bodyWeight: (isFinite(bw) && bw >= 30 && bw <= 300) ? bw : null,
  };
}
/** Écriture partielle validée. Champs hors bornes → ignorés (poids null accepté pour effacer). */
export function setProfile(patch) {
  const next = getProfile();
  if(patch && _VALID_SEXE.includes(patch.sexe)) next.sexe = patch.sexe;
  if(patch && 'bodyWeight' in patch) {
    if(patch.bodyWeight === null || patch.bodyWeight === '') next.bodyWeight = null;
    else { const bw = Number(patch.bodyWeight); if(isFinite(bw) && bw >= 30 && bw <= 300) next.bodyWeight = bw; }
  }
  dbSet('profile', next);
  return next;
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


export function setVacances(list) {
  dbSet('vacances_list', list || []);
}

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

// Stubs legacy supprimés (v3.31.1) : `getVacances()` renvoyait `null` et
// `vacancesDuree()` renvoyait `0`. Aucun appelant restant — mais `getVacances()`
// avait causé le bug §33 (`null.length` → TypeError silencieuse au milieu de
// _confirmReprise). Utiliser `getVacancesList()`, qui renvoie toujours un tableau.

/**
 * Retourne le coefficient de reprise basé sur la DERNIÈRE période terminée.
 * - Période en cours → null (pas encore de reprise)
 * - Période terminée il y a moins de 7 jours → coefficient actif
 * - Période terminée il y a plus de 7 jours → null (déjà repris)
 * - Périodes consécutives ou proches (< 7 jours d'écart) → cumulées
 */

/** 
 * Coefficient de reprise basé sur les semaines (pas le calendrier).
 * Cumule toutes les périodes de vacances sur les 8 dernières semaines.
 * @param {number} week - semaine actuelle (repriseWeek)
 * @param {Array} list  - liste des vacances avec repriseWeek
 */
// Plafond du coefficient : le bonus d'activité **adoucit** la réduction, il ne
// l'annule jamais. Sans ce plafond, `Math.min(1, …)` laissait un congé de 2 semaines
// en « Sport régulier » (+5 %) sortir à 1,00 sur la courbe calendaire (0,95 + 0,05) :
// la reco S+1 annonçait « charge réduite à 100 % » — donc aucune réduction — pendant
// que la bannière affichait 93 %. Cf. journal §37.
export const MAX_REPRISE_COEFF = 0.97;

export function repriseCoeffForWeek(currentWeek, list) {
  if(!list || !list.length) return null;

  // Périodes proches (< 7 j d'écart) ou qui se chevauchent → fusionnées d'abord :
  // saisir « 2 × 1 semaine » doit donner exactement le même résultat qu'une seule
  // période de 2 semaines, et une double saisie ne doit pas compter double.
  const merged = mergeVacPeriods(list, 7);

  // Il faut qu'une période fusionnée reprenne exactement à la semaine courante
  if(!merged.some(v => v.repriseWeek === currentWeek)) return null;

  // Count total skipped weeks across all overlapping vacation periods
  // Use repriseWeek and estimate: look at all vac entries whose repriseWeek <= currentWeek
  // and whose "last skipped week" is within 8 weeks of currentWeek
  let totalSkippedWeeks = 0;
  let weightedBonus = 0;
  let totalWeightDays = 0;

  for(const vac of merged) {
    const rw = vac.repriseWeek;
    if(!rw) continue;
    // Only count vacations that ended at or before currentWeek and started within 8 weeks
    if(rw > currentWeek) continue;
    if(currentWeek - rw > 8) continue; // too old to matter

    // Estimate skipped weeks for this vacation
    // We don't have exact skipped weeks stored, but we have debut/fin dates
    // and repriseWeek. Calculate approximate skipped weeks from dates.
    let skippedWks = 0;
    if(vac.debut && vac.fin) {
      const days = Math.max(0, Math.round((new Date(vac.fin) - new Date(vac.debut)) / 86400000));
      skippedWks = Math.max(1, Math.round(days / 7));
    } else {
      skippedWks = Math.max(1, rw - 1); // fallback
    }

    // Decay: more recent = more impact
    const weeksAgo = currentWeek - rw;
    const decayFactor = Math.max(0.2, 1 - weeksAgo * 0.15); // each week back reduces impact
    const effectiveSkipped = skippedWks * decayFactor;
    totalSkippedWeeks += effectiveSkipped;

    // Activity bonus (weighted by duration) — pondéré sur les périodes SOURCES,
    // pour qu'une fusion « sédentaire + muscu légère » garde bien la moyenne.
    for(const src of (vac.sources || [vac])) {
      const bonus = (ACTIVITE_LABELS[src.activite] || ACTIVITE_LABELS.sedentaire).bonus;
      const dur = (src.debut && src.fin)
        ? Math.max(1, Math.round(Math.max(0, new Date(src.fin) - new Date(src.debut)) / 86400000 / 7))
        : skippedWks;
      weightedBonus += bonus * dur;
      totalWeightDays += dur;
    }
  }

  if(totalSkippedWeeks === 0) return null;

  const actBonus = totalWeightDays > 0 ? weightedBonus / totalWeightDays : 0;

  // Deconditioning curve based on total effective skipped weeks
  let baseCoeff, rpeTarget, labelBase;
  if(totalSkippedWeeks <= 1.5)      { baseCoeff = 0.95; rpeTarget = '≤ 7.5'; labelBase = 'Reprise légère'; }
  else if(totalSkippedWeeks <= 3)   { baseCoeff = 0.88; rpeTarget = '≤ 7';   labelBase = 'Reprise progressive'; }
  else if(totalSkippedWeeks <= 5)   { baseCoeff = 0.80; rpeTarget = '≤ 6.5'; labelBase = 'Reprise modérée'; }
  else                               { baseCoeff = 0.72; rpeTarget = '≤ 6';   labelBase = 'Reprise prudente'; }

  const finalCoeff = Math.min(MAX_REPRISE_COEFF, Math.round((baseCoeff + actBonus) * 100) / 100);
  const rpe = finalCoeff >= 0.95 ? '≤ 7.5' : finalCoeff >= 0.88 ? '≤ 7' : finalCoeff >= 0.82 ? '≤ 6.5' : '≤ 6';
  const skippedLabel = totalSkippedWeeks <= 1.5 ? '~1 semaine'
    : totalSkippedWeeks <= 3 ? '~2-3 semaines'
    : totalSkippedWeeks <= 5 ? '~4-5 semaines'
    : '5+ semaines';

  return {
    coeff: finalCoeff,
    rpeTarget: rpe,
    label: `${labelBase} (${skippedLabel} de repos cumulé)`,
    totalSkippedWeeks: Math.round(totalSkippedWeeks * 10) / 10,
    actBonus: Math.round(actBonus * 100),
  };
}

/**
 * Période (fusionnée) que vise le chemin **calendaire** : la dernière période
 * terminée dont la fin est dans les 14 derniers jours. Extrait de `repriseCoeff`
 * pour que `repriseCoeffFor` puisse tester si cette période porte, ou non, une
 * semaine de reprise déclarée.
 */
function _calendarRepriseTarget(merged, today) {
  let target = null;
  for(const p of merged) {
    const fin = new Date(p.fin); fin.setHours(0,0,0,0);
    if(fin < today) {
      const joursSinceFin = Math.round((today - fin) / 86400000);
      if(joursSinceFin <= 14) target = { ...p, joursSinceFin };
    }
    // Période en cours → info affichée ailleurs, mais pas de coefficient
  }
  return target;
}

export function repriseCoeff() {
  const list = getVacancesList();
  if(!list.length) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  // Fusionner les périodes qui se chevauchent ou sont proches (< 7 jours d'écart)
  const merged = _mergePeriods(list, 7);

  const repriseTarget = _calendarRepriseTarget(merged, today);
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

  const finalCoeff = Math.min(MAX_REPRISE_COEFF, Math.round((baseCoeff + actBonus) * 100) / 100);
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

/**
 * **Point d'entrée unique** pour « quel coefficient de reprise s'applique à la
 * semaine `week` ? ». À utiliser partout plutôt que d'enchaîner soi-même
 * `repriseCoeffForWeek(...) || repriseCoeff()`.
 *
 * Modèle retenu (journal §37) : les **métadonnées de semaine font foi** et la
 * réduction ne concerne que **la semaine de reprise**. Passée cette semaine, Lafay
 * repart normalement depuis ce qui a réellement été fait pendant la reprise.
 *
 * Le chemin calendaire n'est donc plus qu'un **repli** pour les congés saisis sans
 * semaine de reprise (dialogue « Ignorer ») : sinon la bannière (qui interroge la
 * semaine courante) et la reco S+1 (qui interroge `week + 1`) répondaient sur deux
 * courbes différentes — 93 % à l'écran, 100 % sur les charges.
 *
 * @param {number} week  - semaine visée (celle dont on veut le coefficient)
 * @param {Array}  [list] - périodes de vacances (défaut : `getVacancesList()`)
 */
export function repriseCoeffFor(week, list) {
  const l = list || getVacancesList();
  if(!l.length) return null;

  const byWeek = repriseCoeffForWeek(week, l);
  if(byWeek) return byWeek;

  // Aucune reprise déclarée sur la période que viserait le calendrier → repli.
  // Si elle en porte une, c'est elle qui fait foi : hors de sa semaine de reprise,
  // pas de réduction (sinon la réduction survivrait 14 jours sur l'autre courbe).
  const today = new Date(); today.setHours(0,0,0,0);
  const target = _calendarRepriseTarget(mergeVacPeriods(l, 7), today);
  if(!target || target.repriseWeek) return null;

  return repriseCoeff();
}

/**
 * Semaines de programme **neutralisées par un congé**, pour tout calcul de série
 * consécutive (compteur de plateau Lafay) : les semaines effectivement sautées
 * (`firstSkippedWeek` → `repriseWeek - 1`) **et** la semaine de reprise elle-même.
 *
 * Pourquoi la semaine de reprise en fait partie : sa charge est volontairement
 * réduite (cf. `repriseCoeffFor`), donc la juger contre le plan à pleine charge la
 * classerait en `partial`/`high_rpe` — elle viendrait **allonger** un plateau au
 * lieu de le remettre à zéro. Un plateau, c'est N semaines consécutives à la
 * **même** charge sans progresser : après un congé la charge a changé, l'ancienne
 * série ne parle plus de la charge courante (journal §38).
 *
 * **Point d'entrée unique**, lu par les deux chemins (ATHX legacy `progression.js`
 * et programmes générés `tracker.js`) — comme `repriseCoeffFor` pour le coefficient.
 *
 * @param {Array} [list] - périodes de vacances (défaut : `getVacancesList()`)
 * @returns {Set<number>} semaines à ne pas traverser
 */
export function vacancesBreakWeeks(list) {
  const l = list || getVacancesList();
  if(!l.length) return new Set();
  const out = new Set();
  for(const v of mergeVacPeriods(l, 7)) {
    const rw = Number(v.repriseWeek);
    if(!isFinite(rw) || rw < 1) continue;   // congé « Ignorer » → couvert par la règle du trou de données
    out.add(rw);
    const fsw  = Number(v.firstSkippedWeek);
    // Sans `firstSkippedWeek`, au moins la semaine qui précède la reprise a été sautée.
    const from = (isFinite(fsw) && fsw >= 1) ? fsw : rw - 1;
    for(let w = Math.max(1, from); w < rw; w++) out.add(w);
  }
  return out;
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

    // Vacation in progress
    if(debut <= today && today <= fin) {
      const joursRestants = Math.round((fin - today) / 86400000);
      return { en_cours: true, joursRestants, debut: p.debut, fin: p.fin };
    }

    // Upcoming vacation (within 14 days)
    const joursAvant = Math.round((debut - today) / 86400000);
    if(joursAvant > 0 && joursAvant <= 14) {
      const duree = Math.round((fin - debut) / 86400000);
      return { a_venir: true, joursAvant, duree, debut: p.debut, fin: p.fin };
    }
  }

  const rc = repriseCoeff();
  if(rc) return { reprise: true, ...rc };

  return null;
}

/**
 * Fusionne les périodes de vacances proches (< `gapDays` d'écart) ou qui se
 * chevauchent, en conservant les métadonnées de semaine.
 *
 * Contrairement à une fusion naïve (qui garderait les champs de la 1ʳᵉ période) :
 *  - `repriseWeek`      → **max** des valeurs définies (la semaine où l'on reprend
 *                         réellement, sinon le coefficient ne se déclencherait jamais) ;
 *  - `firstSkippedWeek` → **min** (la première semaine effectivement sautée) ;
 *  - `sources`          → périodes d'origine, pour pondérer le bonus d'activité.
 *
 * Une période sans `repriseWeek` (dialogue « Ignorer ») hérite ainsi de celle de
 * sa voisine et cesse d'être invisible au calcul.
 *
 * @param {Array}  list     - périodes brutes (`vacances_list`)
 * @param {number} gapDays  - écart max, en jours, pour fusionner
 */
export function mergeVacPeriods(list, gapDays) {
  if(!list || !list.length) return [];
  const sorted = [...list].sort((a,b) => new Date(a.debut) - new Date(b.debut));
  const _absorb = (grp, p) => {
    if(new Date(p.fin) > new Date(grp.fin)) grp.fin = p.fin;
    if(p.repriseWeek)      grp.repriseWeek = Math.max(grp.repriseWeek || 0, p.repriseWeek);
    if(p.firstSkippedWeek) grp.firstSkippedWeek = Math.min(grp.firstSkippedWeek || Infinity, p.firstSkippedWeek);
    grp.sources.push(p);
    return grp;
  };
  const merged = [_absorb({ ...sorted[0], sources: [] }, sorted[0])];
  for(let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur  = sorted[i];
    const gap  = Math.round((new Date(cur.debut) - new Date(prev.fin)) / 86400000);
    if(gap <= gapDays) {
      // Fusionner : étendre la période précédente
      _absorb(prev, cur);
    } else {
      merged.push(_absorb({ ...cur, sources: [] }, cur));
    }
  }
  return merged;
}

// Chemin calendaire (repriseCoeff / vacancesStatus) : ne lit que debut/fin/activite,
// les champs supplémentaires de mergeVacPeriods lui sont transparents.
function _mergePeriods(list, gapDays) {
  return mergeVacPeriods(list, gapDays);
}
