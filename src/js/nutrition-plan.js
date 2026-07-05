/**
 * nutrition-plan.js — Section Nutrition (plans personnalisés + référence ATHX)
 *
 * La section fonctionne comme Programmes : une liste de plans (le plan ATHX
 * legacy statique est toujours le 1er), un détail par plan, et un assistant
 * (wizard) qui calcule un plan perso via Mifflin-St Jeor.
 */

import { esc } from './security.js';
import { dbGet, dbSet } from './db.js';
import { NUTRITION_OBJECTIFS, NUTRITION_PLANS } from './data.js';

const NUTRI_KEY = 'nutrition_plans';

// ── Paramètres de calcul ──────────────────────────────────────────────────────

const ACTIVITY_FACTORS = {
  sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725, tres_actif: 1.9,
};
const ACTIVITY_LABELS = {
  sedentaire: 'Sédentaire (bureau, peu de marche)',
  leger:      'Léger (1–3 séances/sem)',
  modere:     'Modéré (3–5 séances/sem)',
  actif:      'Actif (6–7 séances/sem)',
  tres_actif: 'Très actif (2×/jour, métier physique)',
};
// deltaTrain/deltaRest = ajustement kcal vs TDEE ; protPerKg / fatPerKg = g/kg
const OBJ_PARAMS = {
  masse:       { deltaTrain: 350, deltaRest: 100, protPerKg: 2.0, fatPerKg: 1.0 },
  perte:       { deltaTrain: -300, deltaRest: -500, protPerKg: 2.2, fatPerKg: 0.9 },
  maintien:    { deltaTrain: 0, deltaRest: 0, protPerKg: 1.8, fatPerKg: 1.0 },
  performance: { deltaTrain: 200, deltaRest: 0, protPerKg: 1.8, fatPerKg: 1.0 },
  healthy:     { deltaTrain: -150, deltaRest: -250, protPerKg: 1.6, fatPerKg: 1.0 },
};
// Répartition des kcal sur la journée d'entraînement
const MEAL_SPLIT = [
  { nom: 'Petit-déjeuner', pct: 0.25 },
  { nom: 'Collation',      pct: 0.10 },
  { nom: 'Déjeuner',       pct: 0.30 },
  { nom: 'Collation',      pct: 0.15 },
  { nom: 'Dîner',          pct: 0.20 },
];

/** Calcul TDEE (Mifflin-St Jeor) → calories + macros. */
export function computeNutritionPlan(inp) {
  const poids  = inp.poids, taille = inp.taille, age = inp.age;
  const bmr  = Math.round(10 * poids + 6.25 * taille - 5 * age + (inp.sexe === 'F' ? -161 : 5));
  const tdee = Math.round(bmr * (ACTIVITY_FACTORS[inp.activite] || 1.55));
  const o    = OBJ_PARAMS[inp.objectif] || OBJ_PARAMS.maintien;

  const kcalTraining = Math.round((tdee + o.deltaTrain) / 10) * 10;
  const kcalRest     = Math.round((tdee + o.deltaRest) / 10) * 10;

  const prot_g = Math.round(poids * o.protPerKg);
  const lip_g  = Math.round(poids * o.fatPerKg);
  const kcalP  = prot_g * 4, kcalL = lip_g * 9;
  const gluc_g = Math.max(0, Math.round((kcalTraining - kcalP - kcalL) / 4));

  const totalKcal = kcalP + kcalL + gluc_g * 4 || 1;
  const prot_pct  = Math.round(kcalP / totalKcal * 100);
  const lip_pct   = Math.round(kcalL / totalKcal * 100);
  const gluc_pct  = Math.max(0, 100 - prot_pct - lip_pct);
  const imc       = +(poids / ((taille / 100) ** 2)).toFixed(1);

  return { bmr, tdee, kcalTraining, kcalRest, prot_g, lip_g, gluc_g,
           prot_pct, gluc_pct, lip_pct, imc };
}

// ── Stockage ────────────────────────────────────────────────────────────────

