/**
 * wizard.js — 7-step program construction wizard
 */

import { loadExercisesDB, searchExercises, FALLBACK_EXERCISES } from './exercises-db.js';
import { AGE_TRANCHES, AGE_MODIFIERS, GROSSESSE_MOIS_CONFIG, POSTNATAL_PHASES, CARDIO_MODALITIES, MOBILITY_ZONES } from './data.js';
import { generateProgram }  from './generator.js';
import { saveProgram, setActiveProgram, newProgramId } from './programs.js';
import { getPrograms }      from './programs.js';
import { dbGet }            from './db.js';
import { esc }              from './security.js';

// ── State ─────────────────────────────────────────────────────────────────────

let _step = 1;
const TOTAL_STEPS = 8;

const _config = {
  domaine:          null,
  niveau:           null,
  age:              null,
  bodyWeight:       null,  // kg — pour estimer les 1RM si non renseignés
  seancesParSemaine: 3,
  dureeSeance:      60,
  materiel:         [],
  cardioModalities: [],  // ids modalités cardio (course, vélo, rameur, skierg…)
  mobilityZones:    [],  // ids zones mobilité ciblées (épaules, hanches, chevilles…)
  exercicesForces:  [],
  exercicesExclus:  [],
  duree:            12,
  competition:      null,
  name:             '',
  orm:              {},
  // Grossesse specific
  grossesse_type:   null,
  mois_grossesse:   5,
  postnatal_phase:  null,
  // Nutrition
  nutrition:        null,
};

// ── Domain labels ─────────────────────────────────────────────────────────────

const DOMAINES = [
  { id:'hyrox',   icon:'🏟', label:'Hyrox / Functional',   desc:'Préparation compétition Hyrox, functional fitness' },
  { id:'force',   icon:'🏋', label:'Force & puissance',     desc:'Powerlifting, haltérophilie, force maximale' },
  { id:'gym',     icon:'💪', label:'Gym / Fitness',         desc:'Hypertrophie, remise en forme, esthétique' },
  { id:'cardio',  icon:'🏃', label:'Endurance / Cardio',    desc:'Course, vélo, VO2max, endurance générale' },
  { id:'mobilite',icon:'🧘', label:'Mobilité & récup.',     desc:'Souplesse, mobilité articulaire, prévention' },
  { id:'mixte',    icon:'⚡', label:'Mixte / Santé globale',  desc:'Force + cardio + mobilité + récupération — programme complet équilibré' },
  { id:'grossesse', icon:'🤰', label:'Grossesse / Post-natal',  desc:'Programme prénatal ou post-natal adapté au stade de grossesse — recommandations HAS/CNSF' },
];

const NIVEAUX = [
  { id:'debutant',      label:'Débutant',       desc:'< 1 an d\'entraînement régulier' },
  { id:'intermediaire', label:'Intermédiaire',  desc:'1–3 ans d\'entraînement' },
  { id:'avance',        label:'Avancé',         desc:'> 3 ans, maîtrise des fondamentaux' },
];

const MATERIELS = [
  { id:'barre',      icon:'🏋', label:'Barre + disques' },
  { id:'halteres',   icon:'🥊', label:'Haltères' },
  { id:'kettlebell', icon:'⚫', label:'Kettlebell' },
  { id:'pdc',        icon:'🤸', label:'Poids du corps' },
  { id:'machines',   icon:'⚙', label:'Machines / Câbles' },
  { id:'elastiques', icon:'🟡', label:'Élastiques' },
];

const DUREES_RECOMMANDEES = {
  mixte:    { min:8,  recommande:12, max:20, raison:'12 semaines pour équilibre force/cardio/mobilité optimal' },
  hyrox:    { min:12, recommande:16, max:24, raison:'16 semaines idéales pour pic de forme Hyrox' },
  force:    { min:8,  recommande:12, max:20, raison:'12 semaines pour progression force significative' },
  gym:      { min:8,  recommande:12, max:16, raison:'12 semaines pour hypertrophie mesurable' },
  cardio:   { min:8,  recommande:12, max:24, raison:'12 semaines pour amélioration VO2max' },
  mobilite: { min:4,  recommande:8,  max:12, raison:'8 semaines pour gains de mobilité durables' },
};

// ── Init ──────────────────────────────────────────────────────────────────────

export async function initWizard() {
  _step = 1;
  Object.assign(_config, {
    domaine: null, niveau: null, age: null, seancesParSemaine: 3,
    grossesse_type: null, mois_grossesse: 5, postnatal_phase: null,
    nutrition: null,
    dureeSeance: 60, materiel: [], cardioModalities: [], mobilityZones: [], exercicesForces: [], exercicesExclus: [],
    duree: 12, competition: null, name: '', orm: {}, bodyWeight: null,
  });

  // Pre-fill ORM from existing tracker data
  _prefillOrm();

  _wizardEventsInit = false;
  renderStep();
  _initWizardEvents();

  // Load exercises in background
  loadExercisesDB();
}

