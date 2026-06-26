/**
 * data.js — All app constants and exercise definitions
 * No side effects. Pure data.
 */

export const EXERCISES = [
  {
    id: 'press', day: 'Mercredi', name: 'Strict Press', unit: 'kg',
    sets: [5,5,5,5,5,null,3,3,3,5,5,null,1,1,1,3,null],
    plan: [35,37.5,40,42.5,45,null,47.5,50,52.5,45,47.5,null,null,null,null,50,null],
    repScheme: ['5×5','5×5','5×5','5×5','5×5','Deload','5×3','5×3','5×3','4×5','4×5','Deload',
                '1RM tentative','1RM tentative','1RM max','3×3','Taper'],
    color: '#1a5fb4', refText: '1RM Press',
  },
  {
    id: 'squat', day: 'Mercredi', name: 'Back Squat', unit: 'kg',
    sets: [5,5,5,5,5,null,4,4,4,5,5,null,3,3,3,3,null],
    plan: [77.5,80,82.5,85,87.5,null,90,92.5,95,85,90,null,null,null,null,92.5,null],
    repScheme: ['4×5','4×5','4×5','4×5','4×5','Deload','4×4','4×4','4×4','3×5','3×5','Deload',
                '3RM tentative','3RM tentative','3RM max','3×3','Taper'],
    color: '#7c4a00', refText: '1RM Squat',
  },
  {
    id: 'deadlift', day: 'Jeudi', name: 'Deadlift', unit: 'kg',
    sets: [4,4,4,4,4,null,3,3,3,4,4,null,1,1,1,3,null],
    plan: [85,90,95,100,105,null,110,115,117.5,105,110,null,120,125,null,null,null],
    repScheme: ['4×4','4×4','4×4','4×4','4×4','Deload','4×3','4×3','4×3','3×4','3×4','Deload',
                '5RM tentative','5RM tentative','5RM max','3×3','Repos'],
    color: '#1b6b45', refText: '1RM Deadlift',
  },
  {
    id: 'gtoh', day: 'Vendredi', name: 'GTOH DB alterné', unit: 'kg',
    sets: Array(17).fill(null),
    plan: [15,15,15,15,15,null,17.5,17.5,20,20,20,null,20,20,20,16,null],
    repScheme: ['3×12','3×12','3×12','3×12','3×12','Deload','3×10/c','3×10/c','3×10/c',
                '3×10/c','3×10/c','Deload','3×15','3×15','Simulation','Volume réduit','Repos'],
    color: '#3b6d11', refText: 'Charge compét : 20 kg',
  },
  {
    id: 'sandbag', day: 'Vendredi', name: 'Sandbag carry', unit: 'kg',
    sets: Array(17).fill(null),
    plan: [null,null,null,null,null,null,40,40,50,50,50,null,50,50,50,40,null],
    repScheme: ['—','—','—','—','—','—','3×30 m','3×30 m','3×30 m','3×30 m','3×30 m','Deload',
                '3×30 m','3×30 m','Simulation','Volume réduit','Repos'],
    color: '#633806', refText: 'Charge compét : 50 kg',
  },
  {
    id: 'lunges', day: 'Vendredi', name: 'DB Walking lunges', unit: 'kg/main',
    sets: Array(17).fill(null),
    plan: [15,15,15,15,15,null,15,17.5,20,20,20,null,20,20,20,16,null],
    repScheme: ['3×10 m','3×10 m','3×10 m','3×10 m','3×10 m','Deload','3×10 m','3×10 m',
                '3×10 m','3×10 m','3×10 m','Deload','Simulation','Simulation','Simulation',
                'Volume réduit','Repos'],
    color: '#3c3489', refText: 'Charge compét : 2×20 kg',
  },
];

export const PHASES = [1,1,1,1,1,0,2,2,2,2,2,0,3,3,3,3,0];
export const PHASE_LABELS = [
  'Deload',
  'Bloc 1 — Base technique',
  'Bloc 2 — Intensité',
  'Bloc 3 — Simulation compétition',
];
export const PHASE_STYLE = [
  { bg:'#e8e6e0', color:'#444441' },
  { bg:'#e8f0fc', color:'#1a5fb4' },
  { bg:'#fdf0d8', color:'#7c4a00' },
  { bg:'#e0f4eb', color:'#1b6b45' },
];

