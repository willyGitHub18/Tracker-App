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
import { getRecord, getExStatus, normRecord, repriseCoeff } from './store.js';

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
  if(status === 'deload')  return 'deload';

  const rec = normRecord(getRecord(ex.id, week));
  if(!rec || !rec.sets || !rec.sets.some(s => s && (s.kg != null || s.skipped))) return 'nodata';

  const scheme   = ex.repScheme[week - 1];
  const planReps = parseReps(scheme) || 5;
  const nSets    = parseSets(scheme) || 4;

  // Séries explicitement "non effectuées" — signal fort de blessure/manque de force,
  // distinct d'une simple absence de saisie (nodata)
  const skippedCount = rec.sets.filter(s => s?.skipped === true).length;
  if(skippedCount > 0) {
    const skippedRatio = skippedCount / nSets;
    if(skippedRatio >= 0.5) return 'injury_suspected'; // ≥50% des séries non faites
    return 'partial_skip'; // quelques séries non faites — recul prudent
  }

  const sets     = rec.sets.filter(s => s && s.kg != null);
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
    if(['skipped','hyrox','nodata','deload'].includes(o)) continue;
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

  const scheme = ex.repScheme?.[week - 1] || '';
  const isDeloadWeek = scheme === 'Deload' || scheme === 'Taper';

  // If this is a structural deload/taper week, base S+1 on last normal week
  // (the deload session kg is intentionally reduced and should not drive progression)
  if(isDeloadWeek) {
    // Find last non-deload week with data
    let refWeek = week - 1;
    while(refWeek >= 1) {
      const refScheme = ex.repScheme?.[refWeek - 1] || '';
      if(refScheme !== 'Deload' && refScheme !== 'Taper' && refScheme !== 'Repos') {
        const refRec = normRecord(getRecord(ex.id, refWeek));
        if(refRec?.sets?.some(s => s?.kg)) break;
      }
      refWeek--;
    }
    if(refWeek >= 1 && refWeek !== week) {
      // Compute S+1 based on last normal week
      const refResult = getNextPlan(ex, refWeek);
      if(refResult) {
        return {
          ...refResult,
          rule: `Basé sur S${refWeek} (dernière semaine normale) — ${refResult.rule}`,
          deloadRef: true,
        };
      }
    }
    // Fallback: use official plan
    const planNext = ex.plan[week];
    if(planNext) return { kg: planNext, rule: 'Plan officiel S+1 (semaine de deload).', outcome: 'deload', plateauCount: 0 };
    return null;
  }

  const rec        = normRecord(getRecord(ex.id, week));
  const _kgValues   = (rec?.sets || []).map(s => s?.kg || 0).filter(v => v > 0);
  const currentKg   = rec ? (_kgValues.length ? Math.max(..._kgValues) : (rec.kg || null)) : null;

  // ── Séries marquées "non effectuées" — recul prudent, même sans charge connue ──
  const skippedSets = rec?.sets?.filter(s => s?.skipped === true) || [];
  if(skippedSets.length > 0 && !currentKg) {
    const scheme0 = ex.repScheme?.[week - 1] || '';
    const nSets0  = parseSets(scheme0) || 4;
    const ratio   = skippedSets.length / nSets0;
    const severe  = ratio >= 0.5;
    const p0      = palier(ex);
    // Base de référence : dernière charge connue (n'importe quelle semaine antérieure)
    let refKg = ex.plan[week - 1] || ex.plan[week] || null;
    for(let w = week - 1; w >= 1 && !refKg; w--) {
      const prevRec = normRecord(getRecord(ex.id, w));
      const prevKg  = prevRec ? Math.max(...(prevRec.sets||[]).map(s=>s?.kg||0).filter(v=>v>0)) : 0;
      if(prevKg > 0) refKg = prevKg;
    }
    if(!refKg) return null;
    const reduction = severe ? 2 * p0 : p0;
    const nextKg = Math.max(refKg - reduction, p0);
    return {
      kg: Math.round(nextKg / 1.25) * 1.25,
      rule: severe
        ? `${skippedSets.length} série(s) non effectuée(s) — possible blessure/manque de force. Recul de 2 paliers par précaution.`
        : `${skippedSets.length} série(s) non effectuée(s) — recul d'un palier par précaution.`,
      outcome: severe ? 'injury_suspected' : 'partial_skip',
      plateauCount: 0,
    };
  }

  if(!currentKg) return ex.plan[week] ? { kg: ex.plan[week], rule: 'Aucune donnée — plan officiel appliqué.', outcome: 'nodata', plateauCount: 0 } : null;

  const p             = palier(ex);
  const outcome       = weekOutcome(ex, week);
  const plateauCount  = consecutivePlateaux(ex, week);
  const status        = getExStatus(ex.id, week);

  /* ── Vacances : ajuster la charge de reprise ── */
  // Use cumulative week-based coeff if available, fallback to calendar-based
  const vacList = typeof getVacancesList === 'function' ? getVacancesList() : [];
  const rc = (typeof repriseCoeffForWeek === 'function' && vacList.length)
    ? repriseCoeffForWeek(week + 1, vacList)  // week+1 = next week (the reprise week)
    : repriseCoeff();
  if(rc) {
    const repriseKg = Math.round(currentKg * rc.coeff / 1.25) * 1.25;
    return { kg: repriseKg, rule: `${rc.label} · charge réduite à ${Math.round(rc.coeff*100)}% · RPE cible ${rc.rpeTarget}`, outcome: 'vacances', plateauCount: 0 };
  }

  let nextKg, rule;

  if(status === 'skipped') {
    nextKg = currentKg;
    rule   = 'Séance sautée — répète la même charge.';
  } else if(status === 'deload') {
    const planNext = ex.plan[week] || currentKg;
    return { kg: Math.round(planNext / 1.25) * 1.25, rule: 'Séance deload — retour au plan officiel S+1.', outcome: 'deload', plateauCount };
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
             avgReps: null, repRatio: null, setPct: null, skipped: true, hyrox: false, deload: false };
  }
  if(status === 'deload') {
    const rec = normRecord(getRecord(ex.id, week));
    const _vals = (rec?.sets||[]).map(s=>s?.kg||0).filter(v=>v>0);
    const bk  = _vals.length ? Math.max(..._vals) : null;
    return { type: 'deload', signals: [
      { type: 'neutral', text: 'Séance deload — pas d\'analyse de performance.' },
      ...(bk ? [{ type: 'good', text: `Charge effectuée : ${bk} kg — progression S+1 basée sur S${week-1}.` }] : []),
    ], nextBonus: 0, bk, avgRpe: null, avgReps: null, repRatio: null, setPct: null,
             skipped: false, hyrox: false, deload: true };
  }

  const rec = normRecord(getRecord(ex.id, week));
  if(!rec || !rec.sets || !rec.sets.some(s => s && (s.kg != null || s.skipped))) return null;

  // ── Séries "non effectuées" — signal explicite distinct de l'absence de données ──
  const skippedSets = rec.sets.filter(s => s?.skipped === true);
  if(skippedSets.length > 0 && !rec.sets.some(s => s && s.kg != null)) {
    // Toutes les séries présentes sont marquées non-effectuées
    const ratio = skippedSets.length / (nSets || rec.sets.length || 1);
    const severe = ratio >= 0.5;
    return {
      type: severe ? 'injury_suspected' : 'partial_skip',
      signals: [{
        type: 'danger',
        text: severe
          ? `${skippedSets.length} série(s) non effectuée(s) — possible blessure ou manque de force. Recul prudent recommandé.`
          : `${skippedSets.length} série(s) non effectuée(s) sur ${nSets} — à surveiller.`,
      }],
      nextBonus: severe ? -2 : -1,
      bk: null, avgRpe: null, avgReps: null, repRatio: null, setPct: 0,
      skipped: false, hyrox: false, deload: false, injurySuspected: severe,
    };
  }

  const isHyrox       = status === 'hyrox';
  const sets          = rec.sets.filter(s => s && s.kg != null);
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