function _prefillOrm() {
  // Try to get from existing tracker records
  const MAIN = { press: 'press', squat: 'squat', deadlift: 'deadlift' };
  Object.entries(MAIN).forEach(([key, exId]) => {
    let best = null;
    for(let w = 1; w <= 17; w++) {
      const rec = dbGet(`${exId}_w${w}`);
      if(rec?.sets) {
        const kgs = rec.sets.map(s => s?.kg).filter(v => v > 0);
        if(kgs.length) best = Math.max(best || 0, ...kgs);
      }
    }
    if(best) _config.orm[key] = best;
  });
}

// ── Rendering ─────────────────────────────────────────────────────────────────

export function setMoisGrossesse(mois) {
  _config.mois_grossesse = mois;
  renderStep();
}

export function renderStep() {
  const container = document.getElementById('wizardContent');
  if(!container) return;

  // Grossesse has its own flow: 1 → grossesse_setup → 7
  const isGrossesse = _config.domaine === 'grossesse';
  const renderers = isGrossesse
    ? [null, step1, step_grossesse, null, null, null, null, null, step7]
    : [null, step1, step2, step2b, step3, step4, step5, step6, step7];
  const stepFn = renderers[_step];
  const html = stepFn ? stepFn() : '';

  container.innerHTML = `
    <div class="wiz-progress">
      ${Array.from({length: TOTAL_STEPS}, (_, i) =>
        `<div class="wiz-dot ${i + 1 < _step ? 'done' : i + 1 === _step ? 'active' : ''}"></div>`
      ).join('')}
      <span class="wiz-step-label">Étape ${_step} / ${TOTAL_STEPS}</span>
    </div>
    <div class="wiz-body">${html}</div>
    <div class="wiz-nav">
      ${_step > 1 ? `<button class="wiz-btn-back" onclick="wizBack()">← Retour</button>` : '<div></div>'}
      ${_step < TOTAL_STEPS
        ? `<button class="wiz-btn-next" onclick="wizNext()">Continuer →</button>`
        : `<button class="wiz-btn-generate" onclick="wizGenerate()">🚀 Générer mon programme</button>`
      }
    </div>
  `;

}

// ── Step 1 — Domaine ──────────────────────────────────────────────────────────

function step1() {
  return `
    <div class="wiz-title">Quel est ton objectif principal ?</div>
    <div class="wiz-cards">
      ${DOMAINES.map(d => `
        <div class="wiz-card ${_config.domaine === d.id ? 'selected' : ''}"
             data-select="domaine" data-value="${d.id}">
          <span class="wiz-card-icon">${d.icon}</span>
          <span class="wiz-card-label">${d.label}</span>
          <span class="wiz-card-desc">${d.desc}</span>
        </div>`).join('')}
    </div>`;
}

// ── Step 2 — Niveau ───────────────────────────────────────────────────────────

function step2() {
  return `
    <div class="wiz-title">Quel est ton niveau actuel ?</div>
    <div class="wiz-cards">
      ${NIVEAUX.map(n => `
        <div class="wiz-card ${_config.niveau === n.id ? 'selected' : ''}"
             data-select="niveau" data-value="${n.id}">
          <span class="wiz-card-label">${n.label}</span>
          <span class="wiz-card-desc">${n.desc}</span>
        </div>`).join('')}
    </div>`;
}

// ── Step 2b — Âge ────────────────────────────────────────────────────────────

function step2b() {
  const mod = _config.age ? AGE_MODIFIERS[_config.age] : null;
  return `
    <div class="wiz-title">Quelle est ta tranche d'âge ?</div>
    <div class="wiz-subtitle">Le programme s'adapte aux recommandations spécialisées selon l'âge</div>
    <div class="wiz-cards">
      ${AGE_TRANCHES.map(a => `
        <div class="wiz-card ${_config.age === a.id ? 'selected' : ''}"
             data-select="age" data-value="${a.id}">
          <span class="wiz-card-label">${a.label}</span>
          <span class="wiz-card-desc">${a.desc}</span>
        </div>`).join('')}
    </div>
    ${mod ? `<div class="wiz-age-summary">
      <div class="wiz-age-summary-title">Adaptations pour ${AGE_TRANCHES.find(a=>a.id===_config.age)?.label}</div>
      <div class="wiz-age-row"><span>Séries max / exercice</span><strong>${mod.seriesMax}</strong></div>
      <div class="wiz-age-row"><span>Deload toutes les</span><strong>${mod.deloadFreq} semaines</strong></div>
      <div class="wiz-age-row"><span>RPE cible</span><strong>${mod.rpeTarget}</strong></div>
      <div class="wiz-age-row"><span>Volume mobilité</span><strong>${Math.round(mod.mobilityPct*100)}% des séances</strong></div>
      ${mod.volumeMult < 1 ? `<div class="wiz-age-row"><span>Ajustement volume</span><strong style="color:var(--amber)">−${Math.round((1-mod.volumeMult)*100)}% vs baseline</strong></div>` : ''}
    </div>` : ''}

    <div class="wiz-field" style="margin-top:16px">
      <label class="wiz-label">Ton poids de corps <span style="font-size:11px;color:var(--text3)">(utilisé pour estimer tes charges si tu ne connais pas tes 1RM)</span></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="number" id="bodyWeight" class="wiz-text-input" style="max-width:120px"
               value="${_config.bodyWeight || ''}" placeholder="kg" min="30" max="200" step="0.5">
        <span style="font-size:13px;color:var(--text2)">kg</span>
      </div>
    </div>`;
}

