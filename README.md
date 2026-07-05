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
- **Repères techniques** par exercice (mouvement, posture, tempo) affichés dans la vue détail **et** la grille de saisie des programmes générés (force/gym/hyrox) ; allure/ressenti + technique par modalité pour le cardio

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
- **Cumul automatique** de tous les programmes actifs simultanément, aligné par timestamps réels
- **Séances cardio incluses** : charge = `durée(min) × RPE/10 × 0.2`, répartie sur les muscles de la modalité (course → quadriceps/mollets, rameur → dos/jambes…)
- **Séances mobilité incluses** (charge très faible) : les routines de la section 🧘 apparaissent en charge légère ; à l'inverse, la Récup lit cette carte pour cibler les muscles les plus sollicités
- Dégradé de couleur continu : gris (repos) → vert → ambre → orange → rouge
- Détail par muscle : charge résiduelle %, estimation de récupération, exercices contributeurs (legacy ATHX + programmes générés + séances cardio, en charge résiduelle décroissante)

### 🎯 Wizard de construction de programme
Création de programme personnalisé en 8 étapes :
1. **Objectif** — Hyrox, Force, Gym, Cardio, Mobilité, Mixte, Grossesse
2. **Niveau** — Débutant / Intermédiaire / Avancé
3. **Âge** — 5 tranches (18–29, 30–39, 40–49, 50–59, 60+) avec adaptations automatiques selon recommandations ACSM/Israetel
4. **Disponibilité** — 2 à 5 séances/semaine + durée par séance
5. **Matériel** — sélection multiple (barre, haltères, kettlebell, PdC, machines, élastiques). **Optionnel pour le cardio** (course/marche = aucun matériel requis)
6. **Exercices / Activités** — force/gym : inclure/exclure depuis la base wger.de (cache IndexedDB offline) ; **cardio : choix des modalités** (course, vélo, rameur, ski-erg, assault bike, elliptique, corde, natation, marche)
7. **Durée + compétition** — avec recommandation expert par domaine et calcul du taper
8. **Récapitulatif + 1RM** — pré-remplis depuis le tracker, modifiables (force/hyrox uniquement)

#### 🏃 Cardio / Endurance
Modèle d'endurance dédié (distinct du modèle force %1RM) — voir `Documentation/cardio-program-design.md`.
- **Distribution polarisée ~80/20** (Seiler) : l'essentiel du volume en zone facile (Z1–Z2), une minorité en qualité (seuil/VO₂max).
- **Zones Z1–Z5** pilotées par le **RPE** (app RPE-centrée) + %FCmax en repère (Tanaka).
- **Types de séance** : récupération, endurance, sortie longue, tempo, seuil (intervalles), VO₂max (intervalles ≥ 7–10 min > 90 % VO₂max), fartlek, allure course.
- **Périodisation** : Base aérobie → Développement seuil → Pic VO₂max → Affûtage ; progression de volume ~8 %/sem, semaines de décharge entre blocs, taper final.
- **Débutant** : run-walk progressif (façon Couch-to-5K), pas de Z4/Z5 tant que la base n'est pas établie. **Âge** : intensité plafonnée (50-59 → pas de Z5).
- **Multi-modalités** : choisir une ou plusieurs activités ; les séances qualité portent sur la principale, les faciles/récup peuvent tourner (cross-training). Les séances faciles suggèrent explicitement le remplacement par vélo/rameur/ergo/sport au choix.
- **Suivi** : durée réelle / RPE / distance (optionnelle) au lieu de la grille kg/reps.
- **Vue détail façon ATHX** : pills par jour → sous-boutons par semaine → fiche séance (intensité, allure/ressenti, description, repères techniques par modalité, durée estimée).
- Sources : Seiler, Daniels (allures), Buchheit & Laursen (HIIT), ACSM, Concept2 (rameur), NHS C25K.

