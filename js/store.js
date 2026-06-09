/**
 * store.js — App-level storage helpers
 * Wraps db.js with typed accessors for records and session status.
 */

import { dbGet, dbSet, dbGetAll, dbSetAll } from './db.js';
import { sanitizeRecord } from './security.js';

// ── Record accessors ─────────────────────────────────────────────────────────

export function getRecord(exId, week) {
  return dbGet(`${exId}_w${week}`) || null;
}

export function setRecord(exId, week, data) {
  const clean = sanitizeRecord(data);
  if(clean) dbSet(`${exId}_w${week}`, clean);
}

export function getExStatus(exId, week) {
  return dbGet(`status_${exId}_w${week}`) || 'normal';
}

export function setExStatus(exId, week, status) {
  const VALID = ['normal', 'hyrox', 'skipped'];
  if(!VALID.includes(status)) return;
  dbSet(`status_${exId}_w${week}`, status);
}

export function getAllRecords() {
  return dbGetAll();
}

export function importRecords(cleanObj) {
  const current = dbGetAll();
  dbSetAll({ ...current, ...cleanObj });
}

/** Find the highest week that has any data */
export function getLatestWeek(exercises) {
  let max = 1;
  exercises.forEach(ex => {
    for(let w = 1; w <= 17; w++) {
      if(getRecord(ex.id, w)) max = Math.max(max, w);
    }
  });
  return Math.min(max, 17);
}

// ── Record normalisation (v1 → v2 compat) ───────────────────────────────────

export function normRecord(rec) {
  if(!rec) return null;
  if(rec.sets && Array.isArray(rec.sets)) return rec;
  // v1 format {kg, rpe, ts} → v2
  return { sets: [{ kg: rec.kg, reps: null, rpe: rec.rpe || '' }], kg: rec.kg, rpe: rec.rpe, ts: rec.ts };
}

export function bestKg(rec) {
  if(!rec) return null;
  const nr = normRecord(rec);
  if(!nr || !nr.sets) return nr?.kg || null;
  const vals = nr.sets.map(s => s?.kg).filter(v => v != null && v > 0);
  return vals.length ? Math.max(...vals) : (nr.kg || null);
}