// ── Step Grossesse — configuration prénatal/postnatal ───────────────────────

function step_grossesse() {
  const isMoisSelectVisible = _config.grossesse_type === 'prenatal';
  const isPostnatal = _config.grossesse_type === 'postnatal';

  const moisOptions = [4,5,6,7,8,9].map(m =>
    `<option value="${m}" ${_config.mois_grossesse === m ? 'selected' : ''}>${GROSSESSE_MOIS_CONFIG[m].label}</option>`
  ).join('');

  const moisConf = GROSSESSE_MOIS_CONFIG[_config.mois_grossesse];

  return `
    <div class="wiz-title">Programme grossesse / post-natal</div>

    <div class="wiz-field">
      <label class="wiz-label">Type de programme</label>
      <div class="wiz-cards">
        <div class="wiz-card ${_config.grossesse_type==='prenatal'?'selected':''}"
             data-select="grossesse_type" data-value="prenatal">
          <span class="wiz-card-icon">🤰</span>
          <span class="wiz-card-label">Prénatal</span>
          <span class="wiz-card-desc">Programme adapté pendant la grossesse · 4ème au 9ème mois</span>
        </div>
        <div class="wiz-card ${_config.grossesse_type==='postnatal'?'selected':''}"
             data-select="grossesse_type" data-value="postnatal">
          <span class="wiz-card-icon">👶</span>
          <span class="wiz-card-label">Post-natal</span>
          <span class="wiz-card-desc">Reprise progressive après accouchement · de S1 à 6 mois+</span>
        </div>
      </div>
    </div>

    ${isMoisSelectVisible ? `
    <div class="wiz-field">
      <label class="wiz-label">Mois de grossesse actuel</label>
      <select id="moisGrossesse" class="prog-selector-select"
              onchange="window._setMoisGrossesse(parseInt(this.value))">
        ${moisOptions}
      </select>
    </div>

    <div class="wiz-age-summary">
      <div class="wiz-age-summary-title">Programme — ${moisConf.label}</div>
      <div class="wiz-age-row"><span>Marche</span><strong>${moisConf.duree_marche}</strong></div>
      <div class="wiz-age-row"><span>Renfo / Pilates</span><strong>${moisConf.duree_renfo}</strong></div>
      <div class="wiz-age-row"><span>Yoga & ballon</span><strong>${moisConf.duree_yoga}</strong></div>
      <div class="wiz-age-row"><span>Natation</span><strong>${moisConf.duree_natation}</strong></div>
      <div class="wiz-age-row"><span>RPE cible</span><strong>≤ ${moisConf.rpe_max}</strong></div>
      ${moisConf.squat_supprime ? '<div class="wiz-age-row"><span>Squats</span><strong style="color:var(--red)">⛔ Suspendus ce mois</strong></div>' : ''}
    </div>

    <div class="wiz-note" style="margin-top:10px">⚕️ <strong>Important :</strong> valide le programme renforcement avec ta sage-femme ou médecin avant de commencer. Sources : HAS, CNSF, NaîtreetGrandir.</div>
    ` : ''}

    ${isPostnatal ? `
    <div class="wiz-field">
      <label class="wiz-label">Phase post-natale</label>
      <div class="wiz-cards">
        ${POSTNATAL_PHASES.map(p => `
          <div class="wiz-card ${_config.postnatal_phase===p.id?'selected':''}"
               data-select="postnatal_phase" data-value="${p.id}">
            <span class="wiz-card-label">${p.label}</span>
            <span class="wiz-card-desc">${p.desc}</span>
          </div>`).join('')}
      </div>
      <div class="wiz-note" style="margin-top:8px">⚕️ Attendre la visite post-natale (6 semaines) et l'accord du médecin/sage-femme avant toute reprise sportive.</div>
    </div>
    ` : ''}`;
}

// ── Step 3 — Disponibilité ────────────────────────────────────────────────────

