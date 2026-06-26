# ATHX Tracker

Application de suivi d'entraînement personnalisée — PWA déployable sur iPhone sans App Store. Conçue pour la préparation à la compétition ATHX (format Hyrox) et extensible à tout type de programme sportif.

---

## Fonctionnalités

### 📊 Tracker de charges
- Saisie **série par série** : charge, reps, RPE pour chaque exercice
- Analyse multi-axe en temps réel : RPE, reps réalisées vs plan, complétude des séries, charge vs plan
- **Recommandation S+1** inspirée de la méthode Lafay :
  - Progression (+1 palier) si toutes séries validées + RPE ≤ 8.5
  - Consolidation si RPE élevé ou reps incomplètes
  - Recul automatique après 3 semaines de plateau
  - Recul d'urgence si RPE > 9.5 ou reps < 80% du plan
- **Statuts de séance** par exercice : Normale / ⚡ Post-compét / 🔵 Deload / Sautée
  - **Deload** : grille de saisie visible (charge ~60%), aucune analyse de progression, ne compte pas dans le plateau
  - **Post-compét** : RPE corrigé +1.5, analyse vs historique perso, aucune recommandation de charge
  - **Sautée** : séance ignorée dans le calcul de plateau, plan S+1 reconduit
- **Sélecteur de programme** en haut du tracker si plusieurs programmes actifs simultanément

