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
  '18-29': { volumeMult:1.0,  seriesMax:5, deloadFreq:6, mobilityPct:0.10, rpeMax:9.0, recovDays:1,   rpeTarget:'7–9'   },
  '30-39': { volumeMult:1.0,  seriesMax:4, deloadFreq:5, mobilityPct:0.15, rpeMax:8.5, recovDays:1,   rpeTarget:'7–8.5' },
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

// ── Cardio / Endurance ──────────────────────────────────────────────────────
// Modèle d'entraînement d'endurance (distinct du modèle force %1RM).
// Réf : Seiler (distribution polarisée 80/20), zones 5 paliers standard,
// Buchheit & Laursen (HIIT), Daniels (allures), Concept2 (rameur), NHS C25K (débutant).
// Voir Documentation/cardio-program-design.md pour les sources détaillées.

// Zones d'intensité — pilotées PRIORITAIREMENT par le RPE (app RPE-centrée),
// le %FCmax n'est qu'un repère secondaire (Tanaka : FCmax ≈ 208 − 0,7 × âge).
export const CARDIO_ZONES = {
  1: { label:'Z1 · Récupération', hr:'50–60% FCmax', rpe:'1–2',  band:'facile', bg:'#E6F1FB', col:'#185FA5', feel:'Très facile. Tu peux tenir une conversation complète sans essoufflement. Objectif : régénérer.' },
  2: { label:'Z2 · Endurance',    hr:'60–70% FCmax', rpe:'3–4',  band:'facile', bg:'#E1F5EE', col:'#0F6E56', feel:'Allure conversationnelle : tu parles par phrases entières (test de la parole). C\'est le socle du volume — reste facile même si ça semble trop lent.' },
  3: { label:'Z3 · Tempo',        hr:'70–80% FCmax', rpe:'5–6',  band:'seuil',  bg:'#FAEEDA', col:'#854F0B', feel:'Modéré à soutenu mais maîtrisé : phrases courtes seulement. « Confortablement inconfortable ». ~allure semi/marathon.' },
  4: { label:'Z4 · Seuil',        hr:'80–90% FCmax', rpe:'7–8',  band:'dur',    bg:'#FDE7DA', col:'#B4480B', feel:'Dur : quelques mots à la fois. Allure ~10 km, sensation de brûlure gérable. C\'est le seuil lactique.' },
  5: { label:'Z5 · VO₂max',       hr:'90–100% FCmax',rpe:'9–10', band:'dur',    bg:'#FDEAEA', col:'#9C2222', feel:'Très dur : parole impossible. Allure ~3–5 km / 1500 m. Respiration maximale. Tenu seulement en intervalles courts.' },
};

// Repères techniques (mouvement / cadence / posture) par modalité.
export const CARDIO_CUES = {
  run:        'Cadence ~170–180 pas/min, foulée courte sous le centre de gravité. Buste droit, épaules relâchées, regard loin. Attaque médio-pied, ne pas sur-attaquer le talon.',
  bike:       'Cadence 80–95 tr/min, pédalage rond (tirer ET pousser). Buste stable, mains relâchées. Vérifier la hauteur de selle (jambe presque tendue en bas).',
  row_erg:    'Séquence : jambes → buste → bras (retour inverse : bras → buste → jambes). Dos gainé, pas d\'arrondi lombaire. ~20–24 coups/min en aérobie, plus en intensité. La puissance vient des jambes.',
  ski_erg:    'Charnière de hanche, tirer avec le dos et les abdos (pas seulement les bras). Descendre les bras jusqu\'aux cuisses, remonter fluide. Gainage constant.',
  bike_erg:   'Bras et jambes synchronisés, cadence régulière. Idéal pour l\'intensité sans impact articulaire. Rester assis stable, ne pas se cambrer.',
  elliptical: 'Amplitude complète du mouvement, buste droit. Pousser dans les talons. Ne pas s\'appuyer lourdement sur les poignées — les jambes travaillent.',
  jump_rope:  'Sauts bas (2–3 cm), rotation des poignets (pas des bras). Appuis sur l\'avant-pied, genoux souples. Fractionner en blocs courts si besoin.',
  swim:       'Expiration continue dans l\'eau, inspiration brève. Gainage gréé, roulis des épaules, poussée complète jusqu\'à la cuisse. La FC est peu fiable en natation → se fier au RPE.',
  walk:       'Marche rapide et dynamique, bras actifs pliés à 90°. Dérouler le pied talon→pointe. Terrain plat pour la récupération, côtes possibles en endurance.',
};

