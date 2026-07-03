/**
 * generator.js — Program generation algorithm
 * Takes wizard config and produces a full program structure.
 */

import { filterExercises } from './exercises-db.js';
import { AGE_MODIFIERS, MIXTE_SPLITS, GROSSESSE_MOIS_CONFIG, GROSSESSE_EXERCISES_PRENATAL, GROSSESSE_SEMAINE_TYPE, POSTNATAL_PHASES, PILATES_VIDEOS } from './data.js';

// ── Phase structures by duration ──────────────────────────────────────────────

const PHASE_TEMPLATES = {
  8:  [
    { nom:'Base aérobie',   weeks:4, startPct:0.65, endPct:0.73, rpeTarget:'7–7.5',  startReps:8,  endReps:6,  seriesMod:0   },
    { nom:'Pic intensité',  weeks:3, startPct:0.80, endPct:0.88, rpeTarget:'8–8.5',  startReps:5,  endReps:3,  seriesMod:1   },
    { nom:'Taper',          weeks:1, startPct:0.65, endPct:0.65, rpeTarget:'6.5–7',  startReps:5,  endReps:5,  seriesMod:-2, isTaper:true },
  ],
  12: [
    { nom:'Base aérobie',   weeks:5, startPct:0.63, endPct:0.73, rpeTarget:'7–7.5',  startReps:8,  endReps:6,  seriesMod:0   },
    { nom:'Construction',   weeks:4, startPct:0.73, endPct:0.82, rpeTarget:'7.5–8',  startReps:6,  endReps:4,  seriesMod:0   },
    { nom:'Pic intensité',  weeks:2, startPct:0.85, endPct:0.90, rpeTarget:'8–9',    startReps:3,  endReps:2,  seriesMod:1   },
    { nom:'Taper',          weeks:1, startPct:0.65, endPct:0.65, rpeTarget:'6.5–7',  startReps:5,  endReps:5,  seriesMod:-2, isTaper:true },
  ],
  16: [
    { nom:'Base aérobie',   weeks:5, startPct:0.60, endPct:0.72, rpeTarget:'6.5–7.5',startReps:10, endReps:6,  seriesMod:0   },
    { nom:'Construction',   weeks:5, startPct:0.70, endPct:0.80, rpeTarget:'7–8',    startReps:6,  endReps:4,  seriesMod:0   },
    { nom:'Intensité',      weeks:4, startPct:0.80, endPct:0.88, rpeTarget:'8–8.5',  startReps:4,  endReps:3,  seriesMod:1   },
    { nom:'Pic',            weeks:1, startPct:0.90, endPct:0.90, rpeTarget:'8.5–9',  startReps:2,  endReps:2,  seriesMod:1   },
    { nom:'Taper',          weeks:1, startPct:0.65, endPct:0.65, rpeTarget:'6.5–7',  startReps:5,  endReps:5,  seriesMod:-2, isTaper:true },
  ],
};

// ── Volume by level ───────────────────────────────────────────────────────────

const VOLUME_BASE = {
  debutant:      { series: 3, repsRange: [10, 12], exPerSession: 4 },
  intermediaire: { series: 4, repsRange: [6, 8],   exPerSession: 5 },
  avance:        { series: 5, repsRange: [4, 6],   exPerSession: 6 },
};

function getVolume(niveau, age) {
  const base = VOLUME_BASE[niveau] || VOLUME_BASE.intermediaire;
  const mod  = AGE_MODIFIERS[age] || AGE_MODIFIERS['30-39'];
  return {
    series:       Math.min(base.series, mod.seriesMax),
    repsRange:    base.repsRange,
    exPerSession: Math.max(3, Math.round(base.exPerSession * mod.volumeMult)),
    rpeMax:       mod.rpeMax,
    rpeTarget:    mod.rpeTarget,
    deloadFreq:   mod.deloadFreq,
    recovDays:    mod.recovDays,
    mobilityPct:  mod.mobilityPct,
  };
}

// ── Days per week templates ───────────────────────────────────────────────────

const DAY_TEMPLATES = {
  2: ['Lundi', 'Jeudi'],
  3: ['Lundi', 'Mercredi', 'Vendredi'],
  4: ['Lundi', 'Mardi', 'Jeudi', 'Vendredi'],
  5: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
};

