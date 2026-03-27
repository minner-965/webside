export type Locale = 'en' | 'fr'

export type NavSection =
  | 'home'
  | 'shop'
  | 'faq'
  | 'shipping'
  | 'returns'
  | 'compliance'
  | 'contact'
  | 'launch'
  | 'admin'

export type Product = {
  id: string
  sku: string
  slug: string
  category: string
  price: number
  compareAtPrice?: number
  stock: number
  featured: boolean
  visible: boolean
  archived?: boolean
  beginnerFriendly: boolean
  rechargeable: boolean
  quiet: boolean
  travelFriendly: boolean
  waterResistant: boolean
  bundleEligible: boolean
  image: string
  coverImage?: string
  images?: string[]
  specs: string[]
  translations: Record<
    Locale,
    {
      name: string
      short: string
      description: string
      why: string[]
      care: string
      notice: string
    }
  >
}

export const markets = ['United States', 'Canada', 'United Kingdom', 'Europe']

export const products: Product[] = [
  {
    id: 'cloudloop-knit-sneaker',
    sku: 'AS-APP-001',
    slug: 'cloudloop-knit-sneaker',
    category: 'Apparel',
    price: 88,
    compareAtPrice: 110,
    stock: 26,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80'],
    specs: ['Breathable knit upper', 'Cushioned sole', 'Easy everyday styling'],
    translations: {
      en: {
        name: 'Cloudloop Knit Sneaker',
        short: 'An easy everyday sneaker with all-day comfort.',
        description:
          'Built for city walks, travel days, and daily wear.',
        why: ['Easy layering', 'Clean look', 'Simple gift'],
        care: 'Spot clean with a soft brush and let air dry fully before storing.',
        notice: 'Ships in recyclable packaging. Size guide available before checkout.',
      },
      fr: {
        name: 'Cloudloop Knit Sneaker',
        short: 'Une sneaker simple et confortable pour tous les jours.',
        description:
          'Concue pour les balades, les deplacements et le quotidien.',
        why: ['Facile a porter', 'Look epure', 'Bonne idee cadeau'],
        care: 'Nettoyer localement avec une brosse douce et laisser secher a l air libre.',
        notice: 'Expedie dans un emballage recyclable. Guide des tailles disponible avant le paiement.',
      },
    },
  },
  {
    id: 'harbor-fleece-quarter-zip',
    sku: 'AS-APP-002',
    slug: 'harbor-fleece-quarter-zip',
    category: 'Apparel',
    price: 72,
    compareAtPrice: 94,
    stock: 19,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80'],
    specs: ['Soft brushed fleece', 'Relaxed quarter-zip fit', 'Layer-ready weight'],
    translations: {
      en: {
        name: 'Harbor Fleece Quarter-Zip',
        short: 'A soft layer for cool days and easy outfits.',
        description:
          'A relaxed fleece layer for mornings, travel, and layering.',
        why: ['Easy layering', 'Soft feel', 'Works year-round'],
        care: 'Machine wash cold on gentle and hang dry to preserve the brushed finish.',
        notice: 'Made for everyday wear. Fit runs relaxed; size down for a closer fit.',
      },
      fr: {
        name: 'Harbor Fleece Quarter-Zip',
        short: 'Une couche confortable et propre pour les trajets et la mi-saison.',
        description:
          'Une couche en fleece pour les matins frais, les trajets et les superpositions.',
        why: ['Facile a superposer', 'Toucher doux', 'A porter toute l annee'],
        care: 'Lavage machine a froid en cycle delicat puis sechage sur cintre.',
        notice: 'Coupe plutot relax. Prenez une taille en dessous pour un rendu plus ajuste.',
      },
    },
  },
  {
    id: 'tilt-mini-lamp',
    sku: 'AS-HOM-001',
    slug: 'tilt-mini-lamp',
    category: 'Home Finds',
    price: 44,
    compareAtPrice: 58,
    stock: 22,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: true,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
    specs: ['Rechargeable glow', 'Small-space friendly', 'Warm ambient light'],
    translations: {
      en: {
        name: 'Tilt Mini Lamp',
        short: 'A compact rechargeable lamp for desks, shelves, and bedside tables.',
        description:
          'A compact rechargeable lamp for desks, shelves, and bedside tables.',
        why: ['Fits small spaces', 'Useful gift', 'Easy to place'],
        care: 'Wipe with a dry cloth and recharge with the included USB cable.',
        notice: 'USB charging cable included. Indoor use recommended.',
      },
      fr: {
        name: 'Tilt Mini Lamp',
        short: 'Une petite lampe rechargeable pour bureau, etagere ou table de nuit.',
        description:
          'Une petite lampe pour le bureau, l etagere ou la table de nuit.',
        why: ['Prend peu de place', 'Bonne idee cadeau', 'Facile a disposer'],
        care: 'Essuyer avec un chiffon sec et recharger avec le cable USB fourni.',
        notice: 'Cable USB inclus. Usage interieur recommande.',
      },
    },
  },
  {
    id: 'focus-click-desk-timer',
    sku: 'AS-GDT-001',
    slug: 'focus-click-desk-timer',
    category: 'Desk Gadgets',
    price: 34,
    compareAtPrice: 42,
    stock: 31,
    featured: false,
    visible: true,
    beginnerFriendly: true,
    rechargeable: true,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'],
    specs: ['One-click presets', 'Quiet desk mode', 'Compact productivity tool'],
    translations: {
      en: {
        name: 'Focus Click Desk Timer',
        short: 'A compact timer for work sessions and tidy desks.',
        description:
          'A small timer for focused work and simple desk setups.',
        why: ['Affordable', 'Useful add-on', 'Easy to gift'],
        care: 'Keep dry, recharge regularly, and clean with a soft microfiber cloth.',
        notice: 'Charging cable included. For indoor desk and study use.',
      },
      fr: {
        name: 'Focus Click Desk Timer',
        short: 'Un minuteur compact pour les sprints de travail et les setups soignes.',
        description:
          'Un petit minuteur pour le travail concentre et les bureaux simples.',
        why: ['Prix abordable', 'Ajout utile', 'Facile a offrir'],
        care: 'Garder au sec, recharger regulierement et nettoyer avec un chiffon doux.',
        notice: 'Cable de charge inclus. Pense pour un usage bureau interieur.',
      },
    },
  },
  {
    id: 'pocket-arcade-keychain',
    sku: 'AS-TOY-001',
    slug: 'pocket-arcade-keychain',
    category: 'Mini Toys',
    price: 19,
    compareAtPrice: 24,
    stock: 43,
    featured: false,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80'],
    specs: ['Pocket-size play', 'Easy add-on', 'Small gift idea'],
    translations: {
      en: {
        name: 'Pocket Arcade Keychain',
        short: 'A small nostalgic toy for quick add-on purchases.',
        description:
          'A playful keychain-sized toy for gifts and everyday fun.',
        why: ['Low-price add-on', 'Easy small gift', 'Adds a playful touch'],
        care: 'Keep away from water and store in a cool dry place when not in use.',
        notice: 'Recommended for ages 8+. Small parts are not suitable for very young children.',
      },
      fr: {
        name: 'Pocket Arcade Keychain',
        short: 'Un petit jouet nostalgique pour un achat rapide.',
        description:
          'Un jouet porte-cles amusant pour les cadeaux et le quotidien.',
        why: ['Petit prix', 'Petit cadeau facile', 'Note ludique'],
        care: 'Conserver au sec et eviter le contact avec l eau.',
        notice: 'Recommande a partir de 8 ans. Petites pieces a surveiller.',
      },
    },
  },
  {
    id: 'carry-all-tech-pouch',
    sku: 'AS-ACC-001',
    slug: 'carry-all-tech-pouch',
    category: 'Accessories',
    price: 28,
    compareAtPrice: 36,
    stock: 28,
    featured: false,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: true,
    travelFriendly: true,
    waterResistant: true,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80'],
    specs: ['Water-resistant shell', 'Cable-ready storage', 'Travel day essential'],
    translations: {
      en: {
        name: 'Carry-All Tech Pouch',
        short: 'A simple pouch for everyday carry and travel essentials.',
        description:
          'A simple pouch for everyday carry and travel essentials.',
        why: ['Keeps things together', 'Useful for travel', 'Easy add-on'],
        care: 'Wipe clean with a damp cloth and leave unzipped until fully dry.',
        notice: 'Accessory only. Items shown in images are not included.',
      },
      fr: {
        name: 'Carry-All Tech Pouch',
        short: 'Un organiseur simple pour cables, chargeurs, stylos et petits objets.',
        description:
          'Une pochette pratique pour le quotidien et les trajets.',
        why: ['Garde tout range', 'Utile en voyage', 'Bon complement'],
        care: 'Nettoyer avec un chiffon humide puis laisser ouvert jusqu au sechage complet.',
        notice: 'Accessoire seul. Les objets visibles sur les images ne sont pas inclus.',
      },
    },
  },
  {
    id: 'weekend-gift-edit-box',
    sku: 'AS-GFT-001',
    slug: 'weekend-gift-edit-box',
    category: 'Gift Ideas',
    price: 64,
    compareAtPrice: 79,
    stock: 12,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: false,
    image:
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    coverImage:
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=1200&q=80'],
    specs: ['Pre-packed gift box', 'Seasonal card included', 'Easy occasion purchase'],
    translations: {
      en: {
        name: 'Weekend Gift Edit Box',
        short: 'A ready-to-give box for birthdays, thank-yous, and simple occasions.',
        description:
          'A gift box for easy occasions.',
        why: ['Ready to gift', 'Simple to feature', 'Ready to give'],
        care: 'Store sealed in a cool dry place until gifting or unboxing.',
        notice: 'Contents may change seasonally while the theme stays the same.',
      },
      fr: {
        name: 'Weekend Gift Edit Box',
        short: 'Un coffret pret a offrir pour anniversaires, remerciements et occasions simples.',
        description:
          'Ce coffret est pret a offrir pour un cadeau rapide et soigne.',
        why: ['Cadeau simple', 'Facile a mettre en avant', 'Pret a offrir'],
        care: 'Conserver ferme dans un endroit sec et tempere jusqu a l ouverture.',
        notice: 'Le contenu peut changer selon la saison tout en gardant le meme theme.',
      },
    },
  },
]

