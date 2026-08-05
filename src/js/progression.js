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
import { getRecord, getExStatus, getExStatusRaw, normRecord, getVacancesList,
         repriseCoeffFor, vacancesBreakWeeks } from './store.js';
import { MAX_SETS_PER_WEEK } from './security.js';

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

/**
 * Semaine de deload/taper **codée dans le programme** (barème `repScheme`).
 * Même couple de valeurs que la condition d'origine de `getNextPlan` — `'Repos'`
 * en est volontairement exclu : il n'apparaît qu'en S17, où `getNextPlan` sort déjà
 * avant (`week >= 17`), et l'inclure changerait le rendu de cette semaine pour rien.
 */
export function isCodedDeload(ex, week) {
  const s = ex.repScheme?.[week - 1] || '';
  return s === 'Deload' || s === 'Taper';
}

/**
 * Le statut choisi à la main **fait foi** ; le deload codé dans le programme n'est
 * qu'un **défaut** (journal §39) :
 *  - statut `'deload'` → deload, même sur une semaine normale du programme ;
 *  - statut `'normal'` **explicite** → semaine classique, même sur une semaine de
 *    deload codée (« override ») : analyse, progression Lafay et décompte de plateau
 *    normaux ;
 *  - aucun statut choisi → le deload codé s'applique, comme avant.
 *
 * Une semaine de deload effective est **transparente** au compteur de plateau (elle
 * ne compte pas et ne casse pas la série) : ce n'est pas une tentative de
 * progression. Sans ça, une deload saisie à ~60 % ressortait « réussie » et effaçait
 * un vrai plateau (résidu laissé ouvert en §38, refermé ici).
 */
export function isEffectiveDeload(ex, week) {
  if(getExStatus(ex.id, week) === 'deload') return true;
  return isCodedDeload(ex, week) && getExStatusRaw(ex.id, week) !== 'normal';
}

/** Une semaine de deload codée que l'utilisateur a explicitement repassée en « Normale ». */
export function isOverriddenDeload(ex, week) {
  return isCodedDeload(ex, week) && getExStatusRaw(ex.id, week) === 'normal';
}

/**
 * Référence de la dernière semaine **normale** avant `week` : son barème
 * (`scheme`) et sa recommandation S+1 (`kg`).
 *
 * Sert à trois choses, toutes sur la même valeur pour éviter les contradictions à
 * l'écran (leçon §37) : la ligne « Plan » du tracker, la charge de référence de
 * l'analyse, et le barème séries × reps. Indispensable pour une deload codée passée
 * en « Normale » : l'ATHX n'a **aucun** plan sur ces semaines (`plan[5] === null`) et
 * un programme généré n'y a qu'un plan à 60 % avec des reps gonflées — juger la
 * séance contre ça la classerait à tort (jusqu'à `crush`). Journal §39.
 */
export function prevNormalRef(ex, week) {
  for(let pw = week - 1; pw >= 1; pw--) {
    if(isEffectiveDeload(ex, pw)) continue;
    const nxt = getNextPlan(ex, pw);
    return { week: pw, scheme: ex.repScheme?.[pw - 1] || '', kg: nxt?.kg || null,
             outcome: nxt?.outcome || null };
  }
  return null;
}

/**
 * 1RM estimé (formule d'Epley) — permet de comparer deux séances de **barèmes
 * différents** : 50 kg × 3 reps et 47,5 kg × 5 reps valent ~55 kg tous les deux.
 * Utilisé uniquement là où le programme ne prescrit pas de barème (journal §40).
 */
export function e1RM(kg, reps) {
  const k = Number(kg), r = Number(reps);
  if(!isFinite(k) || k <= 0 || !isFinite(r) || r <= 0) return 0;
  return k * (1 + r / 30);
}