// ── Exercise split by domain ──────────────────────────────────────────────────

const DOMAIN_SPLITS = {
  hyrox: {
    2: ['Force + MetCon', 'Force + MetCon'],
    3: ['Force membres inf.', 'Force membres sup. + Core', 'MetCon complet'],
    4: ['Force inf.', 'Force sup.', 'MetCon léger', 'Simulation race'],
    5: ['Force inf.', 'Force sup.', 'MetCon', 'Force full', 'Simulation'],
  },
  force: {
    2: ['Push + Legs', 'Pull + Legs'],
    3: ['Push', 'Pull', 'Legs'],
    4: ['Push', 'Pull', 'Legs', 'Full body'],
    5: ['Push', 'Pull', 'Legs', 'Upper', 'Lower'],
  },
  gym: {
    2: ['Full body A', 'Full body B'],
    3: ['Push', 'Pull', 'Legs'],
    4: ['Chest/Tri', 'Back/Bi', 'Legs', 'Shoulders/Core'],
    5: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms/Core'],
  },
  cardio: {
    2: ['Endurance', 'Interval'],
    3: ['Endurance', 'Interval', 'Récupération active'],
    4: ['Long run', 'Interval', 'Tempo', 'Récupération'],
    5: ['Long run', 'Interval', 'Tempo', 'Fartlek', 'Récupération'],
  },
  mobilite: {
    2: ['Mobilité haut du corps', 'Mobilité bas du corps'],
    3: ['Mobilité haut', 'Mobilité bas', 'Full body flow'],
    4: ['Hanche + ischio', 'Épaule + thoracique', 'Full body', 'Yoga flow'],
    5: ['Hanche', 'Épaule', 'Thoracique', 'Bas du corps', 'Full body'],
  },
};

// ── Main generator ────────────────────────────────────────────────────────────

