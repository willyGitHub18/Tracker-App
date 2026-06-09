# ATHX Tracker

Outil de suivi d'entraînement pour la préparation à la compétition **ATHX** (format Hyrox / functional fitness). Conçu pour un usage personnel, déployable en PWA sur iPhone sans App Store.

---

## Fonctionnalités

### 📊 Tracker de charges
- Saisie **série par série** : charge, reps, RPE pour chaque exercice
- Analyse multi-axe en temps réel : RPE, reps réalisées vs plan, complétude des séries, charge vs plan
- **Recommandation S+1** inspirée de la méthode Lafay :
  - Progression (+1 palier) si toutes séries validées + RPE ≤ 8.5
  - Consolidation (même charge) si RPE élevé ou reps incomplètes
  - Recul automatique après 3 semaines de plateau
  - Recul d'urgence si RPE > 9.5 ou reps < 80% du plan
- Compteur de plateau visible (ex. `Plateau : 2/3 sem.`)
- Statut par exercice : **Normale / ⚡ Post-Hyrox / Sautée**
  - Post-Hyrox : RPE corrigé +1.5, aucune recommandation de charge, analyse vs historique perso
  - Sautée : séance ignorée dans le calcul de plateau, plan S+1 reconduit

### 🧬 Suivi musculaire
- Schéma anatomique SVG interactif (face avant + face arrière)
- Calcul de charge résiduelle par muscle avec **modèle SRA** (Stimulus → Récupération → Adaptation)
- Formule : `charge_résiduelle = Σ (reps × RPE/10 × facteur) × 2^(−Δt / demi-vie)`
- Dégradé de couleur continu : gris (repos) → vert → ambre → orange → rouge
- Demi-vies de récupération propres à chaque groupe musculaire
- Détail par muscle : charge résiduelle %, estimation heure de récupération complète, exercices contributeurs
- Mise à jour automatique après chaque sauvegarde de séance

### 📋 Programme 17 semaines
- Bloc 1 (S1–S5) : Base technique
- Deload S6
- Bloc 2 (S7–S11) : Intensité
- Deload S12
- Bloc 3 (S13–S16) : Simulation compétition
- Nutrition, échauffements, Mercredi Force, Jeudi Force/MetCon

### 📖 Documentation intégrée
Guide complet : tracker, logique de progression, statuts de séance, suivi musculaire, RPE, données.

---

## Exercices suivis

| Exercice | Jour | 1RM référence | Palier |
|---|---|---|---|
| Strict Press | Mercredi | 50 kg | +1.25 kg |
| Back Squat | Mercredi | 110 kg | +2.5 kg |
| Deadlift | Jeudi | 140 kg | +2.5 kg |

---

## Architecture

```
athx/
├── index.html              # Shell PWA — charge les vues dynamiquement
├── manifest.json           # Métadonnées PWA (nom, icônes, standalone)
├── sw.js                   # Service Worker — cache offline
├── css/
│   ├── base.css            # Variables CSS, reset, header, navigation
│   ├── tracker.css         # Tracker, saisie, tableau des séries
│   ├── musculaire.css      # Schéma SVG, panneau de détail musculaire
│   └── programme.css       # Programme 17 semaines + Documentation
├── js/
│   ├── db.js               # IndexedDB avec cache in-memory + fallback localStorage
│   ├── security.js         # esc(), sanitizeRecord(), validateImport() — fonctions pures
│   ├── data.js             # Constantes : EXERCISES, MUSCLE_MAP, RECOVERY_HALFLIFE
│   ├── store.js            # Accesseurs typés : getRecord, setRecord, getExStatus…
│   ├── progression.js      # Logique Lafay : weekOutcome, getNextPlan, calcAdj
│   ├── tracker.js          # UI tracker : renderSaisie, saveSaisie, historique
│   ├── musculaire.js       # Calcul SRA, paintAllViews, renderMusculaire
│   ├── io.js               # Export JSON/CSV, import avec validation
│   └── app.js              # Routing, initialisation, Service Worker registration
├── views/                  # Fragments HTML injectés au chargement
│   ├── tracker.html
│   ├── musculaire.html
│   ├── programme.html
│   └── doc.html
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Données

- Stockées **localement** dans IndexedDB (fallback localStorage)
- Aucune donnée envoyée sur un serveur
- Export JSON : sauvegarde complète (`athx_YYYY-MM-DD.json`)
- Import JSON : fusion avec les données existantes, validation stricte du schéma
- Export CSV : historique complet compatible Excel / Google Sheets

---

## Déploiement

### Prérequis
- Un compte GitHub (gratuit)
- Sur Windows : [GitHub Desktop](https://desktop.github.com/) ou l'interface web GitHub

### Déploiement via GitHub Pages (interface web)

1. Sur [github.com](https://github.com) → **New repository**
2. Nom : `athx-tracker` · Visibilité : **Private**
3. Cocher *"Add a README file"* → **Create repository**
4. **Add file → Upload files** → glisser-déposer le contenu du dossier `athx/`
5. **Settings → Pages** → Source : `main` / `root` → **Save**
6. URL disponible après ~2 min : `https://USERNAME.github.io/athx-tracker/`