function getNutritionPlans() {
  const list = dbGet(NUTRI_KEY);
  return Array.isArray(list) ? list : [];
}
function saveNutritionPlan(plan) {
  const list = getNutritionPlans();
  const i = list.findIndex(p => p.id === plan.id);
  if(i >= 0) list[i] = plan; else list.push(plan);
  dbSet(NUTRI_KEY, list);
}
function deleteNutritionPlan(id) {
  dbSet(NUTRI_KEY, getNutritionPlans().filter(p => p.id !== id));
}
function _newNutriId() {
  return 'nutri_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

// ── Vues (liste / détail / wizard) ─────────────────────────────────────────────

function _showNutriView(id) {
  const sec = document.getElementById('nutrition-section');
  if(!sec) return;
  sec.querySelectorAll('.prog-view').forEach(v => v.classList.remove('active-view'));
  document.getElementById(id)?.classList.add('active-view');
}

/** Point d'entrée appelé par showSection('nutrition-section'). */
export function renderNutritionSection() {
  _showNutriView('nutri-list-view');
  _renderNutriList();
}

function _renderNutriList() {
  const el = document.getElementById('nutriListContent');
  if(!el) return;
  const plans = getNutritionPlans();

  // Carte ATHX legacy (toujours en 1er, non supprimable)
  let html = `
    <div class="p-card nutri-plan-card">
      <div class="nutri-plan-info">
        <div class="nutri-plan-name">🏆 ATHX — Compétition (référence)</div>
        <div class="nutri-plan-sub">Profil 73 kg · phase de compétition · plan détaillé</div>
      </div>
      <button class="save-btn" style="padding:6px 14px;font-size:12px" onclick="_viewNutriPlan('athx')">Voir</button>
    </div>`;

  html += plans.map(p => {
    const obj = NUTRITION_OBJECTIFS.find(n => n.id === p.objectif);
    const c = p.calc || {};
    return `
    <div class="p-card nutri-plan-card">
      <div class="nutri-plan-info">
        <div class="nutri-plan-name">${obj?.icon || '🥗'} ${esc(p.name)}</div>
        <div class="nutri-plan-sub">${obj?.label || ''} · ${esc(c.kcalTraining ?? '?')} kcal · ${esc(c.prot_g ?? '?')} g P</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="save-btn" style="padding:6px 14px;font-size:12px" onclick="_viewNutriPlan('${esc(p.id)}')">Voir</button>
        <button class="vac-clear-btn" onclick="_deleteNutriPlan('${esc(p.id)}')">🗑</button>
      </div>
    </div>`;
  }).join('');

  if(!plans.length) {
    html += `<div class="wiz-note" style="margin-top:10px">💡 Crée un plan personnalisé adapté à ton poids et ton objectif avec « + Créer un plan ».</div>`;
  }
  el.innerHTML = html;
}

function _renderNutriDetail(id) {
  const el = document.getElementById('nutri-detail-view');
  if(!el) return;

  const back = `<div class="wiz-header"><div class="wiz-header-top">
      <div class="wiz-header-title">Nutrition</div>
      <button class="wiz-show-list-btn" onclick="showNutriList()">← Mes plans</button>
    </div></div>`;

  if(id === 'athx') {
    const tpl = document.getElementById('athx-nutri-tpl');
    el.innerHTML = back;
    if(tpl) el.appendChild(tpl.content.cloneNode(true));
    _showNutriView('nutri-detail-view');
    return;
  }

  const plan = getNutritionPlans().find(p => p.id === id);
  if(!plan) { showNutriList(); return; }
  const c   = plan.calc || {};
  const inp = plan.inputs || {};
  const obj = NUTRITION_OBJECTIFS.find(n => n.id === plan.objectif);
  const advice = NUTRITION_PLANS[plan.objectif];

  // Valeurs dérivées pour le détail du calcul
  const op        = OBJ_PARAMS[plan.objectif] || OBJ_PARAMS.maintien;
  const af        = ACTIVITY_FACTORS[inp.activite] || 1.55;
  const afLabel   = ACTIVITY_LABELS[inp.activite] || '';
  const kcalP     = c.prot_g * 4, kcalL = c.lip_g * 9, kcalG = c.gluc_g * 4;
  const glucPerKg = inp.poids ? (c.gluc_g / inp.poids).toFixed(1) : '?';
  const sexeAdj   = inp.sexe === 'F' ? '− 161' : '+ 5';
  const dlt       = d => d === 0 ? '' : (d > 0 ? ' + ' + d : ' − ' + Math.abs(d));

  const meals = MEAL_SPLIT.map(m =>
    `<div class="p-meal-row"><div class="p-meal-name">${m.nom}</div><div class="p-meal-detail">~${Math.round(c.kcalTraining * m.pct / 10) * 10} kcal · ${Math.round(m.pct * 100)}% de la journée</div></div>`
  ).join('');

  const adviceBlock = advice ? `
    <div class="nutri-block">
      <div class="nutri-block-title">⏰ ${esc(advice.preSeance.timing)} — Pré-séance</div>
      ${advice.preSeance.conseils.map(t => `<div class="nutri-tip">${esc(t)}</div>`).join('')}
    </div>
    <div class="nutri-block">
      <div class="nutri-block-title">💪 ${esc(advice.postSeance.timing)} — Post-séance</div>
      ${advice.postSeance.conseils.map(t => `<div class="nutri-tip">${esc(t)}</div>`).join('')}
    </div>
    <div class="nutri-block">
      <div class="nutri-block-title">🛋 Jours de repos</div>
      ${advice.reposActif.conseils.map(t => `<div class="nutri-tip">${esc(t)}</div>`).join('')}
    </div>
    <div class="nutri-block nutri-tips-block">
      <div class="nutri-block-title">💡 À retenir</div>
      ${advice.tips.map(t => `<div class="nutri-tip">${esc(t)}</div>`).join('')}
    </div>` : '';

  el.innerHTML = back + `
    <div class="p-section">
      <div class="p-sec-title">${obj?.icon || '🥗'} ${esc(plan.name)} — ${obj?.label || ''}</div>
      <div class="p-metrics">
        <div class="p-metric"><div class="p-metric-val">${c.kcalTraining}</div><div class="p-metric-lbl">kcal/jour (entraînement)</div></div>
        <div class="p-metric"><div class="p-metric-val">${c.kcalRest}</div><div class="p-metric-lbl">kcal/jour (repos)</div></div>
        <div class="p-metric"><div class="p-metric-val">${c.tdee}</div><div class="p-metric-lbl">TDEE (dépense)</div></div>
        <div class="p-metric"><div class="p-metric-val">${c.bmr}</div><div class="p-metric-lbl">MB (métabolisme base)</div></div>
        <div class="p-metric"><div class="p-metric-val">${c.imc}</div><div class="p-metric-lbl">IMC</div></div>
      </div>
      <div class="p-note">Profil : ${inp.poids || '?'} kg · ${inp.taille || '?'} cm · ${inp.age || '?'} ans · ${inp.sexe === 'F' ? 'femme' : 'homme'} · ${afLabel}.</div>
    </div>

    <div class="p-section">
      <div class="p-sec-title">Répartition des macronutriments (jour d'entraînement)</div>
      <div class="p-card">
        <div class="p-card-body">
          <div style="display:flex;gap:16px;margin-bottom:10px;flex-wrap:wrap">
            <div><span style="font-size:18px;font-weight:500;color:var(--text)">${c.prot_g} g</span><div style="font-size:11px;color:var(--text2)">Protéines · ${op.protPerKg} g/kg</div></div>
            <div><span style="font-size:18px;font-weight:500;color:var(--text)">${c.gluc_g} g</span><div style="font-size:11px;color:var(--text2)">Glucides · ~${glucPerKg} g/kg</div></div>
            <div><span style="font-size:18px;font-weight:500;color:var(--text)">${c.lip_g} g</span><div style="font-size:11px;color:var(--text2)">Lipides · ${op.fatPerKg} g/kg</div></div>
          </div>
          <div class="p-macro-bar"><div class="p-macro-p" style="width:${c.prot_pct}%"></div><div class="p-macro-g" style="width:${c.gluc_pct}%"></div><div class="p-macro-l" style="width:${c.lip_pct}%"></div></div>
          <div class="p-macro-legend">
            <span><span class="p-legend-dot" style="background:#378ADD"></span>Protéines ${c.prot_pct}%</span>
            <span><span class="p-legend-dot" style="background:#1D9E75"></span>Glucides ${c.gluc_pct}%</span>
            <span><span class="p-legend-dot" style="background:#EF9F27"></span>Lipides ${c.lip_pct}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="p-section">
      <div class="p-sec-title">Détail du calcul</div>
      <div class="p-card">
        <div class="p-ex-row"><div class="p-ex-name">Métabolisme de base</div><div class="p-ex-detail">Mifflin-St Jeor : 10 × ${inp.poids || '?'} + 6.25 × ${inp.taille || '?'} − 5 × ${inp.age || '?'} ${sexeAdj} = <strong style="color:var(--text)">${c.bmr} kcal</strong></div><div class="p-ex-tag p-tag-r">MB</div></div>
        <div class="p-ex-row"><div class="p-ex-name">Dépense totale (TDEE)</div><div class="p-ex-detail">MB × ${af} (${afLabel}) = <strong style="color:var(--text)">${c.tdee} kcal</strong></div><div class="p-ex-tag p-tag-c">TDEE</div></div>
        <div class="p-ex-row"><div class="p-ex-name">Objectif — ${obj?.label || ''}</div><div class="p-ex-detail">Entraînement : ${c.tdee}${dlt(op.deltaTrain)} = <strong style="color:var(--text)">${c.kcalTraining} kcal</strong> · Repos : ${c.tdee}${dlt(op.deltaRest)} = <strong style="color:var(--text)">${c.kcalRest} kcal</strong></div><div class="p-ex-tag p-tag-f">Cible</div></div>
        <div class="p-ex-row"><div class="p-ex-name">Protéines</div><div class="p-ex-detail">${op.protPerKg} g/kg × ${inp.poids || '?'} kg = <strong style="color:var(--text)">${c.prot_g} g</strong> (${kcalP} kcal)</div><div class="p-ex-tag" style="background:#378ADD;color:#fff">P</div></div>
        <div class="p-ex-row"><div class="p-ex-name">Lipides</div><div class="p-ex-detail">${op.fatPerKg} g/kg × ${inp.poids || '?'} kg = <strong style="color:var(--text)">${c.lip_g} g</strong> (${kcalL} kcal)</div><div class="p-ex-tag" style="background:#EF9F27;color:#fff">L</div></div>
        <div class="p-ex-row"><div class="p-ex-name">Glucides</div><div class="p-ex-detail">Reste : (${c.kcalTraining} − ${kcalP} − ${kcalL}) ÷ 4 = <strong style="color:var(--text)">${c.gluc_g} g</strong> (${kcalG} kcal)</div><div class="p-ex-tag" style="background:#1D9E75;color:#fff">G</div></div>
      </div>
      <div class="p-note">Méthode : équation de Mifflin-St Jeor (référence actuelle, plus précise que Harris-Benedict) ; protéines fixées en g/kg selon l'objectif, lipides ≥ 0.9 g/kg pour la fonction hormonale, glucides sur les calories restantes.</div>
    </div>

    <div class="p-section">
      <div class="p-sec-title">Répartition des repas (jour d'entraînement)</div>
      <div class="p-card">${meals}</div>
    </div>
    ${adviceBlock}`;

  _showNutriView('nutri-detail-view');
}

// ── Wizard (formulaire unique) ─────────────────────────────────────────────────

const _nutriForm = { poids: '', taille: '', age: '', sexe: 'M', activite: 'modere', objectif: '', name: '' };

function _renderNutriWizardForm() {
  const el = document.getElementById('nutriWizardContent');
  if(!el) return;
  el.innerHTML = `
    <div class="wiz-field">
      <label class="wiz-label">Poids (kg)</label>
      <input type="number" inputmode="decimal" class="wiz-orm-input" id="nutriPoids" value="${esc(String(_nutriForm.poids))}" placeholder="ex : 73">
    </div>
    <div class="wiz-field">
      <label class="wiz-label">Taille (cm)</label>
      <input type="number" inputmode="numeric" class="wiz-orm-input" id="nutriTaille" value="${esc(String(_nutriForm.taille))}" placeholder="ex : 176">
    </div>
    <div class="wiz-field">
      <label class="wiz-label">Âge</label>
      <input type="number" inputmode="numeric" class="wiz-orm-input" id="nutriAge" value="${esc(String(_nutriForm.age))}" placeholder="ex : 30">
    </div>
    <div class="wiz-field">
      <label class="wiz-label">Sexe</label>
      <div class="wiz-chips">
        <button class="wiz-chip ${_nutriForm.sexe === 'M' ? 'selected' : ''}" data-nutri-chip="sexe" data-value="M">Homme</button>
        <button class="wiz-chip ${_nutriForm.sexe === 'F' ? 'selected' : ''}" data-nutri-chip="sexe" data-value="F">Femme</button>
      </div>
    </div>
    <div class="wiz-field">
      <label class="wiz-label">Niveau d'activité</label>
      <div class="wiz-chips" style="flex-direction:column;align-items:stretch">
        ${Object.entries(ACTIVITY_LABELS).map(([k, v]) =>
          `<button class="wiz-chip ${_nutriForm.activite === k ? 'selected' : ''}" data-nutri-chip="activite" data-value="${k}">${v}</button>`).join('')}
      </div>
    </div>
    <div class="wiz-field">
      <label class="wiz-label">Objectif</label>
      <div class="wiz-cards">
        ${NUTRITION_OBJECTIFS.map(n => `
          <div class="wiz-card ${_nutriForm.objectif === n.id ? 'selected' : ''}" data-nutri-select="objectif" data-value="${n.id}">
            <span class="wiz-card-icon">${n.icon}</span>
            <span class="wiz-card-label">${n.label}</span>
            <span class="wiz-card-desc">${n.desc}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="wiz-field">
      <label class="wiz-label">Nom du plan (optionnel)</label>
      <input type="text" class="wiz-text-input" id="nutriName" value="${esc(_nutriForm.name)}" placeholder="ex : Plan prise de masse">
    </div>
    <button class="save-btn" style="width:100%;margin-top:8px" onclick="_nutriGenerate()">Calculer mon plan</button>`;
}

// Sauve les champs texte dans _nutriForm avant un re-render (clic chip/card).
function _readNutriForm() {
  _nutriForm.poids  = document.getElementById('nutriPoids')?.value ?? _nutriForm.poids;
  _nutriForm.taille = document.getElementById('nutriTaille')?.value ?? _nutriForm.taille;
  _nutriForm.age    = document.getElementById('nutriAge')?.value ?? _nutriForm.age;
  _nutriForm.name   = document.getElementById('nutriName')?.value ?? _nutriForm.name;
}

// ── Handlers exposés (onclick inline) ──────────────────────────────────────────

window.showNutriList = function() {
  _showNutriView('nutri-list-view');
  _renderNutriList();
};

window.showNutriWizard = function() {
  _showNutriView('nutri-wizard-view');
  _renderNutriWizardForm();
};

window._viewNutriPlan = function(id) { _renderNutriDetail(id); };

window._deleteNutriPlan = function(id) {
  const del = () => { deleteNutritionPlan(id); _renderNutriList(); };
  // Modale iOS-safe (confirm() est bloqué en PWA standalone)
  if(typeof window._confirmModal === 'function') {
    window._confirmModal('Supprimer ce plan nutrition ?', 'Supprimer', del);
  } else {
    del();
  }
};

function _nutriErr(msg) {
  // Toast plutôt qu'alert() (bloqué en PWA iOS standalone)
  if(typeof window._showSaveToast === 'function') window._showSaveToast('⚠️ ' + msg);
  else alert(msg);
}

window._nutriGenerate = function() {
  _readNutriForm();
  const poids  = parseFloat(_nutriForm.poids);
  const taille = parseFloat(_nutriForm.taille);
  const age    = parseInt(_nutriForm.age, 10);
  if(!(poids >= 30 && poids <= 300)) { _nutriErr('Poids invalide (30–300 kg).'); return; }
  if(!(taille >= 100 && taille <= 250)) { _nutriErr('Taille invalide (100–250 cm).'); return; }
  if(!(age >= 14 && age <= 100)) { _nutriErr('Âge invalide (14–100 ans).'); return; }
  if(!_nutriForm.objectif) { _nutriErr('Choisis un objectif.'); return; }

  const inputs = { poids, taille, age, sexe: _nutriForm.sexe, activite: _nutriForm.activite, objectif: _nutriForm.objectif };
  const calc = computeNutritionPlan(inputs);
  const objLabel = NUTRITION_OBJECTIFS.find(n => n.id === _nutriForm.objectif)?.label || 'Plan';
  const plan = {
    id: _newNutriId(),
    name: ((_nutriForm.name || '').trim() || objLabel).slice(0, 60),
    createdAt: new Date().toISOString(),
    objectif: _nutriForm.objectif,
    inputs, calc,
  };
  saveNutritionPlan(plan);
  if(typeof window._showSaveToast === 'function') window._showSaveToast('✓ Plan nutrition créé');
  _renderNutriDetail(plan.id);
};

// Délégation d'événements pour les chips/cards du wizard (lié une seule fois)
let _nutriBound = false;
export function bindNutritionEvents() {
  if(_nutriBound) return;
  _nutriBound = true;
  const sec = document.getElementById('nutrition-section');
  if(!sec) return;
  sec.addEventListener('click', e => {
    const chip = e.target.closest('[data-nutri-chip]');
    if(chip) {
      _readNutriForm();  // préserver les champs texte avant re-render
      _nutriForm[chip.dataset.nutriChip] = chip.dataset.value;
      _renderNutriWizardForm();
      return;
    }
    const card = e.target.closest('[data-nutri-select]');
    if(card) {
      _readNutriForm();
      _nutriForm[card.dataset.nutriSelect] = card.dataset.value;
      _renderNutriWizardForm();
    }
  });
}
