/**
 * security.js — Input sanitisation & validation
 * All functions are pure (no side effects).
 */

/** Escape HTML entities to prevent XSS in innerHTML */
export function esc(str) {
  if(str == null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/** Sanitise and validate a single set record before storage */
/**
 * Plafond du nombre de séries d'une semaine. Les bornes de `sanitizeRecord` portaient
 * jusqu'ici sur les **valeurs** (kg < 1000, reps < 100, RPE ≤ 10) mais **pas sur la
 * longueur** du tableau. Depuis que la grille dérive son nombre de lignes des séries
 * réellement saisies (`nSetsForWeek`, §40), cette longueur est devenue une **borne de
 * boucle de rendu** : un backup forgé avec ~18 000 séries figeait la vue. Le plus grand
 * barème réel est de 5 séries — 20 laisse toute la marge utile. Cf. journal §41.
 */
export const MAX_SETS_PER_WEEK = 20;

export function sanitizeRecord(rec) {
  if(!rec || typeof rec !== 'object') return null;
  const out = {};

  if(Array.isArray(rec.sets)) {
    out.sets = rec.sets.slice(0, MAX_SETS_PER_WEEK).map(s => {
      if(!s || typeof s !== 'object') return { kg: null, reps: null, rpe: null, skipped: false };
      // Série explicitement marquée "non effectuée" — distinct de kg=0 (poids du corps volontaire)
      const skipped = s.skipped === true;
      const kg   = parseFloat(s.kg);
      const reps = parseInt(s.reps, 10);
      const rpe  = parseFloat(s.rpe);
      return {
        kg:      skipped ? null : (isFinite(kg)   && kg   >= 0 && kg   < 1000 ? kg   : null),
        reps:    skipped ? null : (isFinite(reps) && reps >= 0 && reps < 100  ? reps : null),
        rpe:     skipped ? null : (isFinite(rpe)  && rpe  >= 0 && rpe  <= 10  ? String(rpe) : null),
        skipped: skipped,
      };
    });
  }

  const kg = parseFloat(rec.kg);
  const ts = parseInt(rec.ts, 10);
  if(isFinite(kg) && kg >= 0 && kg < 1000) out.kg = kg;
  if(isFinite(ts) && ts > 0)               out.ts = ts;
  if(rec.rpe != null) {
    const rpe = parseFloat(rec.rpe);
    if(isFinite(rpe) && rpe >= 0 && rpe <= 10) out.rpe = String(rpe);
  }
  if(['normal','hyrox','skipped','deload'].includes(rec.sessionStatus))
    out.sessionStatus = rec.sessionStatus;

  // kg=0 est une valeur légitime (poids du corps, échec total) — utiliser != null
  // Une série marquée "non effectuée" compte aussi comme donnée valide à sauvegarder
  if(out.kg == null && (!out.sets || !out.sets.some(s => s && (s.kg != null || s.skipped)))) return null;
  return out;
}

/**
 * Validate an imported JSON object.
 * Returns { ok: true, clean: {...} } or { ok: false, error: '...' }
 */
export function validateImport(obj) {
  if(typeof obj !== 'object' || obj === null || Array.isArray(obj))
    return { ok: false, error: 'Format invalide.' };

  const EX_KEY = /^(press|squat|deadlift|gtoh|sandbag|lunges)_w([1-9]|1[0-7])$/;
  const ST_KEY = /^status_(press|squat|deadlift|gtoh|sandbag|lunges)_w([1-9]|1[0-7])$/;
  const VALID_STATUS = ['normal','hyrox','skipped','deload'];

  const hasAny = Object.keys(obj).some(k => EX_KEY.test(k));
  // Allow empty ATHX data (user may only have generated programs)
  if(!hasAny && Object.keys(obj).length > 0)
    return { ok: false, error: 'Aucune donnée d\'exercice reconnue.' };

  const clean = {};
  for(const [k, v] of Object.entries(obj)) {
    if(EX_KEY.test(k)) {
      const s = sanitizeRecord(v);
      if(s) clean[k] = s;
    } else if(ST_KEY.test(k) && VALID_STATUS.includes(v)) {
      clean[k] = v;
    }
    // unknown keys silently ignored
  }

  // Allow empty clean result when importing generated-program-only data
  if(!Object.keys(clean).length && Object.keys(obj).length > 0)
    return { ok: false, error: 'Aucune donnée valide après nettoyage.' };

  return { ok: true, clean };
}

/** Validate a muscle ID (used in SVG click delegation) */
export function isValidMuscleId(id) {
  return typeof id === 'string' && /^[a-zA-Z]+$/.test(id);
}

// ── Import sanitisation (defense-in-depth) ────────────────────────────────────
// Les fichiers d'import JSON sont un vecteur d'attaque (un backup partagé forgé).
// Seuls les records tracker passaient par validateImport ; ces helpers assainissent
// les autres blocs (programmes, plans nutrition, mobilité) AVANT écriture en base.

/**
 * ID sûr pour usage en attribut ET en chaîne JS de handler `onclick` inline.
 * esc() ne suffit PAS dans ce contexte (`&#39;` est redécodé en `'` par le parseur
 * → réévasion possible). On restreint donc à un alphabet strict. Renvoie null si vide.
 */
export function safeId(id, max = 80) {
  const s = String(id == null ? '' : id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, max);
  return s || null;
}

/**
 * Nettoie une étiquette texte réutilisée en attribut ou re-matchée par chaîne
 * (ex. `day.nom` sert de clé de recherche ET d'attribut `data-prog-day`). On RETIRE
 * les caractères dangereux (`< > " ' \``) au lieu de les encoder → la valeur reste
 * du texte brut cohérent des deux côtés. Conserve `&` (noms « Back & Bi »). Borne la taille.
 */
export function safeLabel(str, max = 120) {
  return String(str == null ? '' : str)
    .replace(/[<>"'`\x00-\x1f\x7f]/g, '')
    .slice(0, max);
}

// Nettoyage récursif générique : nombres/booléens préservés, chaînes passées à
// safeLabel, tableaux et objets bornés en profondeur. Les clés non alphanumériques
// (`__proto__`, `constructor`…) sont écartées → pas de prototype pollution.
export function sanitizeDeep(v, depth = 0) {
  if(v == null) return v;
  if(typeof v === 'number') return isFinite(v) ? v : null;
  if(typeof v === 'boolean') return v;
  if(typeof v === 'string') return safeLabel(v, 400);
  if(Array.isArray(v)) return depth < 5 ? v.slice(0, 500).map(x => sanitizeDeep(x, depth + 1)) : [];
  if(typeof v === 'object') {
    if(depth >= 7) return {};
    const out = {};
    for(const k of Object.keys(v)) {
      if(/^[A-Za-z0-9_]+$/.test(k)) out[k] = sanitizeDeep(v[k], depth + 1);
    }
    return out;
  }
  return null;
}

/** Programme importé → objet nettoyé (texte sans HTML, id strict) ou null si à rejeter. */
export function sanitizeImportedProgram(p) {
  if(!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const id = safeId(p.id);
  if(!id) return null;
  const clean = sanitizeDeep(p, 0);
  clean.id   = id;                                   // forme canonique garantie
  clean.name = safeLabel(p.name || 'Programme', 120);
  return clean;
}

/** Plan nutrition importé → champs numériques coercés (neutralise XSS + crash au rendu). */
export function sanitizeImportedPlan(p) {
  if(!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const id = safeId(p.id);
  if(!id) return null;
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const c = (p.calc && typeof p.calc === 'object') ? p.calc : {};
  const i = (p.inputs && typeof p.inputs === 'object') ? p.inputs : {};
  return {
    id,
    name:      safeLabel(p.name || 'Plan', 80),
    objectif:  safeLabel(p.objectif || '', 40),
    createdAt: num(p.createdAt),
    calc: {
      kcalTraining: num(c.kcalTraining), kcalRest: num(c.kcalRest), tdee: num(c.tdee),
      bmr: num(c.bmr), imc: num(c.imc),
      prot_g: num(c.prot_g), lip_g: num(c.lip_g), gluc_g: num(c.gluc_g),
      prot_pct: num(c.prot_pct), lip_pct: num(c.lip_pct), gluc_pct: num(c.gluc_pct),
    },
    inputs: {
      poids: num(i.poids), taille: num(i.taille), age: num(i.age),
      sexe: i.sexe === 'F' ? 'F' : 'H', activite: safeLabel(i.activite || '', 30),
    },
  };
}

/** Bilan mobilité importé → scores 0/1/2, cm numériques, ids validés. */
export function sanitizeImportedAssessment(a) {
  if(!a || typeof a !== 'object' || Array.isArray(a)) return null;
  const clean = { date: safeLabel(a.date || '', 12), scores: {}, cm: {}, history: [] };
  if(a.scores && typeof a.scores === 'object') {
    for(const k of Object.keys(a.scores)) {
      const zid = safeId(k), s = Number(a.scores[k]);
      if(zid && (s === 0 || s === 1 || s === 2)) clean.scores[zid] = s;
    }
  }
  if(a.cm && typeof a.cm === 'object') {
    for(const k of Object.keys(a.cm)) {
      const zid = safeId(k), n = Number(a.cm[k]);
      if(zid && isFinite(n)) clean.cm[zid] = n;
    }
  }
  return clean;
}

/** Logs mobilité importés → entrées bornées (400 max), ts/durée numériques, zones validées. */
export function sanitizeImportedLogs(arr) {
  if(!Array.isArray(arr)) return [];
  return arr.filter(l => l && typeof l === 'object').slice(-400).map(l => ({
    ts:    Number(l.ts) || 0,
    duree: Number(l.duree) || 0,
    zones: Array.isArray(l.zones)
      ? l.zones.filter(z => typeof z === 'string').map(z => safeId(z)).filter(Boolean).slice(0, 20)
      : [],
    type:  safeLabel(l.type || '', 20),
  })).filter(l => l.ts);
}
