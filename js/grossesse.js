/**
 * grossesse.js — Programme prénatal/post-natal complet
 * Basé sur les recommandations CNSF, HAS, SOGC/CSEP
 * Reprend fidèlement la logique du fichier programme-sport-grossesse.html
 */

// ── Config par mois ───────────────────────────────────────────────────────────

const MOIS_CONFIG = {
  4: { label:'4ème mois', icon:'🌱', banner_titre:'4ème mois — Début du 2ème trimestre', banner_texte:"Programme complet. Toutes les séances sont adaptées. L'énergie revient souvent à ce stade.", duree_marche:'25–30 min', duree_renfo:'20–25 min', duree_yoga:'20 min', duree_natation:'30–45 min · 1 km', squat_dosage:'3 × 12 répétitions', squat_supprime:false, extension_supprime:false, psoas_supprime:false, marche_note:null },
  5: { label:'5ème mois', icon:'🌿', banner_titre:'5ème mois — Programme complet', banner_texte:"Toutes les séances sont adaptées. Le centre de gravité commence à se déplacer — surveillance de l'équilibre.", duree_marche:'25–30 min', duree_renfo:'20–25 min', duree_yoga:'20 min', duree_natation:'30–45 min · 1 km', squat_dosage:'3 × 12 répétitions', squat_supprime:false, extension_supprime:false, psoas_supprime:false, marche_note:null },
  6: { label:'6ème mois', icon:'🌿', banner_titre:'6ème mois — Programme adapté', banner_texte:'Réduire légèrement les squats. Privilégier ballon et yoga. La marche reste excellente.', duree_marche:'20–25 min', duree_renfo:'20 min', duree_yoga:'20 min', duree_natation:'30 min · ~800 m', squat_dosage:'2 × 10 répétitions', squat_supprime:false, extension_supprime:false, psoas_supprime:false, marche_note:'Réduire à 20–25 min si fatigue.' },
  7: { label:'7ème mois', icon:'🌾', banner_titre:'7ème mois — Allègement progressif', banner_texte:"Squats réduits, extension 4 pattes suspendue si inconfort. Marche raccourcie. Yoga et ballon en priorité.", duree_marche:'15–20 min', duree_renfo:'15–20 min', duree_yoga:'20 min', duree_natation:'20–30 min · ~600 m', squat_dosage:'2 × 8 répétitions · descente 60° max', squat_supprime:false, extension_supprime:false, psoas_supprime:false, marche_note:'Terrain plat uniquement.' },
  8: { label:'8ème mois', icon:'🍂', banner_titre:'8ème mois — Séances courtes et douces', banner_texte:'Max 20 min par séance. Supprimer squats profonds. Garder Kegel, marche lente, ballon, yoga. Valider avec sage-femme.', duree_marche:'15 min max', duree_renfo:'15 min', duree_yoga:'15–20 min', duree_natation:'20 min · ~400 m', squat_dosage:null, squat_supprime:true, extension_supprime:true, psoas_supprime:true, marche_note:'Terrain plat, allure lente.' },
  9: { label:'9ème mois', icon:'🍁', banner_titre:'9ème mois — Douceur et préparation', banner_texte:"Séances très courtes. Marche lente quotidienne, Kegel pluriquotidiens, ballon sur le bassin. Valider chaque activité avec la sage-femme.", duree_marche:'10–15 min', duree_renfo:'10 min · Kegel seul', duree_yoga:'15 min', duree_natation:'15 min · bain thérapeutique', squat_dosage:null, squat_supprime:true, extension_supprime:true, psoas_supprime:true, marche_note:'Marche très lente, terrain plat.' },
};

// ── Exercices par séance ──────────────────────────────────────────────────────

