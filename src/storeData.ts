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

export const markets = ['South Africa', 'Nigeria', 'Kenya']

export const products: Product[] = [
  {
    id: 'midnight-lace-bodysuit',
    sku: 'SW-LGR-001',
    slug: 'midnight-lace-bodysuit',
    category: 'Lingerie Sets',
    price: 46,
    compareAtPrice: 59,
    stock: 18,
    rating: 4.8,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    specs: ['Soft stretch lace', 'Adjustable straps', 'Gift-ready fold'],
    translations: {
      en: {
        name: 'Midnight Lace Bodysuit',
        short: 'A sculpted lace piece made for confident evenings.',
        description:
          'A fitted lace bodysuit with a clean silhouette, soft stretch feel, and elevated finish designed for premium intimate styling.',
        why: ['Strong hero product', 'Easy to gift', 'Photographs beautifully on store pages'],
        care: 'Hand wash cold and lay flat to dry.',
        notice: 'Adults 18+ only. Intimate apparel final-sale rules may apply.',
      },
      fr: {
        name: 'Body Dentelle Minuit',
        short: 'Une piece en dentelle pensee pour des soirees plus affirmees.',
        description:
          'Un body en dentelle ajuste avec une ligne elegante, une matiere souple et une finition premium pour une boutique plus seduisante.',
        why: ['Produit hero fort', 'Facile a offrir', 'Tres bon rendu visuel'],
        care: 'Lavage a la main a froid et sechage a plat.',
        notice: 'Reserve aux adultes de 18 ans et plus. Les regles de vente finale peuvent s appliquer.',
      },
    },
  },
  {
    id: 'satin-afterdark-robe',
    sku: 'SW-LGR-002',
    slug: 'satin-afterdark-robe',
    category: 'Nightwear',
    price: 52,
    compareAtPrice: 64,
    stock: 15,
    rating: 4.7,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
    specs: ['Smooth satin touch', 'Waist tie', 'Lightweight drape'],
    translations: {
      en: {
        name: 'Satin Afterdark Robe',
        short: 'Fluid satin layering with a soft luxury finish.',
        description:
          'A satin robe cut for drape and movement, ideal for pairing with statement sets or building elevated bundle offers.',
        why: ['Higher ticket anchor', 'Cross-sells with sets', 'Premium boutique feel'],
        care: 'Gentle wash or delicate dry cleaning recommended.',
        notice: 'Adults 18+ only. Intimate apparel handling rules apply after delivery.',
      },
      fr: {
        name: 'Robe Satin Nuit',
        short: 'Une couche satin fluide avec une finition plus luxueuse.',
        description:
          'Une robe satininee pensee pour le mouvement et la superposition, ideale avec les ensembles et les offres premium.',
        why: ['Bon produit d ancrage', 'Se vend bien en duo', 'Image plus haut de gamme'],
        care: 'Lavage delicat ou nettoyage doux recommande.',
        notice: 'Reserve aux adultes de 18 ans et plus. Les regles d hygiene s appliquent apres livraison.',
      },
    },
  },
  {
    id: 'velvet-curve-set',
    sku: 'SW-LGR-003',
    slug: 'velvet-curve-set',
    category: 'Lingerie Sets',
    price: 58,
    compareAtPrice: 72,
    stock: 13,
    rating: 4.9,
    featured: true,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    specs: ['Velvet finish', 'Two-piece set', 'Contour fit'],
    translations: {
      en: {
        name: 'Velvet Curve Set',
        short: 'A premium two-piece built for shape and texture.',
        description:
          'A velvet-touch set designed to feel richer than entry-level lingerie, with contour-led lines and a clean premium presentation.',
        why: ['Best premium set', 'Strong margin item', 'Fits the store direction better'],
        care: 'Cold hand wash and store folded in a dry drawer.',
        notice: 'Adults 18+ only. Please review sizing before ordering.',
      },
      fr: {
        name: 'Ensemble Velvet Curve',
        short: 'Un ensemble deux pieces plus riche en texture et en maintien.',
        description:
          'Un ensemble toucher velours pense pour une presentation plus premium, avec des lignes plus flatteuses et une meilleure tenue.',
        why: ['Meilleur ensemble premium', 'Bonne marge', 'Plus coherent pour la boutique'],
        care: 'Lavage a la main a froid et rangement au sec.',
        notice: 'Reserve aux adultes de 18 ans et plus. Verifiez la taille avant achat.',
      },
    },
  },
  {
    id: 'sheer-thigh-high-duo',
    sku: 'SW-ACC-001',
    slug: 'sheer-thigh-high-duo',
    category: 'Accessories',
    price: 18,
    compareAtPrice: 24,
    stock: 34,
    rating: 4.5,
    featured: false,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: true,
    image:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
    specs: ['Sheer finish', 'Elastic hold', 'Easy add-on item'],
    translations: {
      en: {
        name: 'Sheer Thigh-High Duo',
        short: 'An easy accessory add-on for higher-value carts.',
        description:
          'A sheer thigh-high pair designed as a clean accessory offer that raises basket value without complicating sizing or fit.',
        why: ['Strong add-on', 'Low friction purchase', 'Matches premium sets'],
        care: 'Hand wash and air dry away from heat.',
        notice: 'Adults 18+ only. Hosiery items may be final sale once opened.',
      },
      fr: {
        name: 'Duo Bas Voile',
        short: 'Un accessoire simple pour augmenter la valeur panier.',
        description:
          'Une paire de bas voile pensee comme vente additionnelle facile, avec un achat simple et une vraie coherence visuelle.',
        why: ['Bon produit additionnel', 'Achat facile', 'S accorde aux ensembles'],
        care: 'Lavage a la main et sechage a l air libre.',
        notice: 'Reserve aux adultes de 18 ans et plus. Les bas ouverts peuvent etre en vente finale.',
      },
    },
  },
  {
    id: 'private-gift-box',
    sku: 'SW-GFT-001',
    slug: 'private-gift-box',
    category: 'Gift Sets',
    price: 69,
    compareAtPrice: 84,
    stock: 9,
    rating: 4.7,
    featured: false,
    visible: true,
    beginnerFriendly: true,
    rechargeable: false,
    quiet: false,
    travelFriendly: true,
    waterResistant: false,
    bundleEligible: false,
    image:
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80',
    specs: ['Curated gift box', 'Premium wrapping', 'Discreet outer packaging'],
    translations: {
      en: {
        name: 'Private Gift Box',
        short: 'A curated box for gifting, date nights, and premium orders.',
        description:
          'A boutique gift box designed for higher-ticket orders, combining presentation, privacy, and easy premium upsell potential.',
        why: ['Great gift purchase', 'Premium packaging story', 'Good special-occasion item'],
        care: 'Store in a cool dry place and avoid crushing the box structure.',
        notice: 'Adults 18+ only. Individual item care instructions are included inside.',
      },
      fr: {
        name: 'Coffret Prive',
        short: 'Un coffret pense pour le cadeau et les commandes plus premium.',
        description:
          'Un coffret boutique concu pour les achats plus haut de gamme, avec une belle presentation et un emballage discret.',
        why: ['Bon produit cadeau', 'Belle histoire produit', 'Ideal pour occasions speciales'],
        care: 'Conserver au sec et eviter d ecraser la structure du coffret.',
        notice: 'Reserve aux adultes de 18 ans et plus. Les consignes sont incluses dans le coffret.',
      },
    },
  },
]