// ── Muscle data ──────────────────────────────────────────────────────────────

export const MUSCLE_LABELS = {
  trapeze:   'Trapèzes',      deltAnt:   'Deltoïde ant.',  deltPost:  'Deltoïde post.',
  biceps:    'Biceps',        triceps:   'Triceps',          pec:       'Pectoraux',
  dorsaux:   'Dorsaux',       core:      'Core / Abdos',    lombaires: 'Lombaires',
  quad:      'Quadriceps',    ischio:    'Ischio-jambiers', fessiers:  'Fessiers',
  avantbras: 'Avant-bras',    mollets:   'Mollets',
};

/** Recovery half-life in hours (SRA model) */
export const RECOVERY_HALFLIFE = {
  trapeze: 48, deltAnt: 48, deltPost: 48, biceps: 48, triceps: 48,
  pec: 60,     dorsaux: 60, core: 36,    lombaires: 72,
  quad: 72,    ischio: 72,  fessiers: 60, avantbras: 36, mollets: 60,
};

/** exercise id → muscle id → load factor (0–1) */
export const MUSCLE_MAP = {
  press: {
    deltAnt: 1.0, trapeze: 0.5, pec: 0.4, triceps: 0.35, core: 0.2, avantbras: 0.15,
  },
  squat: {
    quad: 1.0, fessiers: 0.6, ischio: 0.3, lombaires: 0.3, core: 0.25, mollets: 0.15,
  },
  deadlift: {
    ischio: 1.0, fessiers: 0.8, lombaires: 0.8, quad: 0.4,
    dorsaux: 0.4, trapeze: 0.35, avantbras: 0.3, biceps: 0.2, core: 0.2,
  },
};

/** Maximum weekly volume threshold per muscle */
export const MUSCLE_THRESH = {
  trapeze: 18, deltAnt: 14, deltPost: 14, biceps: 12, triceps: 14,
  pec: 16,     dorsaux: 18, core: 20,    lombaires: 12,
  quad: 20,    ischio: 16,  fessiers: 18, avantbras: 14, mollets: 14,
};

// ── ATHX → Programme structure ────────────────────────────────────────────────

/**
 * Convert the hardcoded ATHX 17-week plan into a generic program structure.
 * This is called once at migration time.
 */
export function buildAthxProgram(id) {
  const semaines = [];

  for(let w = 1; w <= 17; w++) {
    const phaseIdx = PHASES[w - 1];
    const isDeload = phaseIdx === 0;
    const isTaper  = w === 17;

    // Group exercises by day
    const byDay = {};
    EXERCISES.forEach(ex => {
      if(!byDay[ex.day]) byDay[ex.day] = [];
      const plan    = ex.plan[w - 1];
      const scheme  = ex.repScheme[w - 1];
      if(plan || scheme) {
        byDay[ex.day].push({
          id:       ex.id,
          nom:      ex.name,
          unit:     ex.unit,
          kgPlan:   plan || null,
          scheme:   scheme || '—',
          color:    ex.color,
          refText:  ex.refText,
          muscles:  _exMuscles(ex.id),
          // For Lafay tracking — keep full plan array reference
          planFull: ex.plan,
          repSchemeFull: ex.repScheme,
        });
      }
    });

    const jours = Object.entries(byDay).map(([day, exercices]) => ({
      nom:       day,
      split:     day,
      exercices,
    }));

    semaines.push({
      num:       w,
      phase:     PHASE_LABELS[phaseIdx],
      phaseIdx,
      isDeload,
      isTaper:   isTaper,
      rpeTarget: isDeload ? '≤ 6.5' : isTaper ? '≤ 7' : '7–8.5',
      intensite: isDeload ? 0.60 : isTaper ? 0.65 : [0.70,0.75,0.82][phaseIdx - 1] || 0.75,
      jours,
    });
  }

  return {
    id,
    name:      'ATHX — Compétition 5 sept. 2026',
    type:      'competition',
    subtype:   'fixed',   // plan charges hardcodées, pas calculées depuis 1RM
    status:    'active',
    createdAt: Date.now(),
    config: {
      domaine:           'hyrox',
      niveau:            'intermediaire',
      seancesParSemaine: 3,
      dureeSeance:       60,
      materiel:          ['barre', 'halteres', 'kettlebell'],
      competition: {
        date: '2026-09-05',
        type: 'ATHX / Hyrox',
      },
    },
    phases: [
      { nom: 'Bloc 1 — Base',        debut: 1,  fin: 5,  intensite: 0.70 },
      { nom: 'Deload',                debut: 6,  fin: 6,  intensite: 0.60 },
      { nom: 'Bloc 2 — Intensité',    debut: 7,  fin: 11, intensite: 0.82 },
      { nom: 'Deload',                debut: 12, fin: 12, intensite: 0.60 },
      { nom: 'Bloc 3 — Simulation',   debut: 13, fin: 16, intensite: 0.88 },
      { nom: 'Taper',                 debut: 17, fin: 17, intensite: 0.65 },
    ],
    semaines,
    orm:       { press: 50, squat: 110, deadlift: 140 },
    totalWeeks: 17,
    migratedFrom: 'athx_legacy',
  };
}