const SEANCES_PRENATAL = {
  marche: {
    tag:'Endurance · Lun & Sam', title:'Marche active', icon:'🚶‍♀️', mat:'Dehors',
    exercices:[
      { id:'ech', name:'Échauffement marche lente', dosage:'3 min', desc:'Marche lente avec rotations douces des chevilles, épaules et cou. Progresser en allure sur 3 minutes.', tip:'💡 Commence dans la rue dès le départ.', video:null },
      { id:'marche_soutenue', name:'Marche à allure soutenue', dosage_fn: m => MOIS_CONFIG[m].duree_marche, desc:"Allure permettant de tenir une conversation (test de la parole). Dos droit, abdos légèrement engagés. Si tu pousses la poussette, ça compte !", tip_fn: m => MOIS_CONFIG[m].marche_note ? '⚠️ ' + MOIS_CONFIG[m].marche_note + ' FC max : 145 bpm.' : '⚠️ FC max : 145 bpm. Ralentis si tu ne peux plus parler.', video:null },
      { id:'retour_marche', name:'Retour au calme + étirements', dosage:'3 min', desc:'Marche lente 2 min, étirement des mollets 30 s par côté. Rotation lente des hanches debout.', tip:'💡 Profite du retour à la maison pour finir en marchant doucement.', video:null },
    ]
  },
  renfo: {
    tag:'Renforcement · Mar & Ven', title:'Renforcement doux', icon:'💪', mat:'Tapis + ballon',
    exercices:[
      { id:'ech_renfo', name:'Échauffement — mobilisation ballon', dosage:'3 min', desc:"Assise sur le ballon, pieds à plat. Cercles lents du bassin dans les deux sens (8 × chaque sens). Puis balancement avant/arrière. Puis rotations douces des épaules et des chevilles.", tip:'💡 Active la circulation, réveille les muscles profonds et prépare le périnée sans effort.', video:'1x0RTGdyAww', video_label:'Bien utiliser le ballon enceinte', ballon:true },
      { id:'kegel', name:'Kegel (périnée) — rappel quotidien', dosage:'3 × 10 · 8–10 s', desc:"Assise sur le ballon ou côté gauche. Contracter le périnée 8–10 s, relâcher 5 s. Ne pas bloquer la respiration, ne pas contracter les fesses. À faire aussi hors séances : au réveil, pendant la natation, sur le canapé.", tip:"💡 Imagine un ascenseur qui monte 5 étages. Objectif : plusieurs fois par jour, pas seulement en séance.", video:'WfcVJUQHAts', video_label:'Exercices ballon grossesse – MyFrenchPhysio', ballon:true },
      { id:'squat', name:'Squat mural (ballon)', dosage_fn: m => MOIS_CONFIG[m].squat_dosage, supprime_fn: m => MOIS_CONFIG[m].squat_supprime, desc:"Ballon entre ton dos et le mur. Pieds à largeur d'épaules, avancés. Descends jusqu'à 90° max (ou confort), genou dans l'axe des orteils. Remonte sur l'expiration.", tip:"⚠️ Genoux ne dépassent pas les orteils. Arrête si douleur au pubis (SPD).", video:'u0Nx0KbHkRQ', video_label:'Fitness grossesse ballon – Aurélie Edmond', ballon:true, supprime_msg:"Squat supprimé à partir du 8ème mois. Remplacé par le pont fessier et le Kegel." },
      { id:'pont', name:'Pont fessier latéral (côté gauche)', dosage:'2 × 12 par côté', desc:"Allongée sur le côté gauche, jambe du dessus fléchie sur un coussin. Relève lentement le genou du dessus (ouverture de hanche), maintiens 2 s, redescends. Renforce fessiers et abducteurs sans pression abdominale.", tip:"💡 Parfaite à partir du 5ème mois et jusqu'au terme. Idéale en cas de SPD (douleur pubienne).", video:'CWa-cAZuVyE', video_label:'Training cuisses/fessiers grossesse' },
      { id:'chat', name:'Rotation de chat (4 pattes)', dosage:'2 × 10 répétitions', desc:"À 4 pattes, mains sous épaules, genoux sous hanches. Expiration → dos rond, tête vers le bas, périnée fermé. Inspiration → dos plat, regard devant. Rythme lent.", tip:"⚠️ Ne pas creuser le dos en inspiration — rester plat, pas cambré.", video:'DcARcvpeJeA', video_label:'Yoga 5ème mois ballon' },
      { id:'extension', name:'Extension bras / jambe opposée (4 pattes)', dosage:'2 × 8 par côté', supprime_fn: m => MOIS_CONFIG[m].extension_supprime, desc:"À 4 pattes. Sur l'expiration, étends bras droit + jambe gauche, maintiens 3 s. Reviens lentement. Alterne. Gainage profond sans pression abdominale.", tip:"💡 Regard vers le sol — ne pas lever la tête. Arrête si inconfort lombaire.", video:'vf2iERTz2W0', video_label:'Renfo Swiss ball grossesse – FitMumFrance', supprime_msg:"Exercice suspendu à partir du 8ème mois — inconfort lombaire fréquent." },
      { id:'cheville', name:'Cercles de cheville + élévation sur ballon', dosage:'2 × 15 par côté', desc:"Assise sur le ballon. Grands cercles de cheville dans les deux sens. Puis lever un pied à l'horizontale, maintenir 3–5 s. Réduit les oedèmes.", tip:"💡 Peut se faire le soir devant la télé, même assise sur une chaise.", video:'kDxnxL3X7Ig', video_label:'Ballon grossesse – soulagement dos & chevilles', ballon:true },
    ]
  },
  yoga: {
    tag:'Mobilité · Mercredi', title:'Yoga prénatal', icon:'🧘‍♀️', mat:'Tapis + ballon',
    exercices:[
      { id:'ech_yoga', name:'Échauffement — balancement bassin sur ballon', dosage:'2–3 min', desc:"Assise sur le ballon, dos droit. Cercles très lents du bassin (8 dans chaque sens). Puis bascules avant/arrière. Puis balancement latéral. Bouche légèrement ouverte, respiration libre.", tip:"💡 Soulage immédiatement les tensions lombaires. Ce mouvement est utilisé pendant le travail.", video:'aZBDcRXAkho', video_label:'Ballon soulager le dos grossesse – France 5', ballon:true },
      { id:'respiration', name:'Respiration abdominale', dosage:'2 min · ouverture de séance', desc:"Assise sur le ballon, dos droit. Inspire par le nez en laissant le ventre se gonfler, expire lentement par la bouche. Pose une main sur le ventre. Connecte-toi à bébé.", tip:"💡 Lumière tamisée, musique douce. Ce rituel signale au corps « mode détente ».", video:'1I8D1pKG7pg', video_label:'Yoga prénatal 4–5ème mois', ballon:true },
      { id:'papillon', name:'Posture du papillon', dosage:'2 min', desc:"Assise sur le tapis, plantes des pieds jointes, dos droit (adossée au mur si besoin). Ouvre les hanches, prépare à l'accouchement. Ne pas forcer vers le sol.", tip:"💡 Glisse une couverture pliée sous les fesses si le bas du dos tire.", video:null },
      { id:'enfant', name:"Posture de l'enfant modifiée", dosage:'2 × 1 min', desc:"À 4 pattes, recule les fesses vers les talons. Genoux très écartés pour laisser la place au ventre. Bras tendus devant, front sur le tapis. Relâche complètement le bas du dos.", tip:"⚠️ Genoux écartés — indispensable avec le ventre qui s'arrondit.", video:'HQKum8dPY_8', video_label:'10 min yoga prénatal ballon' },
      { id:'torsion', name:'Rotation douce du buste assise', dosage:'30 s par côté · amplitude très limitée', desc:"Assise sur une chaise stable. Pieds à plat, bassin fixe. Rotation très lente et légère du buste. Main sur l'appui de chaise, respiration libre.", tip:"⚠️ Amplitude très limitée. Ne jamais forcer ni retenir la respiration. Arrêter si tiraillement abdominal.", video:null },
      { id:'psoas', name:'Étirement du psoas (fente au sol)', dosage:'30 s par côté', supprime_fn: m => MOIS_CONFIG[m].psoas_supprime, desc:"Grande fente avant, genou arrière au sol (sur tapis plié). Bassin vers l'avant, dos droit. Maintenir. Soulage douleurs lombaires.", tip:"💡 Tiens-toi à une chaise ou au mur. ⚠️ Si douleur au pubis (SPD), remplace par la posture enfant.", video:null, supprime_msg:"Exercice suspendu à partir du 8ème mois — remplacé par posture enfant modifiée." },
      { id:'relaxation', name:'Relaxation côté gauche', dosage:'5 min', desc:"Allongée sur le côté gauche, jambe du dessus fléchie sur un coussin. Respiration lente 4 s (inspiration) / 6 s (expiration). Visualisation positive.", tip:"💡 Position côté gauche = optimal pour la circulation sanguine placentaire.", video:null },
    ]
  },
  pilates: {
    tag:'Pilates prénatal · Mar & Ven', title:'Pilates prénatal', icon:'✨', mat:'Tapis + ballon',
    exercices:[
      { id:'ech_pil', name:'Échauffement — respiration costale + ballon', dosage:'3 min', desc:"Assise sur le ballon, dos droit, mains sur les côtes. Inspire en laissant les côtes s'écarter latéralement. Expire lentement. Puis 8 cercles lents du bassin dans chaque sens.", tip:"💡 La respiration costale est la base du Pilates prénatal — elle évite d'appuyer sur l'abdomen.", video_fn: m => ({ id: m<=5?'BFuFib7wIcM':m==6?'X6XfZ8aT7ro':m==7?'_I1Hzj_WLPM':m==8?'OC3HUKigMSY':'qacjFjJKXTA', label:'Pilates prénatal '+m+'ème mois – Géraldine Navionis' }), ballon:true },
      { id:'pil_kegel', name:'Kegel intégré à la respiration', dosage:'2 × 10 · 8 s', desc:"Assise sur le ballon. À chaque expiration, contracte le périnée. À l'inspiration, relâche complètement. Le Pilates et le Kegel se font ensemble.", tip:"💡 En Pilates, le périnée et le transverse travaillent ensemble. Ne pas contracter les fessiers.", video:null, ballon:true },
      { id:'pil_transverse', name:'Activation du transverse (4 pattes)', dosage:'3 × 8 respirations', desc:"À 4 pattes. Sur l'expiration : engagement très doux du ventre profond vers la colonne. Maintenir 3 s. Aucune pression abdominale.", tip:"⚠️ Mouvement intérieur très subtil — engagement doux, pas fort. Aucune pression sur l'abdomen.", video:null },
      { id:'pil_pont', name:'Pont pelvien latéral (côté gauche)', dosage:'2 × 12 par côté', desc:"Allongée sur le côté gauche. En expirant : remonte le genou du dessus tout en contractant le périnée. En inspirant : redescends et relâches. Synchronisation respiration-périnée.", tip:"💡 La synchronisation expiration + contraction périnée est le coeur du Pilates prénatal.", video:'CWa-cAZuVyE', video_label:'Training cuisses/fessiers grossesse' },
      { id:'pil_chat', name:'Chat Pilates (4 pattes)', dosage:'2 × 10 répétitions', desc:"À 4 pattes. Expire → dos rond, nombril légèrement rentré, tête vers le bas, périnée contracté. Inspire → dos plat, relâche tout. Plus lent et intentionnel que le chat classique.", tip:"⚠️ Ne pas creuser le dos en inspiration. Sentir le gainage profond à chaque expiration.", video:null },
      { id:'pil_ballon_lat', name:'Inclinaison latérale sur ballon', dosage:'2 × 8 par côté', supprime_fn: m => m >= 8, desc:"Assise sur le ballon, pieds écartés. En expirant, incline lentement le buste vers le côté. Inspire pour revenir au centre. Étire les flancs et soulage le ventre.", tip:"💡 Amplitude douce — 15–20 cm max. Le ballon amplifie la sensation d'étirement latéral.", video:null, ballon:true, supprime_msg:"Exercice suspendu à partir du 8ème mois — équilibre instable sur ballon." },
      { id:'pil_relaxation', name:'Relaxation Pilates (côté gauche)', dosage:'5 min', desc:"Allongée sur le côté gauche, coussin entre les genoux. Respiration costale lente : 4 s inspiration, 6 s expiration. À chaque expiration, relâche consciemment nuque, épaules, dos, hanches, jambes.", tip:"💡 La relaxation active entraîne le corps à relâcher — compétence clé pendant le travail.", video:null },
    ]
  },
  natation: {
    tag:'Endurance · Optionnel', title:'Natation', icon:'🏊‍♀️', mat:'Piscine',
    exercices:[
      { id:'ech_nat', name:'Échauffement', dosage:'5 min lent', desc:"Dos crawlé ou brasse très lente. Les 5 premières minutes font monter la FC progressivement.", tip:"💡 La natation est l'une des activités les plus recommandées pendant la grossesse.", video:null },
      { id:'corps_nat', name:'Corps principal — brasse / dos crawlé', dosage_fn: m => MOIS_CONFIG[m].duree_natation, desc:"Préférer dos crawlé et brasse. Éviter le crawl avec rotation de tronc excessive. Allure conversationnelle. Alterner les nages.", tip:"⚠️ Évite la brasse jambes larges si douleur au pubis (SPD).", video:null },
      { id:'retour_nat', name:'Retour au calme + bord', dosage:'5 min', desc:"Derniers longueurs très lents. Au bord : battements de jambes doucement, rotations d'épaules dans l'eau. Étirements mollets hors de l'eau.", tip:"💡 L'aquagym en groupe est une excellente option si ta piscine en propose.", video:null },
    ]
  },
  repos: {
    tag:'Récupération · Dimanche', title:'Récupération active', icon:'🌿', mat:"Tapis · n'importe où",
    exercices:[
      { id:'kegel_repos', name:'Kegel quotidien', dosage:'3 × 10 · 10 s', desc:"À faire n'importe où : canapé, bain, lit sur le côté. Contracter le périnée 10 s, relâcher 5 s. L'investissement le plus important pour l'accouchement et la récupération post-partum.", tip:"💡 Associe-le à une habitude existante (café, brossage de dents, téléphone).", video:null },
      { id:'marche_douce', name:'Marche légère (optionnel)', dosage_fn: m => m >= 8 ? '10 min max, très lent' : '10–15 min si envie', desc:"Sortie courte à ton rythme. Pas d'objectif de vitesse.", tip:"💡 Avec ton enfant = combo sport + moment ensemble.", video:null },
      { id:'relax_repos', name:'Respiration & relaxation', dosage:'5 min', desc:"Allongée sur le côté gauche, coussin entre les genoux. 5 minutes de respiration abdominale lente.", tip:"🌿 Le dimanche est un jour de récupération — ne culpabilise pas de faire peu.", video:null },
    ]
  },
};