// Modalités cardio. equip = clé matériel requise (null = toujours dispo : course, marche…).
export const CARDIO_MODALITIES = [
  { id:'run',        name:'Course à pied',       icon:'🏃', unit:'min', dist:'km', impact:'élevé',  equip:null,       muscles:['quad','ischio','mollets'] },
  { id:'bike',       name:'Vélo / Home-trainer', icon:'🚴', unit:'min', dist:'km', impact:'faible', equip:'machines', muscles:['quad','fessiers','mollets'] },
  { id:'row_erg',    name:'Rameur',              icon:'🚣', unit:'min', dist:'m',  impact:'faible', equip:'machines', muscles:['dorsaux','quad','biceps','core'] },
  { id:'ski_erg',    name:'Ski-erg',             icon:'⛷',  unit:'min', dist:'m',  impact:'faible', equip:'machines', muscles:['dorsaux','deltPost','core','triceps'] },
  { id:'bike_erg',   name:'Assault Bike',        icon:'🌀', unit:'min', dist:null, impact:'faible', equip:'machines', muscles:['quad','ischio','core'] },
  { id:'elliptical', name:'Elliptique',          icon:'🎿', unit:'min', dist:null, impact:'faible', equip:'machines', muscles:['quad','fessiers','ischio'] },
  { id:'jump_rope',  name:'Corde à sauter',      icon:'🪢', unit:'min', dist:null, impact:'moyen',  equip:null,       muscles:['mollets','core'] },
  { id:'swim',       name:'Natation',            icon:'🏊', unit:'min', dist:'m',  impact:'nul',    equip:null,       muscles:['dorsaux','pec','deltAnt','core'] },
  { id:'walk',       name:'Marche / Rando',      icon:'🚶', unit:'min', dist:'km', impact:'faible', equip:null,       muscles:['quad','mollets'] },
];

// Types de séance : zone par défaut + format (continu | intervalles | fartlek).
export const CARDIO_SESSION_TYPES = {
  recovery:  { label:'Récupération',   zone:1, format:'continuous' },
  endurance: { label:'Endurance',      zone:2, format:'continuous' },
  long:      { label:'Sortie longue',  zone:2, format:'continuous' },
  tempo:     { label:'Tempo',          zone:3, format:'continuous' },
  threshold: { label:'Seuil',          zone:4, format:'intervals'  },
  vo2max:    { label:'VO₂max',         zone:5, format:'intervals'  },
  fartlek:   { label:'Fartlek',        zone:3, format:'fartlek'    },
  race:      { label:'Allure course',  zone:4, format:'continuous' },
};

// ── Repères techniques par exercice (force / gym / hyrox) ──────────────────────
// Recommandations de mouvement / posture / tempo, affichées en vue détail + tracker.
export const EXERCISE_CUES = {
  squat:      'Descente 3 s, pause 1 s en bas, poussée explosive. Profondeur hanche sous genou, genoux dans l\'axe des pieds, dos gainé.',
  squat_fs:   'Coudes hauts, position de rack propre. Descente contrôlée, rebond actif en bas. Core très engagé, buste vertical.',
  deadlift:   'Dos neutre, pression pieds milieu/talons. Barre le long des tibias. Verrouillage hanches + épaules simultané. Pas d\'arrondi lombaire.',
  rdl:        'Charnière de hanche, barre le long des cuisses. Genoux légèrement fléchis, étirement ischios, dos neutre. Amplitude contrôlée.',
  press:      'Gainage abdo + fessiers, barre dans l\'axe du nez. Pas de cambrure excessive. Extension complète en haut, tête qui avance après passage.',
  ohp:        'Core engagé, tête en avant une fois la barre passée. Trajectoire verticale, pas d\'inclinaison arrière. Jambes contribuent (push press).',
  bench:      'Rétraction scapulaire, pieds ancrés au sol. Barre au niveau des tétons, coudes à ~45°. Descente contrôlée, poussée explosive.',
  row_barre:  'Buste à ~45°, tirer vers le nombril. Serrer les omoplates en haut, contrôler la descente. Pas de triche lombaire.',
  thruster:   'Front squat propre + press explosif enchaînés. Utiliser l\'élan des jambes. Respiration entre chaque rep.',
  pullup:     'Rétraction scapulaire en bas, tirer coudes vers les hanches. Extension complète bras tendus. Éviter le balancement.',
  pushup:     'Corps gainé en planche, coudes à ~45°. Poitrine au sol, extension complète. Bassin ne s\'affaisse pas.',
  dips:       'Légère inclinaison avant pour cibler les pecs. Descente contrôlée, coudes ~90°. Épaules loin des oreilles.',
  lunges:     'Pas long, genou arrière frôle le sol. Poids sur le talon avant, tronc vertical. Poussée contrôlée.',
  lunges_db:  'Haltères le long du corps, pas long. Genou arrière proche du sol, buste droit. Alterner ou par jambe.',
  leg_press:  'Amplitude complète sans décoller le bassin. Ne pas verrouiller violemment les genoux. Pieds largeur d\'épaules.',
  db_press:   'Haltères au niveau des pecs, coudes ~45°. Poussée vers le haut et légèrement vers l\'intérieur. Contrôle en descente.',
  db_row:     'Appui sur banc, dos plat. Tirer le coude vers la hanche, serrer l\'omoplate. Pas de rotation du buste.',
  db_curl:    'Coudes fixes le long du corps, pas de balancement. Contraction complète en haut, descente contrôlée. Supination.',
  db_shoulder:'Élévations latérales : coudes légèrement fléchis, monter à l\'horizontale. Pas d\'à-coups, épaules basses.',
  kb_swing:   'Charnière de hanche explosive (pas un squat), fessiers qui claquent. Bras relâchés, la puissance vient des hanches. Dos neutre.',
  kb_clean:   'Trajectoire proche du corps, réceptionner en rack sans choc sur l\'avant-bras. Gainage, puis press.',
  kb_goblet:  'Kettlebell contre la poitrine, coudes à l\'intérieur des genoux en bas. Buste droit, descente profonde contrôlée.',
  gtoh:       'Épaule engagée, verrouillage complet overhead. Alterner les bras, gainage anti-rotation. Souffle à la montée.',
  sandbag:    'Sac serré contre le buste, dos gainé. Pas courts et rapides sur le carry. Respiration régulière, ne pas retenir.',
  wall_ball:  'Squat complet + lancer explosif à la cible. Réceptionner en amortissant vers le squat suivant. Enchaînement fluide.',
  box_jump:   'Armé bras + hanche, réception souple genoux fléchis au centre de la box. Descendre (pas sauter) en arrière. Contrôle.',
  burpee:     'Poitrine au sol, ramener les pieds sous les hanches, saut vertical. Garder un rythme soutenable. Gainage constant.',
  plank:      'Corps aligné tête-bassin-talons, abdos + fessiers serrés. Pas de bassin qui creuse. Respiration continue.',
  pistol:     'Squat sur une jambe, autre jambe tendue devant. Descente lente, talon au sol, bras en contrepoids. Contrôle total.',
  hspu:       'Gainage total en appui tête, coudes serrés. Descente contrôlée front vers le sol, poussée explosive. Progression au mur.',
};