function _exMuscles(id) {
  const map = {
    press:    ['deltAnt','triceps','trapeze','pec','core'],
    squat:    ['quad','fessiers','ischio','lombaires','core'],
    deadlift: ['ischio','fessiers','lombaires','dorsaux','trapeze','avantbras','core'],
    gtoh:     ['deltAnt','triceps','core','trapeze'],
    sandbag:  ['trapeze','core','quad'],
    lunges:   ['quad','fessiers','ischio'],
  };
  return map[id] || [];
}

// ── Age modifiers ─────────────────────────────────────────────────────────────
// Based on ACSM, Israetel, Attia recommendations

export const AGE_TRANCHES = [
  { id:'18-29', label:'18–29 ans', desc:'Récupération rapide, volume élevé possible' },
  { id:'30-39', label:'30–39 ans', desc:'Maintien du volume, attention aux tendons' },
  { id:'40-49', label:'40–49 ans', desc:'Volume réduit, récupération renforcée' },
  { id:'50-59', label:'50–59 ans', desc:'Fréquence > intensité, mobilité prioritaire' },
  { id:'60+',   label:'60 ans +',  desc:'Charge modérée, jamais à l\'échec musculaire' },
];

export const AGE_MODIFIERS = {
  '18-29': { volumeMult:1.0,  seriesMax:5, deloadFreq:4, mobilityPct:0.10, rpeMax:9.0, recovDays:1,   rpeTarget:'7–9'   },
  '30-39': { volumeMult:1.0,  seriesMax:4, deloadFreq:4, mobilityPct:0.15, rpeMax:8.5, recovDays:1,   rpeTarget:'7–8.5' },
  '40-49': { volumeMult:0.85, seriesMax:4, deloadFreq:3, mobilityPct:0.20, rpeMax:8.0, recovDays:2,   rpeTarget:'6.5–8' },
  '50-59': { volumeMult:0.75, seriesMax:3, deloadFreq:3, mobilityPct:0.25, rpeMax:7.5, recovDays:2,   rpeTarget:'6–7.5' },
  '60+':   { volumeMult:0.65, seriesMax:3, deloadFreq:2, mobilityPct:0.35, rpeMax:7.0, recovDays:2,   rpeTarget:'5.5–7' },
};

// ── Mixte program structure ───────────────────────────────────────────────────
// Weekly split by number of sessions for a mixed program