function step3() {
  return `
    <div class="wiz-title">Quelle est ta disponibilité ?</div>

    <div class="wiz-field">
      <label class="wiz-label">Séances par semaine</label>
      <div class="wiz-chips">
        ${[2,3,4,5].map(n => `
          <button class="wiz-chip ${_config.seancesParSemaine === n ? 'selected' : ''}"
                  data-chip="seancesParSemaine" data-value="${n}">${n} séances</button>`).join('')}
      </div>
    </div>

    <div class="wiz-field">
      <label class="wiz-label">Durée par séance</label>
      <div class="wiz-chips">
        ${[30,45,60,90].map(m => `
          <button class="wiz-chip ${_config.dureeSeance === m ? 'selected' : ''}"
                  data-chip="dureeSeance" data-value="${m}">${m} min</button>`).join('')}
      </div>
    </div>`;
}

// ── Step 4 — Matériel ──────────────────────────────────────────────────────

function step4() {
  const noMat = _config.domaine === 'cardio' || _config.domaine === 'mobilite';
  return `
    <div class="wiz-title">Quel matériel as-tu disponible ?</div>
    <div class="wiz-subtitle">${noMat ? 'Optionnel — ce programme ne requiert pas de matériel' : 'Sélectionne tout ce dont tu disposes'}</div>
    <div class="wiz-materiel-grid">
      ${MATERIELS.map(m => `
        <div class="wiz-materiel-item ${_config.materiel.includes(m.id) ? 'selected' : ''}"
             data-toggle="materiel" data-value="${m.id}">
          <span class="wiz-mat-icon">${m.icon}</span>
          <span class="wiz-mat-label">${m.label}</span>
        </div>`).join('')}
    </div>
    <div class="wiz-note">${_config.domaine === 'cardio'
      ? '💡 Aucun matériel requis — tu choisiras tes activités (course, vélo, rameur, ski-erg…) à l\'étape suivante. Tu peux passer directement.'
      : _config.domaine === 'mobilite'
      ? '💡 Aucun matériel requis (un tapis, éventuellement une balle/un rouleau pour l\'auto-massage). Tu choisiras tes zones à l\'étape suivante.'
      : '💡 Le programme s\'adapte automatiquement au matériel sélectionné.'}</div>`;
}

// ── Step 5 — Exercices ────────────────────────────────────────────────────────

function step5() {
  // Cardio : sélection des modalités (course, vélo, rameur, ski-erg…) au lieu de la
  // recherche d'exercices — le programme d'endurance se construit autour des modalités.
  if(_config.domaine === 'cardio') return step5_cardio();
  if(_config.domaine === 'mobilite') return step5_mobilite();

  const forcedHtml = _config.exercicesForces.map((ex, i) =>
    `<div class="wiz-ex-tag">
      ${esc(ex.name)}
      <button class="wiz-ex-remove" data-remove-forced="${i}">✕</button>
    </div>`
  ).join('');

  const excludedHtml = _config.exercicesExclus.map((ex, i) =>
    `<div class="wiz-ex-tag excluded">
      ${esc(ex.name)}
      <button class="wiz-ex-remove" data-remove-exclu="${i}">✕</button>
    </div>`
  ).join('');

  return `
    <div class="wiz-title">Exercices spécifiques</div>
    <div class="wiz-subtitle">Optionnel — le générateur sélectionne automatiquement les exercices</div>

    <div class="wiz-field">
      <label class="wiz-label">Exercices à inclure obligatoirement</label>
      <div class="wiz-ex-tags">${forcedHtml}</div>
      <div class="wiz-search-row">
        <input type="text" id="exSearchForced" class="wiz-search-input"
               placeholder="Rechercher un exercice…" oninput="wizSearchEx('forced')">
      </div>
      <div id="exResultsForced" class="wiz-ex-results"></div>
    </div>

    <div class="wiz-field">
      <label class="wiz-label">Exercices à exclure (blessures, préférences)</label>
      <div class="wiz-ex-tags">${excludedHtml}</div>
      <div class="wiz-search-row">
        <input type="text" id="exSearchExclu" class="wiz-search-input"
               placeholder="Rechercher un exercice à exclure…" oninput="wizSearchEx('exclu')">
      </div>
      <div id="exResultsExclu" class="wiz-ex-results"></div>
    </div>

    ${_config.domaine === 'mixte' ? `
    <div class="wiz-field">
      <label class="wiz-label">Activités d'endurance (jour cardio)</label>
      <div class="wiz-subtitle" style="margin-bottom:8px">Le jour cardio du programme utilise ta 1ère activité pour les séances soutenues (tempo, seuil), avec rotation des autres sur les semaines faciles.</div>
      ${_cardioModalityGrid()}
    </div>` : ''}`;
}

// ── Step 5 (cardio) — Modalités d'endurance ────────────────────────────────────

function step5_cardio() {
  return `
    <div class="wiz-title">Quelles activités d'endurance ?</div>
    <div class="wiz-subtitle">Sélectionne ce que tu pratiques (pas besoin de matériel déclaré). Les séances qualité (seuil, VO₂max) porteront sur ta 1ère activité ; les autres serviront aux sorties faciles et à la récupération.</div>
    ${_cardioModalityGrid()}`;
}

