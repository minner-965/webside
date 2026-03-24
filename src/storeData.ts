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

export const markets = ['South Africa', 'Nigeria', 'Kenya']

export const products: Product[] = [
  {
    id: 'calm-start-kit',
    sku: 'AW-STK-001',
    slug: 'calm-start-kit',
    category: 'Starter Kits',
    price: 39,
    compareAtPrice: 49,
    stock: 22,
    rating: 4.6,
    featured: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: true,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=900&q=80',
    specs: ['Beginner friendly', 'Discreet packaging', 'Travel ready'],
    translations: {
      en: {
        name: 'Calm Start Kit',
        short: 'An easy first step into personal wellness.',
        description:
          'A curated starter bundle designed for first-time shoppers who want a low-pressure, polished entry point. Balanced, simple, and giftable.',
        why: ['Clear entry-level pick', 'Easy to browse and understand', 'Pairs well with essentials'],
        care: 'Store in a cool, dry place and review included instructions before first use.',
        notice: 'Adults 18+ only. Wellness product. No medical claims.',
      },
      fr: {
        name: 'Kit Découverte Calme',
        short: 'Une première étape simple vers le bien-être personnel.',
        description:
          'Un coffret d’entrée de gamme pensé pour les premiers achats, avec une présentation discrète, simple et rassurante.',
        why: ['Idéal pour débuter', 'Facile à comprendre', 'Compatible avec les essentiels'],
        care: 'Conserver dans un endroit frais et sec et lire les instructions avant utilisation.',
        notice: 'Réservé aux adultes de 18 ans et plus. Produit bien-être sans allégation médicale.',
      },
    },
  },
  {
    id: 'quiet-care-massager',
    sku: 'AW-DVC-001',
    slug: 'quiet-care-massager',
    category: 'Wellness Devices',
    price: 54,
    compareAtPrice: 69,
    stock: 17,
    rating: 4.8,
    featured: true,
    beginnerFriendly: true,
    rechargeable: true,
    quiet: true,
    travelFriendly: true,
    waterResistant: true,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80',
    specs: ['USB rechargeable', 'Quiet motor', 'Soft-touch finish'],
    translations: {
      en: {
        name: 'Quiet Care Massager',
        short: 'Low-noise comfort for evening self-care.',
        description:
          'A discreet rechargeable device created for comfort-focused routines, with a soft-touch exterior and low-noise profile for private use.',
        why: ['Quiet by design', 'Rechargeable and compact', 'Suitable for routine wellness use'],
        care: 'Wipe clean after use and recharge with the included cable only.',
        notice: 'Adults 18+ only. Use as directed and discontinue use if discomfort occurs.',
      },
      fr: {
        name: 'Masseur Soin Silencieux',
        short: 'Un confort discret pour vos routines de détente.',
        description:
          'Un appareil rechargeable discret, pensé pour le confort et la simplicité, avec un fonctionnement silencieux et un format compact.',
        why: ['Silencieux', 'Rechargeable', 'Adapté aux routines bien-être'],
        care: 'Nettoyer après usage et recharger avec le câble fourni uniquement.',
        notice: 'Réservé aux adultes de 18 ans et plus. Utiliser selon les instructions.',
      },
    },
  },
  {
    id: 'daily-comfort-gel',
    sku: 'AW-ESS-001',
    slug: 'daily-comfort-gel',
    category: 'Essentials',
    price: 14,
    compareAtPrice: 18,
    stock: 48,
    rating: 4.5,
    featured: false,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80',
    specs: ['Water-based', 'Skin-friendly', 'Easy-clean formula'],
    translations: {
      en: {
        name: 'Daily Comfort Gel',
        short: 'A practical add-on for smoother routines.',
        description:
          'A lightweight water-based formula designed to support comfort and convenience. A reliable add-on for bundles and repeat orders.',
        why: ['Simple everyday essential', 'Easy to combine with other items', 'Travel-ready format'],
        care: 'Keep sealed after use and store away from direct heat.',
        notice: 'Adults 18+ only. External use only.',
      },
      fr: {
        name: 'Gel Confort Quotidien',
        short: 'Un complément pratique pour plus de confort.',
        description:
          'Une formule légère à base d’eau conçue pour accompagner les routines de bien-être avec simplicité et confort.',
        why: ['Essentiel du quotidien', 'Facile à associer', 'Format pratique'],
        care: 'Bien refermer après usage et conserver à l’abri de la chaleur.',
        notice: 'Réservé aux adultes de 18 ans et plus. Usage externe uniquement.',
      },
    },
  },
  {
    id: 'pulse-recovery-wand',
    sku: 'AW-BRM-001',
    slug: 'pulse-recovery-wand',
    category: 'Body Recovery & Massage',
    price: 79,
    compareAtPrice: 95,
    stock: 11,
    rating: 4.9,
    featured: true,
    beginnerFriendly: false,
    rechargeable: true,
    quiet: false,
    travelFriendly: false,
    waterResistant: true,
    bundleEligible: false,
    image:
      'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=900&q=80',
    specs: ['Multi-speed', 'Ergonomic grip', 'Rechargeable power'],
    translations: {
      en: {
        name: 'Pulse Recovery Wand',
        short: 'Premium body massage support for home routines.',
        description:
          'A premium recovery-focused wand for body massage and relaxation routines. Stronger output, ergonomic form, and elevated finish.',
        why: ['Premium feel', 'Strong body-massage profile', 'Built for regular home use'],
        care: 'Clean carefully after use and store in the supplied pouch.',
        notice: 'Adults 18+ only. Follow safety instructions before use.',
      },
      fr: {
        name: 'Baguette Récupération Pulse',
        short: 'Un outil premium pour la détente et le massage corporel.',
        description:
          'Un modèle premium destiné aux routines de massage et de récupération, avec une prise ergonomique et une finition soignée.',
        why: ['Positionnement premium', 'Massage corporel', 'Conçu pour une utilisation régulière'],
        care: 'Nettoyer soigneusement après usage et ranger dans sa housse.',
        notice: 'Réservé aux adultes de 18 ans et plus. Respecter les consignes de sécurité.',
      },
    },
  },
  {
    id: 'discreet-travel-pouch-set',
    sku: 'AW-ACC-001',
    slug: 'discreet-travel-pouch-set',
    category: 'Accessories',
    price: 19,
    compareAtPrice: 24,
    stock: 31,
    rating: 4.4,
    featured: false,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: true,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?auto=format&fit=crop&w=900&q=80',
    specs: ['Washable lining', 'Compact form', 'Discreet storage'],
    translations: {
      en: {
        name: 'Discreet Travel Pouch Set',
        short: 'Compact privacy-focused storage for everyday carry.',
        description:
          'A washable pouch set made for organization, privacy, and travel. A strong add-on item that supports higher cart value.',
        why: ['Privacy minded', 'Compact and washable', 'Strong add-on purchase'],
        care: 'Hand wash and dry fully before re-use.',
        notice: 'Adults 18+ only where paired with restricted products.',
      },
      fr: {
        name: 'Set de Pochettes Discrètes',
        short: 'Un rangement compact et discret pour les déplacements.',
        description:
          'Un ensemble de pochettes lavables pensé pour l’organisation, la discrétion et le voyage. Idéal en vente additionnelle.',
        why: ['Discret', 'Compact et lavable', 'Excellent complément'],
        care: 'Laver à la main et laisser sécher complètement avant réutilisation.',
        notice: 'Réservé aux adultes de 18 ans et plus lorsqu’associé à des produits restreints.',
      },
    },
  },
]