export const MIXTE_SPLITS = {
  2: [
    { nom:'Force + Hypertrophie',   focus:['force','gym'],      rpeMax:8.5 },
    { nom:'Cardio + Mobilité',      focus:['cardio','mobilite'], rpeMax:7.0 },
  ],
  3: [
    { nom:'Force',                  focus:['force'],             rpeMax:8.5 },
    { nom:'Cardio + Mobilité',      focus:['cardio','mobilite'], rpeMax:7.0 },
    { nom:'Hypertrophie + Core',    focus:['gym'],               rpeMax:8.0 },
  ],
  4: [
    { nom:'Force membres inf.',     focus:['force'],             rpeMax:8.5 },
    { nom:'Cardio / Endurance',     focus:['cardio'],            rpeMax:7.5 },
    { nom:'Hypertrophie membres sup.', focus:['gym'],            rpeMax:8.0 },
    { nom:'Mobilité + Récupération active', focus:['mobilite'],  rpeMax:6.5 },
  ],
  5: [
    { nom:'Force (Bas du corps)',   focus:['force'],             rpeMax:8.5 },
    { nom:'Cardio intensif',        focus:['cardio'],            rpeMax:8.0 },
    { nom:'Hypertrophie (Haut)',    focus:['gym'],               rpeMax:8.0 },
    { nom:'Mobilité + Yoga',        focus:['mobilite'],          rpeMax:6.0 },
    { nom:'Force / Full body',      focus:['force','gym'],       rpeMax:8.0 },
  ],
};

// ── Grossesse program config ──────────────────────────────────────────────────

export const GROSSESSE_MOIS_CONFIG = {
  4: { label:'4ème mois', duree_marche:'25–30 min', duree_renfo:'20–25 min', duree_yoga:'20 min', duree_natation:'30–45 min · 1 km', squat_dosage:'3 × 12 répétitions', squat_supprime:false, extension_supprime:false, yoga_psoas_supprime:false, marche_note:null, rpe_max:6.5 },
  5: { label:'5ème mois', duree_marche:'25–30 min', duree_renfo:'20–25 min', duree_yoga:'20 min', duree_natation:'30–45 min · 1 km', squat_dosage:'3 × 12 répétitions', squat_supprime:false, extension_supprime:false, yoga_psoas_supprime:false, marche_note:null, rpe_max:6.5 },
  6: { label:'6ème mois', duree_marche:'20–25 min', duree_renfo:'20 min', duree_yoga:'20 min', duree_natation:'30 min · ~800 m', squat_dosage:'2 × 10 répétitions', squat_supprime:false, extension_supprime:false, yoga_psoas_supprime:false, marche_note:'Réduire à 20–25 min si fatigue.', rpe_max:6 },
  7: { label:'7ème mois', duree_marche:'15–20 min', duree_renfo:'15–20 min', duree_yoga:'20 min', duree_natation:'20–30 min · ~600 m', squat_dosage:'2 × 8 répétitions · descente 60° max', squat_supprime:false, extension_supprime:false, yoga_psoas_supprime:false, marche_note:'Terrain plat uniquement.', rpe_max:6 },
  8: { label:'8ème mois', duree_marche:'15 min max', duree_renfo:'15 min', duree_yoga:'15–20 min', duree_natation:'20 min · ~400 m', squat_dosage:null, squat_supprime:true, extension_supprime:true, yoga_psoas_supprime:true, marche_note:'Terrain plat, allure lente.', rpe_max:5.5 },
  9: { label:'9ème mois', duree_marche:'10–15 min', duree_renfo:'10 min · Kegel seul', duree_yoga:'15 min', duree_natation:'15 min · bain thérapeutique', squat_dosage:null, squat_supprime:true, extension_supprime:true, yoga_psoas_supprime:true, marche_note:'Marche très lente, terrain plat.', rpe_max:5 },
};