// Grille de sélection des modalités cardio — partagée entre cardio et mixte.
function _cardioModalityGrid() {
  return `
    <div class="wiz-materiel-grid">
      ${CARDIO_MODALITIES.map(m => {
        const sel = _config.cardioModalities.includes(m.id);
        return `
        <div class="wiz-materiel-item ${sel ? 'selected' : ''}"
             data-toggle="cardioModalities" data-value="${m.id}">
          <span class="wiz-mat-icon">${m.icon}</span>
          <span class="wiz-mat-label">${m.name}</span>
          <span style="font-size:10px;color:var(--text3)">impact ${m.impact}</span>
        </div>`;
      }).join('')}
    </div>
    ${_config.cardioModalities.length === 0 ? '<div class="wiz-note">Aucune sélection = course à pied par défaut (+ marche pour la récupération).</div>' : ''}`;
}

// ── Step 5 (mobilité) — Zones à travailler ─────────────────────────────────────

function step5_mobilite() {
  return `
    <div class="wiz-title">Quelles zones veux-tu travailler ?</div>
    <div class="wiz-subtitle">Choisis tes zones prioritaires (ou laisse vide = toutes). Le focus alterne ces zones sur la semaine, avec une progression douce. Tu peux aussi t'appuyer sur ton bilan dans la section 🧘 Mobilité.</div>
    <div class="wiz-materiel-grid">
      ${MOBILITY_ZONES.map(z => {
        const sel = _config.mobilityZones.includes(z.id);
        return `
        <div class="wiz-materiel-item ${sel ? 'selected' : ''}"
             data-toggle="mobilityZones" data-value="${z.id}">
          <span class="wiz-mat-icon">${z.icon}</span>
          <span class="wiz-mat-label">${z.label}</span>
        </div>`;
      }).join('')}
    </div>
    ${_config.mobilityZones.length === 0 ? '<div class="wiz-note">Aucune sélection = toutes les zones (mobilité générale).</div>' : ''}`;
}

// ── Step 6 — Durée & compétition ──────────────────────────────────────────────

function step6() {
  const rec = _config.domaine ? DUREES_RECOMMANDEES[_config.domaine] : null;

  return `
    <div class="wiz-title">Durée du programme</div>

    <div class="wiz-field">
      <label class="wiz-label">Nombre de semaines</label>
      <div class="wiz-chips">
        ${[8,12,16,20].map(n => `
          <button class="wiz-chip ${_config.duree === n ? 'selected' : ''}"
                  data-chip="duree" data-value="${n}">${n} sem.</button>`).join('')}
      </div>
      ${rec ? `<div class="wiz-recommend">
        💡 Recommandé pour ${DOMAINES.find(d=>d.id===_config.domaine)?.label} : <strong>${rec.recommande} semaines</strong><br>
        <span style="font-size:11px;color:var(--text3)">${rec.raison}</span>
      </div>` : ''}
    </div>

    <div class="wiz-field">
      <label class="wiz-label">As-tu une compétition prévue ?</label>
      <div class="wiz-chips">
        <button class="wiz-chip ${!_config.competition ? 'selected' : ''}"
                data-chip="hasCompet" data-value="non">Non — programme libre</button>
        <button class="wiz-chip ${_config.competition ? 'selected' : ''}"
                data-chip="hasCompet" data-value="oui">Oui</button>
      </div>
    </div>

    ${_config.competition !== undefined && _config.competition !== null ? `
    <div class="wiz-compet-fields" id="competFields">
      <div class="wiz-field">
        <label class="wiz-label">Date de la compétition</label>
        <input type="date" id="competDate" class="wiz-date-input"
               value="${_config.competition?.date || ''}"
               min="${new Date().toISOString().slice(0,10)}">
      </div>
      <div class="wiz-field">
        <label class="wiz-label">Type de compétition</label>
        <input type="text" id="competType" class="wiz-text-input"
               value="${_config.competition?.type || ''}"
               placeholder="Ex: Hyrox Paris, 10km, CrossFit Open…">
      </div>
    </div>` : ''}`;
}



// ── Estimation 1RM à partir du poids de corps × coefficient par niveau ──────
// Sources : Rippetoe "Practical Programming", Kilgore "Fit", ratios communautaires
const ORM_RATIOS = {
  //              débutant  intermédiaire  avancé
  squat:     { debutant: 0.75, intermediaire: 1.25, avance: 1.75 },
  deadlift:  { debutant: 1.00, intermediaire: 1.50, avance: 2.00 },
  press:     { debutant: 0.40, intermediaire: 0.60, avance: 0.75 },
  bench:     { debutant: 0.50, intermediaire: 0.85, avance: 1.25 },
  squat_fs:  { debutant: 0.60, intermediaire: 1.00, avance: 1.40 },
  rdl:       { debutant: 0.80, intermediaire: 1.25, avance: 1.70 },
  row_barre: { debutant: 0.50, intermediaire: 0.80, avance: 1.10 },
  ohp:       { debutant: 0.45, intermediaire: 0.65, avance: 0.85 },
  thruster:  { debutant: 0.40, intermediaire: 0.60, avance: 0.80 },
};