#### 🧘 Mobilité
Section top-level dédiée (barre du bas, 🧘) **+** focus cadrable via le wizard — voir `Documentation/mobilite-program-design.md`.
- **Section quotidienne souple** (esprit GOWOD) : *Routine du jour* (~5-10 min) stable sur la journée (cache + détection de changement de jour en date locale, variété semée par le jour), *Récup* post-séance, *Bilan* auto-scorable, *Progrès*.
- **Auto-bilan par 7 zones** (chevilles, hanches, chaîne postérieure, thoracique, épaules/bras, poignets, cou) : tests de terrain (knee-to-wall, deep squat FMS, ASLR/sit-and-reach, rotation thoracique, FMS shoulder mobility, prayer, rotation cervicale), notés Faible/Limité/Bon (+ cm optionnel). Refaisable pour suivre les progrès.
- **Ciblage adaptatif** : la routine et la récup combinent 3 signaux — zones faibles (bilan), **zones chargées (tracker muscles SRA)**, type de programme actif.
- **Méthodes sourcées** : CARs (réveil articulaire quotidien), étirements dynamiques/statiques (ACSM/Delphi 2025), PNF, PAILs/RAILs (fin d'amplitude) — débloquées par niveau, volume par âge. FRC/CARs/PAILs-RAILs présentés comme méthodes (preuve émergente), sans allégation prouvée ; pas de forçage, douleur = arrêt.
- **Récup post-séance** : cible **toutes** les zones chargées (muscles affichés + %), statique doux + auto-massage (façon GOWOD *Recover*), bénéfice affiché comme modeste. Les zones qui se chevauchent (muscles partagés entre plusieurs zones) sont dédupliquées pour qu'une région distincte nouvellement travaillée apparaisse toujours.
- **Focus généré (wizard)** : programme souple multi-semaines sur les zones choisies, progression douce (PNF puis fin d'amplitude introduits progressivement), suivi dans le Tracker.

#### Type Mixte / Santé globale
Programme équilibré sur la semaine : Force + Cardio + Hypertrophie + Mobilité/Récupération. Structure adaptée au nombre de séances par semaine. Les **jours cardio et mobilité génèrent de vraies séances dédiées** (plus de repli force %1RM) : périodisation cardio simplifiée calée sur la phase force (Base → endurance Z2, Construction → tempo Z3, Intensité/Pic → seuil Z4), sélecteur de modalités dans le wizard, drills de mobilité en rotation. Suivi et carte musculaire hérités automatiquement via `ex.kind`.

#### Adaptations selon l'âge
| Paramètre | 18–29 | 40–49 | 60+ |
|---|---|---|---|
| Séries max | 5 | 4 | 3 |
| Deload toutes les | 4 sem | 3 sem | 2 sem |
| RPE max | 9 | 8 | 7 |
| Volume mobilité | 10% | 20% | 35% |

### 🥗 Nutrition
Section dédiée (onglet de la barre du bas), organisée comme une liste de plans :
- **Plan ATHX — Compétition (référence)** toujours en 1er : profil 73 kg, macros, plan alimentaire détaillé, supplémentation evidence-based.
- **Assistant nutrition** (« + Créer un plan ») : poids, taille, âge, sexe, niveau d'activité, objectif → calcul **Mifflin-St Jeor** (TDEE) → calories jour entraînement/repos, macros (protéines/glucides/lipides en g + %), IMC, répartition des repas et conseils par objectif.
- Plans personnalisés persistés (IndexedDB), inclus dans l'export/import JSON, supprimables.

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
- **Date de démarrage** demandée à la création (wizard) et à l'activation → la semaine courante est calculée automatiquement ; le programme créé s'affiche immédiatement dans le tracker

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

Le **runtime** (servi par GitHub Pages) est à la racine ; les **sources** de build vivent dans `src/`
et sont inertes sur Pages (l'app tourne uniquement avec `index.html`, qui est auto-suffisant).

```
Tracker-App/
├── index.html              # GÉNÉRÉ — app complète bundlée (CSS + JS + vues inline)  ⚠ ne pas éditer
├── manifest.json           # PWA (nom, icônes, standalone)                            — runtime
├── sw.js                   # Service Worker — cache offline                           — runtime
├── robots.txt              # Désindexation moteurs de recherche                       — runtime
├── icons/                  # icon-180 / 192 / 512                                     — runtime
└── src/                    # SOURCES (build-time uniquement)
    ├── build.py            # Bundler : shell.html + css/ + views/ + js/ → ../index.html
    ├── shell.html          # Squelette HTML (head, header, nav bottom, <script>) + placeholders {{CSS}}/{{VIEWS}}/{{JS}}
    ├── js/
    │   ├── db.js               # IndexedDB + cache in-memory + fallback localStorage
    │   ├── security.js         # esc(), sanitizeRecord(), validateImport(), safeId/safeLabel/sanitizeDeep + sanitizers d'import
    │   ├── data.js             # EXERCISES, MUSCLE_MAP, AGE_MODIFIERS, GROSSESSE_*, NUTRITION_*, CARDIO_*, MOBILITY_*
    │   ├── store.js            # Accesseurs + gestion vacances multi-périodes
    │   ├── progression.js      # Logique Lafay : weekOutcome, getNextPlan, calcAdj
    │   ├── tracker.js          # Tracker générique (ATHX + programmes wizard)
    │   ├── musculaire.js       # SRA, paintAllViews, cumul multi-programmes
    │   ├── io.js               # Export JSON/CSV, import avec validation
    │   ├── exercises-db.js     # Base wger.de + cache IndexedDB + fallback 35 exercices
    │   ├── programs.js         # Storage multi-programmes, statuts, clôture, archive
    │   ├── generator.js        # Algo génération programme (age-aware, mixte, grossesse, cardio, mobilité)
    │   ├── grossesse.js        # Programme prénatal/post-natal complet (CNSF/HAS)
    │   ├── wizard.js           # Wizard de programme (8 étapes)
    │   ├── nutrition-plan.js   # Section Nutrition : plans + calcul Mifflin-St Jeor
    │   ├── mobilite.js         # Section Mobilité : bilan + routine du jour + récup (SRA-aware)
    │   └── app.js              # Routing, init, migration ATHX, cycle de vie programmes
    ├── css/
    │   ├── base.css
    │   ├── tracker.css
    │   ├── musculaire.css
    │   ├── programme.css
    │   ├── wizard.css
    │   └── mobilite.css
    └── views/
        ├── tracker.html
        ├── musculaire.html
        ├── programme.html
        ├── programmes.html     # Wizard + liste programmes
        ├── doc.html
        ├── nutrition.html      # Section Nutrition (liste / détail / wizard)
        └── mobilite.html       # Section Mobilité (routine / récup / bilan / progrès)
```

### Build

`index.html` n'est **jamais édité à la main** : on modifie les sources dans `src/`, puis :

```bash
cd Code
python src/build.py            # régénère index.html à la racine
python src/build.py --check    # vérifie que index.html correspond aux sources (0 = OK)
```

Voir `Documentation/just2train-workflow.md` pour la procédure complète (build → bump SW → déploiement).

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

**Seul `index.html` est chargé** par l'app déployée — tout le code est bundlé dedans. Le dossier
`src/` est versionné pour pouvoir rebuild, mais n'est jamais chargé sur GitHub Pages.

```
Éditer les sources dans src/
        ↓
python src/build.py   →  régénère index.html
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
| Correction de bug | `x.x.X+1` |
| Nouvelle fonctionnalité | `x.X+1.0` |
| Refonte majeure | `X+1.0.0` |

---

## Sécurité

Politique complète, modèle de menace et résultat de l'audit : **`Documentation/security.md`**.

| Mesure | Description |
|---|---|
| Échappement HTML | `esc()` sur toutes les valeurs dynamiques (saisie / API / import) avant `innerHTML` |
| Assainissement import | **Tous** les blocs importés (programmes, plans nutrition, mobilité, tracking) passent par un sanitizer avant écriture — `safeId` (ids), `safeLabel`/`sanitizeDeep` (texte + anti prototype-pollution), coercition numérique des plans |
| Sanitisation records | `sanitizeRecord()` : kg < 1000, reps < 100, RPE ≤ 10 ; fichier plafonné à 512 Ko |
| Export CSV | Cellules `= + - @` préfixées `'` (anti-injection de formule) |
| CSP + SRI | `Content-Security-Policy` en `<meta>` (`connect-src` limité à self + wger → anti-exfiltration) ; Chart.js chargé avec `integrity` (SRI) |
| Service Worker | Cache **same-origin only** (anti cache-poisoning), `message` filtré par origine |
| Données locales | Zéro communication réseau (hors API wger publique), zéro tracking, zéro télémétrie |
| Zéro dépendance npm | Aucun risque supply chain |

---

## Stack technique

- **Vanilla JS** — ES Modules, aucune dépendance
- **IndexedDB** — stockage persistant, stable sur iOS Safari
- **SVG** — schéma anatomique interactif
- **Chart.js** — graphiques progression et benchmark (CDN Cloudflare, chargé avec SRI)
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
