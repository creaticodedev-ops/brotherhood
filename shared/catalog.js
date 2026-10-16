/** Editorial archive seeded from Brotherhood photographs. Dates and impact figures are omitted when they are not visible on the material. */

export const CATEGORIES = {
  mission: [
    { id: 'caravane', fr: 'Caravanes', en: 'Caravans', ar: 'قوافل' },
    { id: 'alimentaire', fr: 'Alimentaire', en: 'Food', ar: 'غذائي' },
    { id: 'proximite', fr: 'Proximité', en: 'Neighborhood', ar: 'قرب' },
    { id: 'communaute', fr: 'Communauté', en: 'Community', ar: 'مجتمع' },
  ],
  activity: [
    { id: 'groupe', fr: 'Groupe', en: 'Group', ar: 'المجموعة' },
    { id: 'evenement', fr: 'Événements', en: 'Events', ar: 'فعاليات' },
    { id: 'jeunesse', fr: 'Jeunesse', en: 'Youth', ar: 'شباب' },
    { id: 'sport', fr: 'Sport', en: 'Sport', ar: 'رياضة' },
    { id: 'creation', fr: 'Création', en: 'Creation', ar: 'إبداع' },
    { id: 'preparation', fr: 'Préparation', en: 'Preparation', ar: 'تحضير' },
  ],
}

const shot = (file, alt, caption = '') => ({ src: `/media/${file}.jpg`, alt, caption })

