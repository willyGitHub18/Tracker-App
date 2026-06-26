/**
 * programs.js — Multi-program storage
 * Handles active, archived (completed/abandoned) programs.
 * Each program has a status: 'active' | 'completed' | 'abandoned'
 */

import { dbGet, dbSet } from './db.js';

const KEY_LIST    = 'programs_list';
const KEY_ACTIVE  = 'program_active';   // legacy single
const KEY_ACTIVES = 'programs_active';  // new: array of ids

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function getPrograms() {
  return dbGet(KEY_LIST) || [];
}

export function getActivePrograms() {
  return getPrograms().filter(p => p.status === 'active');
}

export function getArchivedPrograms() {
  return getPrograms().filter(p => p.status !== 'active');
}

export function getProgram(id) {
  return getPrograms().find(p => p.id === id) || null;
}

export function saveProgram(program) {
  try {
    const list = getPrograms();
    const idx  = list.findIndex(p => p.id === program.id);
    if(idx >= 0) list[idx] = program;
    else list.push(program);
    dbSet(KEY_LIST, list);
  } catch(err) {
    console.error('[programs] saveProgram failed:', err);
  }
}

export function deleteProgram(id) {
  const list = getPrograms().filter(p => p.id !== id);
  dbSet(KEY_LIST, list);
  if(getActiveProgramId() === id) setActiveProgram(null);
}

// ── Active program ────────────────────────────────────────────────────────────

// ── Multi-active support ─────────────────────────────────────────────────────

export function getActiveProgramIds() {
  // Migrate legacy single active
  const legacy = dbGet(KEY_ACTIVE);
  const list   = dbGet(KEY_ACTIVES) || [];
  if(legacy && !list.includes(legacy)) {
    list.push(legacy);
    dbSet(KEY_ACTIVES, list);
    dbSet(KEY_ACTIVE, null);
  }
  return list;
}

export function getActiveProgramId() {
  const ids = getActiveProgramIds();
  return ids[0] || null;
}

export function getActiveProgram() {
  const id = getActiveProgramId();
  return id ? getProgram(id) : null;
}

export function getActiveProgramById(id) {
  if(!id) return null;
  const prog = getProgram(id);
  return prog?.status === 'active' ? prog : null;
}

export function getAllActivePrograms() {
  return getActiveProgramIds()
    .map(id => getProgram(id))
    .filter(p => p && p.status === 'active');
}

export function setActiveProgram(idOrNull) {
  // Legacy compat
  dbSet(KEY_ACTIVE, idOrNull);
  if(idOrNull) {
    const list = getActiveProgramIds();
    if(!list.includes(idOrNull)) { list.unshift(idOrNull); dbSet(KEY_ACTIVES, list); }
  }
}

export function addActiveProgram(id) {
  const list = getActiveProgramIds();
  if(!list.includes(id)) list.push(id);
  dbSet(KEY_ACTIVES, list);
  // First active becomes the "primary"
  if(list.length === 1) dbSet(KEY_ACTIVE, id);
}

export function removeActiveProgram(id) {
  const list = getActiveProgramIds().filter(i => i !== id);
  dbSet(KEY_ACTIVES, list);
  if(dbGet(KEY_ACTIVE) === id) dbSet(KEY_ACTIVE, list[0] || null);
}

export function setPrimaryProgram(id) {
  // Move to front
  const list = getActiveProgramIds().filter(i => i !== id);
  list.unshift(id);
  dbSet(KEY_ACTIVES, list);
  dbSet(KEY_ACTIVE, id);
}

// ── Close program (completed or abandoned) ────────────────────────────────────

export function closeProgram(id, reason = 'completed') {
  // reason: 'completed' | 'abandoned'
  const prog = getProgram(id);
  if(!prog) return;

  // Collect all tracking data for this program
  const allData = dbGet('programs_tracking') || {};
  const snapshot = allData[id] || {};

  const closed = {
    ...prog,
    status:     reason,
    closedAt:   Date.now(),
    snapshot,   // all tracking data frozen
  };

  saveProgram(closed);

  // Deactivate from all active lists
  removeActiveProgram(id);
}

// ── Tracking data for any program ─────────────────────────────────────────────
// Stored flat: programs_tracking[programId][key] = value

export function getProgRecord(programId, exId, week) {
  const all = dbGet('programs_tracking') || {};
  return all[programId]?.[`${exId}_w${week}`] || null;
}

export function setProgRecord(programId, exId, week, data) {
  try {
    const all = dbGet('programs_tracking') || {};
    if(!all[programId]) all[programId] = {};
    all[programId][`${exId}_w${week}`] = data;
    dbSet('programs_tracking', all);
  } catch(err) {
    console.error('[programs] setProgRecord failed:', err);
  }
}

export function getProgExStatus(programId, exId, week) {
  const all = dbGet('programs_tracking') || {};
  return all[programId]?.[`status_${exId}_w${week}`] || 'normal';
}

export function setProgExStatus(programId, exId, week, status) {
  const VALID = ['normal','deload','skipped','hyrox'];
  if(!VALID.includes(status)) return;
  const all = dbGet('programs_tracking') || {};
  if(!all[programId]) all[programId] = {};
  all[programId][`status_${exId}_w${week}`] = status;
  dbSet('programs_tracking', all);
}

export function getProgLatestWeek(programId, program) {
  if(!program?.semaines) return 1;
  const all = dbGet('programs_tracking') || {};
  const data = all[programId] || {};
  let max = 1;
  program.semaines.forEach((sem, i) => {
    sem.jours?.forEach(day => {
      day.exercices?.forEach(ex => {
        if(data[`${ex.id}_w${i+1}`]) max = Math.max(max, i + 1);
      });
    });
  });
  return Math.min(max, program.semaines.length);
}

// ── ID generator ──────────────────────────────────────────────────────────────

export function newProgramId() {
  return 'prog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ── Export single program as JSON ─────────────────────────────────────────────

export function exportProgramJSON(id) {
  const prog = getProgram(id);
  if(!prog) return null;
  const all = dbGet('programs_tracking') || {};
  return {
    version:  1,
    exported: new Date().toISOString(),
    program:  prog,
    tracking: all[id] || {},
  };
}

// ── Export/import all programs ────────────────────────────────────────────────

export function exportAllPrograms() {
  return {
    programs:        getPrograms(),
    activeProgram:   getActiveProgramId(),
    programs_tracking: dbGet('programs_tracking') || {},
  };
}

export function importAllPrograms(data) {
  if(!data?.programs || !Array.isArray(data.programs)) return;
  const existing = getPrograms();
  const merged   = [...existing];
  data.programs.forEach(p => {
    if(!p?.id) return;
    const idx = merged.findIndex(e => e.id === p.id);
    if(idx >= 0) merged[idx] = p;
    else merged.push(p);
  });
  dbSet(KEY_LIST, merged);
  if(data.activeProgram) dbSet(KEY_ACTIVE, data.activeProgram);
  if(data.programs_tracking) {
    const existing_tracking = dbGet('programs_tracking') || {};
    dbSet('programs_tracking', { ...existing_tracking, ...data.programs_tracking });
  }
}
