/**
 * exercises-db.js — Exercise database
 * Fetches from wger API and caches in IndexedDB.
 * Falls back to a curated built-in list if offline.
 */

import { dbGet, dbSet } from './db.js';

const WGER_BASE    = 'https://wger.de/api/v2';
const CACHE_KEY    = 'exercises_db';
const CACHE_TTL    = 7 * 24 * 3600 * 1000; // 1 week

// ── Domain → wger category IDs ───────────────────────────────────────────────
// wger categories: 10=Abs, 8=Arms, 12=Back, 14=Calves, 11=Chest,
//                  9=Legs, 13=Shoulders, 15=Glutes
const DOMAIN_CATEGORIES = {
  hyrox:      [9, 12, 11, 13, 8, 10],
  force:      [9, 12, 11, 13, 8],
  cardio:     [9, 12, 10],
  gym:        [9, 12, 11, 13, 8, 10, 14, 15],
  mobilite:   [9, 12, 13, 10],
  mixte:      [9, 12, 11, 13, 8, 10, 14, 15],  // all categories
};

// ── wger equipment IDs ───────────────────────────────────────────────────────
// 1=Barbell, 2=SZ-Bar, 3=Dumbbell, 4=Gym mat, 5=Swiss ball,
// 6=Pull-up bar, 7=None, 8=Bench, 9=Incline bench, 10=Kettlebell,
// 11=Cable, 12=Machine
const EQUIPMENT_MAP = {
  barre:      [1, 2],
  halteres:   [3],
  kettlebell: [10],
  pdc:        [7, 4, 6],
  machines:   [11, 12, 8, 9],
  elastiques: [7],
};