export const STORIES = [
  {
    kind: 'mission',
    slug: 'qafalat-al-dafa',
    title: 'قافلة الدفء',
    summary: 'Une caravane de solidarité vers les zones de montagne, portée par les banderoles, les distributions et le travail sur place du groupe.',
    body: [
      'Les photographies montrent une sortie collective marquée « قافلة الدفء أسفي ». Une banderole adresse « للكرم عنوان، أبطاله سكان الجبال ». Le groupe et des habitants posent ensemble devant un bâtiment en construction, dans un paysage de collines.',
      'D’autres images documentent le geste concret : caisses déchargées d’un camion face à des sommets enneigés, sacs colorés alignés, couvertures remises à des enfants, et une structure de tente montée à flanc de montagne.',
      'Aucun chiffre de bénéficiaires n’est affiché sur ces images. Le récit s’en tient à ce qui est visible.',
    ],
    category: 'caravane',
    location: 'Asfi — zones de montagne',
    year: '',
    featured: true,
    published: true,
    sort: 10,
    cover: '/media/warmth-group.jpg',
    images: [
      shot('warmth-group', 'Groupe et habitants rassemblés sous les banderoles de la caravane قافلة الدفء à Asfi', 'Rassemblement sous la banderole de la caravane.'),
      shot('mountain-aid', 'Distribution de couvertures, d’eau et de cartons dans un relief montagneux', 'Matériel rassemblé sur le site de distribution.'),
      shot('truck-unload', 'Bénévoles déchargeant des cartons d’un camion, avec des montagnes enneigées à l’arrière-plan', 'Déchargement face aux sommets.'),
      shot('tent-frame', 'Équipe en rouge montant une armature de tente dans les montagnes', 'Montage d’une structure sur place.'),
      shot('blankets', 'Jeunes recevant des couvertures bleues, montagnes enneigées derrière eux', 'Remise de couvertures.'),
      shot('color-bags', 'Sacs colorés préparés par des membres en gilet Brotherhood', 'Préparation des sacs.'),
      shot('sorting-bags', 'Membres rangeant des sacs devant une banderole Brotherhood', 'Tri avant la distribution.'),
      shot('village-rows', 'Rangs de sacs colorés alignés au pied d’un village de montagne', 'Les sacs alignés sur le site.'),
    ],
  },
  {
    kind: 'mission',
    slug: 'distributions-alimentaires',
    title: 'Distributions alimentaires',
    summary: 'Denrées, sacs et tables partagées. Un visuel du groupe annonce une campagne d’iftar.',
    body: [
      'Devant une banderole « روح العائلة », des sacs de farine et de préparation pour gâteau sont alignés. Le conditionnement est celui d’une distribution, pas d’une réserve anonyme.',
      'Un visuel publié par Brotherhood, posé sur une pelouse avec des sacs noirs aux couleurs du groupe, indique « 120 إفطار » et « رمضان كريم ». Ce nombre est celui du visuel : il n’est pas repris ici comme un bilan vérifié indépendamment.',
      'D’autres photographies montrent des tables occupées, de nuit sous la même banderole, et sous un chapiteau aux couleurs de Brotherhood.',
    ],
    category: 'alimentaire',
    location: '',
    year: '',
    featured: true,
    published: true,
    sort: 20,
    cover: '/media/iftar-120.jpg',
    images: [
      shot('iftar-120', 'Sacs noirs Brotherhood devant un visuel « 120 إفطار » et une bannière Enlightened Mentality', 'Visuel de campagne publié par le groupe.'),
      shot('flour-bags', 'Sacs de farine et de préparation devant la banderole روح العائلة', 'Denrées préparées pour la distribution.'),
      shot('night-meal', 'Repas partagé de nuit devant la banderole روح العائلة', 'Table du soir.'),
      shot('tent-meal', 'Enfants et jeunes attablés sous un chapiteau Brotherhood', 'Repas sous le chapiteau.'),
    ],
  },
  {
    kind: 'mission',
    slug: 'presences-en-ville',
    title: 'Présences en ville',
    summary: 'Des membres du groupe photographiés en déplacement avec des habitants, dans des rues et des quartiers.',
    body: [
      'Un membre porte un mouton sur l’épaule le long d’un trottoir. Plus loin, deux autres avancent avec un second mouton, l’un d’eux portant un gilet « BROTHER ».',
      'Une autre image suit un petit groupe qui marche vers des constructions inachevées, aux côtés d’une habitante et d’un cheval. Le cadre est celui d’un quartier, pas d’une scène posée en studio.',
      'Ces photographies ne nomment ni une date ni un quartier. Elles documentent une présence, rien de plus.',
    ],
    category: 'proximite',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 30,
    cover: '/media/sheep-street.jpg',
    images: [
      shot('sheep-street', 'Membre de Brotherhood portant un mouton dans une rue', 'Déplacement en ville.'),
      shot('sheep-walk', 'Deux membres marchant avec un mouton, gilet Brotherhood visible', 'Le gilet du groupe dans la rue.'),
      shot('neighborhood', 'Groupe marchant dans un quartier, avec une habitante et un cheval', 'Traversée d’un quartier.'),
    ],
  },
  {
    kind: 'mission',
    slug: 'espace-de-rencontre',
    title: 'Espace de rencontre',
    summary: 'Une salle préparée : tapis, coussins, livres et calligraphie, ouverte sur un paysage de montagne.',
    body: [
      'La pièce est jaune, bordée d’un tapis rouge et de coussins. Des livres sont posés sur les assises. Les murs portent des calligraphies et le nom « الله ».',
      'Par la fenêtre, on voit un relief aride. Rien sur les images n’indique un nom de lieu, une date d’ouverture ou un programme. L’espace est montré tel qu’il a été préparé.',
    ],
    category: 'communaute',
    location: '',
    year: '',
    featured: true,
    published: true,
    sort: 40,
    cover: '/media/yellow-room.jpg',
    images: [
      shot('yellow-room', 'Salle aux murs jaunes, tapis rouge, coussins et calligraphies', 'La salle préparée.'),
      shot('room-window', 'Même salle, fenêtre ouverte sur un paysage de montagne', 'La fenêtre sur le relief.'),
    ],
  },
  {
    kind: 'activity',
    slug: 'portraits-de-groupe',
    title: 'Portraits de groupe',
    summary: 'Brotherhood réuni : une photographie de nuit sous la banderole, et un portrait en intérieur.',
    body: [
      'De nuit, le groupe pose en arc de cercle derrière une banderole « Brother Hood ». Les tenues vont des polos du groupe aux robes de soirée.',
      'Une seconde photographie rassemble une partie de l’équipe en intérieur, en polo noir, à côté d’une bannière officielle marocaine. Le lieu n’est pas nommé ici.',
    ],
    category: 'groupe',
    location: '',
    year: '',
    featured: true,
    published: true,
    sort: 50,
    cover: '/media/night-gathering.jpg',
    images: [
      shot('night-gathering', 'Grand groupe de Brotherhood posant de nuit derrière la banderole Brother Hood', 'Portrait de nuit.'),
      shot('clinic-group', 'Membres en polo Brotherhood posant en intérieur', 'Portrait en intérieur.'),
    ],
  },
  {
    kind: 'activity',
    slug: 'feu-de-plage',
    title: 'Feu de plage',
    summary: 'Un cercle autour d’un feu, face à la mer et aux lumières de la côte.',
    body: [
      'Le groupe est assis sur le sable, éclairé par un feu central et des lampes posées au sol. La mer et une ligne de lumières ferment l’horizon.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 60,
    cover: '/media/beach-fire.jpg',
    images: [shot('beach-fire', 'Cercle autour d’un feu sur la plage, la nuit', 'Le cercle face à la mer.')],
  },
  {
    kind: 'activity',
    slug: 'soiree-au-bord-de-l-eau',
    title: 'Soirée au bord de l’eau',
    summary: 'Tables dressées sur une pelouse, puis la même piscine de nuit sous un palmier éclairé.',
    body: [
      'De jour, les tables nappées attendent sur l’herbe, le long du bassin. De nuit, le palmier et l’eau passent au magenta et au bleu, et les tables sont occupées.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 70,
    cover: '/media/pool-night.jpg',
    images: [
      shot('pool-day', 'Tables dressées sur la pelouse le long d’une piscine', 'La pelouse avant la soirée.'),
      shot('pool-night', 'Dîner de nuit autour d’un palmier éclairé, au bord de la piscine', 'La même piscine, de nuit.'),
    ],
  },
  {
    kind: 'activity',
    slug: 'anniversaire',
    title: 'Anniversaire',
    summary: 'Une pièce montée aux couleurs du groupe, sous une enseigne « Happy Birthday ».',
    body: [
      'Le gâteau porte le signe Brotherhood. L’enseigne, les ballons et la nappe posent la scène : un anniversaire du groupe, sans autre précision de date sur l’image.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 80,
    cover: '/media/birthday.jpg',
    images: [shot('birthday', 'Gâteau Brotherhood sous une enseigne Happy Birthday', 'La pièce montée du groupe.')],
  },
  {
    kind: 'activity',
    slug: 'projection-de-plein-air',
    title: 'Projection de plein air',
    summary: 'Un écran, des chaises rouges, et la banderole Brotherhood sur la façade.',
    body: [
      'Le public est de dos, en rouge pour une grande partie. L’écran est allumé. La banderole « Brother Hood » est fixée au-dessus, entre des ballons et un projecteur de lumière.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: true,
    published: true,
    sort: 90,
    cover: '/media/screening.jpg',
    images: [shot('screening', 'Public assis face à un écran extérieur sous la banderole Brother Hood', 'La projection.')],
  },
  {
    kind: 'activity',
    slug: 'rencontre-sportive',
    title: 'Rencontre sportive',
    summary: 'Deux équipes, des sacs, des fanions et les collines derrière le terrain.',
    body: [
      'Les joueurs portent des chasubles orange et vertes. Autour d’eux, des membres en veste rouge. Des sacs blancs sont posés devant le groupe. Le lieu exact n’est pas écrit sur l’image.',
    ],
    category: 'sport',
    location: '',
    year: '',
    featured: true,
    published: true,
    sort: 100,
    cover: '/media/sports-team.jpg',
    images: [shot('sports-team', 'Équipes et membres de Brotherhood posant sur un terrain, collines derrière eux', 'La photo d’équipe.')],
  },
  {
    kind: 'activity',
    slug: 'avec-les-enfants',
    title: 'Avec les enfants',
    summary: 'Un spectacle costumé et un repas servi à de longues tables.',
    body: [
      'Sous un chapiteau, un costume de souris, des clowns et un animateur font face à des enfants. Dans une cour, les mêmes nappes rouges accueillent un repas le long de la piscine, avec l’enseigne Brotherhood allumée au fond.',
    ],
    category: 'jeunesse',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 110,
    cover: '/media/kids-show.jpg',
    images: [
      shot('kids-show', 'Spectacle pour enfants sous un chapiteau, avec costumes et musiciens', 'Le spectacle.'),
      shot('courtyard-meal', 'Enfants attablés dans une cour, enseigne Brotherhood au fond', 'Le repas dans la cour.'),
    ],
  },
  {
    kind: 'activity',
    slug: 'distinctions',
    title: 'Distinctions',
    summary: 'Une scène, des trophées, et un moment de cercle où l’on applaudit.',
    body: [
      'Sur scène, plusieurs personnes tiennent des trophées et des dossiers verts devant le signe Brotherhood. Une autre image montre ces pièces posées sur une table, avant ou après la remise.',
      'Un intervenant en blanc parle au micro. Plus tard, un cercle applaudit un homme en bonnet coloré, entouré de vestes Brotherhood.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 120,
    cover: '/media/award-stage.jpg',
    images: [
      shot('award-stage', 'Groupe sur scène tenant trophées et dossiers devant le logo Brotherhood', 'La remise.'),
      shot('awards-table', 'Trophées et dossiers verts posés sur une table', 'Les pièces avant la scène.'),
      shot('stage-speaker', 'Intervenant en blanc au micro, banderole Brotherhood au premier plan', 'La prise de parole.'),
      shot('circle-clap', 'Cercle d’applaudissements autour d’un invité en bonnet coloré', 'Le cercle.'),
    ],
  },
  {
    kind: 'activity',
    slug: 'fete-de-village',
    title: 'Fête de village',
    summary: 'Ballons, costumes et une célébration dans une ruelle de pierre.',
    body: [
      'La rue est étroite, les murs en pierre. On voit des ballons roses, un costume jaune, des tenues de fête et des vestes Brotherhood. L’image ne nomme ni les personnes ni l’occasion au-delà de ce qui se voit.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 130,
    cover: '/media/village-celebration.jpg',
    images: [shot('village-celebration', 'Célébration dans une ruelle de pierre, ballons et costumes', 'La ruelle.')],
  },
  {
    kind: 'activity',
    slug: 'safi-vu-d-en-haut',
    title: 'Safi, vu d’en haut',
    summary: 'Un cœur bleu et le nom SAFI formés au sol, sur un parking en bord de mer.',
    body: [
      'La photographie aérienne montre des personnes et des sacs bleus dessinant un cœur, puis les lettres S A F I. C’est l’une des images où le lien du groupe avec la ville est écrit en toutes lettres.',
    ],
    category: 'creation',
    location: 'Asfi',
    year: '',
    featured: true,
    published: true,
    sort: 140,
    cover: '/media/safi-heart.jpg',
    images: [shot('safi-heart', 'Vue aérienne : un cœur bleu et le mot SAFI formés par un groupe sur un parking', 'Le cœur et le nom de la ville.')],
  },
  {
    kind: 'activity',
    slug: 'the-enlightened-mentality',
    title: 'The Enlightened Mentality',
    summary: 'Une installation en forêt : deux cerveaux peints et les mots que le groupe choisit de montrer.',
    body: [
      'La banderole dit « THE ENLIGHTENED MENTALITY ». Au-dessus, entre deux dessins de cerveau, on lit : Identity, Fraternity, Donations, Passion, Fidelity.',
      'Le polo du groupe reprend le même univers : « WARRIORS » d’un côté, l’écusson Brotherhood de l’autre. Ailleurs, deux enfants se tiennent devant « Brother Hood » et « روح العائلة ».',
    ],
    category: 'creation',
    location: '',
    year: '',
    featured: true,
    published: true,
    sort: 150,
    cover: '/media/enlightened-words.jpg',
    images: [
      shot('enlightened-words', 'Banderole The Enlightened Mentality avec les mots Identity, Fraternity, Donations, Passion, Fidelity', 'Les mots de l’installation.'),
      shot('enlightened-wide', 'Longue banderole The Enlightened Mentality dans une forêt', 'La banderole dans les arbres.'),
      shot('polo', 'Polo noir Brotherhood et Warriors suspendu à un palmier', 'Le polo du groupe.'),
      shot('boys-banners', 'Deux enfants devant les banderoles Brother Hood et روح العائلة', 'Les banderoles sur le terrain.'),
    ],
  },
  {
    kind: 'activity',
    slug: 'cercle-de-lanternes',
    title: 'Cercle de lanternes',
    summary: 'Une veillée assise autour d’un feu, des lanternes en papier traçant le cercle.',
    body: [
      'Les chaises forment un anneau. Le feu est au centre. Chaque lanterne est un sac éclairé de l’intérieur. Le toit est une bâche tendue.',
    ],
    category: 'evenement',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 160,
    cover: '/media/lantern-circle.jpg',
    images: [shot('lantern-circle', 'Veillée assise autour d’un feu, lanternes en papier au sol', 'Le cercle de lanternes.')],
  },
  {
    kind: 'activity',
    slug: 'chantier-de-jeux',
    title: 'Chantier de jeux',
    summary: 'Des agrès en cours d’installation sur un terrain sec, au pied d’une colline.',
    body: [
      'On voit des pneus peints, des montants jaunes et des membres en gilet rouge qui travaillent le sol. L’image montre un chantier, pas un terrain terminé.',
    ],
    category: 'jeunesse',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 170,
    cover: '/media/playground.jpg',
    images: [shot('playground', 'Membres installant des agrès de jeu sur un terrain sec', 'Le chantier.')],
  },
  {
    kind: 'activity',
    slug: 'preparer-les-colis',
    title: 'Préparer les colis',
    summary: 'Boîtes blanches sur une pelouse, et des sacs cadeaux devant la banderole du groupe.',
    body: [
      'Dans un jardin, des boîtes sont alignées pendant que l’équipe se penche pour les remplir ou les compter. En intérieur, des sacs blancs, gris et noirs attendent devant « Brother Hood ».',
    ],
    category: 'preparation',
    location: '',
    year: '',
    featured: false,
    published: true,
    sort: 180,
    cover: '/media/boxes-grass.jpg',
    images: [
      shot('boxes-grass', 'Équipe disposant des boîtes blanches sur une pelouse', 'Les boîtes sur l’herbe.'),
      shot('gift-bags', 'Sacs cadeaux alignés sur une table devant la banderole Brotherhood', 'Les sacs prêts à partir.'),
    ],
  },
]

export const storyPath = (story) => (story.kind === 'mission' ? `/missions/${story.slug}` : `/activities/${story.slug}`)

export const categoryLabel = (kind, id, locale = 'fr') =>
  CATEGORIES[kind]?.find((item) => item.id === id)?.[locale] || CATEGORIES[kind]?.find((item) => item.id === id)?.fr || id

const fold = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

export const queryStories = (list, { kind, q = '', category = '', year = '', featured, slug, limit, page = 1 } = {}) => {
  let items = list.filter((story) => story.published !== false)
  if (kind) items = items.filter((story) => story.kind === kind)
  if (slug) items = items.filter((story) => story.slug === slug)
  if (category) items = items.filter((story) => story.category === category)
  if (year) items = items.filter((story) => String(story.year || '') === String(year))
  if (featured === true || featured === '1') items = items.filter((story) => story.featured)
  const needle = fold(q).trim()
  if (needle) {
    items = items.filter((story) =>
      fold([story.title, story.summary, story.location, story.category, ...(story.body || [])].join(' ')).includes(needle),
    )
  }
  items = [...items].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))
  const total = items.length
  const size = Math.min(60, Math.max(1, Number(limit) || total || 1))
  const pages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(pages, Math.max(1, Number(page) || 1))
  const slice = limit ? items.slice((current - 1) * size, current * size) : items
  return { items: slice, total, page: current, pages }
}

export const relatedStories = (list, story, count = 3) =>
  list
    .filter((item) => item.published !== false && item.slug !== story.slug && item.kind === story.kind)
    .sort((a, b) => Number(b.category === story.category) - Number(a.category === story.category) || a.sort - b.sort)
    .slice(0, count)

/** Curated chapters. Each frame is a photograph that already belongs to a story. */
export const CHAPTERS = [
  {
    id: 'montagne',
    story: 'qafalat-al-dafa',
    layout: 'cinema',
    images: ['warmth-group', 'truck-unload', 'blankets', 'tent-frame'],
  },
  {
    id: 'table',
    story: 'distributions-alimentaires',
    layout: 'split',
    images: ['iftar-120', 'night-meal', 'flour-bags', 'tent-meal'],
  },
  {
    id: 'ville',
    story: 'presences-en-ville',
    layout: 'walk',
    images: ['sheep-street', 'neighborhood', 'sheep-walk'],
  },
  {
    id: 'portraits',
    story: 'portraits-de-groupe',
    layout: 'portraits',
    images: ['night-gathering', 'clinic-group', 'sports-team', 'circle-clap'],
  },
  {
    id: 'soirees',
    story: 'feu-de-plage',
    layout: 'night',
    evenings: true,
    images: ['beach-fire', 'pool-night', 'lantern-circle', 'screening'],
  },
  {
    id: 'signe',
    story: 'safi-vu-d-en-haut',
    layout: 'sign',
    images: ['safi-heart', 'enlightened-words', 'polo', 'boys-banners'],
  },
]

export const resolveChapters = (stories) => {
  const published = stories.filter((story) => story.published !== false)
  const find = (file) => {
    for (const story of published) {
      const image = (story.images || []).find((item) => item.src.includes(`/${file}.`))
      if (!image) continue
      return { ...image, href: storyPath(story), title: story.title, slug: story.slug }
    }
    return null
  }
  return CHAPTERS.map((chapter) => {
    const story = published.find((item) => item.slug === chapter.story)
    const frames = chapter.images.map(find).filter(Boolean)
    if (!story || frames.length < 2) return null
    return {
      ...chapter,
      title: story.title,
      summary: story.summary,
      href: storyPath(story),
      frames,
    }
  }).filter(Boolean)
}

export const creativeFrames = (list) =>
  list
    .filter((story) => story.published !== false)
    .flatMap((story) =>
      story.images.map((image, index) => ({
        ...image,
        story: story.slug,
        kind: story.kind,
        title: story.title,
        href: storyPath(story),
        wide: index === 0 && story.featured,
      })),
    )