export const launchDays = [
  'Day 1: Lock the launch assortment, pricing, and hero product order.',
  'Day 2: Finalize product imagery, short copy, and category placement.',
  'Day 3: Lock policy pages, age-gate language, shipping, and return rules.',
  'Day 4: Review checkout flow, payment verification, and order email copy.',
  'Day 5: Polish English and French site copy across home, shop, and support pages.',
  'Day 6: Check mobile layout, product cards, and merchandising hierarchy.',
  'Day 7: Go live, monitor orders and stock, and tighten the catalog after launch data comes in.',
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

export const categoryLabels = ['Lingerie Sets', 'Nightwear', 'Accessories', 'Gift Sets']

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
    brand: 'SexWomen',
    tagline: 'Premium lingerie, gift-ready sets, and discreet delivery.',
    nav: {
      home: 'Home',
      shop: 'Shop',
      faq: 'FAQ',
      shipping: 'Shipping',
      returns: 'Returns',
      compliance: 'Policies',
      contact: 'Contact',
      launch: 'Launch Plan',
      admin: 'Admin',
    },
    heroTitle: 'Premium intimate wear, curated with a cleaner storefront.',
    heroBody:
      'Shop lingerie, nightwear, add-ons, and gift-ready sets with discreet delivery, clearer product pages, and checkout that keeps the focus on the product.',
    heroPrimary: 'Shop now',
    heroSecondary: 'Read policies',
    featured: 'Featured Collection',
    categories: 'Collections',
    addToCart: 'Add to cart',
    viewPolicies: 'View policies',
    cart: 'Cart',
    checkout: 'Checkout',
    trust: [
      'Discreet packaging',
      'Secure hosted checkout',
      'Adults 18+ only',
      'USD checkout at launch',
      'Gift-ready presentation',
      'English site with French support copy',
      'Built for South Africa, Nigeria, and Kenya',
    ],
    ageTitle: 'Age Verification',
    ageBody:
      'This storefront is intended for adults aged 18 and over. By entering, you confirm that viewing and purchasing intimate products is permitted in your location.',
    enter: 'I am 18+',
    exit: 'Exit',
    languageLabel: 'Language',
    orderSummary: 'Order summary',
    placeOrder: 'Place order',
    emptyCart: 'Your cart is empty.',
    faqTitle: 'Frequently Asked Questions',
    shippingTitle: 'Discreet shipping across launch markets',
    returnsTitle: 'Returns and hygiene rules',
    complianceTitle: 'Store policies',
    contactTitle: 'Contact and support',
    launchTitle: 'Launch rhythm',
    adminTitle: 'Store operations dashboard',
    shippingBody:
      'Orders ship in discreet packaging to South Africa, Nigeria, and Kenya. Prices are shown in USD at launch, and checkout is routed through secure hosted payment pages with clear confirmation steps.',
    returnsBody:
      'For hygiene reasons, opened or worn intimate items are not returnable. Unopened items may qualify within the stated window if the policy conditions are met. Please check sizing before purchase and contact support quickly if an address change is needed.',
    complianceBody:
      'Adults 18+ only. Product names, images, and descriptions should stay accurate, tasteful, and compliant with local rules. Privacy, delivery, and returns details stay available from the footer and checkout.',
    supportNote:
      'Support by email covers delivery updates, sizing, order issues, and policy questions. English is the primary service language during launch, with French support copy across core pages.',
    orderPlacedTitle: 'Payment confirmed',
    orderPlacedBody:
      'Your order is recorded after the payment provider verifies the transaction. Inventory, email notifications, and the admin dashboard update automatically.',
    shopIntro:
      'A focused launch assortment built around lingerie, nightwear, accessories, and giftable sets.',
  },
  fr: {
    brand: 'SexWomen',
    tagline: 'Lingerie premium, coffrets cadeaux et livraison discrete.',
    nav: {
      home: 'Accueil',
      shop: 'Boutique',
      faq: 'FAQ',
      shipping: 'Livraison',
      returns: 'Retours',
      compliance: 'Politiques',
      contact: 'Contact',
      launch: 'Plan de lancement',
      admin: 'Admin',
    },
    heroTitle: 'Des pieces intimes premium, presentees dans une boutique plus claire.',
    heroBody:
      'Decouvrez une selection de lingerie, nightwear, accessoires et coffrets cadeaux avec une presentation plus propre, une livraison discrete et un parcours d achat plus direct.',
    heroPrimary: 'Acheter maintenant',
    heroSecondary: 'Lire les politiques',
    featured: 'Selection mise en avant',
    categories: 'Collections',
    addToCart: 'Ajouter au panier',
    viewPolicies: 'Voir les politiques',
    cart: 'Panier',
    checkout: 'Paiement',
    trust: [
      'Emballage discret',
      'Paiement securise',
      'Reserve aux adultes de 18 ans et plus',
      'Paiement en USD au lancement',
      'Presentation cadeau',
      'Site en anglais avec support francais',
      'Concu pour l Afrique du Sud, le Nigeria et le Kenya',
    ],
    ageTitle: 'Verification de l age',
    ageBody:
      'Cette boutique est reservee aux adultes de 18 ans et plus. En entrant, vous confirmez etre autorise a consulter et acheter ce type de produits.',
    enter: 'J ai 18 ans ou plus',
    exit: 'Quitter',
    languageLabel: 'Langue',
    orderSummary: 'Recapitulatif',
    placeOrder: 'Passer la commande',
    emptyCart: 'Votre panier est vide.',
    faqTitle: 'Questions frequentes',
    shippingTitle: 'Livraison discrete sur les marches de lancement',
    returnsTitle: 'Retours et regles d hygiene',
    complianceTitle: 'Politiques de la boutique',
    contactTitle: 'Contact et assistance',
    launchTitle: 'Rythme de lancement',
    adminTitle: 'Tableau de bord',
    shippingBody:
      'Les commandes sont expediees dans un emballage discret vers l Afrique du Sud, le Nigeria et le Kenya. Les prix sont affiches en USD au lancement et le paiement passe par une page securisee avec une confirmation claire.',
    returnsBody:
      'Pour des raisons d hygiene, les articles intimes ouverts ou portes ne sont pas retournables. Les articles non ouverts peuvent etre acceptes dans le delai prevu si les conditions de politique sont remplies. Verifiez bien la taille avant achat et contactez le support rapidement en cas de changement.',
    complianceBody:
      'Reserve aux adultes de 18 ans et plus. Les noms, images et descriptions doivent rester exacts, elegants et conformes aux regles locales. Les informations de confidentialite, livraison et retour restent visibles depuis le pied de page et le paiement.',
    supportNote:
      'Le support par e-mail couvre la livraison, les tailles, les commandes et les questions de politique. L anglais reste la langue principale pendant le lancement, avec un support francais sur les pages cles.',
    orderPlacedTitle: 'Paiement confirme',
    orderPlacedBody:
      'La commande est creee apres verification du paiement. Une fois validee, le stock et le tableau de bord sont mis a jour automatiquement.',
    shopIntro:
      'Un catalogue de lancement plus cohherent, centre sur la lingerie, les cadeaux et les accessoires premium.',
  },
}
