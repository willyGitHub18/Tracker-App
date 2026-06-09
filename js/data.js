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
