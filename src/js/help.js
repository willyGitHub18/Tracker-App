/**
 * help.js — Aide contextuelle (Phase B)
 *
 * Un petit bouton « ? » (helpBtn) posé à côté d'une fonctionnalité ouvre au tap
 * un popover ancré au déclencheur (fermé par tap extérieur / Échap). Le contenu
 * vient du manuel app parqué (Documentation/phase-b-app-manual-parked.md).
 *
 * Deux types d'entrées :
 *   - concept aussi présent dans le Guide → texte court + lien profond `guide`
 *     (ouvre l'onglet Guide sur l'article) — pas de duplication.
 *   - mécanique propre à l'app (statuts, reco Lafay) → texte complet, sans lien.
 *
 * Contenu = données (HELP). Ajouter une bulle = pousser une entrée + `helpBtn(key)`
 * au point de rendu. Tout passe par esc() (mini-markdown **gras**, \n → <br>).
 */

import { esc } from './security.js';

const HELP = {
  'rpe': {
    title: 'RPE — effort perçu',
    body: "Note de 6 à 10 : la difficulté ressentie d'une série (10 = échec, aucune rep de plus possible ; 8 ≈ 2 reps en réserve). Elle sert à ajuster la charge à ta forme du jour plutôt qu'à un % fixe.",
    guide: 'rpe',
  },
  'session-status': {
    title: 'Statut de séance',
    body: "Ton choix **fait foi** : il prime sur ce que prévoit le programme pour la semaine.\n**Normale** — analyse standard vs plan + reco S+1. Sur une semaine de deload prévue par le programme, la choisir explicitement dit « je l'ai entraînée normalement » : la semaine redevient une semaine classique (analysée, comptée dans le plateau, progression Lafay), avec le barème et la charge de la dernière semaine normale comme référence. Comme le programme n'y prescrit aucun barème, la séance y est jugée à **effort équivalent** (1RM estimé) et non sur les reps brutes : 50 kg × 3 reps compte comme 47,5 kg × 5 reps, donc faire plus lourd sur moins de reps n'est plus pénalisé.\n**⚡ Post-compét** — après une compétition ou un effort intense : le RPE est majoré (fatigue non perçue), la séance est comparée à ton historique et ne génère aucune reco de charge.\n**🔵 Deload** — semaine allégée (~60 %) : aucune analyse de performance, aucune progression tirée de cette séance, et la semaine ne compte pas dans le plateau. La reco S+1 repart de la dernière semaine normale.\n**Sautée** — séance non réalisée : elle ne compte pas dans le compteur de plateau (et 2 semaines sautées d'affilée le remettent à zéro).\nQuand le programme prévoit un deload et que tu n'as rien choisi, le sélecteur affiche « 🔵 Deload (programme) ».",
  },
  'reco-s1': {
    title: 'Recommandation S+1',
    body: "Charge suggérée pour la semaine suivante, façon Lafay :\n**+1 palier** — séries complètes, reps ≥ 95 % du plan et RPE ≤ 8.5. Une semaine réussie progresse toujours, même après plusieurs semaines de plateau.\n**Même charge** — RPE 8.5–9.5, ou reps 80–95 % du plan.\n**Recul** — RPE > 9.5 (−1), reps < 80 % (−2), ou plateau de 3 semaines consécutives (−1).\n**Après une coupure** — congé ou arrêt de 2 semaines et plus : le compteur de plateau repart de zéro, puisque la charge de reprise est réduite. Une seule semaine manquée ne casse rien.\n**Semaines de deload** — elles ne comptent pas dans le plateau, mais ne le remettent pas à zéro : un vrai plateau reste détectable malgré les deload régulières.",
  },
  'muscle-load': {
    title: 'Charge musculaire (modèle SRA)',
    body: "Chaque muscle affiche sa **charge résiduelle** actuelle : l'effort d'une séance décroît avec le temps selon un modèle **SRA** (demi-vie de 36–72 h propre à chaque muscle).\n**Repos** (gris) — récupéré.\n**Récup** (vert) — en cours, fenêtre favorable.\n**Modéré** (ambre) — à surveiller.\n**Fatigue** (rouge) — charge élevée, priorité à la récupération.",
    guide: 'recuperation',
  },
  'export': {
    title: 'Données & sauvegarde',
    body: "Tes données restent **en local** sur l'appareil (rien n'est envoyé) et l'app fonctionne hors ligne.\n**Export JSON** — sauvegarde complète réimportable ; à faire régulièrement.\n**Export CSV** — historique tabulaire (Excel, Google Sheets).\n**Importer** — fusionne les données (les clés existantes sont écrasées) ; le fichier est validé avant import (schéma, plages, taille ≤ 512 Ko).",
  },
};

/** esc() + mini-markdown : **gras**, puis retours ligne → <br>. */
function _fmt(str) {
  return esc(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/** Markup du déclencheur « ? ». key = slug constant (sûr en onclick inline). */
export function helpBtn(key) {
  return `<button class="help-btn" type="button" aria-label="Aide" onclick="event.stopPropagation();showHelp(this,'${key}')">?</button>`;
}

let _helpEl = null;

function _onEsc(e) { if (e.key === 'Escape') closeHelp(); }

export function closeHelp() {
  if (_helpEl) { _helpEl.remove(); _helpEl = null; }
  document.removeEventListener('keydown', _onEsc);
}

/** Positionne le popover sous le déclencheur, replié au-dessus/clampé si besoin. */
function _position(pop, trigger) {
  const r = trigger.getBoundingClientRect();
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = Math.min(Math.max(8, r.left), vw - pw - 8);
  let top = r.bottom + 6;
  if (top + ph > vh - 8) top = Math.max(8, r.top - ph - 6); // pas de place dessous → au-dessus
  pop.style.left = Math.max(8, left) + 'px';
  pop.style.top = top + 'px';
}

export function showHelp(trigger, key) {
  closeHelp();
  const h = HELP[key];
  if (!h) return;
  const back = document.createElement('div');
  back.className = 'help-backdrop';
  back.addEventListener('click', closeHelp);
  const pop = document.createElement('div');
  pop.className = 'help-pop';
  pop.addEventListener('click', e => e.stopPropagation());
  const guideBtn = h.guide
    ? `<button class="help-guide-link" type="button" onclick="openGuideArticle('${h.guide}')">Voir dans le Guide →</button>`
    : '';
  pop.innerHTML = `<div class="help-pop-title">${esc(h.title)}</div>`
    + `<div class="help-pop-body">${_fmt(h.body)}</div>${guideBtn}`;
  back.appendChild(pop);
  document.body.appendChild(back);
  _helpEl = back;
  _position(pop, trigger);
  document.addEventListener('keydown', _onEsc);
}

/** Lien profond : ouvre l'onglet Guide sur l'article puis ferme le popover. */
export function openGuideArticle(id) {
  closeHelp();
  if (window.showSection) window.showSection('doc');
  if (window.showDoc) window.showDoc(id);
  document.getElementById('doc')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
