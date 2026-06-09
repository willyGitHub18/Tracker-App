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
export function sanitizeRecord(rec) {
  if(!rec || typeof rec !== 'object') return null;
  const out = {};

  if(Array.isArray(rec.sets)) {
    out.sets = rec.sets.map(s => {
      if(!s || typeof s !== 'object') return { kg: null, reps: null, rpe: null };
      const kg   = parseFloat(s.kg);
      const reps = parseInt(s.reps, 10);
      const rpe  = parseFloat(s.rpe);
      return {
        kg:   isFinite(kg)   && kg   >= 0 && kg   < 1000 ? kg   : null,
        reps: isFinite(reps) && reps >= 0 && reps < 100  ? reps : null,
        rpe:  isFinite(rpe)  && rpe  >= 0 && rpe  <= 10  ? String(rpe) : null,
      };
    });
  }

  const kg = parseFloat(rec.kg);
  const ts = parseInt(rec.ts, 10);
  if(isFinite(kg) && kg >= 0 && kg < 1000) out.kg = kg;
  if(isFinite(ts) && ts > 0)               out.ts = ts;
  if(rec.rpe != null)
    out.rpe = String(rec.rpe).replace(/[^0-9.]/g, '').slice(0, 4);
  if(['normal','hyrox','skipped'].includes(rec.sessionStatus))
    out.sessionStatus = rec.sessionStatus;

  if(!out.kg && (!out.sets || !out.sets.some(s => s && s.kg))) return null;
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
  const VALID_STATUS = ['normal','hyrox','skipped'];

  const hasAny = Object.keys(obj).some(k => EX_KEY.test(k));
  if(!hasAny)
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

  if(!Object.keys(clean).length)
    return { ok: false, error: 'Aucune donnée valide après nettoyage.' };

  return { ok: true, clean };
}

/** Validate a muscle ID (used in SVG click delegation) */
export function isValidMuscleId(id) {
  return typeof id === 'string' && /^[a-zA-Z]+$/.test(id);
}