function _estimateORM(exId, bodyWeight, niveau) {
  const ratios = ORM_RATIOS[exId];
  if(!ratios || !bodyWeight) return null;
  const ratio = ratios[niveau] || ratios.intermediaire;
  return Math.round(bodyWeight * ratio / 2.5) * 2.5; // arrondi au 2.5 kg
}

// Détermine si le programme nécessite des 1RM
function _needsORM() {
  const forceDomains = ['force', 'hyrox'];
  if(!forceDomains.includes(_config.domaine)) return false;
  return _ormExercises().length > 0;
}

// Retourne la liste des exercices nécessitant un 1RM :
// basé sur les exercices réels du programme (domaine + matériel + exercices forcés)
function _ormExercises() {
  const dom = _config.domaine;
  const seen = new Set();
  const result = [];

  // 1. Exercices forcés par l'utilisateur en step 7 — toujours en priorité
  _config.exercicesForces.forEach(ex => {
    // Chercher dans FALLBACK si c'est un exercice à barre (equipment inclut 1)
    const ref = FALLBACK_EXERCISES.find(f => f.id === ex.id);
    if(ref && ref.equipment?.includes(1) && !seen.has(ex.id)) {
      result.push({ id: ex.id, label: ex.name });
      seen.add(ex.id);
    }
  });

  // 2. Exercices "compound" à barre du domaine sélectionné (les principaux lifts)
  const COMPOUND_BARBELL = ['squat','deadlift','press','bench','squat_fs','ohp','rdl','row_barre','thruster'];
  FALLBACK_EXERCISES
    .filter(ex =>
      COMPOUND_BARBELL.includes(ex.id) &&
      ex.domains?.includes(dom) &&
      ex.equipment?.includes(1) &&
      _config.materiel.includes('barre') &&
      !_config.exercicesExclus.some(e => e.id === ex.id) &&
      !seen.has(ex.id)
    )
    .forEach(ex => {
      result.push({ id: ex.id, label: ex.name });
      seen.add(ex.id);
    });

  return result;
}

// ── Step 7 — Récapitulatif + 1RM ─────────────────────────────────────────────

function step7() {
  const dom  = DOMAINES.find(d => d.id === _config.domaine);
  const niv  = NIVEAUX.find(n => n.id === _config.niveau);
  const mats = _config.materiel.map(m => MATERIELS.find(x => x.id === m)?.label).join(', ');
  const prog = getPrograms();

  return `
    <div class="wiz-title">Récapitulatif de ton programme</div>

    <div class="wiz-recap">
      <div class="wiz-recap-row"><span>Objectif</span><strong>${dom?.icon} ${dom?.label || '—'}</strong></div>
      <div class="wiz-recap-row"><span>Niveau</span><strong>${niv?.label || '—'}</strong></div>
      <div class="wiz-recap-row"><span>Âge</span><strong>${AGE_TRANCHES.find(a=>a.id===_config.age)?.label || '—'}</strong></div>
      <div class="wiz-recap-row"><span>Fréquence</span><strong>${_config.seancesParSemaine} séances / sem. · ${_config.dureeSeance} min</strong></div>
      <div class="wiz-recap-row"><span>Matériel</span><strong>${mats || 'Poids du corps'}</strong></div>
      <div class="wiz-recap-row"><span>Durée</span><strong>${_config.duree} semaines</strong></div>
      ${_config.competition ? `<div class="wiz-recap-row"><span>Compétition</span><strong>${_config.competition.type || 'Oui'} · ${_fmtDate(_config.competition.date)}</strong></div>` : ''}
      ${_config.exercicesForces.length ? `<div class="wiz-recap-row"><span>Exercices forcés</span><strong>${_config.exercicesForces.map(e=>e.name).join(', ')}</strong></div>` : ''}
      ${_config.domaine === 'cardio' || _config.domaine === 'mixte' ? `<div class="wiz-recap-row"><span>Activités cardio</span><strong>${_config.cardioModalities.length ? _config.cardioModalities.map(cid => CARDIO_MODALITIES.find(m=>m.id===cid)?.name).filter(Boolean).join(', ') : 'Course à pied (défaut)'}</strong></div>` : ''}
      ${_config.domaine === 'mobilite' ? `<div class="wiz-recap-row"><span>Zones</span><strong>${_config.mobilityZones.length ? _config.mobilityZones.map(zid => MOBILITY_ZONES.find(z=>z.id===zid)?.label).filter(Boolean).join(', ') : 'Toutes'}</strong></div>` : ''}
      ${_config.domaine === 'grossesse' && _config.grossesse_type === 'prenatal' ? `<div class="wiz-recap-row"><span>Mois de grossesse</span><strong>${GROSSESSE_MOIS_CONFIG[_config.mois_grossesse]?.label}</strong></div>` : ''}
      ${_config.domaine === 'grossesse' && _config.grossesse_type === 'postnatal' ? `<div class="wiz-recap-row"><span>Phase post-natale</span><strong>${POSTNATAL_PHASES.find(p=>p.id===_config.postnatal_phase)?.label||'—'}</strong></div>` : ''}
    </div>

    <div class="wiz-field">
      <label class="wiz-label">Nom du programme (optionnel)</label>
      <input type="text" id="progName" class="wiz-text-input"
             value="${_config.name || `${dom?.label || ''} ${_config.duree} sem.`}"
             placeholder="Mon programme Hyrox 2027">
    </div>

    ${_needsORM() ? `
    <div class="wiz-field">
      <label class="wiz-label">Tes 1RM actuels <span style="font-size:11px;color:var(--text3)">(pour calculer les charges — pré-remplis depuis le tracker)</span></label>
      <div class="wiz-orm-grid">
        ${_ormExercises().map(ex => {
          const manual = _config.orm[ex.id];
          const estimated = _config.bodyWeight ? _estimateORM(ex.id, _config.bodyWeight, _config.niveau) : null;
          const val = manual || estimated || '';
          const isEstimated = !manual && estimated;
          return `
          <div class="wiz-orm-row">
            <label>${ex.label}${isEstimated ? ' <span style="font-size:10px;color:var(--text3)">(estimé)</span>' : ''}</label>
            <input type="number" class="wiz-orm-input" id="orm_${ex.id}"
                   value="${val}" placeholder="kg" min="0" step="2.5"
                   style="${isEstimated ? 'color:var(--text2);font-style:italic' : ''}">
          </div>`;
        }).join('')}
      </div>
      <div class="wiz-note">💡 Les valeurs en <em>italique</em> sont estimées à partir de ton poids de corps (${_config.bodyWeight ? _config.bodyWeight + ' kg' : '?'}) et ton niveau. Modifie-les si tu connais tes vrais 1RM.</div>
    </div>` : ''}`;
}

