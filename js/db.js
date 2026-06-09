/**
 * db.js — IndexedDB storage layer
 * Replaces localStorage for better iOS stability.
 * Exposes a synchronous-looking API via an in-memory cache
 * that is flushed to IndexedDB asynchronously.
 */

const DB_NAME    = 'athx-tracker';
const DB_VERSION = 1;
const STORE_NAME = 'records';

let _db   = null;
let _cache = {};   // in-memory mirror for sync reads
let _ready = false;

/** Open (or upgrade) the database */
function dbOpen() {
  return new Promise((resolve, reject) => {
    if(_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

/** Load all records into cache at startup */
async function dbInit() {
  try {
    const db = await dbOpen();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
    _cache = {};
    all.forEach(item => { _cache[item.key] = item.value; });
    _ready = true;
  } catch(err) {
    console.warn('[db] IndexedDB unavailable, falling back to localStorage:', err);
    // Fallback: migrate localStorage → cache
    try {
      const raw = localStorage.getItem('athx_charges_v2');
      if(raw) _cache = JSON.parse(raw);
    } catch(_) {}
    _ready = true;
  }
}

/** Sync read — always use cache */
function dbGet(key) {
  return _cache[key] !== undefined ? _cache[key] : null;
}

/** Sync read of entire cache */
function dbGetAll() {
  return { ..._cache };
}

/** Write key → cache immediately, persist to IDB async */
function dbSet(key, value) {
  _cache[key] = value;
  _dbPersist(key, value);
}

/** Delete key */
function dbDelete(key) {
  delete _cache[key];
  _dbPersistDelete(key);
}

/** Replace entire cache (used for import) */
function dbSetAll(obj) {
  _cache = { ...obj };
  _dbPersistAll();
}

async function _dbPersist(key, value) {
  try {
    const db = await dbOpen();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, value });
  } catch(_) {
    // Fallback: localStorage mirror
    try { localStorage.setItem('athx_charges_v2', JSON.stringify(_cache)); } catch(_) {}
  }
}

async function _dbPersistDelete(key) {
  try {
    const db = await dbOpen();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch(_) {}
}

async function _dbPersistAll() {
  try {
    const db = await dbOpen();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    Object.entries(_cache).forEach(([key, value]) => store.put({ key, value }));
  } catch(_) {
    try { localStorage.setItem('athx_charges_v2', JSON.stringify(_cache)); } catch(_) {}
  }
}

/** Wipe everything (reset) */
async function dbClear() {
  _cache = {};
  try {
    const db = await dbOpen();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch(_) {
    try { localStorage.removeItem('athx_charges_v2'); } catch(_) {}
  }
}

export { dbInit, dbGet, dbGetAll, dbSet, dbDelete, dbSetAll, dbClear };