export const launchDays = [
  'Day 1: Set the first categories and hero product.',
  'Day 2: Add homepage images and product card order.',
  'Day 3: Review shipping, returns, and support pages.',
  'Day 4: Verify checkout and order email flow.',
  'Day 5: Refine product copy and bundle options.',
  'Day 6: Check mobile layout and buying flow.',
  'Day 7: Go live and monitor inventory and orders.',
]

export const navSections: NavSection[] = [
  'home',
  'shop',
  'faq',
  'shipping',
  'returns',
  'compliance',
  'contact',
]

export const categoryLabels = ['Apparel', 'Desk Gadgets', 'Mini Toys', 'Home Finds', 'Accessories', 'Gift Ideas']

export const uiText: Record<
  Locale,
  {
    brand: string
    tagline: string
    nav: Record<NavSection, string>
    heroTitle: string
    heroBody: string
    heroPrimary: string
    heroSecondary: string
    featured: string
    categories: string
    addToCart: string
    viewPolicies: string
    cart: string
    checkout: string
    trust: string[]
    ageTitle: string
    ageBody: string
    enter: string
    exit: string
    languageLabel: string
    orderSummary: string
    placeOrder: string
    emptyCart: string
    faqTitle: string
    shippingTitle: string
    returnsTitle: string
    complianceTitle: string
    contactTitle: string
    launchTitle: string
    adminTitle: string
    shippingBody: string
    returnsBody: string
    complianceBody: string
    supportNote: string
    orderPlacedTitle: string
    orderPlacedBody: string
    shopIntro: string
  }
