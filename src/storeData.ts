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
  rating: number
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
    rating: 4.8,
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
    specs: ['Breathable knit upper', 'Cushioned sole', 'Easy everyday styling'],
    translations: {
      en: {
        name: 'Cloudloop Knit Sneaker',
        short: 'An easy everyday sneaker with clean lines and all-day comfort.',
        description:
          'Cloudloop is built for light travel days, long city walks, and the kind of wardrobe that wants one dependable pair to wear with nearly everything.',
        why: ['Strong hero product for the homepage', 'Low-friction first purchase', 'Fits gift and self-buy traffic'],
        care: 'Spot clean with a soft brush and let air dry fully before storing.',
        notice: 'Ships in recyclable packaging. Sizing guide is included on the product card and at checkout.',
      },
      fr: {
        name: 'Cloudloop Knit Sneaker',
        short: 'Une sneaker simple et confortable pour tous les jours.',
        description:
          'Cloudloop accompagne les journees actives, les trajets legers et une garde-robe qui cherche une paire facile a porter au quotidien.',
        why: ['Tres bon produit hero', 'Premier achat facile', 'Convient aux achats cadeaux et perso'],
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
    rating: 4.7,
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
    specs: ['Soft brushed fleece', 'Relaxed quarter-zip fit', 'Layer-ready weight'],
    translations: {
      en: {
        name: 'Harbor Fleece Quarter-Zip',
        short: 'A polished layer for flights, cool mornings, and easy gifting.',
        description:
          'This quarter-zip keeps the assortment grounded with a dependable apparel piece that feels seasonal, giftable, and easy to pair with accessories.',
        why: ['Broad audience appeal', 'Works well in bundles', 'Supports a calm premium visual style'],
        care: 'Machine wash cold on gentle and hang dry to preserve the brushed finish.',
        notice: 'Designed for everyday wear. Fit runs relaxed; size down for a closer silhouette.',
      },
      fr: {
        name: 'Harbor Fleece Quarter-Zip',
        short: 'Une couche confortable et propre pour les trajets et la mi-saison.',
        description:
          'Ce quarter-zip apporte une base apparel solide au catalogue, avec une allure facile a offrir et simple a associer.',
        why: ['Public large', 'Se vend bien en bundle', 'Soutient une image premium simple'],
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
    rating: 4.6,
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
    specs: ['Rechargeable glow', 'Small-space friendly', 'Warm ambient light'],
    translations: {
      en: {
        name: 'Tilt Mini Lamp',
        short: 'A compact rechargeable lamp for desks, shelves, and bedside setups.',
        description:
          'Tilt Mini Lamp gives the store a useful home piece with a premium look, soft light, and enough utility to convert well in gifting and apartment-focused edits.',
        why: ['Easy to merchandise in lifestyle scenes', 'High giftability', 'Good for desk and home cross-sell'],
        care: 'Wipe with a dry cloth and recharge with the included USB cable.',
        notice: 'USB charging cable included. Indoor use recommended.',
      },
      fr: {
        name: 'Tilt Mini Lamp',
        short: 'Une petite lampe rechargeable pour bureau, etagere ou table de nuit.',
        description:
          'Tilt Mini Lamp ajoute un produit home utile et visuel au catalogue, facile a offrir et simple a mettre en avant.',
        why: ['Bonne mise en scene lifestyle', 'Tres cadeau', 'Croise bien bureau et maison'],
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
    rating: 4.5,
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
    specs: ['One-click presets', 'Quiet desk mode', 'Compact productivity tool'],
    translations: {
      en: {
        name: 'Focus Click Desk Timer',
        short: 'A simple desk timer designed for work sprints and tidy setups.',
        description:
          'This compact timer is the kind of practical gadget that adds range to the store without making the assortment feel random. It is useful, giftable, and easy to explain.',
        why: ['Accessible price point', 'Useful add-on item', 'Great for gift bundles and desk edits'],
        care: 'Keep dry, recharge regularly, and clean with a soft microfiber cloth.',
        notice: 'Charging cable included. Recommended for indoor desk and study use.',
      },
      fr: {
        name: 'Focus Click Desk Timer',
        short: 'Un minuteur compact pour les sprints de travail et les setups soignes.',
        description:
          'Un petit gadget utile qui elargit le catalogue sans le rendre confus. Pratique, cadeau et facile a comprendre.',
        why: ['Prix accessible', 'Bon produit additionnel', 'Ideal pour cadeaux et univers bureau'],
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
    rating: 4.4,
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
    specs: ['Pocket-size play', 'Conversation starter', 'Gift add-on favorite'],
    translations: {
      en: {
        name: 'Pocket Arcade Keychain',
        short: 'A nostalgic mini toy that works as a fun impulse add-on.',
        description:
          'Pocket Arcade brings a playful lane into the catalog without breaking the lifestyle feel. It is small, affordable, and perfect for gift add-ons or novelty traffic.',
        why: ['Strong impulse buy behavior', 'Great low-price basket builder', 'Adds personality to the assortment'],
        care: 'Keep away from water and store in a cool dry place when not in use.',
        notice: 'Recommended for ages 8+. Small parts may not be suitable for very young children.',
      },
      fr: {
        name: 'Pocket Arcade Keychain',
        short: 'Un mini jouet nostalgique, parfait en petit achat plaisir.',
        description:
          'Pocket Arcade ajoute une note ludique au catalogue tout en restant coherent avec un univers lifestyle cadeau.',
        why: ['Bon achat impulsif', 'Excellent petit produit panier', 'Donne plus de personnalite a la selection'],
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
    rating: 4.6,
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
    specs: ['Water-resistant shell', 'Cable-ready storage', 'Travel day essential'],
    translations: {
      en: {
        name: 'Carry-All Tech Pouch',
        short: 'A clean organizer for cables, chargers, pens, and small travel tools.',
        description:
          'Carry-All Tech Pouch gives the store a practical accessory lane with a product that is easy to understand, easy to gift, and easy to pair with desk or travel goods.',
        why: ['Useful everyday add-on', 'Cross-sells with gadgets and travel picks', 'Supports a tidy visual merchandising story'],
        care: 'Wipe clean with a damp cloth and leave unzipped until fully dry.',
        notice: 'Accessory only. Electronics shown in lifestyle imagery are not included.',
      },
      fr: {
        name: 'Carry-All Tech Pouch',
        short: 'Un organiseur simple pour cables, chargeurs, stylos et petits outils.',
        description:
          'Carry-All Tech Pouch cree une vraie categorie accessoire avec un produit pratique, cadeau et facile a combiner avec les articles bureau ou voyage.',
        why: ['Ajout utile au quotidien', 'Se vend bien avec gadgets et voyage', 'Soutient une mise en scene rangee'],
        care: 'Nettoyer avec un chiffon humide puis laisser ouvert jusqu au sechage complet.',
        notice: 'Accessoire seul. Les appareils visibles sur les images lifestyle ne sont pas inclus.',
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
    rating: 4.9,
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
    specs: ['Pre-packed gift box', 'Seasonal card included', 'Easy occasion purchase'],
    translations: {
      en: {
        name: 'Weekend Gift Edit Box',
        short: 'A ready-to-send gift box built for birthdays, thank-yous, and easy wins.',
        description:
          'This box gives the shop a clear gifting lane: premium enough to feel considered, simple enough to buy fast, and flexible enough to feature year-round.',
        why: ['Strong gifting story', 'Easy homepage merchandising', 'Supports higher basket values'],
        care: 'Store sealed in a cool dry place until gifting or unboxing.',
        notice: 'Contents may rotate seasonally while the overall value and theme stay consistent.',
      },
      fr: {
        name: 'Weekend Gift Edit Box',
        short: 'Un coffret pret a offrir pour anniversaires, remerciements et occasions simples.',
        description:
          'Ce coffret cree une vraie voie cadeau dans la boutique: assez premium pour paraitre choisi avec soin et assez simple pour etre achete vite.',
        why: ['Tres bon angle cadeau', 'Facile a mettre en avant', 'Aide le panier moyen'],
        care: 'Conserver ferme dans un endroit sec et tempere jusqu a l ouverture.',
        notice: 'Le contenu peut varier selon la saison tout en gardant le meme niveau de valeur.',
      },
    },
  },
]

export const launchDays = [
  'Day 1: Lock the first six categories, hero product, and opening price ladder.',
  'Day 2: Finalize homepage imagery, category cards, and product card hierarchy.',
  'Day 3: Review shipping, returns, and customer-facing store standards.',
  'Day 4: Verify checkout, payment callback handling, and order email flow.',
  'Day 5: Polish product descriptions, bundle lanes, and homepage copy.',
  'Day 6: Check mobile layout, quick-buy flow, and admin merchandising actions.',
  'Day 7: Go live, monitor inventory and orders, then tighten the assortment with live data.',
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
    ageTitle: 'Store access',
    ageBody:
      'This store focuses on everyday goods, desk accessories, home finds, and giftable products. Enter to browse the current assortment.',
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
      'Orders are quoted in USD and ship across the United States, Canada, the United Kingdom, and select European destinations. Tracking details follow after the order is confirmed.',
    returnsBody:
      'Eligible unused items can be returned within the stated window in original condition. Final-sale items, opened consumables, and clearly marked clearance products are excluded from standard returns.',
    complianceBody:
      'Product names, images, and descriptions should remain accurate, practical, and easy to understand. Shipping, returns, privacy, and contact details stay visible from navigation, checkout, and the footer.',
    supportNote:
      'Support covers delivery updates, order issues, product questions, and return requests. English is the primary service language for launch.',
    orderPlacedTitle: 'Payment confirmed',
    orderPlacedBody:
      'Your order is recorded after the transaction is confirmed. Inventory, notifications, and the admin dashboard update automatically.',
    shopIntro:
      'A simple edit of apparel, useful gadgets, home finds, and gift-ready goods.',
  },
  fr: {
    brand: 'Aster Supply',
    tagline: 'Mode simple, objets utiles, petits plaisirs et idees cadeaux.',
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
    heroTitle: 'Une boutique lifestyle plus claire et plus simple.',
    heroBody:
      'Des essentiels pour la maison, le travail et les cadeaux.',
    heroPrimary: 'Voir la selection',
    heroSecondary: '',
    featured: 'Nos favoris',
    categories: 'Par categorie',
    addToCart: 'Ajouter au panier',
    viewPolicies: 'Voir les politiques',
    cart: 'Panier',
    checkout: 'Paiement',
    trust: [
      'Livraison rapide',
      'Retours simples',
      'Support direct',
      'Prix en USD',
      'Produits faciles a offrir',
      'Suivi de livraison',
      'Politiques claires',
    ],
    ageTitle: 'Acces boutique',
    ageBody:
      'Cette boutique propose des produits du quotidien, des accessoires de bureau, des objets maison et des idees cadeaux.',
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
      'Les articles eligibles et non utilises peuvent etre retournes dans le delai prevu et dans leur etat d origine. Les produits clairement signales comme vente finale sont exclus.',
    complianceBody:
      'Les noms, images et descriptions produits doivent rester exacts, clairs et utiles. Les liens livraison, retours, confidentialite et contact restent visibles depuis la navigation et le paiement.',
    supportNote:
      'Le support couvre la livraison, les commandes, les questions produit et les demandes de retour. L anglais reste la langue principale au lancement.',
    orderPlacedTitle: 'Paiement confirme',
    orderPlacedBody:
      'Votre commande est enregistree apres verification du paiement. Le stock, les notifications et le tableau de bord se mettent a jour automatiquement.',
    shopIntro:
      'Une selection lifestyle globale avec apparel, objets utiles, idees cadeaux et petits produits faciles a acheter.',
  },
}