// ── Mobilité ──────────────────────────────────────────────────────────────────
// Modèle de mobilité (distinct du modèle force %1RM et du modèle cardio).
// Réf : ACSM Position Stand (Garber 2011), consensus Delphi 2025 (dosage statique/
// dynamique/PNF), FRC/CARs & PAILs/RAILs (Spina — méthode, preuve émergente),
// inspiration produit GOWOD (bilan par zone → ciblage). Sources détaillées dans
// Documentation/mobilite-program-design.md.

// Échelle de charge mobilité pour la carte musculaire (SRA) — très faible : la
// mobilité est peu coûteuse systémiquement, elle ne doit pas gonfler la fatigue.
// (Utilisé par la contribution SRA — cf. musculaire.js.)
export const MOBILITY_LOAD_SCALE = 0.1;

// Zones de mobilité. `muscles` = IDs SRA reliés (signal « zone chargée »).
// `car` = id du drill CARs socle de la zone (null si pas de CAR dédié).
export const MOBILITY_ZONES = [
  { id:'cou',         label:'Cou',                  icon:'🙆', muscles:['trapeze'],                     car:'cou_car' },
  { id:'epaules',     label:'Épaules / bras',       icon:'🤸', muscles:['deltAnt','deltPost','pec','trapeze','triceps','biceps'], car:'epaules_car' },
  { id:'thoracique',  label:'Colonne thoracique',   icon:'🌀', muscles:['dorsaux','trapeze'],           car:'thoracique_car' },
  { id:'hanches',     label:'Hanches',              icon:'🦵', muscles:['fessiers','quad','core'],      car:'hanches_car' },
  { id:'chaine_post', label:'Chaîne postérieure',   icon:'🔗', muscles:['ischio','lombaires','fessiers'], car:null },
  { id:'chevilles',   label:'Chevilles',            icon:'🦶', muscles:['mollets'],                     car:'chevilles_car' },
  { id:'poignets',    label:'Poignets',             icon:'✋', muscles:['avantbras'],                   car:'poignets_car' },
];

// Méthodes : minLevel = niveau minimal requis (0 débutant, 1 intermédiaire, 2 avancé).
export const MOBILITY_METHODS = {
  car:         { label:'CARs',        minLevel:0 },
  dynamic:     { label:'Dynamique',   minLevel:0 },
  static:      { label:'Statique',    minLevel:0 },
  pnf:         { label:'PNF',         minLevel:1 },
  pails_rails: { label:'PAILs/RAILs', minLevel:2 },
  massage:     { label:'Auto-massage',minLevel:0 },
};

