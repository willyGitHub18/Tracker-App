/**
 * resources.js — Guide (hub de ressources & éducation, style Bevel)
 *
 * Contenu 100% data-driven : chaque article est un objet { id, category, icon,
 * title, summary, blocks[] }. Un moteur de rendu unique (renderResources) génère
 * le sommaire (groupé par catégorie) et les cartes. Tout texte passe par esc() au
 * rendu (règle sécurité maison), avec un mini-markdown **gras** / *italique*.
 *
 * Types de bloc supportés :
 *   { type:'h2', text }                     — titre de section (= début de carte)
 *   { type:'p', text }                      — paragraphe
 *   { type:'list', variant:'ok'|'no'|'plain', items:[] }
 *   { type:'table', head?:[], rows:[[...]] }
 *   { type:'formula', text }                — encart monospace
 *   { type:'warn', level?:'danger', text }  — callout (ambre, ou rouge si danger)
 *   { type:'sources', items:[{name,url,desc}] }
 *
 * Ajouter un article = pousser un objet dans RESOURCES. Aucun HTML à écrire.
 * ⚠ Nouveau domaine de lien externe : navigation <a> non bloquée par la CSP, mais
 *   toute ressource EMBARQUÉE (img/iframe) exigerait une mise à jour img-src/frame-src.
 */

import { esc } from './security.js';

// ── Données ───────────────────────────────────────────────────────────────────