export function generateProgram(config, newProgramId) {
  const {
    domaine, niveau, age, seancesParSemaine, dureeSeance,
    materiel, exercicesForces, exercicesExclus, duree, competition, orm,
    name, nutrition,
  } = config;

  // ── Grossesse: special generation ──────────────────────────────────────────
  if(domaine === 'grossesse') {
    return _generateGrossesseProg(config, newProgramId);
  }

  // 1. Get phase template
  const closestDuration = [8, 12, 16].reduce((prev, curr) =>
    Math.abs(curr - duree) < Math.abs(prev - duree) ? curr : prev
  );
  const phaseTemplate = PHASE_TEMPLATES[closestDuration];

  // 2. Adjust phases if competition
  const phases = _buildPhases(phaseTemplate, duree, competition);

  // 3. Get exercises pool
  const pool = filterExercises({
    domain: domaine,
    materiel,
    niveau,
    excludeIds: exercicesExclus || [],
  });

  // Ensure forced exercises are included
  // exercicesForces is [{id, name}] from wizard — extract id
  const forcedIds = (exercicesForces || []).map(f => (typeof f === 'object' ? f.id : f));
  const forcedExercises = forcedIds.map(id => {
    const ex = pool.find(e => e.id === id);
    return ex || null;
  }).filter(Boolean);

  // 4. Get volume params (age-adjusted)
  const vol = getVolume(niveau, age || '30-39');
  const ageMod = AGE_MODIFIERS[age || '30-39'] || AGE_MODIFIERS['30-39'];

  // 5. Build week-by-week schedule
  const days    = DAY_TEMPLATES[Math.min(seancesParSemaine, 5)] || DAY_TEMPLATES[3];
  const isMixte = domaine === 'mixte';
  const mixteSplits = isMixte ? (MIXTE_SPLITS[Math.min(seancesParSemaine, 5)] || MIXTE_SPLITS[3]) : null;
  const splits  = isMixte ? mixteSplits.map(s=>s.nom) : (DOMAIN_SPLITS[domaine] || DOMAIN_SPLITS.gym)[Math.min(seancesParSemaine, 5)] || [];

  const semaines = [];
  let weekNum = 1;

  phases.forEach((phase, phaseIdx) => {
    // ── A1 : Progression intra-phase (linéaire startPct → endPct) ────────────
    for(let pw = 0; pw < phase.weeks; pw++) {
      const isTaper  = phase.isTaper;

      // Calcul du % d'intensité pour cette semaine (interpolation linéaire)
      const weekPct = phase.weeks > 1
        ? phase.startPct + (phase.endPct - phase.startPct) * pw / (phase.weeks - 1)
        : phase.startPct;

      const jours = days.map((dayName, di) => {
        const splitName  = splits[di] || dayName;
        const dayFocus = isMixte && mixteSplits?.[di]?.focus;
        const dayRpeMax = isMixte && mixteSplits?.[di]?.rpeMax
          ? Math.min(mixteSplits[di].rpeMax, vol.rpeMax)
          : vol.rpeMax;

        const exForDay = isMixte && dayFocus
          ? _selectExercisesForMixte(pool, forcedExercises, dayFocus, vol.exPerSession, di)
          : _selectExercisesForDay(pool, forcedExercises, splitName, domaine, vol.exPerSession, di);

        const exercices = exForDay.map(ex => {
          // A3: reps et séries interpolées par semaine dans la phase
          const weekReps = _interpolateReps(phase, pw, vol);
          const weekSeries = _interpolateSeries(phase, pw, vol);
          const pct  = isTaper ? 0.65 : weekPct;
          const kg   = orm ? _calcKg(ex.id, pct, orm, ex.muscles) : null;

          return {
            id:       ex.id,
            nom:      ex.name,
            series:   weekSeries,
            reps:     weekReps,
            scheme:   `${weekSeries}×${weekReps}`,
            pct1rm:   Math.round(pct * 100),
            kgPlan:   kg,
            muscles:  ex.muscles || [],
          };
        });

        return { nom: dayName, split: splitName, exercices };
      });

      semaines.push({
        num:     weekNum,
        phase:   phase.nom,
        isDeload: false,
        isTaper,
        rpeTarget: isTaper ? '≤ 7' : (phase.rpeTarget || vol.rpeTarget),
        intensite: isTaper ? 0.65 : weekPct,
        jours,
      });
      weekNum++;
    }

    // ── A2 : Semaine Deload entre les blocs ──────────────────────────────────
    // Insérer un deload après chaque phase (sauf après la dernière et avant Taper)
    const nextPhase = phases[phaseIdx + 1];
    const insertDeload = nextPhase && !nextPhase.isTaper && !phase.isTaper;
    if(insertDeload) {
      const deloadJours = days.map((dayName, di) => {
        const splitName = splits[di] || dayName;
        const dayFocus = isMixte && mixteSplits?.[di]?.focus;
        const exForDay = isMixte && dayFocus
          ? _selectExercisesForMixte(pool, forcedExercises, dayFocus, vol.exPerSession, di)
          : _selectExercisesForDay(pool, forcedExercises, splitName, domaine, vol.exPerSession, di);

        const exercices = exForDay.map(ex => {
          const deloadPct = 0.60;
          const kg = orm ? _calcKg(ex.id, deloadPct, orm, ex.muscles) : null;
          const deloadSeries = Math.max(2, vol.series - 2);
          const deloadReps = vol.repsRange[1] + 2; // reps élevées en deload
          return {
            id: ex.id, nom: ex.name,
            series: deloadSeries, reps: deloadReps,
            scheme: `${deloadSeries}×${deloadReps}`,
            pct1rm: 60, kgPlan: kg,
            muscles: ex.muscles || [],
          };
        });
        return { nom: dayName, split: splitName, exercices };
      });

      semaines.push({
        num: weekNum,
        phase: `Deload (${phase.nom})`,
        isDeload: true,
        isTaper: false,
        rpeTarget: '≤ 6.5',
        intensite: 0.60,
        jours: deloadJours,
      });
      weekNum++;
    }
  });

  return {
    id:        newProgramId,
    name:      name || `Programme ${domaine === 'mixte' ? 'Mixte' : domaine} ${duree} sem.`,
    status:    'active',
    createdAt: Date.now(),
    config,
    phases:    phases.map(p => ({
      nom:       p.nom,
      debut:     p.startWeek,
      fin:       p.startWeek + p.weeks - 1,
      intensite: (p.startPct + p.endPct) / 2,
      rpeTarget: p.rpeTarget,
    })),
    semaines,
    orm: orm || {},
    totalWeeks: weekNum - 1,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _buildPhases(template, totalWeeks, competition) {
  // Distribute weeks across phases, respecting taper + deloads between phases
  const taperWeeks  = 1;
  const nonTaper    = template.filter(p => !p.isTaper);
  // Deloads: 1 semaine entre chaque phase (sauf avant Taper) = nonTaper.length - 1
  const deloadWeeks = Math.max(0, nonTaper.length - 1);
  const mainWeeks   = totalWeeks - taperWeeks - deloadWeeks;
  const totalRatio  = nonTaper.reduce((s, p) => s + p.weeks, 0);

  let weekCursor = 1;
  const phases = nonTaper.map(p => {
    const scaled = Math.max(1, Math.round(p.weeks / totalRatio * mainWeeks));
    const phase  = { ...p, weeks: scaled, startWeek: weekCursor };
    weekCursor  += scaled;
    return phase;
  });

  // Add taper (dernière phase — c'est le pic de récupération avant compétition).
  const taperTemplate = template.find(p => p.isTaper);
  if(taperTemplate) {
    phases.push({ ...taperTemplate, weeks: taperWeeks, startWeek: weekCursor });
    weekCursor += taperWeeks;
  }

  // NB : l'alignement fin du taper sur la date exacte de compétition (raccourcir/
  // rallonger le programme pour finir la semaine de la compét) reste une évolution
  // à part entière — voir le plan "startDate". La durée choisie par l'utilisateur
  // (recommandée par domaine) place déjà le taper en fin de cycle.

  return phases;
}

// A4: Exercices prioritaires (compound) par type de split
const SPLIT_COMPOUNDS = {
  push:  ['bench','press','ohp','dips'],
  pull:  ['deadlift','row_barre','pullup','rdl'],
  legs:  ['squat','squat_fs','lunges','leg_press'],
  upper: ['bench','press','row_barre','pullup'],
  lower: ['squat','deadlift','squat_fs','rdl'],
  full:  ['squat','bench','deadlift','press'],
  metcon:['thruster','burpee','box_jump','wall_ball'],
  force_inf: ['squat','squat_fs','deadlift','lunges'],
  force_sup: ['bench','press','ohp','row_barre'],
};

// Muscles associés à chaque type de split (pour filtrer les accessoires)
const SPLIT_MUSCLES = {
  push:  ['pec','deltAnt','triceps','epaule'],
  pull:  ['dorsaux','biceps','trapeze','rhomboide'],
  legs:  ['quad','ischio','fessiers','mollets','adducteur'],
  upper: ['pec','deltAnt','triceps','dorsaux','biceps','trapeze','epaule'],
  lower: ['quad','ischio','fessiers','mollets','adducteur'],
  full:  null, // pas de filtre
};

// Contexte partagé entre les jours pour éviter les doublons
let _usedExerciseIds = new Set();

function _resetDaySelection() { _usedExerciseIds = new Set(); }

function _selectExercisesForDay(pool, forced, splitName, domaine, count, dayIndex) {
  if(dayIndex === 0) _resetDaySelection();

  const split = splitName.toLowerCase();
  const result = [];

  // 1. Identifier le type de split
  let splitKey = 'full';
  if(split.includes('push') || split.includes('chest'))          splitKey = 'push';
  else if(split.includes('pull') || split.includes('back') || split.includes('bi')) splitKey = 'pull';
  else if(split.includes('legs') || split.includes('leg') || split.includes('jambe')) splitKey = 'legs';
  else if(split.includes('inf'))                                  splitKey = split.includes('force') ? 'force_inf' : 'lower';
  else if(split.includes('sup'))                                  splitKey = split.includes('force') ? 'force_sup' : 'upper';
  else if(split.includes('upper'))                                splitKey = 'upper';
  else if(split.includes('lower'))                                splitKey = 'lower';
  else if(split.includes('metcon') || split.includes('cardio') || split.includes('simulation')) splitKey = 'metcon';

  // 2. Filtrer les exercices par muscles du split (ou tous pour full/metcon)
  const muscleFilter = SPLIT_MUSCLES[splitKey];
  let filtered = muscleFilter
    ? pool.filter(e => e.muscles?.some(m => muscleFilter.includes(m)))
    : pool;
  if(filtered.length < 2) filtered = pool;

  // 3. Insérer les exercices forcés qui correspondent à ce split
  forced.forEach(ex => {
    if(_usedExerciseIds.has(ex.id)) return;
    const matchesSplit = !muscleFilter || ex.muscles?.some(m => muscleFilter.includes(m));
    if(matchesSplit && result.length < count) {
      result.push(ex);
      _usedExerciseIds.add(ex.id);
    }
  });

  // 4. Compounds prioritaires — cherchés dans le POOL COMPLET (pas le filtre musculaire)
  const compounds = SPLIT_COMPOUNDS[splitKey] || [];
  compounds.forEach(cId => {
    if(result.length >= count) return;
    if(_usedExerciseIds.has(cId)) return;
    const ex = pool.find(e => e.id === cId);
    if(ex) {
      result.push(ex);
      _usedExerciseIds.add(cId);
    }
  });

  // 5. Accessoires : remplir les slots restants depuis le filtre musculaire
  const remaining = filtered
    .filter(e => !_usedExerciseIds.has(e.id))
    .sort((a,b) => (a.id > b.id ? 1 : -1));

  remaining.slice(0, count - result.length).forEach(ex => {
    result.push(ex);
    _usedExerciseIds.add(ex.id);
  });

  return result.slice(0, count);
}

// A3: Interpolation reps et séries par semaine dans la phase
function _interpolateReps(phase, pw, vol) {
  const startR = phase.startReps || vol.repsRange[1];
  const endR   = phase.endReps   || vol.repsRange[0];
  if(phase.weeks <= 1) return startR;
  const raw = startR + (endR - startR) * pw / (phase.weeks - 1);
  return Math.round(raw);
}

function _interpolateSeries(phase, pw, vol) {
  const baseSeries = vol.series;
  const mod = phase.seriesMod || 0;
  // Progressive: séries augmentent légèrement dans les phases intensité (seriesMod > 0)
  // Taper: séries diminuent (seriesMod < 0)
  if(phase.weeks <= 1) return Math.max(2, baseSeries + mod);
  // Interpolation linéaire du modificateur sur la phase
  const weekMod = Math.round(mod * pw / (phase.weeks - 1));
  return Math.max(2, baseSeries + weekMod);
}

function _repsForPhase(pct, vol, isDeload, isTaper) {
  if(isDeload || isTaper) return vol.repsRange[1] + 2; // higher reps, lower weight
  // Higher intensity = lower reps (progressive within phase)
  if(pct >= 0.88) return vol.repsRange[0];       // ex: 4 reps
  if(pct >= 0.80) return vol.repsRange[0] + 1;   // ex: 5 reps
  if(pct >= 0.73) return Math.round((vol.repsRange[0] + vol.repsRange[1]) / 2); // ex: 7 reps
  return vol.repsRange[1];                         // ex: 8 reps
}

function _calcKg(exId, pct, orm, muscles) {
  // Correspondance directe par ID
  if(orm[exId]) return Math.round(orm[exId] * pct / 1.25) * 1.25;

  // Correspondance par groupe musculaire → ORM le plus proche
  const m = (muscles || []).map(x => x.toLowerCase());
  let ref = null;
  if(m.some(x => ['pec','deltant','triceps'].includes(x)))        ref = orm.bench || orm.press;
  else if(m.some(x => ['dorsaux','biceps','trapeze'].includes(x))) ref = orm.deadlift || orm.row_barre;
  else if(m.some(x => ['quad','fessiers','ischio'].includes(x)))   ref = orm.squat || orm.deadlift;
  else if(m.some(x => ['deltpost','core','lombaires'].includes(x)))ref = orm.press || orm.squat;

  // Fallback : moyenne des ORM disponibles × 0.6 (exercice accessoire = ~60% du compound)
  if(!ref) {
    const vals = Object.values(orm).filter(v => typeof v === 'number' && v > 0);
    ref = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length * 0.6 : null;
  }
  if(!ref) return null;
  return Math.round(ref * pct / 1.25) * 1.25;
}

function _generateGrossesseProg(config, id) {
  const { grossesse_type, mois_grossesse, postnatal_phase, duree, name, seancesParSemaine } = config;
  const isPrenatal = grossesse_type === 'prenatal';
  const mois = mois_grossesse || 5;
  const moisConf = GROSSESSE_MOIS_CONFIG[mois] || GROSSESSE_MOIS_CONFIG[5];
  const totalWeeks = duree || (isPrenatal ? 8 : 6);

  // Phases based on type
  let phases;
  if(isPrenatal) {
    phases = [{ nom:`Programme prénatal — ${moisConf.label}`, debut:1, fin:totalWeeks, intensite:0.55, rpeTarget:`≤ ${moisConf.rpe_max}` }];
  } else {
    const phaseDef = POSTNATAL_PHASES.find(p=>p.id===postnatal_phase) || POSTNATAL_PHASES[0];
    phases = [{ nom:`Post-natal — ${phaseDef.label}`, debut:1, fin:totalWeeks, intensite:0.50, rpeTarget:'≤ 6' }];
  }

  // Build semaines
  const semaines = [];
  for(let w = 1; w <= totalWeeks; w++) {
    const currentMois = isPrenatal ? Math.min(9, mois + Math.floor((w-1) / 4)) : mois;
    const mc = GROSSESSE_MOIS_CONFIG[currentMois] || moisConf;

    const jours = GROSSESSE_SEMAINE_TYPE.map(day => {
      if(day.seance === 'repos') {
        return { nom:day.jour, split:day.label, exercices:[
          { id:'kegel_repos', nom:'Kegel quotidien', unit:'', kgPlan:null, scheme:'3 × 10 · 8 s', muscles:['core'], pct1rm:null },
          { id:'etirements_repos', nom:'Étirements doux', unit:'', kgPlan:null, scheme:'10 min', muscles:[], pct1rm:null },
        ]};
      }

      // Get exercises for this seance type
      let seanceId = day.seance;
      const exs = GROSSESSE_EXERCISES_PRENATAL
        .filter(e => e.seance === seanceId)
        .map(e => {
          const dosage = e.dosage_key ? mc[e.dosage_key] : e.dosage;
          const supprime = e.supprime_key ? mc[e.supprime_key] : (e.supprime_from ? currentMois >= e.supprime_from : false);
          return {
            id:       e.id,
            nom:      e.name,
            unit:     '',
            kgPlan:   null,
            scheme:   dosage || '—',
            muscles:  [],
            pct1rm:   null,
            ballon:   e.ballon || false,
            video:    e.video_key === 'pilates_par_mois' ? PILATES_VIDEOS[currentMois] : e.video,
            desc:     e.desc,
            supprime,
            supprime_msg: e.supprime_msg,
            note:     e.note_key ? mc[e.note_key] : null,
          };
        });

      return {
        nom:      day.jour,
        split:    day.label,
        alt:      day.alt || null,
        altLabel: day.altLabel || null,
        exercices: exs,
      };
    });

    semaines.push({
      num:       w,
      phase:     phases[0].nom,
      isDeload:  false,
      isTaper:   false,
      rpeTarget: `≤ ${mc.rpe_max}`,
      intensite: phases[0].intensite,
      moisCourant: currentMois,
      jours,
    });
  }

  return {
    id,
    name:       name || (isPrenatal ? `Programme prénatal — ${moisConf.label}` : `Programme post-natal`),
    type:       grossesse_type === 'prenatal' ? 'prenatal' : 'postnatal',
    subtype:    'grossesse',
    status:     'active',
    createdAt:  Date.now(),
    config,
    phases,
    semaines,
    orm:        {},
    totalWeeks,
  };
}

function _selectExercisesForMixte(pool, forced, focuses, count, dayIndex) {
  // Filter exercises that match any of the focus domains
  const filtered = pool.filter(e =>
    e.domains?.some(d => focuses.includes(d))
  );
  const src = filtered.length >= 2 ? filtered : pool;

  const result = [];
  // Add forced exercises on day 0
  if(dayIndex === 0) {
    forced.slice(0, 2).forEach(ex => {
      if(!result.find(e=>e.id===ex.id)) result.push(ex);
    });
  }
  const used = new Set(result.map(e=>e.id));
  const shuffled = _shuffle(src.filter(e=>!used.has(e.id)));
  shuffled.slice(0, count - result.length).forEach(ex => result.push(ex));
  return result.slice(0, count);
}

function _shuffle(arr) {
  const a = [...arr];
  for(let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