> = {
  en: {
    brand: 'Aster Supply',
    tagline: 'Useful goods for home, work, and gifting.',
    nav: {
      home: 'Home',
      shop: 'Shop',
      faq: 'FAQ',
      shipping: 'Shipping',
      returns: 'Returns',
      compliance: 'Store standards',
      contact: 'Contact',
      launch: 'Launch Plan',
      admin: 'Admin',
    },
    heroTitle: 'Useful things, simply sorted.',
    heroBody: 'Everyday picks for home, work, and gifting.',
    heroPrimary: 'Shop now',
    heroSecondary: '',
    featured: 'Featured products',
    categories: 'Shop by category',
    addToCart: 'Add to cart',
    viewPolicies: 'View policies',
    cart: 'Cart',
    checkout: 'Checkout',
    trust: ['Fast shipping', 'Easy returns', 'Direct support', 'USD pricing'],
    ageTitle: 'Browse store',
    ageBody: 'Browse everyday goods, desk accessories, home finds, and giftable products.',
    enter: 'Enter store',
    exit: 'Exit',
    languageLabel: 'Language',
    orderSummary: 'Order summary',
    placeOrder: 'Place order',
    emptyCart: 'Your cart is empty.',
    faqTitle: 'Frequently Asked Questions',
    shippingTitle: 'Shipping and delivery',
    returnsTitle: 'Returns and exchanges',
    complianceTitle: 'Store standards',
    contactTitle: 'Contact and support',
    launchTitle: 'Launch rhythm',
    adminTitle: 'Store operations dashboard',
    shippingBody:
      'Orders are quoted in USD and ship across the United States, Canada, the United Kingdom, and select European destinations.',
    returnsBody:
      'Eligible unused items can be returned within the stated window in original condition.',
    complianceBody:
      'Product names, images, and descriptions should remain accurate, practical, and easy to understand.',
    supportNote:
      'Support covers delivery updates, order issues, product questions, and return requests.',
    orderPlacedTitle: 'Payment confirmed',
    orderPlacedBody:
      'Your order is recorded after the transaction is confirmed.',
    shopIntro:
      'Apparel, useful gadgets, home finds, and gift-ready goods.',
  },
  fr: {
    brand: 'Aster Supply',
    tagline: 'Objets utiles, essentiels du quotidien et idees cadeaux.',
    nav: {
      home: 'Accueil',
      shop: 'Boutique',
      faq: 'FAQ',
      shipping: 'Livraison',
      returns: 'Retours',
      compliance: 'Standards',
      contact: 'Contact',
      launch: 'Lancement',
      admin: 'Admin',
    },
    heroTitle: 'Une boutique claire et simple.',
    heroBody:
      'Des essentiels pour la maison, le travail et les cadeaux.',
    heroPrimary: 'Voir la selection',
    heroSecondary: '',
    featured: 'Produits vedettes',
    categories: 'Par categorie',
    addToCart: 'Ajouter au panier',
    viewPolicies: 'Voir les politiques',
    cart: 'Panier',
    checkout: 'Paiement',
    trust: ['Livraison rapide', 'Retours simples', 'Support direct', 'Prix en USD'],
    ageTitle: 'Acces boutique',
    ageBody:
      'Des essentiels pour la maison, le travail et les cadeaux.',
    enter: 'Entrer',
    exit: 'Quitter',
    languageLabel: 'Langue',
    orderSummary: 'Recapitulatif',
    placeOrder: 'Passer la commande',
    emptyCart: 'Votre panier est vide.',
    faqTitle: 'Questions frequentes',
    shippingTitle: 'Livraison',
    returnsTitle: 'Retours et echanges',
    complianceTitle: 'Standards de la boutique',
    contactTitle: 'Contact et assistance',
    launchTitle: 'Rythme de lancement',
    adminTitle: 'Tableau de bord',
    shippingBody:
      'Les commandes sont affichees en USD et expediees vers les Etats-Unis, le Canada, le Royaume-Uni et certaines destinations europeennes.',
    returnsBody:
      'Les articles eligibles et non utilises peuvent etre retournes dans le delai prevu et dans leur etat d origine.',
    complianceBody:
      'Les noms, images et descriptions produits doivent rester exacts, clairs et utiles.',
    supportNote:
      'Le support couvre la livraison, les commandes, les questions produit et les demandes de retour.',
    orderPlacedTitle: 'Paiement confirme',
    orderPlacedBody:
      'Votre commande est enregistree apres verification du paiement.',
    shopIntro:
      'Apparel, objets utiles, idees cadeaux et petits produits faciles a acheter.',
  },
}