export const RESOURCES = [

  // ═══ Comprendre ═══════════════════════════════════════════════════════════
  {
    id: 'rpe', category: 'Comprendre', icon: '🔥', title: 'RPE — effort perçu',
    summary: "Le RPE est une échelle simple pour noter la difficulté d'un effort et ajuster ta charge selon ta forme du jour.",
    blocks: [
      { type: 'p', text: "Le **RPE** (*Rate of Perceived Exertion*, ou **échelle d'effort perçu**) mesure à quel point un exercice te paraît difficile. C'est une note **subjective** qui intègre l'essoufflement, la tension musculaire, la fatigue et l'effort ressenti. L'idée vient du physiologiste suédois **Gunnar Borg**, qui a créé dans les années 1960-70 une échelle allant de **6 à 20** : conçue pour croître de façon linéaire avec l'intensité, elle correspondait grossièrement à la fréquence cardiaque (multiplie la note par 10 → battements/minute, de 60 à 200)." },
      { type: 'p', text: "En musculation, on utilise surtout une version modernisée de **6 à 10**, popularisée par le coach **Mike Tuchscherer** (Reactive Training Systems). Elle s'appuie sur le **RIR** (*Reps In Reserve*, répétitions restantes) : combien de répétitions il te reste avant l'échec musculaire." },
      { type: 'h2', text: "Échelle RPE 6–10 et RIR" },
      { type: 'table', head: ['RPE', 'RIR (reps en réserve)', 'Ressenti'], rows: [
        ['10', '0', 'Effort maximal, aucune rep de plus possible'],
        ['9', '1', 'Il te restait 1 rep'],
        ['8', '2', 'Il te restait 2 reps'],
        ['7', '3', 'Il te restait 3 reps, effort modéré'],
        ['6', '4', 'Léger, beaucoup de marge'] ] },
      { type: 'formula', text: "RPE = 10 − RIR   (ex. : 2 reps en réserve → RPE 8)" },
      { type: 'h2', text: "Pourquoi c'est utile : l'autorégulation" },
      { type: 'p', text: "Une charge fixe en **% de ton 1RM** ignore ta forme du jour. Or ta force varie avec le **sommeil, le stress, la nutrition et la fatigue accumulée**. Le RPE permet d'**autoréguler** : au lieu de prescrire « 8 reps à 80 % », on vise « 8 reps à RPE 8 ». Tu ajustes alors la charge séance par séance pour rester à la bonne distance de l'échec — plus lourd si tu es en forme, plus léger un jour difficile." },
      { type: 'list', variant: 'ok', items: [
        "**Simple** : aucun matériel, utilisable sur tout exercice",
        "**Flexible** : s'adapte automatiquement à la fatigue du jour",
        "**Sécurisant** : aide à garder une marge et éviter l'échec systématique" ] },
      { type: 'warn', text: "Le RPE reste **subjectif** et demande de la **calibration** : les débutants sous-estiment souvent l'effort (ils annoncent RPE 8 alors qu'il restait 4-5 reps). La précision s'améliore avec l'expérience et en s'entraînant parfois proche de l'échec pour recalibrer son ressenti." },
      { type: 'sources', items: [
        { name: 'ACSM — Gunnar Borg', url: 'https://acsm.org/gunnar-borg/', desc: "Origine de l'échelle de Borg 6-20 par l'American College of Sports Medicine" },
        { name: 'StrengthLog — RPE & RIR', url: 'https://www.strengthlog.com/rpe-and-rir-in-strength-training/', desc: 'Échelle RPE 6-10, correspondance RIR et rôle de Mike Tuchscherer' },
        { name: 'Sports Medicine - Open (2024)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11164849/', desc: "Étude transversale (n=6311) définissant les niveaux d'intensité par RPE" } ] }
    ]
  },

  {
    id: 'vo2max', category: 'Comprendre', icon: '🫁', title: 'VO2 max',
    summary: "La VO2 max est la quantité maximale d'oxygène que votre corps peut utiliser à l'effort : c'est le meilleur indicateur unique de votre condition cardio-respiratoire.",
    blocks: [
      { type: 'p', text: "La **VO2 max** correspond au volume maximal d'oxygène que votre organisme est capable de consommer par minute lorsqu'il est poussé à son maximum. On l'exprime en **millilitres d'oxygène par kilo de poids corporel et par minute (ml/kg/min)**. Plus elle est élevée, plus votre cœur, vos poumons et vos muscles transportent et utilisent l'oxygène efficacement. C'est considéré comme le **meilleur marqueur unique de la condition cardio-respiratoire**." },
      { type: 'h2', text: "Comment la mesure-t-on ?" },
      { type: 'p', text: "La méthode de référence (« gold standard ») est un **test à l'effort progressif en laboratoire** : on respire dans un masque qui mesure l'oxygène consommé et le CO2 rejeté pendant qu'on court ou pédale à intensité croissante jusqu'à l'épuisement. À défaut, on peut l'**estimer** : montres connectées (via la fréquence cardiaque), tests de terrain comme le **test de Cooper** (distance parcourue en 12 min), ou le rapport entre fréquence cardiaque maximale et de repos." },
      { type: 'formula', text: "VO2 max ≈ 15 × (FC max ÷ FC repos)   —   méthode du rapport de fréquence cardiaque (Uth et coll., 2004 ; facteur mesuré ≈ 15,3 ml/kg/min)" },
      { type: 'table', head: ['Niveau (adulte)', 'VO2 max approximative (ml/kg/min)'], rows: [
        ['Sédentaire', '20 – 30'],
        ['Moyen', '30 – 40'],
        ['Bon / actif', '40 – 50'],
        ["Athlète d'endurance", '60 – 85'] ] },
      { type: 'p', text: "**Pourquoi cela compte.** Une meilleure condition cardio-respiratoire est fortement et régulièrement **associée** à une mortalité plus faible. Dans une étude de la Cleveland Clinic portant sur plus de 122 000 personnes (Mandsager et coll., 2018), la VO2 max était inversement liée à la mortalité toutes causes confondues, **sans limite supérieure observée** au bénéfice. Attention : il s'agit d'une **association** observée, pas d'une preuve directe de cause à effet." },
      { type: 'warn', text: "Les valeurs de référence ci-dessus sont indicatives et varient fortement selon l'âge et le sexe (elles baissent avec l'âge et sont en moyenne un peu plus basses chez les femmes). Les estimations des montres et bracelets connectés sont utiles pour suivre une tendance, mais restent approximatives : elles ne remplacent pas un test en laboratoire." },
      { type: 'sources', items: [
        { name: 'Cleveland Clinic — VO2 Max', url: 'https://health.clevelandclinic.org/what-is-vo2-max-and-how-to-calculate-it', desc: 'Définition, mesure en laboratoire et estimations par objets connectés.' },
        { name: 'Uth et coll., Eur J Appl Physiol (2004)', url: 'https://pubmed.ncbi.nlm.nih.gov/14624296/', desc: 'Estimation de la VO2 max via le rapport FC max / FC repos (facteur ≈ 15).' },
        { name: 'Mandsager et coll., JAMA Netw Open (2018)', url: 'https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2707428', desc: 'Étude sur 122 007 adultes : condition cardio-respiratoire et mortalité.' } ] }
    ]
  },

  {
    id: 'hrv', category: 'Comprendre', icon: '💓', title: 'VFC (HRV)',
    summary: "La variabilité de la fréquence cardiaque mesure les micro-variations de temps entre deux battements et reflète l'équilibre de ton système nerveux autonome.",
    blocks: [
      { type: 'p', text: "La **variabilité de la fréquence cardiaque (VFC**, ou *HRV* en anglais) est la fluctuation des intervalles de temps entre deux battements de cœur successifs. Un cœur sain n'est pas un métronome : ces micro-variations traduisent l'activité du **système nerveux autonome**, tiraillé entre sa branche **sympathique** (stress, effort, « accélérateur ») et sa branche **parasympathique** (récupération, repos, « frein » vagal)." },
      { type: 'p', text: "En pratique, une VFC de repos plus élevée reflète généralement une meilleure capacité de **récupération et d'adaptation**. Mais la valeur n'a de sens que rapportée à toi-même et suivie dans le temps." },
      { type: 'h2', text: "Les principales mesures" },
      { type: 'table', head: ['Indice', 'Ce qu’il mesure', 'À retenir'], rows: [
        ['RMSSD', 'Racine carrée moyenne des différences entre battements successifs', "Reflète surtout l'activité parasympathique (vagale) ; mesurable sur de courtes durées, c'est l'indice privilégié au quotidien"],
        ['SDNN', 'Écart-type des intervalles entre battements normaux', 'Reflète la variabilité globale (sympathique + parasympathique) ; référence sur un enregistrement de 24 h'] ] },
      { type: 'h2', text: "Ce qui la fait monter ou descendre" },
      { type: 'list', variant: 'ok', items: [
        'Un sommeil suffisant et de qualité',
        'Une bonne récupération entre les séances',
        'Une condition physique aérobie qui progresse' ] },
      { type: 'list', variant: 'no', items: [
        'Le stress psychologique et le manque de sommeil',
        "Une charge d'entraînement élevée ou un surentraînement",
        "L'alcool (souvent visible dès la nuit suivante)",
        'Une maladie ou une infection en cours' ] },
      { type: 'h2', text: "Comment les sportifs l'utilisent" },
      { type: 'p', text: "Beaucoup mesurent leur VFC (souvent le **RMSSD**) chaque matin pour estimer leur **état de forme du jour**. C'est le principe de l'**autorégulation** : une VFC dans la normale autorise une séance intense, une VFC nettement abaissée invite à alléger ou à récupérer. Suivre la **tendance** (moyenne sur plusieurs jours) est plus fiable qu'une seule mesure isolée." },
      { type: 'warn', text: "La VFC est très **individuelle** : ne compare pas ta valeur absolue à celle d'une autre personne, suis uniquement ta propre tendance. Les conditions de mesure doivent rester identiques (même moment, par ex. au réveil, même position, même appareil), sinon la comparaison n'a plus de sens." },
      { type: 'sources', items: [
        { name: 'Shaffer & Ginsberg (2017), Front. Public Health', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5624990/', desc: 'Revue de référence : définition, indices (RMSSD, SDNN) et normes de la VFC.' },
        { name: 'HRV in Strength & Conditioning (2024)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11204851/', desc: 'Usage sportif : suivi de tendance individuelle et autorégulation.' } ] }
    ]
  },

  {
    id: 'sommeil', category: 'Comprendre', icon: '😴', title: 'Sommeil & récupération',
    summary: "Le sommeil est le premier levier de récupération : c'est pendant la nuit que le corps répare les muscles, régule ses hormones et consolide les acquis moteurs.",
    blocks: [
      { type: 'p', text: "S'entraîner crée les stimulations, mais c'est le **sommeil** qui transforme l'effort en progrès. Pendant le sommeil profond, la sécrétion d'**hormone de croissance** est à son pic et favorise la réparation des tissus et la synthèse des protéines. Un sommeil suffisant restaure aussi l'**attention, le temps de réaction et la prise de décision**. À l'inverse, le manque de sommeil augmente le risque de blessure : chez de jeunes athlètes, dormir **moins de 8 h par nuit** était associé à un risque de blessure environ **1,7 fois plus élevé**." },
      { type: 'h2', text: "Les phases du sommeil" },
      { type: 'list', variant: 'plain', items: [
        "**Sommeil léger (NREM 1-2)** : transition et stabilisation du sommeil. Le stade 2 participe à la consolidation des habiletés motrices apprises à l'entraînement.",
        "**Sommeil profond / lent (NREM 3)** : la phase la plus réparatrice, concentrée en début de nuit. Pic d'hormone de croissance, réparation physique et récupération.",
        "**Sommeil paradoxal (REM)** : rêves, mémoire et créativité. Il augmente en seconde partie de nuit." ] },
      { type: 'h2', text: "Combien de sommeil ?" },
      { type: 'table', head: ['Âge', 'Durée recommandée par nuit'], rows: [
        ['Adolescents (14-17 ans)', '8 à 10 h'],
        ['Jeunes adultes (18-25 ans)', '7 à 9 h'],
        ['Adultes (26-64 ans)', '7 à 9 h'],
        ['Seniors (65 ans et +)', '7 à 8 h'] ] },
      { type: 'h2', text: "Bien dormir : les bons réflexes" },
      { type: 'list', variant: 'ok', items: [
        "Gardez des **horaires réguliers**, y compris le week-end.",
        "Dormez dans une chambre **sombre, calme et fraîche**.",
        "Limitez la **caféine** en fin de journée (effet stimulant durable).",
        "Coupez les **écrans** et la lumière vive avant le coucher.",
        "Évitez l'alcool et les gros repas tard le soir.",
        "Réservez le lit au sommeil pour renforcer l'association coucher = dormir." ] },
      { type: 'warn', text: "Les phases de sommeil affichées par les montres et bracelets connectés sont des **estimations**, pas une mesure clinique. Seule la polysomnographie en laboratoire mesure précisément les stades du sommeil. Utilisez ces données pour repérer des tendances, pas comme un diagnostic." },
      { type: 'sources', items: [
        { name: 'National Sleep Foundation', url: 'https://www.thensf.org/how-many-hours-of-sleep-do-you-really-need/', desc: 'Recommandations de durée de sommeil par tranche d’âge.' },
        { name: 'NIH / NHLBI — Stages of Sleep', url: 'https://www.nhlbi.nih.gov/health/sleep/stages-of-sleep', desc: 'Description des phases NREM (léger, profond) et REM.' },
        { name: 'Sleep and Athletic Performance (revue, PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9960533/', desc: 'Revue : sommeil, hormones, récupération, cognition et risque de blessure.' },
        { name: 'Milewski et coll., J Pediatr Orthop (2014)', url: 'https://pubmed.ncbi.nlm.nih.gov/25028798/', desc: 'Moins de 8 h de sommeil → risque de blessure ~1,7× chez les jeunes athlètes.' } ] }
    ]
  },

  {
    id: 'recuperation', category: 'Comprendre', icon: '🔁', title: 'Récupération & SRA',
    summary: "Le progrès ne se construit pas pendant l'entraînement mais pendant la récupération qui suit : comprendre le cycle Stimulus–Récupération–Adaptation permet de doser sa charge.",
    blocks: [
      { type: 'p', text: "L'entraînement est un **stress** : il perturbe l'équilibre du corps et provoque de la fatigue. Ce n'est pas la séance elle-même qui vous rend plus fort, mais la **réponse** du corps une fois la séance terminée. C'est le principe du modèle **Stimulus → Récupération → Adaptation (SRA)**, aussi appelé **surcompensation**, issu du syndrome général d'adaptation décrit par Hans Selye." },
      { type: 'h2', text: "Le cycle en trois temps" },
      { type: 'list', variant: 'plain', items: [
        "**Stimulus** : la séance perturbe l'homéostasie et crée une baisse temporaire de capacité (fatigue, courbatures).",
        "**Récupération** : le corps répare les tissus et reconstitue ses réserves. C'est ici, au repos, que se produit l'adaptation — pas pendant l'effort.",
        "**Adaptation (surcompensation)** : bien récupéré, le corps ne revient pas seulement à son niveau de départ, il le dépasse légèrement, créant une nouvelle base plus haute." ] },
      { type: 'p', text: "Le **timing** de la séance suivante est décisif. S'entraîner **trop tôt**, avant la fin de la récupération, empile la fatigue sans laisser l'adaptation se faire (risque de surmenage). S'entraîner **trop tard** laisse retomber le gain avant d'en profiter. Répéter le stimulus au bon moment produit un effet d'escalier : chaque cycle démarre un peu plus haut que le précédent." },
      { type: 'h2', text: "Tous les tissus ne récupèrent pas au même rythme" },
      { type: 'table', head: ['Système / tissu', 'Délai indicatif', 'Remarque'], rows: [
        ['Réserves de glycogène', '~24 h', 'Dépend de l’apport en glucides'],
        ['Petits muscles (bras, mollets)', '~24–48 h', 'Moins de masse, récupération plus rapide'],
        ['Gros groupes (jambes, dos)', '~48–72 h', 'Après un travail lourd ou volumineux'],
        ['Tendons / ligaments / fascias', 'Plusieurs jours à semaines', 'Faible vascularisation → plus lents que le muscle'],
        ['Système nerveux (SNC)', 'Variable, heures à jours', 'Charges lourdes, travail de force/puissance'] ] },
      { type: 'warn', text: "Ces durées sont des **approximations**, pas des demi-vies précises. Le temps de récupération réel est très individuel : il dépend de l'âge d'entraînement, de la charge de la séance, du sommeil, de la nutrition et du stress de vie. Utilisez-les comme repères, pas comme des règles exactes." },
      { type: 'h2', text: "Les leviers concrets de récupération" },
      { type: 'list', variant: 'ok', items: [
        "**Sommeil** : la priorité n°1 ; viser 7–9 h régulières.",
        "**Nutrition et protéines** : assez d'énergie totale et un apport protéique réparti sur la journée.",
        "**Récupération active** : marche, mobilité, effort léger pour favoriser la circulation sans ajouter de fatigue.",
        "**Gestion de la charge totale** : alterner séances dures et légères, prévoir des jours de repos et des semaines allégées (deload)." ] },
      { type: 'sources', items: [
        { name: 'Human Kinetics — General Adaptation Syndrome', url: 'https://us.humankinetics.com/blogs/excerpt/understand-the-general-adaptation-syndrome-model', desc: 'Modèle GAS de Selye et phases de surcompensation.' },
        { name: 'NSCA — Concepts of Periodization', url: 'https://www.nsca.com/education/articles/kinetic-select/central-concepts-related-to-periodization/', desc: 'Stimulus-fatigue-récupération-adaptation et timing en périodisation.' },
        { name: 'Lorenz & Morrison, Periodization (PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4637911/', desc: 'Revue reliant GAS, surcompensation et modèle fitness-fatigue.' } ] }
    ]
  },

  {
    id: 'nutrition', category: 'Comprendre', icon: '🥗', title: 'Nutrition',
    summary: "Comment l'équilibre énergétique et les macronutriments pilotent la performance et la composition corporelle, avec des repères chiffrés pour les personnes actives.",
    blocks: [
      { type: 'p', text: "La composition corporelle dépend d'abord de l'**équilibre énergétique** : manger plus que ce que l'on dépense (**surplus**) favorise la prise de poids, manger moins (**déficit**) favorise la perte. Pour prendre du muscle, un léger surplus aide ; pour perdre du gras, un déficit modéré est nécessaire. Aucun aliment ni complément ne contourne ce principe." },
      { type: 'h2', text: "Les macronutriments" },
      { type: 'table', head: ['Macro', 'Rôle', 'Repère (personnes actives)'], rows: [
        ['Protéines', 'Réparation et construction musculaire, satiété', '1,4–2,0 g/kg/jour (ISSN) ; le haut de la fourchette (~1,6–2,2 g/kg) soutient le mieux la masse maigre'],
        ['Glucides', "Carburant principal de l'effort, recharge du glycogène", '≈3–5 g/kg (activité légère) jusqu’à 8–12 g/kg/jour (gros volume)'],
        ['Lipides', 'Hormones, absorption des vitamines, énergie', "Au moins ~20 % de l'apport énergétique quotidien"] ] },
      { type: 'h2', text: "Répartir les protéines" },
      { type: 'p', text: "C'est l'**apport total sur la journée** qui compte le plus. Le fractionner en plusieurs prises de ~20–40 g (env. 0,25–0,40 g/kg par repas) toutes les 3–4 h aide à stimuler régulièrement la synthèse des protéines musculaires. Le timing exact autour de la séance a un effet mineur si le total quotidien est atteint." },
      { type: 'h2', text: "Hydratation" },
      { type: 'p', text: "Boire régulièrement au cours de la journée et adapter les apports à l'effort et à la chaleur. La couleur des urines (claires = bien hydraté) est un repère simple et fiable au quotidien." },
      { type: 'warn', text: "Ces repères sont des moyennes : les besoins réels varient selon l'individu, l'objectif et le niveau d'activité. En cas de pathologie, de grossesse, d'allaitement ou de régime particulier, consultez un médecin ou un(e) diététicien(ne). Ceci n'est pas un avis médical." },
      { type: 'sources', items: [
        { name: 'ISSN — Protein and Exercise (2017)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/', desc: "Position ISSN : 1,4–2,0 g/kg/jour, 20–40 g par prise." },
        { name: 'AND / DC / ACSM — Nutrition & Performance (2016)', url: 'https://pubmed.ncbi.nlm.nih.gov/26891166/', desc: 'Besoins en glucides selon le volume, repères lipides/protéines.' },
        { name: 'ISSN — Nutrient Timing (2017)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5596471/', desc: 'Glucides 5–12 g/kg/jour selon l’intensité ; protéines toutes les 3–4 h.' },
        { name: 'ANSES — Protéines : besoins', url: 'https://www.anses.fr/fr/system/files/NUT-Ra-Proteines.pdf', desc: "Référence française : ~0,83 g/kg/jour, limite haute tolérée 2,2 g/kg/jour." } ] }
    ]
  },

  {
    id: 'tendons', category: 'Comprendre', icon: '🩹', title: 'Tendons & charge',
    summary: "Comment un tendon se renforce, la place réelle de l'isométrie (utile mais pas magique) et les repères de charge — avec les garde-fous.",
    blocks: [
      { type: 'p', text: "Un tendon transmet la force du muscle à l'os. Il **s'adapte à la charge** — mais **lentement** : le remodelage du collagène et la rigidité de la matrice mettent plus de temps que l'adaptation musculaire, d'où un besoin de **récupération plus longue** (c'est pourquoi le suivi musculaire de l'app donne aux tendons une demi-vie plus longue). Une tendinopathie survient quand la charge dépasse durablement la capacité du tendon." },
      { type: 'h2', text: "Comment un tendon se renforce" },
      { type: 'p', text: "Le **pilier**, c'est la **charge mécanique progressive**. La *résistance lourde et lente* (**HSR**) et le travail *excentrique* donnent les meilleurs résultats et surpassent le repos, les infiltrations ou les ondes de choc à moyen terme. À l'inverse, le travail **concentrique seul est le moins efficace**. On progresse par paliers, en respectant une douleur tolérable." },
      { type: 'h2', text: "L'isométrie : utile, mais pas magique" },
      { type: 'p', text: "L'idée que tenir une contraction **isométrique** calme la douleur vient d'une étude de 2015 (Rio) — **spectaculaire mais sur 6 sujets seulement**. Les travaux **postérieurs la nuancent fortement** : aucun soulagement immédiat démontré au tendon d'Achille, douleur parfois **augmentée** au coude, et globalement l'isométrie **n'est pas supérieure** à la charge dynamique. C'est donc une **option à tester** — surtout pour le genou (rotulien) en phase douloureuse — dont l'effet est **individuel et non garanti**, jamais une baguette magique." },
      { type: 'h2', text: "Repères de charge" },
      { type: 'table', head: ['Type', 'Dosage indicatif', 'Rôle'], rows: [
        ['Isométrique', '~5 × 30–45 s, effort ~7/10, 1–2×/jour', "Antalgie possible (à tester), charger tôt en phase irritable"],
        ['Lourd & lent (HSR)', '3–4 × 6–8, tempo 3 s / 3 s, 3×/sem (48 h d’écart)', 'Le pilier — construit la capacité du tendon'],
        ['Excentrique', '~3 × 15, charge progressive, ~12 sem.', 'Efficace aussi ; volume plus lourd, observance parfois moindre'] ] },
      { type: 'h2', text: "Selon le tendon" },
      { type: 'list', variant: 'plain', items: [
        "**Rotulien (genou)** — site où l'isométrie est la mieux décrite ; puis squat lourd et lent.",
        "**Achille** — charge lourde et lente (référence) ; isométrie sans effet antalgique immédiat démontré.",
        "**Hanche latérale (fessier)** — surtout **gestion de charge** : éviter la compression (croiser les jambes, appui prolongé) ; renforcement en abduction.",
        "**Coiffe des rotateurs** — charge progressive ; l'isométrie n'y est pas supérieure.",
        "**Coude (épicondyle)** — l'isométrie peut **augmenter** la douleur : rester sous le seuil, privilégier la charge lente." ] },
      { type: 'warn', text: "Une tendinopathie se **gère** sur plusieurs semaines/mois, elle ne se « répare » pas en un geste. Doser à la douleur (tolérable pendant, pas de flambée le lendemain). Douleur invalidante ou nocturne, gonflement, perte de force, ou aucune amélioration après 6–12 semaines de charge bien conduite → **consulter un kiné ou un médecin**. Ceci n'est pas un avis médical." },
      { type: 'sources', items: [
        { name: 'Cook & Purdam (2009), BJSM', url: 'https://pubmed.ncbi.nlm.nih.gov/18812414/', desc: "Modèle du continuum de la tendinopathie — base de la charge progressive." },
        { name: 'Beyer/Kongsgaard et coll. (2015)', url: 'https://pubmed.ncbi.nlm.nih.gov/26018970/', desc: 'HSR (lourd & lent) ≈ excentrique, meilleure observance ; paramètres de charge.' },
        { name: 'Challoumas et coll. (2021)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8634001/', desc: 'Méta-analyse rotulien : charge en 1re intention ; concentrique = le moins efficace.' },
        { name: 'Clifford, Challoumas, Millar (2020)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7406028/', desc: "Méta-analyse : l'isométrie n'est pas supérieure à l'isotonique ; réponse variable." },
        { name: 'van der Vlist et coll. (2020)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7496962/', desc: "Achille (n=91) : aucun soulagement immédiat par l'isométrie." },
        { name: 'Article de référence (Training-Thérapie)', url: 'https://pros.training-therapie.fr/lisometrie-est-elle-la-baguette-magique-contre-les-tendinopathies/', desc: "« Ni solution unique ni méthode magique » — cadrage, HIMA/PIMA, facteurs de vie." } ] }
    ]
  },

  // ═══ Grossesse & post-natal ═══════════════════════════════════════════════
  {
    id: 'grossesse', category: 'Grossesse & post-natal', icon: '🤰', title: 'Grossesse & post-natal',
    summary: "Recommandations officielles (ACOG, HAS, SOGC) pour l'activité physique pendant la grossesse et en post-natal. Ne remplace pas l'avis d'un professionnel de santé.",
    blocks: [
      { type: 'p', text: "Ce module est basé sur les recommandations officielles des sociétés savantes françaises, canadiennes et américaines. Il ne remplace pas l'avis de ta sage-femme ou médecin — toute pratique sportive pendant la grossesse doit être validée par un professionnel de santé." },

      { type: 'h2', text: "🗣️ Intensité — test de la parole" },
      { type: 'p', text: "L'**ACOG (2020)** recommande d'utiliser uniquement le **test de la parole** pour surveiller l'intensité pendant la grossesse :" },
      { type: 'list', variant: 'plain', items: [
        "**Bonne intensité** — Tu peux parler normalement mais pas chanter",
        "**Trop intense** — Tu ne peux plus tenir une conversation → ralentir immédiatement" ] },
      { type: 'warn', text: "La limite de 145 bpm (ou 140 bpm) est une recommandation **obsolète depuis les années 1990** (ACOG 1985, abandonnée). Les réponses cardiaques varient individuellement pendant la grossesse — la fréquence cardiaque n'est pas un indicateur fiable d'intensité." },

      { type: 'h2', text: "✅ Volume recommandé" },
      { type: 'list', variant: 'ok', items: [
        "150 min/semaine d'activité modérée minimum · ACOG 2020, SOGC/CSEP 2019, HAS 2019",
        "Au moins 3 jours/semaine, idéalement tous les jours · SOGC/CSEP 2019",
        "Séances de 20–30 min minimum · ACOG 2020",
        "Pas de limite supérieure établie pour les femmes sans complications · ACOG 2020" ] },
      { type: 'p', text: "Notre programme vise 5–6 activités/semaine de 15–30 min selon le mois — conforme et au-dessus du minimum recommandé." },

      { type: 'h2', text: "✅ Activités recommandées (ACOG 2020)" },
      { type: 'list', variant: 'ok', items: [
        "**Marche** — Excellente tout au long de la grossesse",
        "**Natation** — Recommandée, portance de l'eau, pas de choc",
        "**Vélo stationnaire** — Safe, pas de risque de chute",
        "**Yoga / Pilates modifiés** — Recommandés, éviter le hot yoga",
        "**Renforcement musculaire doux** — Validé avec sage-femme ou médecin",
        "**Jogging léger** — Si pratiqué avant la grossesse et grossesse non compliquée" ] },

      { type: 'h2', text: "🚫 Activités à éviter" },
      { type: 'list', variant: 'no', items: [
        "**Sports de contact** — Rugby, boxe, hockey, arts martiaux",
        "**Risque de chute** — Ski alpin, équitation, vélo en extérieur, gymnastique",
        "**Plongée sous-marine** — Risque d'embolie gazeuse pour le fœtus",
        "**Hot yoga / Hot Pilates** — Hyperthermie maternelle dangereuse",
        "**Position allongée sur le dos** — Après le 4ème mois, compression veine cave",
        "**Abdominaux classiques** — Crunchs, sit-ups, pression abdominale excessive",
        "**Brasse jambes larges** — Si douleur pubienne (SPD)" ] },

      { type: 'h2', text: "🚫 Contre-indications absolues à l'exercice" },
      { type: 'warn', level: 'danger', text: "Source : HAS 2019, ACOG 2020, SOGC 2019. **Ne pas faire d'exercice** en présence de :" },
      { type: 'table', rows: [
        ['Rupture prématurée des membranes'],
        ['Travail prématuré en cours'],
        ['Saignement vaginal persistant inexpliqué'],
        ['Placenta praevia après 28 semaines'],
        ['Prééclampsie'],
        ['Béance du col (incompétence cervicale)'],
        ["Grossesse multiple à risque d'accouchement prématuré"],
        ['Cardiopathie hémodynamique significative'],
        ['Pneumopathie restrictive'],
        ['Diabète de type 1 non contrôlé'],
        ['HTA non contrôlée'],
        ['Retard de croissance intra-utérin sévère'] ] },

      { type: 'h2', text: "⚠️ Contre-indications relatives — consulter avant" },
      { type: 'p', text: "Discuter avec le médecin avant de commencer ou continuer l'exercice :" },
      { type: 'table', rows: [
        ['Anémie sévère'],
        ['Arythmie cardiaque maternelle'],
        ['Bronchite chronique'],
        ['Diabète de type 1 mal équilibré'],
        ['Obésité morbide (IMC > 40)'],
        ['Maigreur extrême (IMC < 12)'],
        ['Sédentarité extrême avant la grossesse'],
        ['Grossesse gémellaire après 28 SA'],
        ['HTA gestationnelle'],
        ['Hyperthyroïdie non contrôlée'] ] },

      { type: 'h2', text: "🚨 Signes d'arrêt immédiat — consulter" },
      { type: 'table', rows: [
        ['Contractions utérines'],
        ['Saignements vaginaux'],
        ['Douleur abdominale ou pelvienne aiguë'],
        ["Essoufflement anormal avant l'effort"],
        ['Vertiges ou étourdissements'],
        ['Céphalées (maux de tête)'],
        ['Douleur thoracique'],
        ['Fuite de liquide amniotique'],
        ['Diminution des mouvements du bébé'],
        ['Œdème soudain du visage, mains ou chevilles'] ] },

      { type: 'h2', text: "🦴 Douleur pubienne (SPD)" },
      { type: 'p', text: "Très fréquente à partir du 5ème mois. Elle est due à la relaxine qui assouplit les ligaments pelviens." },
      { type: 'list', variant: 'plain', items: [
        "**Symptôme** — Douleur à l'avant du pubis, parfois irradiant vers l'intérieur des cuisses",
        "**Éviter** — Squats profonds, fentes, jambes très écartées, brasse jambes larges en natation",
        "**Remplacer par** — Pont fessier latéral couché sur le côté gauche, Kegel, marche douce",
        "**Consulter** — Sage-femme ou kiné spécialisée périnée si la douleur persiste" ] },

      { type: 'h2', text: "🎯 Kegel — périnée" },
      { type: 'p', text: "Les exercices de périnée sont l'un des investissements les plus importants pour l'accouchement et la récupération post-partum." },
      { type: 'list', variant: 'plain', items: [
        "**Technique** — Contracter le périnée 8–10 s, relâcher 5 s, répéter 10 fois",
        "**Fréquence** — Plusieurs fois par jour, pas seulement en séance",
        "**Astuce** — Associe-les à une habitude : café, brossage de dents, téléphone",
        "**Position** — Assise, allongée, debout — toutes les positions fonctionnent",
        "**Ne pas** — Contracter les fesses ou abdominaux, bloquer la respiration" ] },
      { type: 'p', text: "En Pilates : synchronisation expiration + contraction périnée = approche recommandée pour les renforcer ensemble." },

      { type: 'h2', text: "📅 Adaptations par mois de grossesse" },
      { type: 'list', variant: 'plain', items: [
        "**Mois 4–5** — 20–30 min · Squat 3×12 · Extension ✓ · Psoas ✓",
        "**Mois 6** — 20 min · Squat 2×10 · Extension ✓ · Psoas ✓",
        "**Mois 7** — 15–20 min · Squat 2×8 (60° max) · Extension ✓ · Psoas ✓",
        "**Mois 8** — 15 min · Squat ⛔ · Extension ⛔ · Psoas ⛔",
        "**Mois 9** — 10–15 min · Squat ⛔ · Extension ⛔ · Psoas ⛔" ] },
      { type: 'p', text: "La suspension du squat et de l'extension à partir du 8ème mois est une précaution supplémentaire raisonnable — les recommandations officielles ne fixent pas de limite par mois mais laissent la décision à la sage-femme et à la femme enceinte selon son ressenti." },

      { type: 'h2', text: "👶 Post-natal — reprise progressive" },
      { type: 'list', variant: 'plain', items: [
        "**S1–S6 · Récupération** — Kegel très doux, respiration abdominale, marche très courte si accord médecin",
        "**S6–S12 · Reprise douce** — Kegel progressif, pont fessier, chat/vache, marche 15–20 min. Pas de course.",
        "**3–6 mois · Remise en forme** — Gainage progressif (vérifier diastase), squats, cardio léger. Course avec accord kiné.",
        "**6 mois+ · Programme standard** — Retour à un programme normal via le wizard. Allaitement = apports caloriques accrus." ] },
      { type: 'warn', text: "Attendre impérativement la visite post-natale (6 semaines) et l'accord du médecin ou sage-femme avant toute reprise sportive structurée. En cas de diastase des grands droits, consulter une kiné spécialisée périnée avant tout gainage." },

      { type: 'sources', items: [
        { name: 'ACOG 2020', url: 'https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period', desc: 'Committee Opinion No. 804 — Physical Activity and Exercise During Pregnancy and the Postpartum Period' },
        { name: 'HAS 2019', url: 'https://www.has-sante.fr/jcms/p_3261806/fr/prescription-d-activite-physique-et-sportive-grossesse-et-post-partum', desc: "Prescription d'activité physique et sportive — Grossesse et post-partum" },
        { name: 'CNSF 2021', url: 'https://www.cnsf.asso.fr/grossesse-et-activite-physique-les-nouveaux-outils-du-cnsf/', desc: 'Recommandations de pratique clinique — Activité physique périnatale' },
        { name: 'SOGC/CSEP 2019', url: 'https://www.researchgate.net/publication/328367267_2019_Canadian_guideline_for_physical_activity_throughout_pregnancy', desc: 'Canadian Guideline for Physical Activity Throughout Pregnancy (Br J Sports Med)' },
        { name: 'ANSES 2016', url: 'https://www.anses.fr/fr/content/plus-activite-physique-et-moins-de-sedentarite-une-meilleure-sante', desc: 'Repères du PNNS relatifs à l’activité physique et à la sédentarité' },
        { name: 'Ameli.fr', url: 'https://www.ameli.fr/assure/sante/devenir-parent/grossesse/grossesse-en-bonne-sante/grossesse-activite-physique/grossesse-choix-activite-physique', desc: 'Grossesse et sport — recommandations pratiques' },
        { name: 'Naître et Grandir', url: 'https://naitreetgrandir.com/fr/grossesse/sante-bien-etre/activite-physique-durant-grossesse/', desc: "L'activité physique pendant la grossesse" } ] }
    ]
  }

];

// ── Rendu ───────────────────────────────────────────────────────────────────

/** esc() + mini-markdown : **gras** puis *italique*. Ordre important (gras d'abord). */
function _inline(str) {
  return esc(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** N'autorise que http(s) pour un href (défense contre javascript:/data:). */
function _safeUrl(u) {
  try {
    const p = new URL(String(u));
    return (p.protocol === 'https:' || p.protocol === 'http:') ? p.href : null;
  } catch (e) { return null; }
}

function _renderBlock(b) {
  if (!b || typeof b !== 'object') return '';
  switch (b.type) {
    case 'h2':      return `<div class="doc-h2">${_inline(b.text)}</div>`;
    case 'p':       return `<p class="doc-p">${_inline(b.text)}</p>`;
    case 'formula': return `<div class="doc-formula">${_inline(b.text)}</div>`;
    case 'warn':    return `<div class="doc-warn${b.level === 'danger' ? ' danger' : ''}">${_inline(b.text)}</div>`;
    case 'table': {
      const head = Array.isArray(b.head)
        ? `<thead><tr>${b.head.map(h => `<th>${_inline(h)}</th>`).join('')}</tr></thead>` : '';
      const rows = (b.rows || [])
        .map(r => `<tr>${r.map(c => `<td>${_inline(c)}</td>`).join('')}</tr>`).join('');
      return `<table class="doc-table">${head}<tbody>${rows}</tbody></table>`;
    }
    case 'list': {
      const cls  = b.variant === 'ok' ? ' doc-list-ok' : b.variant === 'no' ? ' doc-list-no' : '';
      const mark = b.variant === 'ok' ? '✓ ' : b.variant === 'no' ? '✗ ' : '';
      const items = (b.items || [])
        .map(it => `<div class="doc-list-item${cls}">${mark}${_inline(it)}</div>`).join('');
      return `<div class="doc-list-simple">${items}</div>`;
    }
    case 'sources': {
      const items = (b.items || []).map(s => {
        const url  = _safeUrl(s.url);
        const name = `<strong>${_inline(s.name || '')}</strong>`;
        const link = url
          ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="doc-link">${name}</a>`
          : name;
        const desc = s.desc ? ` — ${_inline(s.desc)}` : '';
        return `<div class="doc-list-item">${link}${desc}</div>`;
      }).join('');
      return `<div class="doc-h2">Sources</div><div class="doc-list-simple">${items}</div>`;
    }
    default: return '';
  }
}

/** Regroupe les blocs d'un article en cartes : nouvelle carte à chaque h2/sources. */
function _renderArticle(a) {
  const blocks = Array.isArray(a.blocks) ? a.blocks : [];
  let i = 0, intro = '';
  while (i < blocks.length && blocks[i].type !== 'h2' && blocks[i].type !== 'sources') {
    intro += _renderBlock(blocks[i]); i++;
  }
  const summary = a.summary
    ? `<p class="doc-p" style="color:var(--text3);margin-bottom:16px">${_inline(a.summary)}</p>` : '';
  let cards = `<div class="doc-card"><div class="doc-h1">${esc(a.icon || '')} ${esc(a.title)}</div>${summary}${intro}</div>`;
  let group = '';
  for (; i < blocks.length; i++) {
    if ((blocks[i].type === 'h2' || blocks[i].type === 'sources') && group) {
      cards += `<div class="doc-card">${group}</div>`; group = '';
    }
    group += _renderBlock(blocks[i]);
  }
  if (group) cards += `<div class="doc-card">${group}</div>`;
  return cards;
}

/** Construit le sommaire (groupé par catégorie) + les cartes. Idempotent. */
export function renderResources() {
  const nav = document.getElementById('docNav');
  const content = document.getElementById('docContent');
  if (!nav || !content || content.dataset.built) return;

  const cats = [], byCat = {};
  RESOURCES.forEach(a => {
    if (!byCat[a.category]) { byCat[a.category] = []; cats.push(a.category); }
    byCat[a.category].push(a);
  });

  let navHtml = '', contentHtml = '', first = true;
  cats.forEach(cat => {
    navHtml += `<div class="doc-nav-cat">${esc(cat)}</div>`;
    byCat[cat].forEach(a => {
      const active = first ? ' active' : '';
      navHtml += `<button class="doc-nav-item${active}" data-doc="${esc(a.id)}" onclick="showDoc('${esc(a.id)}')">${esc(a.icon || '')} ${esc(a.title)}</button>`;
      contentHtml += `<div id="${esc(a.id)}" class="doc-section${active}">${_renderArticle(a)}</div>`;
      first = false;
    });
  });

  nav.innerHTML = navHtml;
  content.innerHTML = contentHtml;
  content.dataset.built = '1';
}