/**
 * Nombre de séries de la grille pour une semaine.
 *
 * ⚠ **`ex.sets` (`data.js`) contient les reps par série, pas un nombre de séries**,
 * malgré son nom : `press.sets[10] === 5` alors que le barème de S11 est `4×5`. Les
 * trois sites qui dessinaient puis relisaient la grille des semaines de deload s'en
 * servaient comme d'un compte de séries → **une ligne de trop** (5 au lieu de 4), et
 * ils doivent rester d'accord entre eux sous peine de perdre ou d'inventer une série.
 * Le barème fait foi ; sur une semaine de deload/taper, celui de la semaine normale
 * de référence (journal §40).
 */
export function nSetsForWeek(ex, week) {
  const scheme = ex.repScheme?.[week - 1] || '';
  let base = parseSets(scheme);
  if(!base) base = parseSets(prevNormalRef(ex, week)?.scheme || '') || 4;
  // Ne jamais masquer des séries **déjà saisies** : des séances ont pu être
  // enregistrées sur la ligne excédentaire avant ce correctif.
  // Plafonné : cette longueur vient du stockage, donc potentiellement d'un backup
  // importé — sans le plafond elle bornait la boucle de rendu de la grille (§41).
  const rec = normRecord(getRecord(ex.id, week));
  const logged = (rec?.sets || [])
    .filter(s => s && (s.kg != null || s.reps != null || s.skipped)).length;
  return Math.min(Math.max(base, logged), MAX_SETS_PER_WEEK);
}

/** Reps cibles d'une semaine : barème de la semaine, ou de la référence si non prescrit. */
export function planRepsForWeek(ex, week) {
  const scheme = ex.repScheme?.[week - 1] || '';
  return parseReps(scheme) ?? parseReps(prevNormalRef(ex, week)?.scheme || '');
}

export function weekOutcome(ex, week) {
  const status = getExStatus(ex.id, week);
  if(status === 'skipped') return 'skipped';
  if(status === 'hyrox')   return 'hyrox';
  if(isEffectiveDeload(ex, week)) return 'deload';

  const rec = normRecord(getRecord(ex.id, week));
  if(!rec || !rec.sets || !rec.sets.some(s => s && (s.kg != null || s.skipped))) return 'nodata';

  // Deload codée passée en « Normale » : le barème vient de la dernière semaine
  // normale, sinon 'Deload' ne fournit ni séries ni reps et les replis (4×5) seraient
  // faux dans un bloc en 4×4 — 4 reps sur un plan de 5 sortirait en `partial`.
  const _ovr     = isOverriddenDeload(ex, week) ? prevNormalRef(ex, week) : null;
  const scheme   = _ovr?.scheme || ex.repScheme[week - 1];
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

  const perfRatio = perfRatioFor(ex, week, { ovr: _ovr, sets, avgReps, planReps });

  if(perfRatio !== null && perfRatio < 0.8) return 'crush';
  if(avgRpe !== null && avgRpe > 9.5) return 'overload';
  if(setPct >= 1 && (perfRatio === null || perfRatio >= 0.95)) {
    return (avgRpe !== null && avgRpe > 8.5) ? 'high_rpe' : 'success';
  }
  return 'partial';
}

/**
 * Ratio de performance de la semaine, seul juge des seuils 0,8 / 0,95 / 1,1.
 *
 * Semaine normale → **reps réalisées / reps du plan** (le barème est la consigne, s'en
 * écarter doit se voir). Semaine de deload passée en « Normale » → **équivalence en
 * 1RM estimé** : le programme n'y prescrit aucun barème, et comparer les reps brutes
 * punissait une séance plus lourde à reps moindres. Cas réel : press S12, 50 kg × 3
 * reps × 5 séries à RPE 8 sortait en `crush` (3/5 = 60 % d'un objectif de 5 reps) avec
 * « recul de 2 paliers », alors que 50 × 3 ≈ 55 kg de 1RM estimé contre 48,75 × 5
 * ≈ 56,9, soit 97 % — une bonne séance (journal §40).
 *
 * Une vraie sous-performance reste détectée : 40 kg × 3 → 44 kg estimé, 77 % → `crush`.
 */
