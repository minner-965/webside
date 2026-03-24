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
        short: 'A fitted lace hero piece with a clean premium silhouette.',
        description:
          'A polished lace bodysuit built to anchor the launch collection, with soft stretch, a flattering shape, and a premium finish that works well on product pages and gift-led bundles.',
        why: ['Launch hero item', 'Strong visual sell-through', 'Easy to pair with accessories'],
        care: 'Hand wash cold and lay flat to dry. Avoid bleach and heat.',
        notice: 'Adults 18+ only. Intimate apparel may be final sale where local rules allow.',
      },
      fr: {
        name: 'Body Dentelle Minuit',
        short: 'Une piece en dentelle ajustee avec une finition plus premium.',
        description:
          'Un body en dentelle pense pour guider le lancement, avec une coupe flatteuse, une matiere souple et une finition qui reste lisible sur une page produit.',
        why: ['Produit de lancement', 'Bonne mise en avant visuelle', 'Se combine facilement'],
        care: 'Lavage a la main a froid et sechage a plat. Eviter la chaleur.',
        notice: 'Reserve aux adultes de 18 ans et plus. Certaines ventes peuvent etre finales selon la reglementation locale.',
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
        short: 'A fluid satin layer that lifts sets, gifting, and upsells.',
        description:
          'A satin robe cut for movement and presentation, designed to sit beside lingerie sets, gift boxes, and higher-value bundle offers.',
        why: ['Upsell-friendly item', 'Works with bundles', 'Improves cart value'],
        care: 'Gentle wash or delicate dry cleaning recommended. Hang to dry.',
        notice: 'Adults 18+ only. Follow hygiene and handling guidance after delivery.',
      },
      fr: {
        name: 'Robe Satin Nuit',
        short: 'Une couche satin fluide qui soutient les ventes et les coffrets.',
        description:
          'Une robe satininee pensee pour la presentation, la superposition et les offres plus premium, avec une coupe souple et un rendu boutique plus net.',
        why: ['Produit de valeur', 'Bon complement aux ensembles', 'Ameliore le panier'],
        care: 'Lavage delicat ou nettoyage a sec doux recommande. Sechage sur cintre.',
        notice: 'Reserve aux adultes de 18 ans et plus. Respecter les consignes d hygiene apres livraison.',
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
        short: 'A premium two-piece focused on shape, texture, and fit.',
        description:
          'A velvet-touch set built for the core catalog, with contour-led lines, a richer feel, and a clean presentation suited to premium intimate retail.',
        why: ['Core premium set', 'Strong margin potential', 'Clear hero for the shop'],
        care: 'Cold hand wash and store folded in a dry drawer. Do not tumble dry.',
        notice: 'Adults 18+ only. Please review sizing before placing an order.',
      },
      fr: {
        name: 'Ensemble Velvet Curve',
        short: 'Un ensemble deux pieces axe sur la forme, la texture et la coupe.',
        description:
          'Un ensemble toucher velours pense pour le coeur de catalogue, avec des lignes plus flatteuses, une sensation plus riche et une presentation boutique plus nette.',
        why: ['Ensemble premium central', 'Bonne marge potentielle', 'Hero clair pour la boutique'],
        care: 'Lavage a la main a froid et rangement au sec. Ne pas passer au tambour.',
        notice: 'Reserve aux adultes de 18 ans et plus. Verifiez la taille avant de commander.',
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
        short: 'A simple add-on that raises basket value without friction.',
        description:
          'A sheer thigh-high pair positioned as a low-friction add-on, easy to bundle with the launch assortment and simple to understand at checkout.',
        why: ['Fast add-on', 'Easy to bundle', 'Supports higher cart totals'],
        care: 'Hand wash and air dry away from heat. Avoid wringing.',
        notice: 'Adults 18+ only. Hosiery items may be final sale once opened.',
      },
      fr: {
        name: 'Duo Bas Voile',
        short: 'Un ajout simple pour augmenter la valeur du panier.',
        description:
          'Une paire de bas voile positionnee comme ajout a faible friction, facile a associer au catalogue de lancement et simple a comprendre au moment du paiement.',
        why: ['Ajout rapide', 'Facile a associer', 'Aide a faire monter le panier'],
        care: 'Lavage a la main et sechage a l air libre. Ne pas tordre.',
        notice: 'Reserve aux adultes de 18 ans et plus. Les articles ouverts peuvent etre en vente finale.',
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
        short: 'A gift-ready box for premium orders and special occasions.',
        description:
          'A boutique gift box designed to support premium orders, with presentation, privacy, and giftability built into the offer.',
        why: ['Strong gift option', 'Premium packaging story', 'Useful for seasonal promotions'],
        care: 'Store in a cool dry place and avoid crushing the box structure. Keep wrapped until use.',
        notice: 'Adults 18+ only. Individual item care instructions are included inside.',
      },
      fr: {
        name: 'Coffret Prive',
        short: 'Un coffret pret a offrir pour les commandes premium et les occasions speciales.',
        description:
          'Un coffret boutique concu pour accompagner les commandes premium, avec la presentation, la discretion et la valeur cadeau au centre de l offre.',
        why: ['Bonne option cadeau', 'Belle histoire produit', 'Utile pour les promotions saisonnieres'],
        care: 'Conserver au sec et eviter d ecraser la structure du coffret. Garder emballe jusqu a l usage.',
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
    featured: 'Launch highlights',
    categories: 'Shop by category',
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
    featured: 'Produits phares',
    categories: 'Par categorie',
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
      'La commande est enregistree apres verification du paiement par le prestataire. Le stock, les emails et le tableau de bord admin se mettent a jour automatiquement.',
    shopIntro:
      'Un catalogue de lancement plus cohherent, centre sur la lingerie, les cadeaux et les accessoires premium.',
  },
}