const SEMAINE_TYPE = [
  { jour:'Lundi',    seance:'marche',   alt:null },
  { jour:'Mardi',    seance:'renfo',    alt:'pilates' },
  { jour:'Mercredi', seance:'yoga',     alt:null },
  { jour:'Jeudi',    seance:'natation', alt:null },
  { jour:'Vendredi', seance:'renfo',    alt:'pilates' },
  { jour:'Samedi',   seance:'marche',   alt:null },
  { jour:'Dimanche', seance:'repos',    alt:null },
];

const CONSEILS_HTML = `
<div class="conseil-block">
  <div class="conseil-title">🗣️ Intensité modérée — test de la parole</div>
  <div class="conseil-card">Tu dois pouvoir tenir une conversation pendant l'effort. <strong>FC max : 145 bpm.</strong> Ralentis immédiatement si tu ne peux plus parler.</div>
</div>
<div class="conseil-block">
  <div class="conseil-title">⚠️ Positions à éviter</div>
  <div class="conseil-card">Pas de position allongée sur le dos après le 4ème mois → toujours côté gauche. Pas de crunchs, sit-ups ou abdominaux classiques. Pas de sauts, sports de contact.</div>
</div>
<div class="conseil-block">
  <div class="conseil-title">🦴 Douleur pubienne (SPD)</div>
  <div class="conseil-card">Si douleur à l'avant du pubis : éviter squats profonds, fentes, jambes très écartées. Remplacer par pont fessier latéral couché. En natation : éviter la brasse jambes larges. Mentionner à la sage-femme.</div>
</div>
<div class="conseil-block">
  <div class="conseil-title">🎯 Kegel — objectif pluriquotidien</div>
  <div class="conseil-card">Les Kegel se font <strong>plusieurs fois par jour</strong>, pas seulement en séance. 3 × 10 contractions de 8–10 s = 5 min. Associe-les à une habitude : café, brossage de dents, téléphone.</div>
</div>
<div class="conseil-block">
  <div class="conseil-title">💧 Hydratation & chaleur</div>
  <div class="conseil-card">Boire avant, pendant et après chaque séance. Éviter l'exercice en pleine chaleur ou pièce mal ventilée.</div>
</div>
<div class="conseil-block">
  <div class="conseil-title">⚕️ Validation médicale</div>
  <div class="conseil-card">La séance de renforcement musculaire doit être validée par ta sage-femme ou médecin avant le début du programme. Durée max par séance : 90 min (non contraignant ici).</div>
</div>
<div class="conseil-block alert">
  <div class="conseil-title">🚨 Signes d'arrêt immédiats — consulter si :</div>
  <div class="conseil-card" style="color:var(--red)">contractions · saignements · douleur abdominale ou pelvienne aiguë · essoufflement anormal · vertiges · gonflement soudain · diminution des mouvements du bébé</div>
</div>
<div class="conseil-block">
  <div class="conseil-title">📚 Sources</div>
  <div class="conseil-card" style="font-size:11px;color:var(--text3)">CNSF – Recommandations de pratique clinique, mars 2021 · HAS – Grossesse et post-partum · ANSES 2016 · Guide canadien SOGC/CSEP, Br J Sports Med 2018;52:1339-46 · Ameli.fr · NaîtreetGrandir.ca</div>
</div>`;