export const GROSSESSE_EXERCISES_PRENATAL = [
  // Marche
  { id:'ech_marche',    seance:'marche',  name:'Échauffement marche lente',           dosage:'3 min',                   video:null,          desc:'Marche lente avec rotations douces des chevilles et épaules. Progresser en allure sur 3 min.' },
  { id:'marche',        seance:'marche',  name:'Marche active',                        dosage_key:'duree_marche',        video:null,          desc:'Allure permettant de tenir une conversation (test de la parole). Dos droit, abdos légers. FC max 145 bpm.', note_key:'marche_note' },
  { id:'retour_marche', seance:'marche',  name:'Retour au calme + étirements',         dosage:'3 min',                   video:null,          desc:'Marche lente 2 min, étirement mollets 30 s par côté, rotation lente des hanches.' },
  // Renforcement
  { id:'ech_renfo',     seance:'renfo',   name:'Échauffement — ballon',               dosage:'3 min',                   video:'1x0RTGdyAww', desc:'Assise sur le ballon : cercles bassin × 8 chaque sens, balancement avant/arrière, rotations épaules.', ballon:true },
  { id:'kegel',         seance:'renfo',   name:'Kegel périnée — rappel quotidien',    dosage:'3 × 10 · 8–10 s',         video:'WfcVJUQHAts', desc:'Contracter le périnée 8–10 s, relâcher 5 s. Ne pas bloquer la respiration, ne pas contracter les fesses. À faire aussi hors séances.', ballon:true },
  { id:'squat',         seance:'renfo',   name:'Squat mural (ballon)',                dosage_key:'squat_dosage',        video:'u0Nx0KbHkRQ', desc:"Ballon entre le dos et le mur. Descendre à 90° max, genou dans axe orteils. Remonter à l'expiration.", ballon:true, supprime_key:'squat_supprime', supprime_from:8, supprime_msg:'Squat supprimé à partir du 8ème mois. Remplacé par pont fessier et Kegel.' },
  { id:'pont',          seance:'renfo',   name:'Pont fessier latéral (côté gauche)', dosage:'2 × 12 par côté',         video:'CWa-cAZuVyE', desc:'Allongée côté gauche, jambe du dessus fléchie sur coussin. Relever le genou du dessus, maintenir 2 s, redescendre.' },
  { id:'chat',          seance:'renfo',   name:'Rotation de chat (4 pattes)',         dosage:'2 × 10 répétitions',       video:'DcARcvpeJeA', desc:'À 4 pattes. Expiration → dos rond, tête vers le bas. Inspiration → dos plat. Rythme lent. Ne pas cambrer.' },
  { id:'extension',     seance:'renfo',   name:'Extension bras/jambe opposée',        dosage:'2 × 8 par côté',          video:'BFuFib7wIcM', desc:'À 4 pattes. Étendre bras droit + jambe gauche simultanément, maintenir 3 s. Contrôle respiratoire.', supprime_key:'extension_supprime', supprime_from:8, supprime_msg:'Suspendu à partir du 8ème mois — risque déséquilibre.' },
  { id:'cercles',       seance:'renfo',   name:'Cercles de chevilles assise',         dosage:'10 cercles / sens / pied', video:null,          desc:'Assise sur le ballon ou chaise. Tracer de grands cercles avec chaque pied. Améliore la circulation.', ballon:true },
  // Yoga
  { id:'ech_yoga',      seance:'yoga',    name:'Échauffement — balancement bassin',   dosage:'2–3 min',                 video:'DcARcvpeJeA', desc:'Assise sur le ballon. Balancement latéral lent, puis avant/arrière. Respiration libre.', ballon:true },
  { id:'chat_yoga',     seance:'yoga',    name:'Chat / Vache (4 pattes)',             dosage:'10 respirations',          video:'DcARcvpeJeA', desc:'À 4 pattes. Inspiration → dos plat. Expiration → dos rond. Synchronisé avec la respiration.' },
  { id:'papillon',      seance:'yoga',    name:'Papillon assis',                      dosage:'2 × 45 s',                 video:null,          desc:'Assis sur le tapis, plantes de pieds en contact. Dos droit, ne pas forcer les genoux vers le sol. Respiration lente.' },
  { id:'psoas',         seance:'yoga',    name:'Étirement psoas (fente au sol)',      dosage:'45 s par côté',            video:null,          desc:'Genou arrière posé, avant du bassin vers le sol. Ne pas cambrer. Si SPD : remplacer par posture enfant.', supprime_key:'yoga_psoas_supprime' },
  { id:'torsion',       seance:'yoga',    name:'Rotation douce du buste assise',      dosage:'30 s par côté',            video:null,          desc:'Assis sur une chaise. Amplitude très limitée. Ne pas bloquer la respiration. Arrêter si tiraillement.' },
  { id:'enfant',        seance:'yoga',    name:'Posture enfant modifiée',             dosage:'1 min',                    video:null,          desc:'Genoux largement écartés pour laisser place au ventre. Front sur les mains. Respiration abdominale libre.' },
  { id:'relaxation',    seance:'yoga',    name:'Relaxation — côté gauche',            dosage:'3 min',                    video:null,          desc:'Allongée côté gauche, coussin entre les genoux. Respiration lente et profonde. Scan corporel de bas en haut.' },
  // Pilates (alternative renfo)
  { id:'ech_pil',       seance:'pilates', name:'Échauffement — respiration costale',  dosage:'3 min',                   video_key:'pilates_par_mois', desc:"Assise sur le ballon, mains sur les côtes. Inspiration → côtes s'écartent. Expiration → côtes se rapprochent. Puis 8 cercles bassin.", ballon:true },
  { id:'pil_kegel',     seance:'pilates', name:'Kegel intégré à la respiration',      dosage:'2 × 10 · 8 s',            video:null,           desc:"Assise sur le ballon. Contracter le périnée à l'expiration, relâcher à l'inspiration. Périnée + transverse ensemble.", ballon:true },
  { id:'pil_transverse',seance:'pilates', name:'Activation du transverse (4 pattes)', dosage:'3 × 8 respirations',       video:null,           desc:"À 4 pattes. Sur l'expiration : engagement très doux du ventre profond vers la colonne. Maintenir 3 s. Aucune pression abdominale." },
  { id:'pil_pont',      seance:'pilates', name:'Pont pelvien latéral (côté gauche)',  dosage:'2 × 12 par côté',          video:null,           desc:"Allongée côté gauche. Relever le genou du dessus à l'expiration, redescendre à l'inspiration. Gainage périnée." },
  { id:'pil_chat',      seance:'pilates', name:'Chat Pilates (respiration guidée)',    dosage:'10 respirations',          video:null,           desc:'À 4 pattes. Inspiration → dos plat. Expiration → dos légèrement rond, périnée engagé. Vitesse très lente.' },
  { id:'pil_lateral',   seance:'pilates', name:'Inclinaison latérale sur ballon',     dosage:'8 par côté',               video:null,           desc:'Assise sur le ballon, bras le long du corps. Inclination latérale douce, retour lent. Gainage latéral.', ballon:true, supprime_from:8, supprime_msg:'Suspendu à partir du 8ème mois pour sécurité équilibre.' },
  { id:'pil_relax',     seance:'pilates', name:'Relaxation Pilates côté gauche',      dosage:'3 min',                    video:null,           desc:'Allongée côté gauche, coussin entre genoux. Scan corporel avec respiration costale. Conscience du bébé.' },
];