// Auto-bilan par zone (auto-scorable : 0 faible / 1 limité / 2 bon).
// `cm:true` → un champ centimètres optionnel en plus (tendance plus fine).
export const MOBILITY_TESTS = {
  chevilles:   { name:'Knee-to-Wall', protocol:'Pied derrière un repère, talon au sol, avancer le genou pour toucher le mur ; reculer au max où le talon reste au sol. Mesurer orteil→mur.', good:'≥ 10 cm', limited:'5–9 cm', poor:'< 5 cm', cm:true },
  hanches:     { name:'Deep Squat (FMS)', protocol:'Pieds largeur épaules, bâton tendu au-dessus de la tête, descendre le plus profond possible, talons au sol.', good:'Hanches sous parallèle, talons au sol, buste droit, bâton reste au-dessus', limited:'Seulement avec compensation (talons qui lèvent / buste qui penche)', poor:'N’atteint pas la profondeur', cm:false },
  chaine_post: { name:'ASLR + Sit-and-Reach', protocol:'Allongé, lever une jambe tendue au maximum, l’autre à plat au sol.', good:'Cheville dépasse le milieu de la cuisse', limited:'Entre le genou et le milieu de cuisse', poor:'Reste sous le genou', cm:true },
  thoracique:  { name:'Rotation assise', protocol:'Assis, genoux serrés, bâton sur les épaules ; tourner le buste au maximum de chaque côté (verrouille le lombaire).', good:'≈ 45° / côté, symétrique', limited:'Nettement < 45° ou asymétrie', poor:'Rotation très limitée', cm:false },
  epaules:     { name:'FMS Shoulder Mobility', protocol:'Mesurer sa main. Un poing par-dessus l’épaule dans le dos, l’autre par le bas ; mesurer l’écart entre les deux poings.', good:'≤ 1 longueur de main', limited:'≤ 1,5 longueur', poor:'> 1,5 longueur', cm:false },
  poignets:    { name:'Prayer test', protocol:'Paumes jointes devant la poitrine, coudes écartés, descendre les mains pour horizontaliser les avant-bras.', good:'Avant-bras ≈ horizontaux', limited:'Partiel', poor:'Très limité', cm:false },
  cou:         { name:'Rotation cervicale', protocol:'Tourner la tête pour regarder par-dessus chaque épaule.', good:'Menton ≈ à l’épaule (~80°)', limited:'Nettement moins / asymétrie', poor:'Très limité', cm:false },
};

// Emphase par défaut selon le domaine du/des programme(s) actif(s).
export const MOBILITY_PROGRAM_FOCUS = {
  force:     ['hanches','thoracique','epaules'],
  hyrox:     ['hanches','thoracique','epaules'],
  cardio:    ['chevilles','hanches','chaine_post'],
  gym:       [],
  mixte:     [],
  grossesse: [],
};