// ── Navigation ────────────────────────────────────────────────────────────────

export function wizNext() {
  if(!_validateStep()) return;
  _collectStep();

  // Grossesse special flow: step 1 → step 2 (grossesse setup) → step 7 (recap)
  if(_config.domaine === 'grossesse') {
    if(_step === 1) { _step = 2; renderStep(); return; }
    if(_step === 2) { _step = 8; renderStep(); return; } // skip to recap (step7 @ idx 8)
  }

  if(_step < TOTAL_STEPS) { _step++; renderStep(); }
}

export function wizBack() {
  if(_config.domaine === 'grossesse' && _step === 8) { _step = 2; renderStep(); return; }
  if(_step > 1) { _step--; renderStep(); }
}

export function wizGenerate() {
  if(!_validateStep()) return;
  _collectStep();

  const id      = newProgramId();
  const program = generateProgram(_config, id);
  saveProgram(program);

  // Activation via le flux complet : actif + affiché dans le tracker + prompt date de
  // démarrage. Repli si le handler global n'est pas dispo (setActiveProgram seul).
  if(typeof window._activateNewProgram === 'function') {
    window._activateNewProgram(id);
  } else {
    setActiveProgram(id);
    window.showSection('programmes');
    window.renderPrograms?.();
  }
}

export function wizSearchEx(type) {
  const inputId   = type === 'forced' ? 'exSearchForced' : 'exSearchExclu';
  const resultsId = type === 'forced' ? 'exResultsForced' : 'exResultsExclu';
  const query     = document.getElementById(inputId)?.value || '';
  const results   = searchExercises(query).slice(0, 8);
  const container = document.getElementById(resultsId);
  if(!container) return;

  container.innerHTML = results.map(ex =>
    `<div class="wiz-ex-result" data-add-${type}="${ex.id}" data-name="${esc(ex.name)}">
      ${esc(ex.name)}
    </div>`
  ).join('') || '<div class="wiz-ex-empty">Aucun résultat</div>';
}

// ── Validation ────────────────────────────────────────────────────────────────

function _validateStep() {
  if(_step === 1 && !_config.domaine) {
    _showError('Sélectionne un objectif pour continuer.');
    return false;
  }
  if(_step === 2 && !_config.niveau && _config.domaine !== 'grossesse') {
    _showError('Sélectionne ton niveau pour continuer.');
    return false;
  }
  if(_step === 3 && !_config.age) {
    _showError("Sélectionne ta tranche d'âge pour continuer.");
    return false;
  }
  if(_step === 2 && _config.domaine === 'grossesse') {
    if(!_config.grossesse_type) { _showError('Sélectionne prénatal ou post-natal.'); return false; }
    if(_config.grossesse_type === 'postnatal' && !_config.postnatal_phase) { _showError('Sélectionne ta phase post-natale.'); return false; }
    return true;
  }
  // Matériel (step4 @ idx 5) requis — sauf cardio et mobilité (sans matériel).
  if(_step === 5 && _config.materiel.length === 0 && _config.domaine !== 'cardio' && _config.domaine !== 'mobilite') {
    _showError('Sélectionne au moins un type de matériel.');
    return false;
  }
  return true;
}