export const launchDays = [
  'Day 1: Lock categories, navigation, bilingual scope, and the first five SKUs.',
  'Day 2: Finalize product records, pricing in USD, stock levels, and image selection.',
  'Day 3: Publish privacy, terms, returns, shipping, contact, and 18+ notices.',
  'Day 4: Review English and French storefront copy, market notes, and mobile layout.',
  'Day 5: Test checkout for South Africa, Nigeria, and Kenya with payment success and failure states.',
  'Day 6: Prepare order handling, stock alerts, analytics, and customer support responses.',
  'Day 7: Run final QA on desktop and mobile, publish, and monitor first sessions/orders.',
]

export const navSections: NavSection[] = [
  'home',
  'shop',
  'faq',
  'shipping',
  'returns',
  'compliance',
  'contact',
  'launch',
  'admin',
]

export const categoryLabels = ['Starter Kits', 'Wellness Devices', 'Essentials', 'Body Recovery & Massage', 'Accessories']

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
    brand: 'Aster Wellness',
    tagline: 'Wellness, privacy, and confidence delivered.',
    nav: {
      home: 'Home',
      shop: 'Shop',
      faq: 'FAQ',
      shipping: 'Shipping',
      returns: 'Returns',
      compliance: 'Compliance',
      contact: 'Contact',
      launch: 'Launch Plan',
      admin: 'Admin',
    },
    heroTitle: 'Discreet adult wellness essentials for modern routines.',
    heroBody:
      'Launch-ready storefront for South Africa, Nigeria, and Kenya with English-first browsing, French support copy, secure checkout, and discreet packaging messaging.',
    heroPrimary: 'Shop Bestsellers',
    heroSecondary: 'Read Compliance',
    featured: 'Featured Picks',
    categories: 'Categories',
    addToCart: 'Add to cart',
    viewPolicies: 'View policies',
    cart: 'Cart',
    checkout: 'Checkout',
    trust: [
      'Discreet packaging',
      'Secure checkout',
      'Adults 18+ only',
      'USD pricing for launch',
      'Shipping to South Africa, Nigeria, and Kenya',
      'English main site, French support copy',
    ],
    ageTitle: 'Age Verification',
    ageBody:
      'This website contains adult wellness products and is intended only for visitors aged 18 or older. By entering, you confirm that access is legal in your location.',
    enter: 'I am 18+',
    exit: 'Exit',
    languageLabel: 'Language',
    orderSummary: 'Order summary',
    placeOrder: 'Place order',
    emptyCart: 'Your cart is empty.',
    faqTitle: 'Frequently Asked Questions',
    shippingTitle: 'Fast, discreet, and trackable delivery',
    returnsTitle: 'Clear returns for eligible items',
    complianceTitle: 'Compliance and responsible selling',
    contactTitle: 'Contact and support',
    launchTitle: '7-day launch rhythm',
    adminTitle: 'Store operations dashboard',
    shippingBody:
      'We display prices in USD for launch. Shipping is currently scoped to South Africa, Nigeria, and Kenya. Delivery options appear at checkout and packaging remains plain on the outside.',
    returnsBody:
      'Eligible unopened items may be returned in line with our returns policy. Hygiene-sensitive products may be excluded. Refund timing and approval status are shown in the customer support workflow.',
    complianceBody:
      'Adults 18+ only. Avoid medical claims, keep wellness messaging neutral, and verify destination restrictions before fulfilling orders. Privacy, terms, returns, and shipping pages should remain visible from the footer and checkout.',
    supportNote:
      'Support is available by email for order updates, address changes, and product questions. English is the primary support language for launch.',
    orderPlacedTitle: 'Order received',
    orderPlacedBody:
      'This MVP uses a demo order flow. The order has been recorded locally and inventory has been reduced so you can validate the purchase journey end-to-end.',
    shopIntro:
      'Five launch SKUs, one currency, bilingual copy, and a full browse-to-checkout journey designed for a seven-day MVP.',
  },
  fr: {
    brand: 'Aster Wellness',
    tagline: 'Bien-être, confidentialité et confiance, livrés chez vous.',
    nav: {
      home: 'Accueil',
      shop: 'Boutique',
      faq: 'FAQ',
      shipping: 'Livraison',
      returns: 'Retours',
      compliance: 'Conformité',
      contact: 'Contact',
      launch: 'Plan de lancement',
      admin: 'Admin',
    },
    heroTitle: 'Des essentiels bien-être pour adultes, discrets et prêts à lancer.',
    heroBody:
      'Une boutique MVP pensée pour l’Afrique du Sud, le Nigeria et le Kenya, avec navigation principale en anglais, contenus clés en français et parcours d’achat complet.',
    heroPrimary: 'Voir les meilleures ventes',
    heroSecondary: 'Lire la conformité',
    featured: 'Sélection mise en avant',
    categories: 'Catégories',
    addToCart: 'Ajouter au panier',
    viewPolicies: 'Voir les politiques',
    cart: 'Panier',
    checkout: 'Paiement',
    trust: [
      'Emballage discret',
      'Paiement sécurisé',
      'Réservé aux adultes de 18 ans et plus',
      'Prix de lancement en USD',
      'Livraison vers Afrique du Sud, Nigeria et Kenya',
      'Site principal en anglais, support en français',
    ],
    ageTitle: "Vérification de l'âge",
    ageBody:
      'Ce site présente des produits de bien-être pour adultes et est réservé aux personnes de 18 ans ou plus. En entrant, vous confirmez être autorisé à consulter ce contenu.',
    enter: "J'ai 18 ans ou plus",
    exit: 'Quitter',
    languageLabel: 'Langue',
    orderSummary: 'Récapitulatif',
    placeOrder: 'Passer la commande',
    emptyCart: 'Votre panier est vide.',
    faqTitle: 'Questions fréquentes',
    shippingTitle: 'Livraison rapide, discrète et suivie',
    returnsTitle: 'Retours clairs pour les articles éligibles',
    complianceTitle: 'Conformité et vente responsable',
    contactTitle: 'Contact et assistance',
    launchTitle: 'Rythme de lancement sur 7 jours',
    adminTitle: 'Tableau de bord de la boutique',
    shippingBody:
      "Les prix sont affichés en USD pour le lancement. La livraison est prévue pour l'Afrique du Sud, le Nigeria et le Kenya. Les options finales apparaissent au paiement et l’emballage reste neutre.",
    returnsBody:
      'Les articles éligibles non ouverts peuvent être retournés selon notre politique. Les produits sensibles à l’hygiène peuvent être exclus. Le statut du remboursement doit rester visible dans le support client.',
    complianceBody:
      'Réservé aux adultes de 18 ans et plus. Évitez les allégations médicales, gardez un ton neutre et vérifiez les restrictions par destination avant expédition.',
    supportNote:
      'Le support est disponible par e-mail pour les commandes, les changements d’adresse et les questions produit. Le support principal de lancement reste en anglais.',
    orderPlacedTitle: 'Commande enregistrée',
    orderPlacedBody:
      'Ce MVP utilise un parcours de commande démonstratif. La commande a bien été enregistrée localement et le stock a été décrémenté pour valider le flux complet.',
    shopIntro:
      'Cinq références de lancement, une seule devise, un contenu bilingue et un parcours complet de la découverte au paiement.',
  },
}