// Bibliothèque de drills. minLevel : 0 débutant+, 1 intermédiaire+, 2 avancé.
// scheme = libellé de dosage lisible (bornes issues de la littérature, cf. §7 du doc).
export const MOBILITY_DRILLS = [
  // Cou
  { id:'cou_car',   zone:'cou',  method:'car',     nom:'CARs cervicaux',            scheme:'3–5 cercles lents / sens',        cue:'Le menton dessine le plus grand cercle indolore. Épaules relâchées, très lent.',                                 muscles:['trapeze'], minLevel:0 },
  { id:'cou_dyn',   zone:'cou',  method:'dynamic', nom:'Rotations & inclinaisons',  scheme:'8 lentes / direction',            cue:'Amplitude douce, sans à-coup. Regarder loin.',                                                                    muscles:['trapeze'], minLevel:0 },
  { id:'cou_stat',  zone:'cou',  method:'static',  nom:'Étirement trapèze sup.',    scheme:'2 × 20 s / côté',                 cue:'Oreille vers l’épaule, la main accompagne sans tirer fort. Gêne légère.',                                          muscles:['trapeze'], minLevel:0 },

  // Épaules
  { id:'epaules_car',  zone:'epaules', method:'car',        nom:'CARs d’épaule',              scheme:'3–5 cercles lents / sens · par bras', cue:'Bras tendu, plus grand cercle possible, buste immobile.',                                            muscles:['deltAnt','deltPost'], minLevel:0 },
  { id:'epaules_dyn',  zone:'epaules', method:'dynamic',    nom:'Dislocates au bâton',        scheme:'2 × 8–10',                            cue:'Prise large (bâton/élastique), bras tendus, passage lent devant → dos.',                             muscles:['deltAnt','pec'], minLevel:0 },
  { id:'epaules_stat', zone:'epaules', method:'static',     nom:'Étirement pec au chambranle',scheme:'2 × 30 s / côté',                     cue:'Avant-bras contre le mur, avancer doucement le buste. Gêne légère.',                                 muscles:['pec','deltAnt'], minLevel:0 },
  { id:'epaules_pnf',  zone:'epaules', method:'pnf',        nom:'Contract-relâché épaule',    scheme:'3 × (6 s poussée + 20 s étirement)',  cue:'Pousser doucement dans le mur 6 s, relâcher, gagner l’amplitude.',                                    muscles:['deltAnt','pec'], minLevel:1, caution:'Ne pas bloquer la respiration (Valsalva).' },
  { id:'epaules_pails',zone:'epaules', method:'pails_rails',nom:'PAILs/RAILs suspension',     scheme:'2 × (10 s PAIL + 10 s RAIL)',         cue:'En fin d’amplitude : contracter DANS l’étirement (PAIL), puis tirer plus loin activement (RAIL).',    muscles:['deltAnt','deltPost'], minLevel:2, caution:'Avancé — jamais dans la douleur.' },
  { id:'epaules_stat_tri',zone:'epaules', method:'static', nom:'Étirement triceps overhead',  scheme:'2 × 30 s / côté', cue:'Coude en l’air, la main descend dans le dos ; l’autre main tire doucement le coude.',            muscles:['triceps'], minLevel:0 },
  { id:'epaules_stat_bi', zone:'epaules', method:'static', nom:'Étirement biceps',            scheme:'2 × 30 s / côté', cue:'Bras tendu en arrière, paume vers l’arrière contre un mur/montant ; pivoter légèrement le buste.', muscles:['biceps'], minLevel:0 },

  // Thoracique
  { id:'thoracique_car',  zone:'thoracique', method:'car',     nom:'CARs colonne thoracique', scheme:'3–5 / sens',                cue:'Rotation segmentaire lente, bassin fixe.',                                                muscles:['dorsaux'], minLevel:0 },
  { id:'thoracique_dyn',  zone:'thoracique', method:'dynamic', nom:'Open-book',               scheme:'2 × 8 / côté',              cue:'Sur le côté, genoux empilés : ouvrir le bras du dessus vers l’arrière, suivre la main du regard.', muscles:['dorsaux','pec'], minLevel:0 },
  { id:'thoracique_stat', zone:'thoracique', method:'static',  nom:'Extension sur rouleau',   scheme:'2 × 30 s',                  cue:'Rouleau sous les omoplates, mains derrière la tête, souffler en s’étendant.',              muscles:['dorsaux'], minLevel:0 },
  { id:'thoracique_pnf',  zone:'thoracique', method:'pnf',     nom:'RAIL de rotation assise', scheme:'3 × (6 s + amplitude)',     cue:'En rotation maximale, contracter pour aller activement plus loin.',                        muscles:['dorsaux'], minLevel:1 },

  // Hanches
  { id:'hanches_car',        zone:'hanches', method:'car',        nom:'CARs de hanche',            scheme:'2 × 4 cercles lents / sens · par hanche', cue:'Bassin stable, le genou dessine le plus grand cercle indolore (~10 s/cercle).',        muscles:['fessiers','quad'], minLevel:0 },
  { id:'hanches_dyn',        zone:'hanches', method:'dynamic',    nom:'Transitions 90/90',         scheme:'8–10 passages',                            cue:'Assis au sol, passer d’un côté à l’autre, dos droit.',                                  muscles:['fessiers'], minLevel:0 },
  { id:'hanches_stat_pigeon',zone:'hanches', method:'static',     nom:'Pigeon (fessier)',          scheme:'2 × 30 s / côté',                          cue:'Tibia devant, hanches carrées, le buste descend progressivement.',                      muscles:['fessiers'], minLevel:0 },
  { id:'hanches_stat_psoas', zone:'hanches', method:'static',     nom:'Fente psoas',               scheme:'2 × 30 s / côté',                          cue:'Genou arrière au sol, bassin en rétroversion, ne pas cambrer.',                          muscles:['quad'], minLevel:0 },
  { id:'hanches_pnf',        zone:'hanches', method:'pnf',        nom:'Contract-relâché adducteurs',scheme:'3 × (6 s + 20 s)',                        cue:'Position grenouille : pousser les genoux 6 s puis relâcher et descendre.',               muscles:['fessiers'], minLevel:1, caution:'Ne pas bloquer la respiration.' },
  { id:'hanches_pails',      zone:'hanches', method:'pails_rails',nom:'PAILs/RAILs en 90/90',      scheme:'2 × (10–15 s PAIL + 10 s RAIL)',           cue:'En fin d’amplitude de rotation, contracter dans puis tirer plus loin activement.',       muscles:['fessiers','quad'], minLevel:2, caution:'Avancé — sans douleur.' },

  // Chaîne postérieure
  { id:'cp_dyn',     zone:'chaine_post', method:'dynamic',     nom:'Balancers de jambe',      scheme:'2 × 10 / jambe',        cue:'Amplitude progressive, buste stable, appui gainé.',                              muscles:['ischio'], minLevel:0 },
  { id:'cp_stat',    zone:'chaine_post', method:'static',      nom:'Étirement ischios debout',scheme:'2 × 30 s / côté',       cue:'Charnière de hanche, dos droit, gêne légère derrière la cuisse.',                 muscles:['ischio'], minLevel:0 },
  { id:'cp_stat_sr', zone:'chaine_post', method:'static',      nom:'Sit-and-reach au sol',    scheme:'2 × 30 s',              cue:'Jambes tendues, avancer les mains vers les orteils sans arrondir violemment.',    muscles:['ischio','lombaires'], minLevel:0 },
  { id:'cp_pnf',     zone:'chaine_post', method:'pnf',         nom:'Hold-relâché ischios',    scheme:'3 × (6 s + amplitude)', cue:'Jambe tendue en l’air : pousser contre la main/sangle 6 s puis relâcher et gagner.', muscles:['ischio'], minLevel:1, caution:'Ne pas bloquer la respiration.' },
  { id:'cp_pails',   zone:'chaine_post', method:'pails_rails', nom:'PAILs/RAILs ischios (pike)',scheme:'2 × (10–15 s PAIL + 10 s RAIL)', cue:'En flexion maximale, contracter dans l’étirement puis tirer activement plus loin.', muscles:['ischio'], minLevel:2, caution:'Avancé.' },

  // Chevilles
  { id:'chevilles_car',      zone:'chevilles', method:'car',        nom:'CARs de cheville',        scheme:'3–5 cercles / sens · par pied', cue:'Grand cercle lent, jambe immobile.',                                       muscles:['mollets'], minLevel:0 },
  { id:'chevilles_dyn',      zone:'chevilles', method:'dynamic',    nom:'Knee-to-wall dynamique',  scheme:'2 × 10 / côté',                 cue:'Genou vers le mur, talon au sol, chercher l’amplitude à chaque répétition.', muscles:['mollets'], minLevel:0 },
  { id:'chevilles_stat',     zone:'chevilles', method:'static',     nom:'Étirement mollet au mur', scheme:'2 × 30 s / côté',               cue:'Jambe arrière tendue, talon au sol.',                                      muscles:['mollets'], minLevel:0 },
  { id:'chevilles_stat_sol', zone:'chevilles', method:'static',     nom:'Étirement soléaire',      scheme:'2 × 30 s / côté',               cue:'Même position, genou fléchi : cible le bas du mollet.',                     muscles:['mollets'], minLevel:0 },
  { id:'chevilles_pails',    zone:'chevilles', method:'pails_rails',nom:'Dorsiflexion chargée',    scheme:'2 × (10 s PAIL + 10 s RAIL)',   cue:'Genou au-dessus des orteils, charger et contrôler la fin d’amplitude.',    muscles:['mollets'], minLevel:2, caution:'Avancé.' },

  // Poignets
  { id:'poignets_car',  zone:'poignets', method:'car',     nom:'CARs de poignet',            scheme:'5 cercles / sens', cue:'Avant-bras fixe, cercle complet lent.',                              muscles:['avantbras'], minLevel:0 },
  { id:'poignets_dyn',  zone:'poignets', method:'dynamic', nom:'Flexions/extensions à genoux',scheme:'2 × 8',           cue:'Paumes puis dos des mains au sol, charge progressive et contrôlée.',  muscles:['avantbras'], minLevel:0 },
  { id:'poignets_stat', zone:'poignets', method:'static',  nom:'Étirement fléchisseurs',     scheme:'2 × 20–30 s',      cue:'Bras tendu, doigts vers le bas, tirer doucement.',                    muscles:['avantbras'], minLevel:0 },

  // Auto-massage (récup post-séance — GOWOD Recover)
  { id:'cou_mass',         zone:'cou',         method:'massage', nom:'Détente nuque / trapèzes',    scheme:'30–45 s / côté', cue:'Balle contre le mur sur le trapèze, petits mouvements, respiration lente.',            muscles:['trapeze'], minLevel:0 },
  { id:'epaules_mass',     zone:'epaules',     method:'massage', nom:'Balle pec / deltoïde',        scheme:'30–60 s / côté', cue:'Balle contre un mur sur le pectoral et le deltoïde, rouler lentement, s’attarder sur les points sensibles.', muscles:['pec','deltAnt'], minLevel:0 },
  { id:'bras_mass',        zone:'epaules',     method:'massage', nom:'Auto-massage bras (triceps/biceps)', scheme:'30–45 s / côté', cue:'Rouleau ou balle sur le triceps puis le biceps, pression modérée, lent.',              muscles:['triceps','biceps'], minLevel:0 },
  { id:'thoracique_mass',  zone:'thoracique',  method:'massage', nom:'Rouleau haut du dos',         scheme:'30–60 s',        cue:'Rouleau sous les omoplates, rouler doucement le long de la colonne thoracique (pas les lombaires).', muscles:['dorsaux'], minLevel:0 },
  { id:'hanches_mass',     zone:'hanches',     method:'massage', nom:'Rouleau fessiers / quadriceps',scheme:'30–60 s / côté',cue:'Assis sur le rouleau pour le fessier, puis à plat ventre pour le quadriceps. Lent, respiration.', muscles:['fessiers','quad'], minLevel:0 },
  { id:'cp_mass',          zone:'chaine_post', method:'massage', nom:'Rouleau ischios / mollets',   scheme:'30–60 s / côté', cue:'Rouler l’arrière de la cuisse puis le mollet, du bas vers le haut. Éviter l’arrière du genou.', muscles:['ischio','mollets'], minLevel:0 },
  { id:'chevilles_mass',   zone:'chevilles',   method:'massage', nom:'Voûte plantaire / mollet',    scheme:'30–45 s / côté', cue:'Balle sous la voûte plantaire, puis rouler le mollet. Pression modérée.',              muscles:['mollets'], minLevel:0 },
];

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
  { id:'marche',        seance:'marche',  name:'Marche active',                        dosage_key:'duree_marche',        video:null,          desc:'Allure permettant de tenir une conversation (test de la parole = seul indicateur recommandé, ACOG 2020). Dos droit, abdos légers.', note_key:'marche_note' },
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