export function perfRatioFor(ex, week, { ovr, sets, avgReps, planReps }) {
  if(avgReps == null || !(planReps > 0)) return null;
  const refKg = ovr?.kg;
  if(!ovr || !refKg) return avgReps / planReps;
  const kgs = (sets || []).map(s => s?.kg || 0).filter(v => v > 0);
  const bk  = kgs.length ? Math.max(...kgs) : 0;
  const ref = e1RM(refKg, planReps);
  if(!bk || !ref) return avgReps / planReps;
  return e1RM(bk, avgReps) / ref;
}

/**
 * Nombre de semaines de plateau **consécutives** avant `beforeWeek`.
 *
 * Deux ruptures de série, toutes deux liées au déconditionnement (journal §38) :
 *  1. **Congé déclaré** — les semaines sautées et la semaine de reprise arrêtent le
 *     décompte (`vacancesBreakWeeks`, source unique dans `store.js`). Sans cela ces
 *     semaines sortaient en `nodata`, donc *transparentes* : un plateau d'avant le
 *     congé traversait la coupure et faisait reculer la semaine de reprise — déjà
 *     réduite par le coefficient. Une reprise **réussie** ressortait en
 *     « 4 semaines de plateau — recul d'un palier ».
 *  2. **Trou de ≥ 2 semaines sans séance** — couvre le congé saisi puis « Ignorer »
 *     (aucune métadonnée de semaine), la blessure et l'arrêt non saisi, sans avoir
 *     besoin d'un calendrier (l'ATHX legacy n'a pas de `startDate`). Une **seule**
 *     semaine manquée reste transparente, comme avant.
 */
export function consecutivePlateaux(ex, beforeWeek) {
  const brkWeeks = typeof vacancesBreakWeeks === 'function' ? vacancesBreakWeeks() : new Set();
  let count = 0;
  let gap   = 0;   // semaines consécutives sans séance réelle
  for(let w = beforeWeek - 1; w >= 1; w--) {
    if(brkWeeks.has(w)) break;
    const o = weekOutcome(ex, w);
    // Une semaine de deload **saisie** est transparente : ce n'est pas une tentative de
    // progression, elle ne compte ni ne casse. Une semaine de deload **sans données**
    // reste en revanche une semaine sans séance et alimente le compteur de trou — sinon
    // le deload codé en S6 masquerait un vrai arrêt de 2 semaines (§39).
    const noSession = o === 'nodata' || o === 'skipped'
                      || (o === 'deload' && !hasSessionData(ex.id, w));
    if(noSession) { if(++gap >= 2) break; continue; }
    gap = 0;
    if(['hyrox','deload'].includes(o)) continue;
    if(['partial','high_rpe'].includes(o)) { count++; continue; }
    break;
  }
  return count;
}

/** La semaine porte-t-elle une séance réellement saisie (charge ou série non effectuée) ? */
export function hasSessionData(exId, week) {
  const rec = normRecord(getRecord(exId, week));
  return !!rec?.sets?.some(s => s && (s.kg != null || s.skipped));
}

/**
 * Returns { kg, rule, outcome, plateauCount } or null.
 */