// ── Post-natal config ─────────────────────────────────────────────────────────

const POSTNATAL_PROGRAMS = {
  's1-6': {
    label:'S1–S6 · Récupération immédiate',
    exercices:[
      { name:'Kegel doux', dosage:'5 × 5 s · plusieurs fois/jour', desc:"Contractions très douces, pas encore profondes. Même si tu as eu une césarienne — attends S3.", tip:"💡 Commence dès le lendemain de l'accouchement si vaginal, à S3 si césarienne.", video:null },
      { name:'Respiration abdominale profonde', dosage:'5 min · 3×/jour', desc:"Allongée ou assise. Inspire, laisse le ventre se gonfler. Expire lentement. Reconnecte-toi à tes abdominaux profonds.", tip:"💡 Aide à réduire les oedèmes et à relancer la circulation.", video:null },
      { name:'Marche très courte', dosage:'5–10 min · si accord médecin', desc:"Marche très lente à l'intérieur ou dehors. Pas de montée d'escaliers en charge.", tip:"⚠️ Attendre le feu vert médical. Ne pas forcer.", video:null },
    ]
  },
  's6-12': {
    label:'S6–S12 · Reprise douce',
    exercices:[
      { name:'Kegel progressif', dosage:'3 × 10 · 8–10 s · 2×/jour', desc:"Contractions plus profondes et plus longues. Vérifier avec la sage-femme l'absence de fuite urinaire.", tip:"💡 Si fuites urinaires à l'effort : consulter une kiné spécialisée périnée.", video:null },
      { name:'Pont fessier couché', dosage:'3 × 12', desc:"Allongée sur le dos, genoux fléchis. Relever le bassin, maintenir 2 s, redescendre lentement. Ne pas cambrer.", tip:"💡 Toujours synchroniser avec la respiration. Expiration = montée.", video:null },
      { name:'Chat / Vache (4 pattes)', dosage:'2 × 10 respirations', desc:"À 4 pattes. Mobilisation douce du dos. Ne pas creuser.", tip:"💡 Aide à soulager les tensions du dos dues au portage.", video:null },
      { name:'Marche progressive', dosage:'15–20 min · terrain plat', desc:"Augmenter progressivement. Test de la parole toujours valable.", tip:"⚠️ Pas de course à pied avant S12 minimum et accord kiné périnée.", video:null },
    ]
  },
  's12-24': {
    label:'3–6 mois · Remise en forme',
    exercices:[
      { name:'Gainage progressif', dosage:'3 × 30 s · progression', desc:"Planche sur genoux, puis sur pointes de pieds. Gainage latéral. Vérifier l'absence de diastase.", tip:"⚠️ Si tu vois une bosse au milieu du ventre en position de planche : diastase → consulter kiné.", video:null },
      { name:'Squats', dosage:'3 × 15', desc:"Squats classiques, dos droit. Progression des charges très progressive.", tip:"💡 Retour progressif à la force musculaire.", video:null },
      { name:'Cardio léger', dosage:'20–30 min · 3×/sem', desc:"Marche rapide, vélo stationnaire, natation. Éviter la course si pas encore validée.", tip:"⚠️ Course à pied : uniquement après accord d'une kiné spécialisée plancher pelvien.", video:null },
    ]
  },
  '6m+': {
    label:'6 mois+ · Programme standard',
    exercices:[
      { name:'Programme adapté à ton niveau', dosage:'Voir wizard', desc:"Tu peux reprendre un programme classique (force, gym, cardio) via le wizard. Renseigne ton niveau actuel et tes contraintes.", tip:"💡 Allaitement = prévoir une alimentation adaptée (apports caloriques supplémentaires).", video:null },
    ]
  },
};

