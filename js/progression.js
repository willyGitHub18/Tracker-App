/**
 * progression.js — Lafay-inspired progression engine
 *
 * Rules:
 *  SUCCESS   : all sets + reps ≥ 95% plan + RPE ≤ 8.5  → +1 step
 *  HIGH_RPE  : all sets + reps ok but RPE 8.5–9.5       → hold
 *  PARTIAL   : incomplete sets or reps 80–95%            → hold
 *  PLATEAU   : 3 consecutive holds                       → -1 step
 *  OVERLOAD  : RPE > 9.5                                 → -1 step
 *  CRUSH     : reps < 80% of plan                        → -2 steps
 */

import { EXERCISES } from './data.js';
import { getRecord, getExStatus, normRecord } from './store.js';

export function parseSets(scheme) {
  if(!scheme || ['Deload','—','Taper','Repos'].includes(scheme)) return 0;
  const m = scheme.match(/^(\d+)[×x]/);
  return m ? parseInt(m[1], 10) : 0;
}

export function parseReps(scheme) {
  const m = scheme && scheme.match(/[×x](\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function palier(ex) {
  return (ex.id === 'squat' || ex.id === 'deadlift') ? 2.5 : 1.25;
}

export function weekOutcome(ex, week) {
  const status = getExStatus(ex.id, week);
  if(status === 'skipped') return 'skipped';
  if(status === 'hyrox')   return 'hyrox';

  const rec = normRecord(getRecord(ex.id, week));
  if(!rec || !rec.sets || !rec.sets.some(s => s && s.kg)) return 'nodata';

  const scheme   = ex.repScheme[week - 1];
  const planReps = parseReps(scheme) || 5;
  const nSets    = parseSets(scheme) || 4;
  const sets     = rec.sets.filter(s => s && s.kg);
  const done     = sets.filter(s => s.reps && s.reps > 0);

  const avgRpe  = done.length ? done.reduce((a, s) => a + (parseFloat(s.rpe) || 7), 0) / done.length : null;
  const avgReps = done.length ? done.reduce((a, s) => a + (s.reps || 0), 0) / done.length : null;
  const setPct  = nSets > 0 ? done.length / nSets : 0;

  if(avgReps !== null && planReps > 0 && avgReps / planReps < 0.8) return 'crush';
  if(avgRpe !== null && avgRpe > 9.5) return 'overload';
  if(setPct >= 1 && (avgReps === null || avgReps / planReps >= 0.95)) {
    return (avgRpe !== null && avgRpe > 8.5) ? 'high_rpe' : 'success';
  }
  return 'partial';
}

export function consecutivePlateaux(ex, beforeWeek) {
  let count = 0;
  for(let w = beforeWeek - 1; w >= 1; w--) {
    const o = weekOutcome(ex, w);
    if(['skipped','hyrox','nodata'].includes(o)) continue;
    if(['partial','high_rpe'].includes(o)) { count++; continue; }
    break;
  }
  return count;
}

/**
 * Returns { kg, rule, outcome, plateauCount } or null.
 */
export function getNextPlan(ex, week) {
  if(week >= 17) return null;

  const rec       = normRecord(getRecord(ex.id, week));
  const currentKg = rec ? (Math.max(...(rec.sets || []).map(s => s?.kg || 0).filter(v => v > 0)) || rec.kg) : null;
  if(!currentKg) return ex.plan[week] ? { kg: ex.plan[week], rule: 'Aucune donnée — plan officiel appliqué.', outcome: 'nodata', plateauCount: 0 } : null;

  const p             = palier(ex);
  const outcome       = weekOutcome(ex, week);
  const plateauCount  = consecutivePlateaux(ex, week);
  const status        = getExStatus(ex.id, week);

  let nextKg, rule;

  if(status === 'skipped') {
    nextKg = currentKg;
    rule   = 'Séance sautée — répète la même charge.';
  } else if(outcome === 'crush') {
    nextKg = Math.max(currentKg - 2 * p, p);
    rule   = 'Reps très insuffisantes — recul de 2 paliers (Lafay : réinitialisation).';
  } else if(outcome === 'overload') {
    nextKg = Math.max(currentKg - p, p);
    rule   = 'RPE > 9.5 — charge excessive. Recul d\'un palier.';
  } else if(plateauCount >= 3) {
    nextKg = Math.max(currentKg - p, p);
    rule   = `${plateauCount} semaines de plateau — recul d'un palier (règle Lafay).`;
  } else if(outcome === 'success') {
    nextKg = currentKg + p;
    rule   = 'Toutes séries validées + RPE ≤ 8.5 — progression d\'un palier ✓';
  } else if(outcome === 'high_rpe') {
    nextKg = currentKg;
    rule   = 'Séries complètes mais RPE élevé (8.5–9.5) — consolide à la même charge.';
  } else {
    nextKg = currentKg;
    const remaining = 3 - plateauCount - 1;
    rule = plateauCount >= 1
      ? `${plateauCount + 1} semaine(s) de plateau. Encore ${remaining} avant recul.`
      : 'Séries incomplètes — répète la même charge (règle Lafay).';
  }

  return { kg: Math.round(nextKg / 1.25) * 1.25, rule, outcome, plateauCount };
}

/**
 * Full multi-axis analysis (RPE, reps, sets, kg vs plan).
 * Returns { type, signals[], hyrox, skipped, avgRpe, avgReps, ... }
 */
export function calcAdj(ex, week) {
  const planKg   = ex.plan[week - 1];
  const scheme   = ex.repScheme[week - 1];
  const planReps = parseReps(scheme) || 5;
  const nSets    = parseSets(scheme) || 4;
  if(!planKg) return null;

  const status   = getExStatus(ex.id, week);

  if(status === 'skipped') {
    return { type: 'skipped', signals: [], nextBonus: 0, bk: null, avgRpe: null,
             avgReps: null, repRatio: null, setPct: null, skipped: true, hyrox: false };
  }

  const rec = normRecord(getRecord(ex.id, week));
  if(!rec || !rec.sets || !rec.sets.some(s => s && s.kg)) return null;

  const isHyrox       = status === 'hyrox';
  const sets          = rec.sets.filter(s => s && s.kg);
  const completedSets = sets.filter(s => s.reps && s.reps > 0);
  const bk            = Math.max(...sets.map(s => s.kg || 0));

  const rawAvgRpe = completedSets.length
    ? completedSets.reduce((a, s) => a + (parseFloat(s.rpe) || 7), 0) / completedSets.length
    : null;
  const effectiveRpe = (rawAvgRpe != null && isHyrox)
    ? Math.min(10, rawAvgRpe + 1.5) : rawAvgRpe;
  const avgRpe  = effectiveRpe;
  const avgReps = completedSets.length
    ? completedSets.reduce((a, s) => a + (s.reps || 0), 0) / completedSets.length
    : null;

  // ── Post-Hyrox: compare vs personal history ──────────────────────────────
  if(isHyrox) {
    const baseline = _calcBaseline(ex, week);
    const signals  = [];
    if(rawAvgRpe != null) {
      const msg = rawAvgRpe >= 8.5
        ? `RPE ressenti ${round1(rawAvgRpe)} (effectif estimé ${round1(effectiveRpe)} avec fatigue Hyrox).`
        : `RPE ressenti ${round1(rawAvgRpe)} — contexte post-effort élevé.`;
      signals.push({ type: rawAvgRpe >= 8.5 ? 'warn' : 'neutral', text: msg });
    }
    if(avgReps != null) {
      const d = baseline.avgReps != null ? round1(avgReps - baseline.avgReps) : null;
      signals.push({ type: d != null && d < -1 ? 'warn' : 'neutral',
        text: `Reps/série : ${round1(avgReps)}${baseline.avgReps ? ` (moy. habituelle ${baseline.avgReps})` : ''}.` });
    }
    if(baseline.avgKg != null) {
      const dKg = round1(bk - baseline.avgKg);
      signals.push({ type: dKg < -5 ? 'warn' : 'neutral',
        text: `Charge : ${bk} ${ex.unit} (moy. habituelle ${baseline.avgKg} ${ex.unit}).` });
    }
    signals.push({ type: 'neutral', text: 'Données transmises au suivi musculaire uniquement. Aucun ajustement programme.' });
    return { type: 'hyrox', signals, nextBonus: 0, bk, avgRpe, rawRpe: rawAvgRpe,
             avgReps, repRatio: null, setPct: completedSets.length / nSets, skipped: false, hyrox: true };
  }

  // ── Normal analysis ───────────────────────────────────────────────────────
  const deltaKg  = round1(bk - planKg);
  const repRatio = avgReps != null && planReps > 0 ? avgReps / planReps : null;
  const setPct   = nSets > 0 ? completedSets.length / nSets : null;
  const signals  = [];
  let nextBonus  = 0;

  // Axe RPE
  if(avgRpe != null) {
    if(avgRpe >= 9.5) {
      signals.push({ type: 'danger', text: `RPE ${round1(avgRpe)} — intensité maximale.` });
      nextBonus -= (ex.id === 'squat' || ex.id === 'deadlift') ? 5 : 2.5;
    } else if(avgRpe >= 9) {
      signals.push({ type: 'warn', text: `RPE ${round1(avgRpe)} — proche de la limite. Pas de progression.` });
    } else if(avgRpe <= 6.5) {
      signals.push({ type: 'good', text: `RPE ${round1(avgRpe)} — effort léger. Progression accélérée.` });
      nextBonus += (ex.id === 'squat' || ex.id === 'deadlift') ? 5 : 2.5;
    } else if(avgRpe <= 7.5) {
      signals.push({ type: 'good', text: `RPE ${round1(avgRpe)} — zone optimale.` });
    } else {
      signals.push({ type: 'neutral', text: `RPE ${round1(avgRpe)} — charge bien calibrée.` });
    }
  }

  // Axe reps
  if(repRatio != null) {
    const r = round1(avgReps);
    if(repRatio < 0.8) {
      signals.push({ type: 'danger', text: `${r} reps/série (plan : ${planReps}). Réduis la charge.` });
      nextBonus -= (ex.id === 'squat' || ex.id === 'deadlift') ? 5 : 2.5;
    } else if(repRatio < 0.95) {
      signals.push({ type: 'warn', text: `${r} reps/série (plan : ${planReps}). Consolide avant de progresser.` });
      nextBonus -= 1.25;
    } else if(repRatio >= 1.1) {
      signals.push({ type: 'good', text: `${r} reps/série — objectif dépassé. Augmente la charge.` });
      nextBonus += 1.25;
    } else {
      signals.push({ type: 'good', text: `${r} reps/série — objectif atteint ✓` });
    }
  }

  // Axe séries
  if(setPct != null && completedSets.length > 0) {
    if(setPct < 0.6) {
      signals.push({ type: 'danger', text: `${completedSets.length}/${nSets} séries. Vérifie récupération.` });
      nextBonus -= 1.25;
    } else if(setPct < 1) {
      signals.push({ type: 'warn', text: `${completedSets.length}/${nSets} séries complètes.` });
    } else {
      signals.push({ type: 'good', text: `Toutes les séries (${nSets}/${nSets}) ✓` });
    }
  }

  // Axe charge vs plan
  if(Math.abs(deltaKg) >= 1.25) {
    if(deltaKg >= 5) {
      signals.push({ type: 'good', text: `+${deltaKg} kg sur le plan — en avance.` });
      nextBonus += (ex.id === 'squat' || ex.id === 'deadlift') ? 2.5 : 1.25;
    } else if(deltaKg >= 2.5) {
      signals.push({ type: 'good', text: `+${deltaKg} kg sur le plan — légère avance.` });
    } else if(deltaKg <= -5) {
      signals.push({ type: 'danger', text: `${deltaKg} kg sous le plan.` });
      nextBonus += deltaKg;
    } else if(deltaKg < -1.25) {
      signals.push({ type: 'warn', text: `${deltaKg} kg sous le plan.` });
      nextBonus += Math.round(deltaKg / 2 * 4) / 4;
    }
  } else if(completedSets.length > 0) {
    signals.push({ type: 'neutral', text: `Charge conforme au plan (${planKg} ${ex.unit}).` });
  }

  // Gel si RPE >= 9
  if(avgRpe != null && avgRpe >= 9 && nextBonus > 0) nextBonus = 0;

  const hasDanger = signals.some(s => s.type === 'danger');
  const hasWarn   = signals.some(s => s.type === 'warn');
  const allGood   = signals.every(s => s.type === 'good' || s.type === 'neutral');
  const type = hasDanger ? 'behind' : hasWarn ? 'slight_behind' : allGood ? 'ahead' : 'ok';

  return { type, signals, nextBonus, bk, avgRpe, avgReps, repRatio, setPct, skipped: false, hyrox: false };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round1(n) { return Math.round(n * 10) / 10; }

function _calcBaseline(ex, upToWeek) {
  const kgs = [], rpesArr = [], repsArr = [];
  for(let w = 1; w < upToWeek; w++) {
    const status = getExStatus(ex.id, w);
    if(status === 'hyrox' || status === 'skipped') continue;
    const r = normRecord(getRecord(ex.id, w));
    if(!r || !r.sets) continue;
    r.sets.forEach(s => {
      if(s?.kg)   kgs.push(s.kg);
      if(s?.reps) repsArr.push(s.reps);
      if(s?.rpe)  rpesArr.push(parseFloat(s.rpe));
    });
  }
  const avg = arr => arr.length ? round1(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  return { avgKg: avg(kgs), avgReps: avg(repsArr), avgRpe: avg(rpesArr) };
}