export function getNextPlan(ex, week) {
  if(week >= 17) return null;

  // Deload **effectif** : le statut choisi à la main fait foi (§39). Un « Normale »
  // explicite sur une semaine de deload codée fait donc tomber ce bloc et la semaine
  // est traitée comme n'importe quelle semaine d'entraînement ; à l'inverse un statut
  // 🔵 Deload posé sur une semaine normale y entre.
  const isDeloadWeek = isEffectiveDeload(ex, week);

  // Sur une semaine de deload, S+1 se base sur la dernière semaine normale
  // (la charge de la séance deload est volontairement réduite et ne doit pas piloter
  // la progression).
  if(isDeloadWeek) {
    // Find last non-deload week with data
    let refWeek = week - 1;
    while(refWeek >= 1) {
      if(!isEffectiveDeload(ex, refWeek)) {
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
    // Base de référence : dernière charge RÉELLEMENT soulevée (semaine antérieure
    // avec données), sinon repli sur la charge planifiée. Chercher l'historique
    // d'abord, sans quoi la réduction de sécurité s'applique au plan et non au réel.
    let refKg = null;
    for(let w = week - 1; w >= 1 && !refKg; w--) {
      const prevRec = normRecord(getRecord(ex.id, w));
      const prevKg  = prevRec ? Math.max(0, ...(prevRec.sets||[]).map(s=>s?.kg||0).filter(v=>v>0)) : 0;
      if(prevKg > 0) refKg = prevKg;
    }
    if(!refKg) refKg = ex.plan[week - 1] || ex.plan[week] || null;
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
  // Source unique : `repriseCoeffFor` (métadonnées de semaine prioritaires, repli
  // calendaire seulement si aucune reprise n'a été déclarée). On interroge `week + 1`
  // puisque c'est le plan de la semaine suivante qu'on produit ici — la bannière, elle,
  // interroge la semaine courante. Avant, le repli calendaire s'appliquait aussi APRÈS
  // la semaine de reprise : la bannière annonçait 93 % et la reco 100 % (journal §37).
  const vacList = typeof getVacancesList === 'function' ? getVacancesList() : [];
  const rc = (typeof repriseCoeffFor === 'function') ? repriseCoeffFor(week + 1, vacList) : null;
  if(rc) {
    const repriseKg = Math.round(currentKg * rc.coeff / 1.25) * 1.25;
    return { kg: repriseKg, rule: `${rc.label} · charge réduite à ${Math.round(rc.coeff*100)}% · RPE cible ${rc.rpeTarget}`, outcome: 'vacances', plateauCount: 0 };
  }

  let nextKg, rule;
  // Compteur affiché : une semaine réussie **casse** le plateau, on ne veut donc
  // pas afficher « Plateau : 3/3 » à côté d'une progression (cf. branche `success`).
  let plateauShown = plateauCount;

  // NB : plus de branche `status === 'deload'` ici — un statut 🔵 Deload est désormais
  // capté en amont par `isEffectiveDeload`, qui base S+1 sur la dernière semaine
  // **normale** au lieu de reconduire le plan officiel. Même règle donc pour un deload
  // manuel et pour un deload codé, et la perf réelle d'avant le deload est prise en
  // compte au lieu d'être ignorée (§39).
  if(status === 'skipped') {
    nextKg = currentKg;
    rule   = 'Séance sautée — répète la même charge.';
  } else if(outcome === 'crush') {
    nextKg = Math.max(currentKg - 2 * p, p);
    rule   = 'Reps très insuffisantes — recul de 2 paliers (Lafay : réinitialisation).';
  } else if(outcome === 'overload') {
    nextKg = Math.max(currentKg - p, p);
    rule   = 'RPE > 9.5 — charge excessive. Recul d\'un palier.';
  } else if(outcome === 'success') {
    // `success` est testé AVANT le plateau : une semaine réellement réussie (séries
    // pleines, reps ≥ 95 %, RPE ≤ 8.5) doit progresser, pas reculer. L'ordre inverse
    // faisait reculer une semaine réussie dès que la série antérieure atteignait 3 —
    // y compris hors congé (journal §38).
    nextKg = currentKg + p;
    rule   = 'Toutes séries validées + RPE ≤ 8.5 — progression d\'un palier ✓';
    plateauShown = 0;
  } else if(plateauCount >= 3) {
    nextKg = Math.max(currentKg - p, p);
    rule   = `${plateauCount} semaines de plateau — recul d'un palier (règle Lafay).`;
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

  return { kg: Math.round(nextKg / 1.25) * 1.25, rule, outcome, plateauCount: plateauShown };
}

/**
 * Full multi-axis analysis (RPE, reps, sets, kg vs plan).
 * Returns { type, signals[], hyrox, skipped, avgRpe, avgReps, ... }
 */
export function calcAdj(ex, week) {
  // Deload codée passée en « Normale » : l'ATHX n'a aucun plan sur ces semaines
  // (`plan[5] === null`), donc l'analyse repartait muette et l'override n'aurait rien
  // donné de visible. Référence = dernière semaine normale (barème + reco), soit
  // exactement la charge que la ligne « Plan » du tracker affiche déjà (§39).
  const _ovr     = isOverriddenDeload(ex, week) ? prevNormalRef(ex, week) : null;
  const planKg   = ex.plan[week - 1] || _ovr?.kg || null;
  const scheme   = _ovr?.scheme || ex.repScheme[week - 1];
  const planReps = parseReps(scheme) || 5;
  const nSets    = parseSets(scheme) || 4;

  const status   = getExStatus(ex.id, week);

  // Statuts « pas d'analyse de perf » traités AVANT le garde `!planKg` : une semaine
  // de deload codée de l'ATHX n'a pas de plan, le garde renvoyait donc `null` et la
  // vue n'affichait rien du tout sur ces semaines (§39).
  if(status === 'skipped') {
    return { type: 'skipped', signals: [], nextBonus: 0, bk: null, avgRpe: null,
             avgReps: null, repRatio: null, setPct: null, skipped: true, hyrox: false, deload: false };
  }
  if(isEffectiveDeload(ex, week)) {
    const rec = normRecord(getRecord(ex.id, week));
    const _vals = (rec?.sets||[]).map(s=>s?.kg||0).filter(v=>v>0);
    const bk  = _vals.length ? Math.max(..._vals) : null;
    const refW = prevNormalRef(ex, week)?.week;
    return { type: 'deload', signals: [
      { type: 'neutral', text: 'Séance deload — pas d\'analyse de performance, et la semaine ne compte pas dans le plateau.' },
      ...(bk ? [{ type: 'good', text: `Charge effectuée : ${bk} ${ex.unit}${refW ? ` — progression S+1 basée sur S${refW}` : ''}.` }] : []),
      { type: 'neutral', text: 'Si tu l\'as en fait entraînée normalement, choisis le statut « Normale » : elle sera analysée et comptée comme une semaine classique.' },
    ], nextBonus: 0, bk, avgRpe: null, avgReps: null, repRatio: null, setPct: null,
             skipped: false, hyrox: false, deload: true };
  }

  if(!planKg) return null;

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

  // Axe reps — jugé par `perfRatioFor` : reps brutes sur une semaine normale, équivalence
  // en 1RM estimé sur une deload passée en « Normale » (le programme n'y prescrit aucun
  // barème). Cf. §40 : 50 kg × 3 reps ne doit pas se lire comme 60 % d'un objectif de 5.
  const perfRatio = perfRatioFor(ex, week, { ovr: _ovr, sets, avgReps, planReps });
  if(perfRatio != null && _ovr) {
    const r    = round1(avgReps);
    const eSes = round1(e1RM(bk, avgReps));
    const eRef = round1(e1RM(planKg, planReps));
    const equiv = `${r} reps à ${bk} ${ex.unit} — 1RM estimé ${eSes} kg contre ${eRef} attendus (${planKg} × ${planReps})`;
    if(perfRatio < 0.8) {
      signals.push({ type: 'danger', text: `${equiv}. Nettement en dessous — réduis la charge.` });
      nextBonus -= (ex.id === 'squat' || ex.id === 'deadlift') ? 5 : 2.5;
    } else if(perfRatio < 0.95) {
      signals.push({ type: 'warn', text: `${equiv}. Un peu en dessous — consolide avant de progresser.` });
      nextBonus -= 1.25;
    } else if(perfRatio >= 1.1) {
      signals.push({ type: 'good', text: `${equiv} — objectif dépassé. Augmente la charge.` });
      nextBonus += 1.25;
    } else {
      signals.push({ type: 'good', text: `${equiv} — équivalent au barème attendu ✓` });
    }
  } else if(repRatio != null) {
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