// ── Rendering functions ───────────────────────────────────────────────────────

export function renderGrossesseProgram(prog, weekNum, container) {
  if(!prog || !container) return;

  const mois = prog.config?.mois_grossesse || 5;
  const type = prog.config?.grossesse_type || 'prenatal';
  const mc   = MOIS_CONFIG[mois] || MOIS_CONFIG[5];

  if(type === 'postnatal') {
    _renderPostnatal(prog, container);
    return;
  }

  // Prenatal: week view with day cards
  let html = `
    <div class="g-banner" style="background:${_bannerColor(mois)}">
      <span class="g-banner-icon">${mc.icon}</span>
      <div><strong>${mc.banner_titre}</strong><br><span style="font-size:11px">${mc.banner_texte}</span></div>
    </div>

    <div class="g-tabs">
      <button class="g-tab active" data-gtab="planning">📅 Planning</button>
      <button class="g-tab" data-gtab="seances">🤸 Séances</button>
      <button class="g-tab" data-gtab="conseils">💡 Conseils</button>
    </div>

    <div id="g-planning" class="g-panel active">
      <div class="g-week-grid">
        ${SEMAINE_TYPE.map(day => {
          const s = SEANCES_PRENATAL[day.seance];
          const dur = _seanceDuration(day.seance, mois);
          return `<div class="g-day-card" data-gday="${day.seance}">
            <div class="g-day-name">${day.jour}</div>
            <div class="g-day-seance">${s.icon} ${s.title}</div>
            <div class="g-day-dur">${dur}</div>
            ${day.alt ? `<div class="g-day-alt" data-gday="${day.alt}">ou ${SEANCES_PRENATAL[day.alt].icon} ${SEANCES_PRENATAL[day.alt].title}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <div id="g-seances" class="g-panel">
      <div class="g-seance-list">
        ${Object.entries(SEANCES_PRENATAL).map(([key, s]) => `
          <div class="g-seance-card" data-gseance="${key}">
            <div class="g-seance-card-top">
              <span>${s.icon} <strong>${s.title}</strong></span>
              <span class="g-seance-tag">${s.tag}</span>
            </div>
            <div class="g-seance-mat">🎒 ${s.mat}</div>
          </div>`).join('')}
      </div>
      <div id="g-seance-detail" style="display:none"></div>
    </div>

    <div id="g-conseils" class="g-panel">
      ${CONSEILS_HTML}
    </div>`;

  container.innerHTML = html;
  _bindGrossesseEvents(mois, container);
}

function _renderPostnatal(prog, container) {
  const phase   = prog.config?.postnatal_phase || 's6-12';
  const pConfig = POSTNATAL_PROGRAMS[phase];

  container.innerHTML = `
    <div class="g-banner" style="background:#e8f0fc">
      <span class="g-banner-icon">👶</span>
      <div><strong>Post-natal — ${pConfig.label}</strong><br><span style="font-size:11px">Programme progressif basé sur les recommandations HAS</span></div>
    </div>
    <div class="g-exercices-list">
      ${pConfig.exercices.map((ex, i) => `
        <div class="g-ex-block">
          <div class="g-ex-header">
            <span class="g-ex-num">Exercice ${i+1}</span>
            <span class="g-ex-name">${ex.name}</span>
            <span class="g-ex-dosage">${ex.dosage}</span>
          </div>
          <div class="g-ex-body">
            <div class="grossesse-ex-desc">${ex.desc}</div>
            <div class="grossesse-ex-note">${ex.tip}</div>
            ${ex.video ? `<a class="grossesse-video-btn" href="https://www.youtube.com/watch?v=${ex.video}" target="_blank" rel="noopener">▶ Voir la démonstration</a>` : ''}
          </div>
        </div>`).join('')}
    </div>
    <div class="g-conseils-note">⚕️ Attendre la visite post-natale (6 semaines) et l'accord du médecin ou sage-femme avant toute reprise.</div>`;
}

function _buildSeanceDetail(seanceKey, mois) {
  const s = SEANCES_PRENATAL[seanceKey];
  if(!s) return '';

  let html = `<button class="g-back-btn" data-gback="seances">← Retour aux séances</button>
    <div class="g-seance-title">${s.icon} ${s.title}</div>
    <div class="g-seance-mat">🎒 ${s.mat} · ${_seanceDuration(seanceKey, mois)}</div>
    <div class="g-alert-card">💬 Test de la parole à tout moment. Arrête si douleur, vertiges ou contractions.</div>
    <div class="g-exercices-list">`;

  s.exercices.forEach((ex, i) => {
    const dosage = ex.dosage_fn ? ex.dosage_fn(mois) : ex.dosage;
    const tip    = ex.tip_fn ? ex.tip_fn(mois) : ex.tip;
    const isSupprime = ex.supprime_fn ? ex.supprime_fn(mois) : false;
    const video  = ex.video_fn ? ex.video_fn(mois) : { id: ex.video, label: ex.video_label };
    const isVideObj = typeof video === 'object' && video?.id;

    html += `<div class="g-ex-block ${isSupprime ? 'g-ex-supprime' : ''}">
      <div class="g-ex-header">
        <span class="g-ex-num">Exercice ${i+1}</span>
        <span class="g-ex-name">${ex.name}</span>
        ${!isSupprime ? `<span class="g-ex-dosage">${dosage || '—'}</span>` : ''}
        ${ex.ballon && !isSupprime ? '<span class="ballon-badge">🎈 Ballon</span>' : ''}
        ${isSupprime ? '<span class="g-badge-supprime">⛔ Suspendu</span>' : ''}
      </div>`;

    if(isSupprime) {
      html += `<div class="g-supprime-msg">⛔ ${ex.supprime_msg || 'Exercice suspendu pour ce mois.'}</div>`;
    } else {
      html += `<div class="g-ex-body">
        <div class="grossesse-ex-desc">${ex.desc}</div>
        ${tip ? `<div class="grossesse-ex-note">${tip}</div>` : ''}
        ${isVideObj ? `<a class="grossesse-video-btn" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener">▶ ${video.label}</a>` : ''}
        ${!isVideObj && ex.video ? `<a class="grossesse-video-btn" href="https://www.youtube.com/watch?v=${ex.video}" target="_blank" rel="noopener">▶ ${ex.video_label || 'Voir la démonstration'}</a>` : ''}
      </div>`;
    }
    html += '</div>';
  });

  html += '</div>';
  return html;
}

function _bindGrossesseEvents(mois, container) {
  // Tab switching
  container.addEventListener('click', e => {
    const tab = e.target.closest('[data-gtab]');
    if(tab) {
      container.querySelectorAll('.g-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.g-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      container.querySelector(`#g-${tab.dataset.gtab}`)?.classList.add('active');
      return;
    }

    // Day card click → show seance in seances tab
    const dayCard = e.target.closest('[data-gday]');
    if(dayCard) {
      const seanceKey = dayCard.dataset.gday;
      // Switch to séances tab
      container.querySelectorAll('.g-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.g-panel').forEach(p => p.classList.remove('active'));
      container.querySelector('[data-gtab="seances"]')?.classList.add('active');
      container.querySelector('#g-seances')?.classList.add('active');
      // Show detail
      const list = container.querySelector('.g-seance-list');
      const detail = container.querySelector('#g-seance-detail');
      if(list && detail) {
        list.style.display = 'none';
        detail.style.display = 'block';
        detail.innerHTML = _buildSeanceDetail(seanceKey, mois);
        _bindBackBtn(container, mois);
      }
      return;
    }

    // Seance card click
    const seanceCard = e.target.closest('[data-gseance]');
    if(seanceCard) {
      const list = container.querySelector('.g-seance-list');
      const detail = container.querySelector('#g-seance-detail');
      if(list && detail) {
        list.style.display = 'none';
        detail.style.display = 'block';
        detail.innerHTML = _buildSeanceDetail(seanceCard.dataset.gseance, mois);
        _bindBackBtn(container, mois);
      }
    }
  });
}

function _bindBackBtn(container, mois) {
  container.querySelector('[data-gback]')?.addEventListener('click', () => {
    const list = container.querySelector('.g-seance-list');
    const detail = container.querySelector('#g-seance-detail');
    if(list && detail) { list.style.display = ''; detail.style.display = 'none'; }
  });
}

function _seanceDuration(seance, mois) {
  const mc = MOIS_CONFIG[mois] || MOIS_CONFIG[5];
  const map = { marche: mc.duree_marche, renfo: mc.duree_renfo, yoga: mc.duree_yoga, natation: mc.duree_natation, pilates: mc.duree_renfo, repos: '15–20 min' };
  return map[seance] || '20 min';
}

function _bannerColor(mois) {
  const colors = { 4:'#e8f5e2', 5:'#e8f5e2', 6:'#f0f5e8', 7:'#f5f0e0', 8:'#fdf0d8', 9:'#fde8d8' };
  return colors[mois] || '#f6f5f0';
}