### 🏖 Gestion vacances / congés
- Ajout de plusieurs périodes avec dates et **niveau d'activité** (sédentaire, activité légère, sport régulier, programme vacances, musculation légère)
- Fusion automatique des périodes proches (< 7 jours d'écart)
- **Coefficient de reprise** calculé automatiquement selon durée et activité :
  - ≤ 2 sem : 95% des charges · RPE ≤ 7.5
  - 3–4 sem : 85% · RPE ≤ 7
  - > 4 sem : 75% · RPE ≤ 6.5
  - Bonus activité pondéré par durée : jusqu'à +8%
- Panneau de reprise avec charges calculées par exercice
- Bannière "Vacances en cours" ou "Reprise — X% des charges"
- Exporté / importé dans le JSON de sauvegarde

### 🧬 Suivi musculaire
- Schéma anatomique SVG interactif (face avant + face arrière)
- Calcul de charge résiduelle avec **modèle SRA** (Stimulus → Récupération → Adaptation)
- Formule : `charge_résiduelle = Σ (reps × RPE/10 × facteur) × 2^(−Δt / demi-vie)`
- **Cumul automatique** de tous les programmes actifs simultanément
- Dégradé de couleur continu : gris (repos) → vert → ambre → orange → rouge
- Détail par muscle : charge résiduelle %, estimation de récupération, exercices contributeurs

### 🎯 Wizard de construction de programme
Création de programme personnalisé en 8 étapes :
1. **Objectif** — Hyrox, Force, Gym, Cardio, Mobilité, Mixte, Grossesse
2. **Niveau** — Débutant / Intermédiaire / Avancé
3. **Âge** — 5 tranches (18–29, 30–39, 40–49, 50–59, 60+) avec adaptations automatiques selon recommandations ACSM/Israetel
4. **Disponibilité** — 2 à 5 séances/semaine + durée par séance
5. **Matériel** — sélection multiple (barre, haltères, kettlebell, PdC, machines, élastiques)
6. **Exercices** — inclure/exclure depuis la base wger.de (cache IndexedDB offline)
7. **Durée + compétition** — avec recommandation expert par domaine et calcul du taper
8. **Récapitulatif + 1RM** — pré-remplis depuis le tracker, modifiables

#### Type Mixte / Santé globale
Programme équilibré sur la semaine : Force + Cardio + Hypertrophie + Mobilité/Récupération. Structure adaptée au nombre de séances par semaine.

#### Adaptations selon l'âge
| Paramètre | 18–29 | 40–49 | 60+ |
|---|---|---|---|
| Séries max | 5 | 4 | 3 |
| Deload toutes les | 4 sem | 3 sem | 2 sem |
| RPE max | 9 | 8 | 7 |
| Volume mobilité | 10% | 20% | 35% |

### 🤰 Programme Grossesse / Post-natal
Basé sur les recommandations **CNSF, HAS, SOGC/CSEP**.

**Prénatal (mois 4 à 9)** — programme adapté automatiquement par mois :
- 📅 Planning semaine type : Marche / Renforcement ou Pilates / Yoga / Natation / Repos
- 🤸 6 séances détaillées avec exercices complets, descriptions, tips, vidéos YouTube
- 🔵 Exercices suspendus automatiquement (squat à partir du 8ème mois, extension 4 pattes, psoas)
- 💡 Onglet Conseils : test de la parole, FC max 145 bpm, SPD, Kegel pluriquotidien, signes d'arrêt, sources
- ✨ Option Pilates prénatal (vidéos Géraldine Navionis adaptées par mois)

**Post-natal** — 4 phases progressives : S1–S6 récupération, S6–S12 reprise douce, 3–6 mois remise en forme, 6 mois+ programme standard.

### 🗂 Gestion multi-programmes
- **Plusieurs programmes actifs simultanément** — sélecteur en haut du tracker
- Programme **principal** (⭐) affiché par défaut
- Statuts : Actif / ✓ Terminé / ✕ Abandonné
- Programmes archivés exportables individuellement en JSON
- Migration automatique du programme ATHX legacy au premier lancement

### 📊 Progression & Benchmark
- Courbe de progression (3 exercices principaux) avec ligne plan vs réalisé
- Benchmark population — percentiles P25/P50/P75/P90 (source : Strength Level)
- Cartes percentile par exercice : < P25 / P25–50 / P50–75 / P75–90 / Top 10%
- Filtre Homme / Femme

### 📋 Programme ATHX 17 semaines
- Bloc 1 (S1–S5) : Base technique
- Deload S6 et S12
- Bloc 2 (S7–S11) : Intensité
- Bloc 3 (S13–S16) : Simulation compétition
- Taper S17
- Nutrition, échauffements, jours détaillés Mercredi/Jeudi/Vendredi, Programme Vacances

---

## Architecture

```
Tracker-App/
├── index.html              # App complète bundlée (CSS + JS + vues inline)
├── manifest.json           # PWA (nom, icônes, standalone)
├── sw.js                   # Service Worker — cache offline
├── robots.txt              # Désindexation moteurs de recherche
├── js/
│   ├── db.js               # IndexedDB + cache in-memory + fallback localStorage
│   ├── security.js         # esc(), sanitizeRecord(), validateImport()
│   ├── data.js             # EXERCISES, MUSCLE_MAP, AGE_MODIFIERS, GROSSESSE_*
│   ├── store.js            # Accesseurs + gestion vacances multi-périodes
│   ├── progression.js      # Logique Lafay : weekOutcome, getNextPlan, calcAdj
│   ├── tracker.js          # Tracker générique (ATHX + programmes wizard)
│   ├── musculaire.js       # SRA, paintAllViews, cumul multi-programmes
│   ├── io.js               # Export JSON/CSV, import avec validation
│   ├── exercises-db.js     # Base wger.de + cache IndexedDB + fallback 35 exercices
│   ├── programs.js         # Storage multi-programmes, statuts, clôture, archive
│   ├── generator.js        # Algo génération programme (age-aware, mixte, grossesse)
│   ├── grossesse.js        # Programme prénatal/post-natal complet (CNSF/HAS)
│   ├── wizard.js           # Wizard 8 étapes
│   └── app.js              # Routing, init, migration ATHX, cycle de vie programmes
├── css/
│   ├── base.css
│   ├── tracker.css
│   ├── musculaire.css
│   ├── programme.css
│   └── wizard.css
├── views/
│   ├── tracker.html
│   ├── musculaire.html
│   ├── programme.html
│   ├── programmes.html     # Wizard + liste programmes
│   └── doc.html
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Données

- Stockées **localement** dans IndexedDB (fallback localStorage)
- Aucune donnée envoyée sur un serveur
- **Export JSON** : sauvegarde complète incluant programmes, tracking, vacances
- **Export JSON individuel** par programme archivé
- Import JSON : fusion avec données existantes, validation stricte
- Export CSV : historique complet compatible Excel / Google Sheets

---

## Déploiement

### GitHub Desktop (Windows — recommandé)

1. Installer [GitHub Desktop](https://desktop.github.com/)
2. Créer un dépôt `Tracker-App` sur github.com (Public pour GitHub Pages gratuit)
3. Cloner → copier les fichiers → **Commit to main** → **Push origin**
4. **Settings → Pages** → Branch : `main` / root → **Save**
5. URL disponible en ~2 min : `https://USERNAME.github.io/Tracker-App/`

### Installation iPhone

Safari → URL GitHub Pages → **Partager → Ajouter à l'écran d'accueil**

---

## Gestion des mises à jour

**Seul `index.html` est obligatoire** pour l'app déployée — tout le code est bundlé dedans.

```
Claude génère index.html
        ↓
Remplacer index.html dans le dossier local
        ↓
⚠ Incrémenter APP_VERSION dans sw.js
        ↓
GitHub Desktop : Commit → Push
        ↓
~1 minute → bannière "Nouvelle version disponible" sur iPhone
```

**Convention de versioning :**
| Changement | Version |
|---|---|
| Correction de bug | `1.0.x` |
| Nouvelle fonctionnalité | `1.x.0` |
| Refonte majeure | `x.0.0` |

---

## Sécurité

| Mesure | Description |
|---|---|
| Échappement HTML | `esc()` sur toutes les valeurs dynamiques avant `innerHTML` |
| Validation import | Schéma, types, plages vérifiés avant stockage |
| Sanitisation | `sanitizeRecord()` : kg < 1000, reps < 100, RPE ≤ 10 |
| Event delegation SVG | Regex sur les IDs muscle |
| Données locales | Zéro communication réseau, zéro tracking |
| Zéro dépendance npm | Aucun risque supply chain |

---

## Stack technique

- **Vanilla JS** — ES Modules, aucune dépendance
- **IndexedDB** — stockage persistant, stable sur iOS Safari
- **SVG** — schéma anatomique interactif
- **Chart.js** — graphiques progression et benchmark (CDN Cloudflare)
- **wger.de API** — base d'exercices open source (cache offline)
- **Service Worker** — cache-first, offline complet
- **PWA** — manifest, standalone, apple-touch-icon

---

## Sources scientifiques (module Grossesse)

- CNSF – Recommandations de pratique clinique, mars 2021
- HAS – Grossesse et post-partum, prescription d'AP
- ANSES 2016
- Guide canadien SOGC/CSEP, Br J Sports Med 2018;52:1339-46
- Ameli.fr · NaîtreetGrandir.ca