// Pilates videos by month
export const PILATES_VIDEOS = {
  4: 'BFuFib7wIcM', 5: 'BFuFib7wIcM', 6: 'X6XfZ8aT7ro',
  7: '_I1Hzj_WLPM', 8: 'OC3HUKigMSY', 9: 'qacjFjJKXTA',
};

export const GROSSESSE_SEMAINE_TYPE = [
  { jour:'Lundi',    seance:'marche',  label:'Marche active' },
  { jour:'Mardi',    seance:'renfo',   label:'Renforcement doux', alt:'pilates', altLabel:'Pilates prénatal' },
  { jour:'Mercredi', seance:'yoga',    label:'Yoga & ballon' },
  { jour:'Jeudi',    seance:'marche',  label:'Marche active' },
  { jour:'Vendredi', seance:'renfo',   label:'Renforcement doux', alt:'pilates', altLabel:'Pilates prénatal' },
  { jour:'Samedi',   seance:'marche',  label:'Marche + natation' },
  { jour:'Dimanche', seance:'repos',   label:'Repos actif · Kegel + étirements' },
];

// Post-natal phases
export const POSTNATAL_PHASES = [
  { id:'s1-6',    label:'S1–S6 · Récupération immédiate',   desc:'Kegel uniquement, marche courte, repos prioritaire' },
  { id:'s6-12',   label:'S6–S12 · Reprise douce',          desc:'Reprise progressive, renforcement plancher pelvien, yoga doux' },
  { id:'s12-24',  label:'3–6 mois · Remise en forme',      desc:'Gainage progressif, cardio léger, renfo global' },
  { id:'6m+',     label:'6 mois+ · Programme standard',    desc:'Retour à un programme normal adapté à ton niveau' },
];