function _showError(msg) {
  const existing = document.querySelector('.wiz-error');
  if(existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'wiz-error';
  el.textContent = msg;
  document.querySelector('.wiz-nav')?.before(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Collect step data ─────────────────────────────────────────────────────────

function _collectStep() {
  // Poids de corps (step 2b / âge)
  const bwEl = document.getElementById('bodyWeight');
  if(bwEl) {
    const bw = parseFloat(bwEl.value);
    if(isFinite(bw) && bw >= 30 && bw <= 200) _config.bodyWeight = bw;
  }

  if(_step === 7) {  // step6() (compétition) est rendu à l'index 7 du renderer
    const dateEl = document.getElementById('competDate');
    const typeEl = document.getElementById('competType');
    if(_config.competition && dateEl) {
      _config.competition = {
        date: dateEl.value,
        type: typeEl?.value || '',
      };
    }
  }
  if(_step === 6 || _step === 7 || _step === 8) {
    const nameEl = document.getElementById('progName');
    if(nameEl) _config.name = nameEl.value.trim();
    // Lire les 1RM uniquement si le formulaire les affiche
    if(_needsORM()) {
      _ormExercises().forEach(({id}) => {
        const el  = document.getElementById(`orm_${id}`);
        const val = parseFloat(el?.value);
        if(isFinite(val) && val > 0) _config.orm[id] = val;
      });
    }
  }
}

// ── Event binding ─────────────────────────────────────────────────────────────

function _bindStepEvents() {
  // No-op: events are bound once in _initWizardEvents()
}

let _wizardEventsInit = false;
function _initWizardEvents() {
  if(_wizardEventsInit) return;
  _wizardEventsInit = true;
  // Attach to stable parent — wizardContent innerHTML is replaced on each step
  // so we must use a parent that persists across renders
  const stable = document.getElementById('wizard-view') || document.getElementById('programmes') || document.body;

  stable.addEventListener('click', e => {
    // Only handle clicks inside wizardContent
    if(!e.target.closest('#wizardContent')) return;
    // Card selection (single)
    const card = e.target.closest('[data-select]');
    if(card) {
      const { select, value } = card.dataset;
      _config[select] = value;
      renderStep(); return;
    }
    // Chip
    const chip = e.target.closest('[data-chip]');
    if(chip) {
      const { chip: key, value } = chip.dataset;
      if(key === 'hasCompet') {
        _config.competition = value === 'oui' ? { date: '', type: '' } : null;
      } else {
        const parsed = isNaN(Number(value)) ? value : Number(value);
        _config[key] = parsed;
      }
      renderStep(); return;
    }
    // Toggle multi-sélection (materiel, cardioModalities) — avant le clic générique
    const item = e.target.closest('[data-toggle]');
    if(item) {
      const key   = item.dataset.toggle;
      const value = item.dataset.value;
      if(!Array.isArray(_config[key])) _config[key] = [];
      const idx = _config[key].indexOf(value);
      if(idx >= 0) _config[key].splice(idx, 1);
      else _config[key].push(value);
      renderStep(); return;
    }
    // Remove forced
    const btnF = e.target.closest('[data-remove-forced]');
    if(btnF) { _config.exercicesForces.splice(parseInt(btnF.dataset.removeForced), 1); renderStep(); return; }
    // Remove exclu
    const btnE = e.target.closest('[data-remove-exclu]');
    if(btnE) { _config.exercicesExclus.splice(parseInt(btnE.dataset.removeExclu), 1); renderStep(); return; }
    // Add forced from search
    const resF = e.target.closest('[data-add-forced]');
    if(resF) {
      _config.exercicesForces.push({ id: resF.dataset.addForced, name: resF.dataset.name });
      const inp = document.getElementById('exSearchForced');
      if(inp) inp.value = '';
      const res = document.getElementById('exResultsForced');
      if(res) res.innerHTML = '';
      renderStep(); return;
    }
    // Add exclu from search
    const resE = e.target.closest('[data-add-exclu]');
    if(resE) {
      _config.exercicesExclus.push({ id: resE.dataset.addExclu, name: resE.dataset.name });
      const inp = document.getElementById('exSearchExclu');
      if(inp) inp.value = '';
      const res = document.getElementById('exResultsExclu');
      if(res) res.innerHTML = '';
      renderStep(); return;
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _fmtDate(d) {
  if(!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
}