// ── Objectifs nutrition ───────────────────────────────────────────────────────

export const NUTRITION_OBJECTIFS = [
  { id:'masse',       icon:'💪', label:'Prise de masse',    desc:"Surplus calorique, priorité protéines et glucides" },
  { id:'perte',       icon:'🔥', label:'Perte de poids',    desc:"Déficit calorique contrôlé, maintien masse musculaire" },
  { id:'healthy',     icon:'🥗', label:'Santé / Équilibre', desc:"Alimentation équilibrée, énergie stable, bien-être" },
  { id:'performance', icon:'⚡', label:'Performance',       desc:"Optimisation énergie et récupération pour l'effort" },
  { id:'maintien',    icon:'⚖️', label:'Maintien',          desc:"Stabilité pondérale, composition corporelle constante" },
];

export const NUTRITION_PLANS = {
  masse: {
    label: 'Prise de masse',
    surplus: "+300 à +500 kcal/jour vs dépense totale",
    proteines: "1.8–2.2 g / kg de poids corporel",
    glucides: "4–6 g / kg — carburant principal de l'effort",
    lipides: "0.8–1.2 g / kg — hormones et récupération",
    preSeance: {
      timing: "60–90 min avant l'entraînement",
      conseils: [
        "Repas complet : glucides complexes + protéines maigres",
        "Exemple : riz + blanc de poulet + légumes cuits",
        "Éviter les graisses en excès (ralentissent la digestion)",
        "Hydratation : 500 ml d'eau 2h avant",
      ]
    },
    postSeance: {
      timing: "Dans les 30–60 min après l'entraînement",
      conseils: [
        "Fenêtre anabolique : protéines + glucides rapides",
        "Exemple : yaourt grec + banane + flocons d'avoine",
        "Protéines : 25–40 g minimum (whey ou alimentaire)",
        "Glucides : 0.5–1 g/kg pour reconstituer le glycogène",
      ]
    },
    reposActif: {
      conseils: [
        "Maintenir les apports protéiques même sans entraînement",
        "Réduire légèrement les glucides (activité moindre)",
        "Augmenter les légumes et fibres",
        "Ne pas sauter de repas — la croissance musculaire est continue",
      ]
    },
    tips: [
      "💡 Mange 4–5 repas par jour pour maximiser la synthèse protéique",
      "💡 La créatine monohydrate (3–5 g/j) est le complément le plus validé scientifiquement",
      "⚠️ Un surplus trop important (> 500 kcal) favorise le stockage de gras",
    ]
  },
  perte: {
    label: 'Perte de poids',
    surplus: "−300 à −500 kcal/jour (déficit modéré)",
    proteines: "2.0–2.4 g / kg — essentiel pour préserver le muscle",
    glucides: "2–4 g / kg — privilégier avant l'entraînement",
    lipides: "0.8–1.0 g / kg — ne pas trop réduire",
    preSeance: {
      timing: "45–60 min avant",
      conseils: [
        "Repas léger : protéines + glucides modérés",
        "Exemple : blanc d'oeuf + flocons d'avoine + fruits rouges",
        "Éviter d'entraîner à jeun si objectif maintien musculaire",
        "Café noir acceptable pour la mobilisation des graisses",
      ]
    },
    postSeance: {
      timing: "Dans les 45 min",
      conseils: [
        "Priorité aux protéines, glucides modérés",
        "Exemple : blanc de poulet + légumes vapeur + quinoa",
        "Protéines : 30–40 g pour limiter le catabolisme",
        "Éviter les sucres rapides sauf si entraînement très intense",
      ]
    },
    reposActif: {
      conseils: [
        "Journées de repos = journées de déficit plus faciles à tenir",
        "Augmenter les légumes et les fibres (satiété)",
        "Maintenir les protéines élevées — le muscle consomme des calories",
        "Hydratation : 2–3 L/jour — la déshydratation masque la faim",
      ]
    },
    tips: [
      "💡 Un déficit de 300–500 kcal/j permet de perdre 0.3–0.5 kg/semaine sans perte musculaire",
      "💡 Peser ses aliments les 2 premières semaines pour calibrer ses portions",
      "⚠️ Pas de repas à moins de 1200 kcal (femmes) / 1500 kcal (hommes) — risque carences",
    ]
  },
  healthy: {
    label: "Santé / Équilibre",
    surplus: "Équilibre — ni surplus ni déficit",
    proteines: "1.4–1.8 g / kg",
    glucides: "3–5 g / kg — variés et complets",
    lipides: "1.0–1.2 g / kg — bons acides gras",
    preSeance: {
      timing: "60–90 min avant",
      conseils: [
        "Repas équilibré et digeste",
        "Exemple : salade de lentilles + oeufs durs + légumes",
        "Limiter les aliments ultra-transformés",
        "Hydratation régulière tout au long de la journée",
      ]
    },
    postSeance: {
      timing: "Dans l'heure",
      conseils: [
        "Repas complet et équilibré",
        "Exemple : poisson + patate douce + légumes verts",
        "Pas besoin d'optimiser à la minute — régularité > précision",
        "Favoriser les aliments entiers, peu transformés",
      ]
    },
    reposActif: {
      conseils: [
        "Maintenir 3 repas structurés + 1–2 collations si besoin",
        "Légumes à chaque repas — visez 5 portions/jour",
        "Limiter alcool, sucres ajoutés, sel en excès",
        "Bien dormir — le sommeil est clé pour la récupération",
      ]
    },
    tips: [
      "💡 La règle des 80/20 : 80% d'aliments nutritifs, 20% de plaisir sans culpabilité",
      "💡 Cuisiner soi-même est le levier le plus puissant pour une alimentation saine",
      "⚠️ La régularité sur 80% du temps vaut mieux que la perfection sur 50%",
    ]
  },
  performance: {
    label: 'Performance sportive',
    surplus: "Léger surplus les jours d'entraînement intense (+200–300 kcal)",
    proteines: "1.8–2.2 g / kg",
    glucides: "5–7 g / kg les jours d'entraînement, 3–4 g les jours de repos",
    lipides: "1.0–1.2 g / kg — acides gras essentiels",
    preSeance: {
      timing: "2–3h avant pour repas complet, 30–45 min pour collation",
      conseils: [
        "Repas riche en glucides complexes + protéines modérées",
        "Exemple : pâtes complètes + sauce thon + légumes",
        "Collation 30 min avant : banane + quelques amandes",
        "Hydratation : 500 ml d'eau dans l'heure précédant l'effort",
      ]
    },
    postSeance: {
      timing: "Immédiatement après — fenêtre de 30 min",
      conseils: [
        "Ratio glucides/protéines = 3:1 pour les efforts longs",
        "Exemple : smoothie banane + lait + whey + flocons d'avoine",
        "Protéines : 25–40 g pour la réparation musculaire",
        "Électrolytes si effort > 60 min ou forte sudation",
      ]
    },
    reposActif: {
      conseils: [
        "Jours de repos = jours de reconstruction — ne pas négliger l'alimentation",
        "Réduire les glucides, maintenir protéines et lipides",
        "Anti-inflammatoires naturels : curcuma, oméga-3, fruits rouges",
        "Sommeil 7–9h — principal vecteur de récupération",
      ]
    },
    tips: [
      "💡 La caféine (3–6 mg/kg, 45 min avant) améliore la performance de 3–7%",
      "💡 Bêta-alanine + créatine = les deux seuls compléments validés pour la performance",
      "⚠️ Pas d'expérimentation nutritionnelle le jour d'une compétition",
    ]
  },
  maintien: {
    label: 'Maintien',
    surplus: "Équilibre strict — calories = dépense totale",
    proteines: "1.6–2.0 g / kg",
    glucides: "3–5 g / kg selon le volume d'entraînement",
    lipides: "0.8–1.0 g / kg",
    preSeance: {
      timing: "60–90 min avant",
      conseils: [
        "Repas équilibré et habituel — pas de changement brutal",
        "Exemple : riz + légumineuses + légumes + huile d'olive",
        "Maintenir les mêmes horaires de repas",
        "Hydratation : 1.5–2 L/jour minimum",
      ]
    },
    postSeance: {
      timing: "Dans l'heure",
      conseils: [
        "Repas complet et protéiné",
        "Exemple : oeufs + légumes sautés + pain complet",
        "La régularité est plus importante que l'optimisation",
        "Écouter ses signaux de faim et satiété",
      ]
    },
    reposActif: {
      conseils: [
        "Manger légèrement moins les jours sans entraînement (−100 à −200 kcal)",
        "Maintenir les protéines constantes 7j/7",
        "Varier les sources alimentaires pour couvrir tous les micronutriments",
        "Peser régulièrement (1×/semaine, mêmes conditions) pour vérifier la stabilité",
      ]
    },
    tips: [
      "💡 Le maintien demande autant d'attention que la prise de masse ou la perte de poids",
      "💡 Ajustements progressifs de ±100 kcal si le poids dérive sur 2–3 semaines",
      "⚠️ Éviter les fluctuations extrêmes — le corps préfère la stabilité",
    ]
  },
};