### Déploiement via GitHub Desktop (Windows)

1. Télécharger et installer [GitHub Desktop](https://desktop.github.com/)
2. **File → New repository** → Choisir le dossier `athx/` comme chemin local
3. Publier le dépôt sur GitHub (bouton **Publish repository**) → cocher **Private**
4. Activer GitHub Pages dans les Settings du dépôt sur github.com

### Installation iPhone

1. Ouvrir Safari sur iPhone → naviguer vers l'URL GitHub Pages
2. Icône **Partager** → **"Ajouter à l'écran d'accueil"**
3. L'app s'ouvre en mode standalone, fonctionne hors ligne

> **Important** : garde le dépôt en **Private**. Le code source contient des données personnelles (poids, taille, date de compétition).

---


## Gestion des mises à jour

### Workflow de mise à jour

```
Claude génère les fichiers modifiés
        ↓
Tu remplaces les fichiers dans le dossier local
        ↓
⚠ Tu incrémentes APP_VERSION dans sw.js
        ↓
GitHub Desktop : Commit to main → Push origin
        ↓
GitHub Pages se met à jour en ~1 minute
        ↓
L'iPhone affiche une bannière "Nouvelle version disponible"
        ↓
L'utilisateur clique "Mettre à jour" → rechargement
```

### Incrémenter la version (obligatoire à chaque déploiement)

Dans `sw.js`, ligne 9 :

```js
const APP_VERSION = '1.0.0';  // → '1.0.1', '1.1.0', etc.
```

Sans ce changement, le Service Worker continue de servir l'ancienne version en cache sur l'iPhone.

### Convention de versioning suggérée

| Changement | Version |
|---|---|
| Correction de bug | `1.0.x` |
| Nouvelle fonctionnalité | `1.x.0` |
| Refonte majeure | `x.0.0` |

### Fichiers typiquement modifiés selon le type de mise à jour

| Type | Fichiers |
|---|---|
| Bug tracker | `js/tracker.js` |
| Bug progression | `js/progression.js` |
| Bug import/export | `js/io.js` |
| Nouvelle fonctionnalité | `js/app.js` + module concerné + vue HTML |
| Mise à jour programme | `views/programme.html` |
| Ajout exercice | `js/data.js` + `js/tracker.js` |

### Données utilisateur

Les données (IndexedDB) **ne sont jamais effacées** par une mise à jour du code. Le Service Worker ne touche qu'au cache des fichiers statiques, pas à IndexedDB.

Seul `dbClear()` (bouton "Effacer toutes les données" dans l'historique) supprime les données.

## Sécurité

| Mesure | Description |
|---|---|
| Échappement HTML | Toutes les valeurs dynamiques passent par `esc()` avant `innerHTML` |
| Validation import | Schéma, types et plages de valeurs vérifiés avant tout stockage |
| Sanitisation | `sanitizeRecord()` nettoie chaque enregistrement (kg < 1000, reps < 100, RPE ≤ 10) |
| Event delegation SVG | Clics sur le schéma anatomique validés par regex avant traitement |
| Content Security Policy | Meta CSP déclarant les sources autorisées |
| Données locales | Aucune communication réseau, aucun tracking |

---

## Développement local (Windows)

Pour tester en local (les modules ES nécessitent un serveur HTTP) :

```bash
# Option 1 — Node.js (si installé)
npx serve .

# Option 2 — Python (si installé)
python -m http.server 8080

# Option 3 — VS Code
# Installer l'extension "Live Server" → clic droit sur index.html → "Open with Live Server"
```

Puis ouvrir `http://localhost:8080` dans Chrome ou Edge.

---

## Stack technique

- **Vanilla JS** — ES Modules natifs, aucune dépendance
- **IndexedDB** — stockage persistant, plus stable que localStorage sur iOS Safari
- **SVG** — schéma anatomique interactif (polygones issus de react-body-highlighter, MIT)
- **Service Worker** — cache-first pour les assets statiques, offline complet
- **PWA** — manifest, standalone display, apple-touch-icon