// ── Curated fallback exercises ────────────────────────────────────────────────
// Used when offline or API fails. Covers main movements for each domain.
const FALLBACK_EXERCISES = [
  // Force compound
  { id:'squat',     name:'Back Squat',          category:[9],     equipment:[1], muscles:['quad','fessiers','ischio'],    level:'all',    domains:['force','hyrox','gym'] },
  { id:'deadlift',  name:'Deadlift',             category:[12],    equipment:[1], muscles:['ischio','lombaires','fessiers'],level:'all',   domains:['force','hyrox','gym'] },
  { id:'press',     name:'Strict Press',         category:[13],    equipment:[1], muscles:['deltAnt','triceps','trapeze'], level:'all',    domains:['force','hyrox','gym'] },
  { id:'bench',     name:'Bench Press',          category:[11],    equipment:[1,8],muscles:['pec','deltAnt','triceps'],   level:'all',    domains:['force','gym'] },
  { id:'row_barre', name:'Rowing barre',         category:[12],    equipment:[1], muscles:['dorsaux','biceps','trapeze'],  level:'all',    domains:['force','gym'] },
  { id:'squat_fs',  name:'Front Squat',          category:[9],     equipment:[1], muscles:['quad','fessiers','core'],     level:'inter',  domains:['hyrox','force'] },
  { id:'rdl',       name:'Romanian Deadlift',    category:[12],    equipment:[1], muscles:['ischio','fessiers','lombaires'],level:'all',   domains:['force','gym','hyrox'] },
  { id:'ohp',       name:'Push Press',           category:[13],    equipment:[1], muscles:['deltAnt','triceps','core'],   level:'all',    domains:['hyrox','force'] },
  // Hyrox spécifique
  { id:'gtoh',      name:'GTOH DB alterné',      category:[13],    equipment:[3], muscles:['deltAnt','triceps','core'],   level:'all',    domains:['hyrox'] },
  { id:'sandbag',   name:'Sandbag carry',         category:[9],     equipment:[7], muscles:['trapeze','core','quad'],      level:'all',    domains:['hyrox'] },
  { id:'lunges_db', name:'Walking lunges DB',     category:[9],     equipment:[3], muscles:['quad','fessiers','ischio'],   level:'all',    domains:['hyrox','gym'] },
  { id:'burpee',    name:'Burpee box jump-over',  category:[10],    equipment:[7], muscles:['quad','pec','core'],          level:'all',    domains:['hyrox','cardio'] },
  { id:'row_erg',   name:'Rowing ergomètre',      category:[12],    equipment:[12],muscles:['dorsaux','biceps','core'],    level:'all',    domains:['hyrox','cardio'] },
  { id:'ski_erg',   name:'Ski Erg',               category:[13],    equipment:[12],muscles:['dorsaux','deltPost','core'],  level:'all',    domains:['hyrox','cardio'] },
  { id:'wall_ball', name:'Wall Ball',             category:[9],     equipment:[7], muscles:['quad','deltAnt','core'],      level:'all',    domains:['hyrox'] },
  // Haltères
  { id:'db_curl',   name:'Curl haltères',         category:[8],     equipment:[3], muscles:['biceps','avantbras'],         level:'all',    domains:['gym'] },
  { id:'db_press',  name:'Développé haltères',    category:[11],    equipment:[3], muscles:['pec','deltAnt','triceps'],    level:'all',    domains:['gym'] },
  { id:'db_row',    name:'Rowing haltère',        category:[12],    equipment:[3], muscles:['dorsaux','biceps'],           level:'all',    domains:['gym','hyrox'] },
  { id:'db_shoulder',name:'Élévations latérales', category:[13],    equipment:[3], muscles:['deltAnt','deltPost'],         level:'all',    domains:['gym'] },
  { id:'thruster',  name:'Thruster',              category:[9],     equipment:[1,3],muscles:['quad','deltAnt','triceps'],  level:'inter',  domains:['hyrox','gym'] },
  // Kettlebell
  { id:'kb_swing',  name:'KB Swing',              category:[9],     equipment:[10],muscles:['ischio','fessiers','core'],   level:'all',    domains:['hyrox','gym','cardio'] },
  { id:'kb_clean',  name:'KB Clean & Press',      category:[13],    equipment:[10],muscles:['deltAnt','quad','core'],      level:'inter',  domains:['hyrox'] },
  { id:'kb_goblet', name:'Goblet Squat',          category:[9],     equipment:[10],muscles:['quad','fessiers','core'],     level:'all',    domains:['hyrox','gym'] },
  // Poids du corps
  { id:'pullup',    name:'Traction',              category:[12],    equipment:[6], muscles:['dorsaux','biceps'],           level:'all',    domains:['gym','hyrox','force'] },
  { id:'dip',       name:'Dips',                  category:[11],    equipment:[6], muscles:['pec','triceps','deltAnt'],    level:'all',    domains:['gym','force'] },
  { id:'pushup',    name:'Push-up',               category:[11],    equipment:[7], muscles:['pec','triceps','deltAnt'],    level:'all',    domains:['gym','hyrox','force'] },
  { id:'plank',     name:'Planche',               category:[10],    equipment:[4], muscles:['core','lombaires'],           level:'all',    domains:['gym','hyrox','mobilite'] },
  { id:'pistol',    name:'Pistol Squat',          category:[9],     equipment:[7], muscles:['quad','fessiers'],            level:'avance', domains:['hyrox','gym'] },
  { id:'hspu',      name:'HSPU',                  category:[13],    equipment:[7], muscles:['deltAnt','triceps','core'],   level:'avance', domains:['hyrox'] },
  // Cardio
  { id:'run',       name:'Course à pied',         category:[9],     equipment:[7], muscles:['quad','ischio','mollets'],    level:'all',    domains:['cardio','hyrox'] },
  { id:'bike_erg',  name:'Assault Bike',          category:[9],     equipment:[12],muscles:['quad','ischio','core'],       level:'all',    domains:['hyrox','cardio'] },
  { id:'jump_rope', name:'Corde à sauter',        category:[9],     equipment:[7], muscles:['mollets','core'],             level:'all',    domains:['cardio','hyrox'] },
  // Mobilité
  { id:'hip_flex',  name:'Hip flexor stretch',    category:[9],     equipment:[4], muscles:['quad','fessiers'],            level:'all',    domains:['mobilite'] },
  { id:'thor_rot',  name:'Rotation thoracique',   category:[12],    equipment:[4], muscles:['lombaires','dorsaux'],        level:'all',    domains:['mobilite'] },
  { id:'deep_sq',   name:'Deep squat hold',       category:[9],     equipment:[4], muscles:['quad','fessiers','mollets'],  level:'all',    domains:['mobilite'] },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load exercise database.
 * Returns { exercises, fromCache, fromApi, fromFallback }
 */
export async function loadExercisesDB() {
  // 1. Check cache
  const cached = dbGet(CACHE_KEY);
  if(cached && cached.ts && Date.now() - cached.ts < CACHE_TTL) {
    return { exercises: cached.data, fromCache: true };
  }

  // 2. Try wger API
  try {
    const exercises = await _fetchFromWger();
    // On accepte toute réponse au moins aussi riche que le fallback intégré.
    if(exercises.length >= FALLBACK_EXERCISES.length) {
      dbSet(CACHE_KEY, { ts: Date.now(), data: exercises });
      return { exercises, fromApi: true };
    }
  } catch(err) {
    console.warn('[exercises-db] wger fetch failed:', err.message);
  }

  // 3. Repli : réutiliser le cache même périmé (bien plus complet que le fallback)
  if(cached?.data?.length) {
    return { exercises: cached.data, fromCache: true, stale: true };
  }

  // 4. Dernier recours : liste intégrée
  return { exercises: FALLBACK_EXERCISES, fromFallback: true };
}

/**
 * Get exercises db (sync, from cache or fallback)
 */
export function getExercisesDB() {
  const cached = dbGet(CACHE_KEY);
  return cached?.data || FALLBACK_EXERCISES;
}

/**
 * Filter exercises by domain + equipment + level
 */
export function filterExercises({ domain, materiel = [], niveau = 'all', excludeIds = [] }) {
  const db = getExercisesDB();

  // Equipment IDs allowed
  const allowedEquip = new Set([7]); // always allow bodyweight
  materiel.forEach(m => {
    (EQUIPMENT_MAP[m] || []).forEach(id => allowedEquip.add(id));
  });

  const levelOrder = { debutant: 0, intermediaire: 1, avance: 2, all: 3 };
  const userLevel  = levelOrder[niveau] ?? 1;

  return db.filter(ex => {
    if(excludeIds.includes(ex.id)) return false;
    // Mixte accepts exercises from any domain
    if(domain && domain !== 'mixte' && ex.domains && !ex.domains.includes(domain)) return false;
    const exLevel = levelOrder[ex.level] ?? 0;
    if(exLevel > userLevel && ex.level !== 'all') return false;
    if(ex.equipment && ex.equipment.length > 0) {
      const hasEquip = ex.equipment.some(e => allowedEquip.has(e));
      if(!hasEquip) return false;
    }
    return true;
  });
}

/**
 * Search exercises by name (for wizard step 5)
 */
export function searchExercises(query) {
  const db = getExercisesDB();
  const q  = query.toLowerCase().trim();
  if(!q) return db.slice(0, 20);
  return db.filter(ex => ex.name.toLowerCase().includes(q)).slice(0, 20);
}

// ── Internal: fetch from wger ─────────────────────────────────────────────────

async function _fetchFromWger() {
  const exercises = [];
  // Fetch exerciseinfo (includes muscles + equipment) in English then French
  let url = `${WGER_BASE}/exerciseinfo/?format=json&language=2&limit=100`;
  let page = 0;
  const maxPages = 10;

  while(url && page < maxPages) {
    // Timeout 8 s : une connexion suspendue ne doit pas bloquer le repli fallback.
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let res;
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if(!res.ok) throw new Error(`wger API error: ${res.status}`);
    const data = await res.json();

    data.results.forEach(ex => {
      const name = ex.translations?.find(t => t.language === 2)?.name
                || ex.translations?.[0]?.name
                || ex.name
                || `Exercise ${ex.id}`;
      if(!name) return;

      exercises.push({
        id:        `wger_${ex.id}`,
        name,
        category:  [ex.category?.id].filter(Boolean),
        equipment: ex.equipment?.map(e => e.id) || [7],
        muscles:   ex.muscles?.map(m => _wgerMuscleToLocal(m.name_en)) || [],
        level:     'all',
        domains:   _categoryToDomains(ex.category?.id),
        wgerId:    ex.id,
      });
    });

    url = data.next;
    page++;
  }
  return exercises;
}

function _wgerMuscleToLocal(name) {
  const map = {
    'Quadriceps femoris': 'quad',
    'Biceps femoris':     'ischio',
    'Gluteus maximus':    'fessiers',
    'Pectoralis major':   'pec',
    'Latissimus dorsi':   'dorsaux',
    'Deltoid':            'deltAnt',
    'Triceps brachii':    'triceps',
    'Biceps brachii':     'biceps',
    'Trapezius':          'trapeze',
    'Rectus abdominis':   'core',
    'Gastrocnemius':      'mollets',
    'Soleus':             'mollets',
    'Erector spinae':     'lombaires',
    'Brachialis':         'biceps',
    'Anterior deltoid':   'deltAnt',
    'Posterior deltoid':  'deltPost',
  };
  return map[name] || name.toLowerCase().replace(/\s+/g,'_');
}

function _categoryToDomains(catId) {
  const map = {
    10: ['gym','hyrox'],        // Abs
    8:  ['gym'],                // Arms
    12: ['force','gym','hyrox'],// Back
    14: ['gym'],                // Calves
    11: ['force','gym'],        // Chest
    9:  ['force','gym','hyrox','cardio'], // Legs
    13: ['force','gym','hyrox'],// Shoulders
    15: ['gym','hyrox'],        // Glutes
  };
  return map[catId] || ['gym'];
}

export { FALLBACK_EXERCISES, DOMAIN_CATEGORIES, EQUIPMENT_MAP };
