import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './index.css'
import { categoryLabels, markets, navSections, uiText } from './storeData'
import type { Locale, NavSection, Product } from './storeData'

type CartItem = {
  productId: string
  quantity: number
}

type CheckoutForm = {
  name: string
  email: string
  phone: string
  country: string
  address: string
}

type OrderStatus = 'Paid' | 'Processing' | 'Shipped' | 'Refunded' | 'Cancelled'

type ProductSort = 'featured' | 'stock' | 'price'
type ProductScope = 'All' | 'Featured' | 'Low stock' | 'Archived'
type ShopSort = 'featured' | 'priceLow' | 'priceHigh' | 'rating'
type ShopIntent = 'All' | 'Starter picks' | 'Gift-ready' | 'Travel-friendly' | 'Low stock'
type HomepageContent = {
  heroEyebrow: string
  heroTitle: string
  heroBody: string
  heroPrimary: string
  heroSecondary: string
  shopIntro: string
  focusTitle: string
  focusBody: string
  trustLine: string
}

type ProductEditor = {
  id: string
  slug: string
  nameEn: string
  nameFr: string
  sku: string
  category: string
  price: string
  compareAtPrice: string
  rating: string
  image: string
  shortEn: string
  shortFr: string
  descriptionEn: string
  descriptionFr: string
  specs: string
  featured: boolean
  visible: boolean
  archived?: boolean
}

type ProductDraft = {
  name: string
  nameEn: string
  nameFr: string
  slug: string
  sku: string
  category: string
  price: string
  compareAtPrice: string
  rating: string
  image: string
  short: string
  description: string
  shortEn: string
  shortFr: string
  descriptionEn: string
  descriptionFr: string
  specs: string
  featured: boolean
  visible: boolean
  archived?: boolean
}

type OrderRecord = {
  id: string
  customerName: string
  customerEmail: string
  phone: string
  country: string
  address: string
  language: Locale
  paymentStatus: 'Paid'
  fulfillmentStatus: OrderStatus
  internalNote: string
  total: number
  createdAt: string
  paymentReference?: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
  }>
}

type StorePayload = {
  products: Product[]
  orders: OrderRecord[]
  config: {
    paymentConfigured: boolean
    emailConfigured: boolean
    supportEmail: string
    appBaseUrl: string
    adminAuthEnabled?: boolean
  }
}

const initialForm: CheckoutForm = {
  name: '',
  email: '',
  phone: '',
  country: markets[0],
  address: '',
}

const emptyEditor: ProductEditor = {
  id: '',
  slug: '',
  nameEn: '',
  nameFr: '',
  sku: '',
  category: '',
  price: '',
  compareAtPrice: '',
  rating: '',
  image: '',
  shortEn: '',
  shortFr: '',
  descriptionEn: '',
  descriptionFr: '',
  specs: '',
  featured: false,
  visible: true,
  archived: false,
}

const emptyProductDraft: ProductDraft = {
  name: '',
  nameEn: '',
  nameFr: '',
  slug: '',
  sku: '',
  category: categoryLabels[0] ?? '',
  price: '',
  compareAtPrice: '',
  rating: '4.8',
  image: '',
  short: '',
  description: '',
  shortEn: '',
  shortFr: '',
  descriptionEn: '',
  descriptionFr: '',
  specs: '',
  featured: false,
  visible: true,
  archived: false,
}

const storageKeys = {
  locale: 'aster-locale',
  age: 'aster-age-confirmed',
  cart: 'aster-cart',
  adminAccessCode: 'aster-admin-access-code',
  homepageContent: 'aster-homepage-content',
} as const

const ADMIN_ACCESS_HEADER = 'X-Admin-Access-Code'
const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    return fallback
  }
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures so storefront interactions still work in restricted browsers.
  }
}

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(key)
  } catch {
    return fallback
  }
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeSession(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures so admin gate still behaves in restricted browsers.
  }
}

function slugifyProductName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseSpecs(specs: string) {
  return specs
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function joinSpecs(specs: string[]) {
  return specs.join('\n')
}

function buildHomepageContent(locale: Locale, ui: (typeof uiText)[Locale]): HomepageContent {
  void locale
  return {
    heroEyebrow: 'Premium lingerie | EN + FR',
    heroTitle: ui.heroTitle,
    heroBody: ui.heroBody,
    heroPrimary: ui.heroPrimary,
    heroSecondary: ui.heroSecondary,
    shopIntro: ui.shopIntro,
    focusTitle: 'Homepage focus',
    focusBody: 'Hero products, gift sets, and premium add-ons only. No filler blocks.',
    trustLine: 'Discreet packaging, live support, and a secure hosted checkout keep the experience calm end to end.',
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      reject(new Error('Please choose an image smaller than 2 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

async function request<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const payload = (await response.json().catch(() => null)) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed')
  }
  return payload
}

function App() {
  const [locale, setLocale] = useState<Locale>(() => readLocal(storageKeys.locale, 'en'))
  const [activeSection, setActiveSection] = useState<NavSection>('home')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [shopSort, setShopSort] = useState<ShopSort>('featured')
  const [shopIntent, setShopIntent] = useState<ShopIntent>('All')
  const [cart, setCart] = useState<CartItem[]>(() => readLocal(storageKeys.cart, []))
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(() => readLocal(storageKeys.age, false))
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(initialForm)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [paymentConfigured, setPaymentConfigured] = useState(false)
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [supportEmail, setSupportEmail] = useState('support@asterwellness.example')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminAuthEnabled, setAdminAuthEnabled] = useState(false)
  const [adminAccessCode, setAdminAccessCode] = useState<string>(() => readSession(storageKeys.adminAccessCode, ''))
  const [adminAccessDraft, setAdminAccessDraft] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [adminScope, setAdminScope] = useState<ProductScope>('All')
  const [adminSort, setAdminSort] = useState<ProductSort>('featured')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All')
  const [orderSort, setOrderSort] = useState<'recent' | 'oldest' | 'total'>('recent')
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [orderNoteDraft, setOrderNoteDraft] = useState('')
  const [orderNoteSaving, setOrderNoteSaving] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [editor, setEditor] = useState<ProductEditor>(emptyEditor)
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft)
  const [draftOpen, setDraftOpen] = useState(false)
  const [homepageContentByLocale, setHomepageContentByLocale] = useState<Record<Locale, HomepageContent>>(() =>
    readLocal(storageKeys.homepageContent, {
      en: buildHomepageContent('en', uiText.en),
      fr: buildHomepageContent('fr', uiText.fr),
    }),
  )

  const adminGateRequired = adminAuthEnabled && !adminAccessCode.trim()

  useEffect(() => {
    writeLocal(storageKeys.locale, locale)
  }, [locale])

  useEffect(() => {
    writeLocal(storageKeys.age, ageConfirmed)
  }, [ageConfirmed])

  useEffect(() => {
    writeLocal(storageKeys.cart, cart)
  }, [cart])

  useEffect(() => {
    writeLocal(storageKeys.homepageContent, homepageContentByLocale)
  }, [homepageContentByLocale])

  useEffect(() => {
    writeSession(storageKeys.adminAccessCode, adminAccessCode)
  }, [adminAccessCode])

  useEffect(() => {
    const sync = async () => {
      try {
        setLoading(true)
        const payload = await request<StorePayload>('/api/store')
        setProducts(payload.products)
        setOrders(payload.orders)
        setPaymentConfigured(payload.config.paymentConfigured)
        setEmailConfigured(payload.config.emailConfigured)
        setSupportEmail(payload.config.supportEmail)
        setError(null)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load store')
      } finally {
        setLoading(false)
      }
    }

    void sync()
  }, [])

  useEffect(() => {
    if (activeSection !== 'admin') return

    const syncAdmin = async () => {
      try {
        const payload = await request<StorePayload>('/api/store?includeHidden=1&includeArchived=1', {
          headers: adminAccessCode
            ? {
                [ADMIN_ACCESS_HEADER]: adminAccessCode,
              }
            : undefined,
        })
        syncStore(payload)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load admin catalog')
      }
    }

    void syncAdmin()
  }, [activeSection, adminAccessCode])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    const completedOrderId = params.get('orderId')
    if (paymentStatus === 'success' && completedOrderId) {
      setOrderId(completedOrderId)
      setCart([])
      writeLocal(storageKeys.cart, [])
      setActiveSection('home')
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (paymentStatus === 'failed') {
      setError('Payment was not completed. You can try again from checkout.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const t = uiText[locale]
  const homepageContent = {
    ...buildHomepageContent(locale, t),
    ...(homepageContentByLocale[locale] ?? {}),
  }
  const catalogProducts = products
  const storefrontProducts = catalogProducts.filter(
    (product) => product.visible !== false && product.archived !== true,
  )

  const visibleProducts = useMemo(() => {
    const byCategory =
      selectedCategory === 'All'
        ? storefrontProducts
        : storefrontProducts.filter((product) => product.category === selectedCategory)

    const byIntent = byCategory.filter((product) => {
      if (shopIntent === 'All') return true
      if (shopIntent === 'Starter picks') return product.beginnerFriendly
      if (shopIntent === 'Gift-ready') return product.category === 'Gift Sets' || product.bundleEligible === false
      if (shopIntent === 'Travel-friendly') return product.travelFriendly
      if (shopIntent === 'Low stock') return product.stock <= 12
      return true
    })

    return [...byIntent].sort((left, right) => {
      if (shopSort === 'priceLow') return left.price - right.price
      if (shopSort === 'priceHigh') return right.price - left.price
      if (shopSort === 'rating') return right.rating - left.rating
      return Number(right.featured) - Number(left.featured) || right.rating - left.rating
    })
  }, [selectedCategory, shopIntent, shopSort, storefrontProducts])

  const cartItems = useMemo(
    () =>
      cart
        .map((item) => {
          const product = catalogProducts.find((entry) => entry.id === item.productId)
          return product ? { product, quantity: item.quantity } : null
        })
        .filter((item): item is { product: Product; quantity: number } => Boolean(item)),
    [cart, catalogProducts],
  )

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shipping = subtotal > 0 ? 9 : 0
  const total = subtotal + shipping
  const paidOrders = orders.filter((order) => order.paymentStatus === 'Paid').length
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const inventoryUnits = catalogProducts.reduce((sum, product) => sum + product.stock, 0)
  const lowStockItems = catalogProducts.filter((product) => product.stock <= 12).length
  const featuredProducts = storefrontProducts.filter((product) => product.featured).slice(0, 3)
  const collectionCards = categoryLabels.map((category) => {
    const items = storefrontProducts.filter((product) => product.category === category)
    const lowestPrice = items.length ? Math.min(...items.map((item) => item.price)) : 0
    return {
      category,
      count: items.length,
      lowestPrice,
      hero: items[0],
    }
  })
  const heroSignals = [
    {
      label: 'Featured pieces',
      value: String(featuredProducts.length),
      note: 'Curated for the homepage',
    },
    {
      label: 'Category groups',
      value: String(collectionCards.length),
      note: 'Focused launch assortment',
    },
    {
      label: 'Markets live',
      value: String(markets.length),
      note: 'South Africa, Nigeria, Kenya',
    },
  ]
  const storyMoments = [
    {
      title: 'Build the first impression',
      body: 'Lead with polished sets, clear pricing, and a premium visual rhythm that feels giftable from the first scroll.',
    },
    {
      title: 'Keep the basket moving',
      body: 'Pair statement pieces with lighter add-ons so shoppers can raise cart value without feeling pushed into bundles.',
    },
    {
      title: 'Close with confidence',
      body: 'Discreet packaging, fast support, and a secure hosted checkout keep the experience calm all the way to payment.',
    },
  ]
  const categoryHighlights = collectionCards
    .filter((collection) => collection.hero)
    .slice(0, 3)
    .map((collection, index) => ({
      ...collection,
      label: index === 0 ? 'Entry point' : index === 1 ? 'Best margin' : 'Gift lane',
    }))
  const hiddenProductCount = catalogProducts.filter((product) => product.visible === false && !product.archived).length
  const archivedProductCount = catalogProducts.filter((product) => product.archived).length
  const openOrderCount = orders.filter((order) => order.fulfillmentStatus === 'Paid' || order.fulfillmentStatus === 'Processing').length
  const averageOrderValue = paidOrders > 0 ? revenue / paidOrders : 0
  const reassuranceCards = [
    {
      title: 'Discreet by default',
      body: 'Plain packaging, clear policy links, and a calm checkout path keep the first-time experience low friction.',
    },
    {
      title: 'Live support',
      body: `Help requests route to ${supportEmail} so shoppers know where to reach the team before and after payment.`,
    },
    {
      title: paymentConfigured ? 'Hosted payment live' : 'Payment setup in progress',
      body: paymentConfigured
        ? 'Checkout is wired to a hosted payment flow and returns through server-verified callbacks.'
        : 'The checkout flow is ready, and payment becomes live as soon as the provider keys are set.',
    },
    {
      title: 'Return guidance visible',
      body: 'Returns, compliance, and shipping live in the main nav so buyers do not need to hunt for reassurance.',
    },
  ]
  const bundleHighlights = [
    {
      label: 'Gift lane',
      category: categoryHighlights[2]?.category || 'All',
      title: categoryHighlights[2]?.category || 'Gift-ready collection',
      body: categoryHighlights[2]?.hero?.translations[locale].short || 'Create a polished gift path with one click into the shop.',
    },
    {
      label: 'Hero pick',
      category: featuredProducts[0]?.category || 'All',
      title: featuredProducts[0]?.translations[locale].name || 'Homepage hero',
      body: featuredProducts[0]?.translations[locale].short || 'Lead traffic to the strongest conversion piece in the edit.',
    },
    {
      label: 'Bundle idea',
      category: featuredProducts[1]?.category || 'All',
      title: featuredProducts[1]?.translations[locale].name || 'Curated pairing',
      body: 'Pair a statement piece with a lighter add-on to raise basket value without cluttering the page.',
    },
  ]
  const getProductSellingPoints = (product: Product) => ({
    quickFacts: [
      product.beginnerFriendly ? 'Starter-friendly fit' : 'Statement silhouette',
      product.travelFriendly ? 'Travel-friendly' : 'Home styling ready',
      product.bundleEligible === false ? 'Gift lane hero' : 'Pairs well in bundles',
    ],
    whyList: [
      product.stock <= 12 ? 'Low stock adds urgency' : 'Healthy stock for campaigns',
      product.compareAtPrice ? `Compare at $${product.compareAtPrice}` : 'No promo clutter',
      product.featured ? 'Homepage-worthy edit' : 'Merchandised for discovery',
    ],
  })
  const opsSummaryCards = [
    {
      label: 'Paid orders',
      value: String(paidOrders),
      note: openOrderCount ? `${openOrderCount} still open for follow-up` : 'All current orders are settled or complete',
    },
    {
      label: 'Average ticket',
      value: averageOrderValue ? `$${averageOrderValue.toFixed(2)}` : '$0.00',
      note: 'Useful for checking whether bundles are lifting order value',
    },
    {
      label: 'Catalog health',
      value: `${catalogProducts.length} SKUs`,
      note: `${hiddenProductCount} hidden and ${archivedProductCount} archived right now`,
    },
    {
      label: 'Stock pressure',
      value: String(lowStockItems),
      note: 'Low-stock items deserve the first replenishment call',
    },
  ]
  const shopIntentCards = [
    {
      label: 'Starter picks' as ShopIntent,
      title: 'Easy first basket',
      body: 'Start with products that are straightforward to browse, gift, and understand.',
    },
    {
      label: 'Gift-ready' as ShopIntent,
      title: 'Gift lane',
      body: 'Push shoppers into box-ready and occasion-friendly products with stronger presentation value.',
    },
    {
      label: 'Travel-friendly' as ShopIntent,
      title: 'Low-friction picks',
      body: 'Surface lighter pieces that travel well and add less hesitation at checkout.',
    },
    {
      label: 'Low stock' as ShopIntent,
      title: 'Urgent to restock',
      body: 'See which products are close to running out so merchandising and replenishment stay aligned.',
    },
  ]
  const shopIntentTiles = [
    {
      title: 'Bestsellers',
      body: 'Jump straight to the strongest conversion pieces in the live edit.',
      category: 'All',
      intent: 'All' as ShopIntent,
      highlighted: true,
    },
    {
      title: 'Gift lane',
      body: 'Browse pieces that are easy to bundle, gift, and upsell together.',
      category: categoryHighlights[2]?.category || 'All',
      intent: 'Gift-ready' as ShopIntent,
      highlighted: false,
    },
    {
      title: 'By category',
      body: 'Open the shop already filtered to the category that matches buyer intent.',
      category: categoryHighlights[0]?.category || 'All',
      intent: 'Starter picks' as ShopIntent,
      highlighted: false,
    },
  ]
  const productAttentionCount = hiddenProductCount + archivedProductCount + lowStockItems
  const orderAttentionCount = orders.filter(
    (order) => order.fulfillmentStatus === 'Paid' || order.fulfillmentStatus === 'Processing',
  ).length
  const adminStatusLabel = adminAuthEnabled
    ? adminGateRequired
      ? 'Admin locked'
      : 'Admin unlocked'
    : 'Admin open'
  const adminOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()
    return orders
      .filter((order) => {
        const haystack = [
          order.id,
          order.customerName,
          order.customerEmail,
          order.phone,
          order.country,
          order.address,
          order.language,
          order.paymentReference || '',
          order.fulfillmentStatus,
          order.internalNote || '',
        ]
          .join(' ')
          .toLowerCase()
        const matchesSearch = query ? haystack.includes(query) : true
        const matchesStatus =
          orderStatusFilter === 'All' ? true : order.fulfillmentStatus === orderStatusFilter
        return matchesSearch && matchesStatus
      })
      .sort((left, right) => {
        if (orderSort === 'total') return right.total - left.total
        const leftTime = new Date(left.createdAt).getTime()
        const rightTime = new Date(right.createdAt).getTime()
        return orderSort === 'oldest' ? leftTime - rightTime : rightTime - leftTime
      })
  }, [orders, orderSearch, orderSort, orderStatusFilter])
  const orderAttentionQueue = adminOrders
    .filter((order) => order.fulfillmentStatus === 'Paid' || order.fulfillmentStatus === 'Processing')
    .slice(0, 4)
  const selectedOrder =
    adminOrders.find((order) => order.id === selectedOrderId) ?? adminOrders[0] ?? null
  useEffect(() => {
    if (activeSection !== 'admin') return
    if (!adminOrders.length) {
      if (selectedOrderId) setSelectedOrderId('')
      setOrderNoteDraft('')
      return
    }
    if (!selectedOrderId || !adminOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(adminOrders[0].id)
    }
  }, [activeSection, adminOrders, selectedOrderId])

  useEffect(() => {
    if (!selectedOrder) {
      setOrderNoteDraft('')
      return
    }
    setOrderNoteDraft(selectedOrder.internalNote || '')
  }, [selectedOrder])
  const adminProducts = catalogProducts
    .filter((product) => {
      const haystack = `${product.id} ${product.sku} ${product.category} ${product.translations[locale].name} ${product.translations[locale].short}`.toLowerCase()
      const matchesSearch = haystack.includes(adminSearch.trim().toLowerCase())
      const matchesScope =
        adminScope === 'All' ||
        (adminScope === 'Featured' && product.featured) ||
        (adminScope === 'Low stock' && product.stock <= 12) ||
        (adminScope === 'Archived' && product.archived === true)
      return matchesSearch && matchesScope
    })
    .sort((left, right) => {
      if (adminSort === 'stock') return left.stock - right.stock
      if (adminSort === 'price') return left.price - right.price
      return Number(right.featured) - Number(left.featured) || right.rating - left.rating
    })
  const priorityProducts = adminProducts
    .filter((product) => product.stock <= 12 || product.visible === false || product.archived)
    .slice(0, 4)
  const selectedAdminProducts = adminProducts.filter((product) => selectedProductIds.includes(product.id))
  const allAdminProductsSelected = adminProducts.length > 0 && selectedAdminProducts.length === adminProducts.length
  useEffect(() => {
    if (!selectedProductIds.length) return
    const allowedIds = new Set(adminProducts.map((product) => product.id))
    const nextSelection = selectedProductIds.filter((productId) => allowedIds.has(productId))
    if (nextSelection.length !== selectedProductIds.length) {
      setSelectedProductIds(nextSelection)
    }
  }, [adminProducts, selectedProductIds])

  const syncStore = (payload: StorePayload) => {
    setProducts(payload.products)
    setOrders(payload.orders)
    setPaymentConfigured(payload.config.paymentConfigured)
    setEmailConfigured(payload.config.emailConfigured)
    setSupportEmail(payload.config.supportEmail)
    setAdminAuthEnabled(Boolean(payload.config.adminAuthEnabled))
  }

  const adminRequest = async <T,>(input: RequestInfo, init?: RequestInit) => {
    const headers = {
      ...(init?.headers || {}),
      ...(adminAccessCode
        ? {
            [ADMIN_ACCESS_HEADER]: adminAccessCode,
          }
        : {}),
    }
    return request<T>(input, { ...init, headers })
  }

  const unlockAdmin = () => {
    const nextCode = adminAccessDraft.trim()
    if (!nextCode) {
      setError('Enter an admin access code to open the dashboard.')
      return
    }
    setAdminAccessCode(nextCode)
    setAdminAccessDraft('')
    setError(null)
  }

  const clearAdminAccess = () => {
    setAdminAccessCode('')
    setAdminAccessDraft('')
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(storageKeys.adminAccessCode)
      } catch {
        // Ignore session storage failures.
      }
    }
    setError(null)
  }

  const updateHomepageContent = (field: keyof HomepageContent, value: string) => {
    setHomepageContentByLocale((current) => ({
      ...current,
      [locale]: {
        ...(current[locale] ?? buildHomepageContent(locale, t)),
        [field]: value,
      },
    }))
  }

  const resetHomepageContent = () => {
    setHomepageContentByLocale((current) => ({
      ...current,
      [locale]: buildHomepageContent(locale, t),
    }))
    setError(null)
  }

  const setDraftImageFromFile = async (file?: File | null) => {
    if (!file) return
    try {
      const nextImage = await readFileAsDataUrl(file)
      setDraft((current) => ({ ...current, image: nextImage }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed')
    }
  }

  const setEditorImageFromFile = async (file?: File | null) => {
    if (!file) return
    try {
      const nextImage = await readFileAsDataUrl(file)
      setEditor((current) => ({ ...current, image: nextImage }))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed')
    }
  }

  const startNewProduct = () => {
    setDraft(emptyProductDraft)
    setEditor(emptyEditor)
    setDraftOpen(true)
    setError(null)
  }

  const seedDraftFromProduct = (product: Product) => {
    setDraft({
      name: product.translations.en.name,
      nameEn: product.translations.en.name,
      nameFr: product.translations.fr.name,
      slug: product.slug,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      rating: String(product.rating),
      image: product.image,
      short: product.translations.en.short,
      description: product.translations.en.description,
      shortEn: product.translations.en.short,
      shortFr: product.translations.fr.short,
      descriptionEn: product.translations.en.description,
      descriptionFr: product.translations.fr.description,
      specs: joinSpecs(product.specs),
      featured: product.featured,
      visible: product.visible,
      archived: product.archived === true,
    })
    setDraftOpen(true)
    setError(null)
  }

  const duplicateProductToDraft = (product: Product | undefined) => {
    if (!product) return
    seedDraftFromProduct(product)
  }

  const openEditor = (product: Product) => {
    setDraftOpen(false)
    setEditor({
      id: product.id,
      slug: product.slug,
      nameEn: product.translations.en.name,
      nameFr: product.translations.fr.name,
      sku: product.sku,
      category: product.category,
      price: String(product.price),
      compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : '',
      rating: String(product.rating),
      image: product.image,
      shortEn: product.translations.en.short,
      shortFr: product.translations.fr.short,
      descriptionEn: product.translations.en.description,
      descriptionFr: product.translations.fr.description,
      specs: joinSpecs(product.specs),
      featured: product.featured,
      visible: product.visible,
      archived: product.archived === true,
    })
  }

  const toggleCatalogFlag = async (productId: string, body: Record<string, unknown>) => {
    try {
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      syncStore(payload.store)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Catalog update failed')
    }
  }

  const updateSelectedProducts = async (body: Record<string, unknown>, successMessage: string) => {
    const productIds = selectedProductIds
    if (!productIds.length) {
      setError('Select one or more products first.')
      return
    }

    try {
      setError(null)
      let nextStore: StorePayload | null = null
      for (const productId of productIds) {
        const payload = await adminRequest<{ store: StorePayload }>(`/api/products/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
        nextStore = payload.store
      }
      if (nextStore) {
        syncStore(nextStore)
      }
      setSelectedProductIds([])
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : successMessage)
    }
  }

  const toggleAllAdminProducts = (checked: boolean) => {
    setSelectedProductIds(checked ? adminProducts.map((product) => product.id) : [])
  }

  const saveProduct = async () => {
    if (!editor.id) return

    try {
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/products/${editor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sku: editor.sku,
          slug: editor.slug.trim() || slugifyProductName(editor.nameEn),
          category: editor.category,
          price: Number(editor.price),
          compareAtPrice: editor.compareAtPrice === '' ? null : Number(editor.compareAtPrice),
          rating: Number(editor.rating),
          image: editor.image,
          nameEn: editor.nameEn,
          shortEn: editor.shortEn,
          descriptionEn: editor.descriptionEn,
          nameFr: editor.nameFr,
          shortFr: editor.shortFr,
          descriptionFr: editor.descriptionFr,
          specs: parseSpecs(editor.specs),
          featured: editor.featured,
          visible: editor.visible,
          archived: editor.archived,
        }),
      })
      syncStore(payload.store)
      setEditor(emptyEditor)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Product update failed')
    }
  }

  const createProduct = async () => {
    try {
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          slug: draft.slug.trim() || slugifyProductName(draft.nameEn),
          name: draft.nameEn,
          nameFr: draft.nameFr,
          sku: draft.sku,
          category: draft.category,
          price: Number(draft.price),
          compareAtPrice: draft.compareAtPrice === '' ? null : Number(draft.compareAtPrice),
          rating: Number(draft.rating),
          image: draft.image,
          short: draft.shortEn,
          shortFr: draft.shortFr,
          description: draft.descriptionEn,
          descriptionFr: draft.descriptionFr,
          specs: parseSpecs(draft.specs),
          featured: draft.featured,
          visible: draft.visible,
        }),
      })
      syncStore(payload.store)
      setDraft(emptyProductDraft)
      setDraftOpen(false)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Product creation failed')
    }
  }

  const addToCart = (productId: string) => {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId)
      if (existing) {
        return current.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { productId, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const beginCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cartItems.length) return

    try {
      setError(null)
      const payload = await request<{ paymentLink: string; txRef: string }>('/api/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          ...checkoutForm,
          locale,
          total,
          items: cartItems.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
          })),
        }),
      })
      window.location.assign(payload.paymentLink)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout failed')
    }
  }

  const updateOrderStatus = async (orderIdToUpdate: string, fulfillmentStatus: OrderStatus) => {
    try {
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/orders/${orderIdToUpdate}`, {
        method: 'PATCH',
        body: JSON.stringify({ fulfillmentStatus }),
      })
      syncStore(payload.store)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Status update failed')
    }
  }

  const adjustStock = async (productId: string, delta: number) => {
    try {
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      })
      syncStore(payload.store)
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : 'Stock update failed')
    }
  }

  const resetStore = async () => {
    try {
      setError(null)
      const payload = await adminRequest<StorePayload>('/api/reset', { method: 'POST' })
      syncStore(payload)
      setCart([])
      setOrderId(null)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Reset failed')
    }
  }

  const refreshAdminStore = async () => {
    try {
      setError(null)
      const payload = await adminRequest<StorePayload>('/api/store?includeHidden=1&includeArchived=1')
      syncStore(payload)
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Admin refresh failed')
    }
  }

  const saveOrderNote = async () => {
    if (!selectedOrder) {
      setError('Pick an order before saving a note.')
      return
    }

    try {
      setOrderNoteSaving(true)
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ internalNote: orderNoteDraft.trim() }),
      })
      syncStore(payload.store)
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Order note update failed')
    } finally {
      setOrderNoteSaving(false)
    }
  }

  const exportOrdersCsv = async () => {
    try {
      setError(null)
      const response = await fetch('/api/orders/export.csv', {
        headers: adminAccessCode
          ? {
              [ADMIN_ACCESS_HEADER]: adminAccessCode,
            }
          : undefined,
      })

      if (!response.ok) {
        const message = await response.text().catch(() => '')
        throw new Error(message || 'CSV export failed')
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i)
      const fileName = fileNameMatch?.[1] || `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'CSV export failed')
    }
  }

  if (!ageConfirmed) {
    return (
      <div className="age-gate">
        <div className="age-card">
          <span className="eyebrow">Aster Wellness</span>
          <h1>{t.ageTitle}</h1>
          <p>{t.ageBody}</p>
          <div className="age-actions">
            <button className="primary-btn" type="button" onClick={() => setAgeConfirmed(true)}>
              {t.enter}
            </button>
            <button className="ghost-btn" type="button" onClick={() => window.location.assign('about:blank')}>
              {t.exit}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">{markets.join(' / ')}</p>
          <h1 className="brand-mark">{t.brand}</h1>
        </div>
        <div className="header-actions">
          <span className={adminGateRequired ? 'admin-status-pill locked' : 'admin-status-pill'}>
            {adminStatusLabel}
          </span>
          <label className="lang-switcher">
            <span>{t.languageLabel}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
          </label>
          <button className="cart-pill" type="button" onClick={() => setCheckoutOpen(true)}>
            {t.cart} ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
          {adminAuthEnabled ? (
            adminGateRequired ? (
              <button className="ghost-btn small" type="button" onClick={() => setActiveSection('admin')}>
                Open admin
              </button>
            ) : (
              <button
                className="ghost-btn small"
                type="button"
                onClick={() => {
                  clearAdminAccess()
                  setActiveSection('home')
                }}
              >
                Logout
              </button>
            )
          ) : null}
        </div>
      </header>

      <nav className="site-nav">
        {navSections.map((section) => (
          <button
            key={section}
            type="button"
            className={activeSection === section ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveSection(section)}
          >
            {t.nav[section]}
          </button>
        ))}
      </nav>

      <main className="content-shell">
        {error ? (
          <section className="error-banner">
            <strong>Action needed</strong>
            <p>{error}</p>
          </section>
        ) : null}

        {orderId ? (
          <section className="confirmation-banner">
            <strong>{t.orderPlacedTitle}</strong>
            <p>{t.orderPlacedBody}</p>
            <span>Order ID: {orderId}</span>
          </section>
        ) : null}

        {loading ? (
          <section className="page-panel">
            <h2>Loading collection</h2>
            <p>Fetching live products, checkout settings, and support details.</p>
          </section>
        ) : null}

        {!loading && activeSection === 'home' ? (
          <>
            <section className="hero-panel">
              <div className="hero-copy">
                <span className="eyebrow">{homepageContent.heroEyebrow}</span>
                <h2>{homepageContent.heroTitle}</h2>
                <p>{homepageContent.heroBody}</p>
                <div className="hero-actions">
                  <button className="primary-btn" type="button" onClick={() => setActiveSection('shop')}>
                    {homepageContent.heroPrimary}
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => setActiveSection('compliance')}>
                    {homepageContent.heroSecondary}
                  </button>
                </div>
                <div className="metrics-grid">
                  {heroSignals.map((signal) => (
                    <article key={signal.label} className="mini-card">
                      <span className="eyebrow">{signal.label}</span>
                      <strong className="metric-value">{signal.value}</strong>
                      <p>{signal.note}</p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="hero-sidecard">
                <h3>{homepageContent.shopIntro}</h3>
                <ul>
                  {t.trust.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="stack-note">
                  <strong>{paymentConfigured ? 'Payments are ready' : 'Payments are not ready yet'}</strong>
                  <span>
                    {emailConfigured
                      ? 'Order emails are connected.'
                      : 'Confirmation emails will activate once Resend is configured.'}
                  </span>
                </div>
                <div className="stack-note">
                  <strong>{homepageContent.focusTitle}</strong>
                  <span>{homepageContent.focusBody}</span>
                </div>
                <div className="stack-note">
                  <strong>Trust line</strong>
                  <span>{homepageContent.trustLine}</span>
                </div>
                <div className="button-row">
                  <button
                    className="primary-btn small"
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All')
                      setActiveSection('shop')
                    }}
                  >
                    Shop best sellers
                  </button>
                  <button
                    className="ghost-btn small"
                    type="button"
                    onClick={() => {
                      setSelectedCategory(categoryHighlights[0]?.category ?? 'All')
                      setActiveSection('shop')
                    }}
                  >
                    Shop by category
                  </button>
                </div>
              </div>
            </section>

            <section className="trust-grid">
              {collectionCards.map((collection) => (
                <article key={collection.category} className="mini-card">
                  <span className="eyebrow">{collection.category}</span>
                  <h3>{collection.count} products</h3>
                  <p>{collection.lowestPrice ? `From $${collection.lowestPrice}` : 'Collection coming soon'}</p>
                  {collection.hero ? <strong>{collection.hero.translations[locale].name}</strong> : null}
                </article>
              ))}
            </section>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Trust & reassurance</span>
                  <h2>Clear signals before checkout</h2>
                </div>
                <p>Answer the questions that typically slow down premium first-time buyers.</p>
              </div>
              <div className="compliance-grid">
                {reassuranceCards.map((card) => (
                  <article key={card.title} className="admin-trust-card">
                    <span className="eyebrow">{card.title}</span>
                    <p>{card.body}</p>
                  </article>
                ))}
              </div>
              <div className="button-row">
                <button className="primary-btn small" type="button" onClick={() => setActiveSection('shipping')}>
                  Review shipping
                </button>
                <button className="ghost-btn small" type="button" onClick={() => setActiveSection('compliance')}>
                  View policies
                </button>
              </div>
            </section>

            <section className="editorial-band">
              {storyMoments.map((moment) => (
                <article key={moment.title} className="story-card">
                  <span className="eyebrow">Store story</span>
                  <h3>{moment.title}</h3>
                  <p>{moment.body}</p>
                </article>
              ))}
            </section>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Curated story</span>
                  <h2>Three ways to shop the drop</h2>
                </div>
                <p>Premium, giftable, and easy to browse on mobile.</p>
              </div>
              <div className="product-grid">
                {featuredProducts.map((product, index) => {
                  const sellingPoints = getProductSellingPoints(product)
                  return (
                    <article key={product.id} className="product-card">
                      <img src={product.image} alt={product.translations[locale].name} />
                      <div className="product-body">
                        <span className="category-chip">
                          {index === 0 ? 'Hero pick' : index === 1 ? 'Best paired' : 'Gift ready'}
                        </span>
                        <h3>{product.translations[locale].name}</h3>
                        <p>{product.translations[locale].short}</p>
                        <div className="product-insight">
                          <span className="eyebrow">Quick facts</span>
                          <p>{sellingPoints.quickFacts.join(' · ')}</p>
                        </div>
                        <ul className="spec-list compact">
                          {product.translations[locale].why.slice(0, 2).map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                        <div className="product-insight">
                          <span className="eyebrow">Why it works</span>
                          <p>{sellingPoints.whyList.slice(0, 2).join(' · ')}</p>
                        </div>
                        <div className="meta-row">
                          <span>{product.category}</span>
                          <span>{product.rating.toFixed(1)} / 5</span>
                        </div>
                        <button className="primary-btn small" type="button" onClick={() => addToCart(product.id)}>
                          {t.addToCart}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Shop by intent</span>
                  <h2>Collections with a clear role</h2>
                </div>
                <p>Give each category a job in the journey: discovery, margin, or gifting.</p>
              </div>
              <div className="category-strip">
                {categoryHighlights.map((collection) => (
                  <article key={collection.category} className="category-feature-card">
                    <span className="category-chip">{collection.label}</span>
                    <h3>{collection.category}</h3>
                    <p>
                      {collection.hero?.translations[locale].short ||
                        'Premium assortment ready for paid traffic and repeat browsing.'}
                    </p>
                    <div className="meta-row">
                      <span>{collection.count} live items</span>
                      <span>{collection.lowestPrice ? `From $${collection.lowestPrice}` : 'Coming soon'}</span>
                    </div>
                    <button
                      className="ghost-btn small"
                      type="button"
                      onClick={() => {
                        setSelectedCategory(collection.category)
                        setActiveSection('shop')
                      }}
                    >
                      Shop {collection.category}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Curated bundles</span>
                  <h2>Gift lane and basket builders</h2>
                </div>
                <p>Show shoppers one premium bundle idea, one hero pick, and one easy pairing.</p>
              </div>
              <div className="product-grid">
                {bundleHighlights.map((bundle) => (
                  <article key={bundle.label} className="story-card">
                    <span className="eyebrow">{bundle.label}</span>
                    <h3>{bundle.title}</h3>
                    <p>{bundle.body}</p>
                    <div className="button-row">
                      <button
                        className="ghost-btn small"
                        type="button"
                        onClick={() => {
                          setSelectedCategory(bundle.category)
                          setActiveSection('shop')
                        }}
                      >
                        Shop lane
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="trust-grid">
              {t.trust.map((item) => (
                <article key={item} className="mini-card">
                  <h3>{item}</h3>
                </article>
              ))}
            </section>

            <section className="section-head">
              <div>
                <span className="eyebrow">{t.categories}</span>
                <h2>{t.featured}</h2>
              </div>
            </section>

            <section className="cta-showcase">
              <div className="product-grid">
                {storefrontProducts
                  .filter((product) => product.featured)
                  .map((product) => {
                    const sellingPoints = getProductSellingPoints(product)
                    return (
                      <article key={product.id} className="product-card">
                        <img src={product.image} alt={product.translations[locale].name} />
                        <div className="product-body">
                          <span className="category-chip">{product.category}</span>
                          <h3>{product.translations[locale].name}</h3>
                          <p>{product.translations[locale].short}</p>
                          <div className="checkout-note">
                            <p>
                              <strong>Quick facts:</strong> {sellingPoints.quickFacts.join(' · ')}
                            </p>
                            <p>
                              <strong>Why it works:</strong> {sellingPoints.whyList.join(' · ')}
                            </p>
                          </div>
                          <div className="price-row">
                            <strong>${product.price}</strong>
                            {product.compareAtPrice ? <span>${product.compareAtPrice}</span> : null}
                          </div>
                          <button className="primary-btn small" type="button" onClick={() => addToCart(product.id)}>
                            {t.addToCart}
                          </button>
                        </div>
                      </article>
                    )
                  })}
              </div>
              <aside className="cta-stack">
                <article className="cta-card">
                  <span className="eyebrow">Best next step</span>
                  <h3>Send traffic to a tighter first view</h3>
                  <p>Keep the home page selective, then move shoppers into a filtered shop view with stronger intent.</p>
                  <button className="primary-btn small" type="button" onClick={() => setActiveSection('shop')}>
                    Browse all live products
                  </button>
                </article>
                <article className="cta-card subtle">
                  <span className="eyebrow">Admin shortcut</span>
                  <h3>Merchandise from one panel</h3>
                  <p>Feature, hide, archive, or rewrite a product without touching code.</p>
                  <div className="button-row">
                    <button className="ghost-btn small" type="button" onClick={() => setActiveSection('admin')}>
                      Open store admin
                    </button>
                    {adminAuthEnabled && !adminGateRequired ? (
                      <button
                        className="ghost-btn small"
                        type="button"
                        onClick={() => {
                          clearAdminAccess()
                          setActiveSection('home')
                        }}
                      >
                        Logout
                      </button>
                    ) : null}
                  </div>
                </article>
              </aside>
            </section>
          </>
        ) : null}

        {!loading && activeSection === 'shop' ? (
          <section className="shop-layout">
            <aside className="filter-card">
              <h3>{t.categories}</h3>
              <div className="checkout-note">
                <p>Use intent tiles to jump into the right part of the catalog faster.</p>
                <p>Category filters stay available for deeper browsing after the first click.</p>
              </div>
              <div className="button-row">
                {shopIntentTiles.map((tile) => (
                  <button
                    key={tile.title}
                    type="button"
                    className={tile.highlighted ? 'primary-btn small' : 'ghost-btn small'}
                    onClick={() => {
                      setSelectedCategory(tile.category)
                      setShopIntent(tile.intent)
                      setActiveSection('shop')
                    }}
                  >
                    {tile.title}
                  </button>
                ))}
              </div>
              {['All', ...categoryLabels].map((category) => (
                <button
                  key={category}
                  type="button"
                  className={selectedCategory === category ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </aside>
            <div className="shop-main">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Current collection</span>
                  <h2>{t.nav.shop}</h2>
                </div>
                <p>{homepageContent.shopIntro}</p>
              </div>
              <div className="shop-discovery">
                {shopIntentCards.map((card) => (
                  <article key={card.label} className="mini-card">
                    <span className="category-chip">{card.label}</span>
                    <h3>{card.title}</h3>
                    <p>{card.body}</p>
                    <button
                      className="ghost-btn small"
                      type="button"
                      onClick={() => setShopIntent(card.label)}
                    >
                      Explore this lane
                    </button>
                  </article>
                ))}
              </div>
              <div className="orders-toolbar">
                <label className="field">
                  Browse intent
                  <select value={shopIntent} onChange={(event) => setShopIntent(event.target.value as ShopIntent)}>
                    <option value="All">All intents</option>
                    <option value="Starter picks">Starter picks</option>
                    <option value="Gift-ready">Gift-ready</option>
                    <option value="Travel-friendly">Travel-friendly</option>
                    <option value="Low stock">Low stock</option>
                  </select>
                </label>
                <label className="field">
                  Sort products
                  <select value={shopSort} onChange={(event) => setShopSort(event.target.value as ShopSort)}>
                    <option value="featured">Featured first</option>
                    <option value="rating">Highest rated</option>
                    <option value="priceLow">Lowest price</option>
                    <option value="priceHigh">Highest price</option>
                  </select>
                </label>
                <div className="checkout-note">
                  <p>{visibleProducts.length} live products match the current shop view.</p>
                  <p>Use intent first, then category, then sort to shape the path for traffic and returning buyers.</p>
                </div>
              </div>
              <div className="compliance-grid">
                {shopIntentTiles.map((tile) => (
                  <article key={tile.title} className="mini-card">
                    <span className="eyebrow">{tile.title}</span>
                    <p>{tile.body}</p>
                    <button
                      className="ghost-btn small"
                      type="button"
                      onClick={() => {
                        setSelectedCategory(tile.category)
                        setShopIntent(tile.intent)
                        setActiveSection('shop')
                      }}
                    >
                      Open this view
                    </button>
                  </article>
                ))}
              </div>
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <article key={product.id} className="product-card">
                    <img src={product.image} alt={product.translations[locale].name} />
                    <div className="product-body">
                      <div className="card-topline">
                        <span className="category-chip">{product.category}</span>
                        <span className="stock-indicator">
                          {product.stock > 0
                            ? locale === 'en'
                              ? `${product.stock} in stock`
                              : `${product.stock} en stock`
                            : locale === 'en'
                              ? 'Sold out'
                              : 'Rupture'}
                        </span>
                      </div>
                      <h3>{product.translations[locale].name}</h3>
                      <p>{product.translations[locale].description}</p>
                      <ul className="spec-list">
                        {product.specs.map((spec) => (
                          <li key={spec}>{spec}</li>
                        ))}
                      </ul>
                      <div className="product-insight">
                        <span className="eyebrow">Why it sells</span>
                        <p>{product.translations[locale].why[0]}</p>
                      </div>
                      <div className="price-row">
                        <strong>${product.price}</strong>
                        {product.compareAtPrice ? <span>${product.compareAtPrice}</span> : null}
                      </div>
                      <div className="meta-row">
                        <span>SKU {product.sku}</span>
                        <span>{product.rating.toFixed(1)} / 5</span>
                      </div>
                      <div className="product-actions">
                        <button
                          className="primary-btn small"
                          type="button"
                          onClick={() => addToCart(product.id)}
                          disabled={product.stock === 0}
                        >
                          {t.addToCart}
                        </button>
                        <button className="ghost-btn small" type="button" onClick={() => setActiveSection('compliance')}>
                          {t.viewPolicies}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && activeSection === 'faq' ? (
          <section className="page-panel">
            <h2>{t.faqTitle}</h2>
            <div className="faq-list">
              <article>
                <h3>How discreet is delivery?</h3>
                <p>
                  {locale === 'en'
                    ? 'Orders ship in plain packaging with no explicit branding on the outside.'
                    : "Les commandes partent dans un emballage neutre, sans marque explicite visible a l'exterieur."}
                </p>
              </article>
              <article>
                <h3>Who can shop here?</h3>
                <p>
                  {locale === 'en'
                    ? 'This storefront is intended for adults aged 18 and over.'
                    : 'Cette boutique est reservee aux adultes de 18 ans et plus.'}
                </p>
              </article>
              <article>
                <h3>How does payment work?</h3>
                <p>
                  {locale === 'en'
                    ? 'Checkout redirects to a secure hosted payment page and the order is confirmed after server-side verification.'
                    : 'Le paiement redirige vers une page securisee et la commande est validee apres verification cote serveur.'}
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {!loading && activeSection === 'shipping' ? (
          <section className="page-panel">
            <h2>{t.shippingTitle}</h2>
            <p>{t.shippingBody}</p>
            <ul className="info-list">
              <li>Markets: {markets.join(', ')}</li>
              <li>Currency shown at checkout: USD</li>
              <li>Support email: {supportEmail}</li>
            </ul>
          </section>
        ) : null}

        {!loading && activeSection === 'returns' ? (
          <section className="page-panel">
            <h2>{t.returnsTitle}</h2>
            <p>{t.returnsBody}</p>
            <ul className="info-list">
              <li>Eligible unopened items only</li>
              <li>Hygiene-sensitive items may be excluded</li>
              <li>Refund and cancellation states stay visible in admin</li>
            </ul>
          </section>
        ) : null}

        {!loading && activeSection === 'compliance' ? (
          <section className="page-panel">
            <h2>{t.complianceTitle}</h2>
            <p>{t.complianceBody}</p>
            <div className="compliance-grid">
              <article className="mini-card">
                <h3>18+ only</h3>
                <p>Age gate is enforced before browsing and repeated at checkout.</p>
              </article>
              <article className="mini-card">
                <h3>Policy links</h3>
                <p>Privacy, terms, shipping, returns, and contact remain accessible from footer and checkout.</p>
              </article>
              <article className="mini-card">
                <h3>Verified checkout</h3>
                <p>Orders are created only after the payment provider callback is verified by the backend.</p>
              </article>
            </div>
          </section>
        ) : null}

        {!loading && activeSection === 'contact' ? (
          <section className="page-panel">
            <h2>{t.contactTitle}</h2>
            <p>{t.supportNote}</p>
            <div className="contact-card">
              <p>Email: {supportEmail}</p>
              <p>Response window: 24-48 hours</p>
              <p>Primary operational language: English</p>
            </div>
          </section>
        ) : null}

        {!loading && activeSection === 'admin' ? (
          adminGateRequired ? (
              <section className="page-panel">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Admin access</span>
                    <h2>Unlock dashboard</h2>
                  </div>
                  <p>Access codes stay in session storage only and clear when the tab closes.</p>
                </div>
                <div className="checkout-form">
                  <label className="field">
                    Admin access code
                    <input
                      type="password"
                      value={adminAccessDraft}
                      onChange={(event) => setAdminAccessDraft(event.target.value)}
                      placeholder="Enter admin code"
                    />
                  </label>
                  <div className="button-row">
                    <button className="primary-btn small" type="button" onClick={unlockAdmin}>
                      Unlock admin
                    </button>
                    <button className="ghost-btn small" type="button" onClick={clearAdminAccess}>
                      Clear code
                    </button>
                  </div>
                  <div className="checkout-note">
                    <p>When admin auth is enabled by the backend, every catalog mutation includes the access code header.</p>
                    <p>After unlocking, the dashboard stays open for this tab only.</p>
                  </div>
                </div>
              </section>
          ) : (
              <section className="admin-layout">
            {adminAuthEnabled ? (
              <section className="page-panel">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Admin session</span>
                    <h2>Dashboard unlocked</h2>
                  </div>
                  <div className="button-row">
                    <button
                      className="ghost-btn small"
                      type="button"
                      onClick={() => {
                        clearAdminAccess()
                        setActiveSection('home')
                      }}
                    >
                      Logout
                    </button>
                    <button className="primary-btn small" type="button" onClick={() => setActiveSection('home')}>
                      Back to storefront
                    </button>
                  </div>
                </div>
                <div className="checkout-note">
                  <p>Access codes stay in session storage only and are sent on admin mutating requests while unlocked.</p>
                  <p>Use logout to clear the code immediately before handing the browser to someone else.</p>
                </div>
              </section>
            ) : null}
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Homepage editor</span>
                  <h2>Front-page copy</h2>
                </div>
                <div className="button-row">
                  <span className="status-pill pending">{locale.toUpperCase()} content</span>
                  <button className="ghost-btn small" type="button" onClick={resetHomepageContent}>
                    Reset this language
                  </button>
                </div>
              </div>
              <div className="admin-split">
                <div className="checkout-form">
                  <label className="field">
                    Hero eyebrow
                    <input
                      value={homepageContent.heroEyebrow}
                      onChange={(event) => updateHomepageContent('heroEyebrow', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Hero title
                    <input
                      value={homepageContent.heroTitle}
                      onChange={(event) => updateHomepageContent('heroTitle', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Hero body
                    <textarea
                      rows={4}
                      value={homepageContent.heroBody}
                      onChange={(event) => updateHomepageContent('heroBody', event.target.value)}
                    />
                  </label>
                  <div className="field-grid">
                    <label className="field">
                      Primary CTA
                      <input
                        value={homepageContent.heroPrimary}
                        onChange={(event) => updateHomepageContent('heroPrimary', event.target.value)}
                      />
                    </label>
                    <label className="field">
                      Secondary CTA
                      <input
                        value={homepageContent.heroSecondary}
                        onChange={(event) => updateHomepageContent('heroSecondary', event.target.value)}
                      />
                    </label>
                  </div>
                </div>
                <div className="checkout-form">
                  <label className="field">
                    Shop intro
                    <textarea
                      rows={4}
                      value={homepageContent.shopIntro}
                      onChange={(event) => updateHomepageContent('shopIntro', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Focus title
                    <input
                      value={homepageContent.focusTitle}
                      onChange={(event) => updateHomepageContent('focusTitle', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Focus body
                    <textarea
                      rows={4}
                      value={homepageContent.focusBody}
                      onChange={(event) => updateHomepageContent('focusBody', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Trust line
                    <textarea
                      rows={4}
                      value={homepageContent.trustLine}
                      onChange={(event) => updateHomepageContent('trustLine', event.target.value)}
                    />
                  </label>
                  <div className="checkout-note">
                    <p>These edits save in this browser and let you tune the homepage tone without touching product data.</p>
                    <p>English and French are stored separately, so switch language first when you want to localize the hero.</p>
                    <p>The trust line appears in the hero sidecard and gives the homepage one editable reassurance hook.</p>
                  </div>
                </div>
              </div>
            </section>
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Needs attention</span>
                  <h2>Queue for today</h2>
                </div>
                <p>These counts help the operator know what to touch first.</p>
              </div>
              <div className="compliance-grid">
                <article className="admin-summary-card">
                  <span className="eyebrow">Orders to review</span>
                  <strong className="metric-value">{orderAttentionCount}</strong>
                  <p>Paid and processing orders are the most likely to need follow-up.</p>
                </article>
                <article className="admin-summary-card">
                  <span className="eyebrow">Catalog tasks</span>
                  <strong className="metric-value">{productAttentionCount}</strong>
                  <p>Hidden, archived, and low-stock items are the first merchandising priorities.</p>
                </article>
                <article className="admin-summary-card">
                  <span className="eyebrow">Pending notes</span>
                  <strong className="metric-value">
                    {selectedOrder?.internalNote ? 1 : 0}
                  </strong>
                  <p>{selectedOrder?.internalNote ? 'Selected order already has an internal note.' : 'Selected order can use an internal note for handoff.'}</p>
                </article>
              </div>
              <div className="discovery-grid">
                <article className="admin-pending-card">
                  <span className="status-pill pending">Order queue</span>
                  <strong>{orderAttentionQueue.length ? 'Orders waiting on fulfillment' : 'No open order queue right now'}</strong>
                  {orderAttentionQueue.length ? (
                    <div className="admin-list">
                      {orderAttentionQueue.map((order) => (
                        <article key={order.id} className="admin-row" onClick={() => setSelectedOrderId(order.id)} style={{ cursor: 'pointer' }}>
                          <div className="admin-row-main">
                            <strong>{order.id}</strong>
                            <span>{`${order.customerName} / ${order.fulfillmentStatus}`}</span>
                            <span>{`${order.country} / $${order.total.toFixed(2)}`}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="checkout-note">
                      <p>All paid orders are either shipped, refunded, or cancelled.</p>
                    </div>
                  )}
                </article>
                <article className="admin-pending-card">
                  <span className="status-pill pending">Catalog queue</span>
                  <strong>{priorityProducts.length ? 'Products needing merch attention' : 'Catalog is in a healthy state'}</strong>
                  {priorityProducts.length ? (
                    <div className="admin-list">
                      {priorityProducts.map((product) => (
                        <article key={product.id} className={product.archived ? 'admin-row archived' : 'admin-row'}>
                          <div className="admin-row-main">
                            <strong>{product.translations[locale].name}</strong>
                            <span>{`${product.stock} units / ${product.category}`}</span>
                            <span>
                              {product.archived ? 'Archived' : product.visible === false ? 'Hidden from storefront' : 'Low stock'}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="checkout-note">
                      <p>No hidden, archived, or low-stock products are currently bubbling to the top.</p>
                    </div>
                  )}
                </article>
              </div>
            </section>
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Operations snapshot</span>
                  <h2>Live business health</h2>
                </div>
                <p>A quick read on catalog pressure, order pace, and merchandising quality.</p>
              </div>
              <div className="compliance-grid">
                {opsSummaryCards.map((card) => (
                  <article key={card.label} className="admin-summary-card">
                    <span className="eyebrow">{card.label}</span>
                    <strong className="metric-value">{card.value}</strong>
                    <p>{card.note}</p>
                  </article>
                ))}
              </div>
            </section>
            <div className="metrics-grid">
              <article className="mini-card">
                <h3>Total paid orders</h3>
                <strong className="metric-value">{paidOrders}</strong>
              </article>
              <article className="mini-card">
                <h3>Revenue captured</h3>
                <strong className="metric-value">${revenue.toFixed(2)}</strong>
              </article>
              <article className="mini-card">
                <h3>Inventory units</h3>
                <strong className="metric-value">{inventoryUnits}</strong>
              </article>
              <article className="mini-card">
                <h3>Low stock alerts</h3>
                <strong className="metric-value">{lowStockItems}</strong>
              </article>
            </div>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Catalog manager</span>
                  <h2>Products and stock</h2>
                </div>
                <button className="primary-btn small" type="button" onClick={startNewProduct}>
                  New product
                </button>
              </div>
              <div className="admin-split">
                <div className="checkout-form admin-filters">
                  <label className="field">
                    Search products
                    <input
                      value={adminSearch}
                      onChange={(event) => setAdminSearch(event.target.value)}
                      placeholder="Search by name, SKU, or category"
                    />
                  </label>
                  <label className="field">
                    Scope
                    <select
                      value={adminScope}
                      onChange={(event) => setAdminScope(event.target.value as ProductScope)}
                    >
                      <option value="All">All products</option>
                      <option value="Featured">Featured only</option>
                      <option value="Low stock">Low stock</option>
                      <option value="Archived">Archived only</option>
                    </select>
                  </label>
                  <label className="field">
                    Sort
                    <select
                      value={adminSort}
                      onChange={(event) => setAdminSort(event.target.value as ProductSort)}
                    >
                      <option value="featured">Featured first</option>
                      <option value="stock">Lowest stock first</option>
                      <option value="price">Lowest price first</option>
                    </select>
                  </label>
                  <div className="checkout-note">
                    <p>Live actions now include price, category, featured, visibility, and stock updates.</p>
                    <p>Archived products stay in admin, dimmed and restorable, while hidden products stay off the storefront.</p>
                  </div>
                  <div className="button-row">
                    <button className="primary-btn small" type="button" onClick={startNewProduct}>
                      New product
                    </button>
                    {draftOpen ? (
                      <button
                        className="ghost-btn small"
                        type="button"
                        onClick={() => {
                          setDraftOpen(false)
                          setDraft(emptyProductDraft)
                        }}
                      >
                        Close draft
                      </button>
                    ) : null}
                  </div>
                  {draftOpen ? (
                    <div className="editor-card">
                      <div className="editor-head">
                        <div>
                          <span className="eyebrow">New catalog item</span>
                          <h3>{draft.nameEn || 'Create a new product'}</h3>
                        </div>
                        <span className="category-chip">Starts hidden only if you choose</span>
                      </div>
                      <div className="field-grid">
                        <label className="field">
                          Product name (EN)
                          <input
                            value={draft.nameEn}
                            onChange={(event) => {
                              const nextName = event.target.value
                              setDraft((current) => ({
                                ...current,
                                nameEn: nextName,
                                slug: current.slug || slugifyProductName(nextName),
                              }))
                            }}
                            placeholder="Velvet Evening Set"
                          />
                        </label>
                        <label className="field">
                          Product name (FR)
                          <input
                            value={draft.nameFr}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, nameFr: event.target.value }))
                            }
                            placeholder="Ensemble Velours Soiree"
                          />
                        </label>
                        <label className="field">
                          Slug
                          <input
                            value={draft.slug}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, slug: slugifyProductName(event.target.value) }))
                            }
                            placeholder="velvet-evening-set"
                          />
                        </label>
                        <label className="field">
                          SKU
                          <input
                            value={draft.sku}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, sku: event.target.value }))
                            }
                            placeholder="SW-LGR-006"
                          />
                        </label>
                        <label className="field">
                          Category
                          <select
                            value={draft.category}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, category: event.target.value }))
                            }
                          >
                            {categoryLabels.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          Price (USD)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.price}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, price: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field">
                          Compare at
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.compareAtPrice}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, compareAtPrice: event.target.value }))
                            }
                          />
                        </label>
                        <label className="field">
                          Rating
                          <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={draft.rating}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, rating: event.target.value }))
                            }
                          />
                        </label>
                        <div className="field full image-field">
                          <span>Product image</span>
                          <div className="image-dropzone">
                            <strong>Upload or paste an image</strong>
                            <span>Choose a local file for instant preview, or keep using a public image URL.</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => void setDraftImageFromFile(event.target.files?.[0])}
                            />
                            <input
                              value={draft.image}
                              onChange={(event) =>
                                setDraft((current) => ({ ...current, image: event.target.value }))
                              }
                              placeholder="https://images.unsplash.com/..."
                            />
                            {draft.image ? (
                              <div className="button-row">
                                <button
                                  className="ghost-btn small"
                                  type="button"
                                  onClick={() => setDraft((current) => ({ ...current, image: '' }))}
                                >
                                  Remove image
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="image-preview">
                            {draft.image ? (
                              <img src={draft.image} alt={draft.nameEn || 'Draft preview'} />
                            ) : (
                              <div className="image-placeholder">Draft image preview appears here.</div>
                            )}
                          </div>
                        </div>
                        {draft.image ? (
                          <div className="editor-preview">
                            <span className="preview-chip">{draft.category || 'Draft preview'}</span>
                            <img src={draft.image} alt={draft.nameEn || draft.nameFr || 'Draft preview'} />
                            <div className="editor-stack">
                              <strong>{draft.nameEn || draft.nameFr || 'Untitled draft'}</strong>
                              <p>{draft.shortEn || 'Uploaded image preview will appear here.'}</p>
                              <span>Image source: {draft.image.startsWith('data:') ? 'Uploaded file' : 'URL input'}</span>
                            </div>
                          </div>
                        ) : null}
                        {draft.image ? (
                          <div className="button-row">
                            <button
                              className="ghost-btn small"
                              type="button"
                              onClick={() => setDraft((current) => ({ ...current, image: '' }))}
                            >
                              Remove image
                            </button>
                          </div>
                        ) : null}
                        <label className="field">
                          Specs
                          <input
                            value={draft.specs}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, specs: event.target.value }))
                            }
                            placeholder="Gift-ready, Stretch satin, Lightweight layering"
                          />
                        </label>
                        <label className="field full">
                          Short copy (EN)
                          <input
                            value={draft.shortEn}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, shortEn: event.target.value }))
                            }
                            placeholder="A premium boutique piece for your next campaign."
                          />
                        </label>
                        <label className="field full">
                          Short copy (FR)
                          <input
                            value={draft.shortFr}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, shortFr: event.target.value }))
                            }
                            placeholder="Une piece premium pour votre prochaine campagne."
                          />
                        </label>
                        <label className="field full">
                          Full description (EN)
                          <textarea
                            rows={4}
                            value={draft.descriptionEn}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, descriptionEn: event.target.value }))
                            }
                            placeholder="Describe the fit, merchandising angle, and bundle value."
                          />
                        </label>
                        <label className="field full">
                          Full description (FR)
                          <textarea
                            rows={4}
                            value={draft.descriptionFr}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, descriptionFr: event.target.value }))
                            }
                            placeholder="Decrivez la coupe, le style et l angle merchandising."
                          />
                        </label>
                      </div>
                      <div className="checkbox-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={draft.featured}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, featured: event.target.checked }))
                            }
                          />
                          Feature on homepage
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={draft.visible}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, visible: event.target.checked }))
                            }
                          />
                          Publish to storefront
                        </label>
                      </div>
                      <div className="checkout-note">
                        <p>New products start with zero inventory so you can create the listing before stocking it.</p>
                        <p>English and French copy can now be entered directly from admin.</p>
                      </div>
                      <div className="button-row">
                        <button className="primary-btn small" type="button" onClick={() => void createProduct()}>
                          Create product
                        </button>
                        <button
                          className="ghost-btn small"
                          type="button"
                          onClick={() => {
                            setDraft(emptyProductDraft)
                            setDraftOpen(false)
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="editor-card">
                    <div className="editor-head">
                      <div>
                        <span className="eyebrow">Product editor</span>
                        <h3>{editor.id ? editor.nameEn || editor.nameFr : 'Select a product to edit'}</h3>
                      </div>
                      {editor.id ? (
                        <button className="ghost-btn small" type="button" onClick={() => setEditor(emptyEditor)}>
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <div className="field-grid">
                      <label className="field">
                        Product name (EN)
                        <input
                          value={editor.nameEn}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, nameEn: event.target.value }))
                          }
                          placeholder="Midnight Lace Bodysuit"
                        />
                      </label>
                      <label className="field">
                        Product name (FR)
                        <input
                          value={editor.nameFr}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, nameFr: event.target.value }))
                          }
                          placeholder="Body Dentelle Minuit"
                        />
                      </label>
                      <label className="field">
                        SKU
                        <input
                          value={editor.sku}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, sku: event.target.value }))
                          }
                          placeholder="SW-LGR-001"
                        />
                      </label>
                      <label className="field">
                        Slug
                        <input
                          value={editor.slug}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, slug: slugifyProductName(event.target.value) }))
                          }
                          placeholder="midnight-lace-bodysuit"
                        />
                      </label>
                      <label className="field">
                        Category
                        <select
                          value={editor.category}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, category: event.target.value }))
                          }
                        >
                          <option value="">Choose a category</option>
                          {categoryLabels.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="field full image-field">
                        <span>Product image</span>
                        <div className="image-dropzone">
                          <strong>Upload or replace an image</strong>
                          <span>Files are converted to a data URL and saved through the existing image field.</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void setEditorImageFromFile(event.target.files?.[0])}
                          />
                          <input
                            value={editor.image}
                            onChange={(event) =>
                              setEditor((current) => ({ ...current, image: event.target.value }))
                            }
                            placeholder="https://images.unsplash.com/..."
                          />
                          {editor.image ? (
                            <div className="button-row">
                              <button
                                className="ghost-btn small"
                                type="button"
                                onClick={() => setEditor((current) => ({ ...current, image: '' }))}
                              >
                                Remove image
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="image-preview">
                          {editor.image ? (
                            <img src={editor.image} alt={editor.nameEn || editor.nameFr || 'Editor preview'} />
                          ) : (
                            <div className="image-placeholder">Product preview appears here.</div>
                          )}
                        </div>
                      </div>
                      {editor.image ? (
                        <div className="editor-preview">
                          <span className="preview-chip">{editor.category || 'Preview'}</span>
                          <img src={editor.image} alt={editor.nameEn || editor.nameFr || 'Product preview'} />
                          <div className="editor-stack">
                            <strong>{editor.nameEn || editor.nameFr || 'Untitled product'}</strong>
                            <p>{editor.shortEn || 'Uploaded image preview will appear here.'}</p>
                            <span>Image source: {editor.image.startsWith('data:') ? 'Uploaded file' : 'URL input'}</span>
                          </div>
                        </div>
                      ) : null}
                      <label className="field">
                        Price (USD)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editor.price}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, price: event.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Compare at
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editor.compareAtPrice}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, compareAtPrice: event.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Rating
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={editor.rating}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, rating: event.target.value }))
                          }
                        />
                      </label>
                      <label className="field">
                        Short copy (EN)
                        <input
                          value={editor.shortEn}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, shortEn: event.target.value }))
                          }
                          placeholder="A sculpted lace piece made for confident evenings."
                        />
                      </label>
                      <label className="field">
                        Short copy (FR)
                        <input
                          value={editor.shortFr}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, shortFr: event.target.value }))
                          }
                          placeholder="Une piece en dentelle pensee pour des soirees plus affirmees."
                        />
                      </label>
                      <label className="field">
                        Description (EN)
                        <textarea
                          rows={4}
                          value={editor.descriptionEn}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, descriptionEn: event.target.value }))
                          }
                          placeholder="Long-form English description for the storefront."
                        />
                      </label>
                      <label className="field">
                        Description (FR)
                        <textarea
                          rows={4}
                          value={editor.descriptionFr}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, descriptionFr: event.target.value }))
                          }
                          placeholder="Description longue en francais pour la boutique."
                        />
                      </label>
                      <label className="field">
                        Specs
                        <textarea
                          rows={4}
                          value={editor.specs}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, specs: event.target.value }))
                          }
                          placeholder="One spec per line, or comma-separated"
                        />
                      </label>
                    </div>
                    <div className="checkbox-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={editor.featured}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, featured: event.target.checked }))
                          }
                        />
                        Featured on home
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={editor.visible}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, visible: event.target.checked }))
                          }
                        />
                        Visible on storefront
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(editor.archived)}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, archived: event.target.checked }))
                          }
                        />
                        Archived
                      </label>
                    </div>
                    <div className="checkout-note">
                      <p>Use visibility to unpublish a product without deleting it from inventory or reports.</p>
                      <p>Customer-facing text, image, and specs now save through the server PATCH endpoint.</p>
                      <p>You can paste an image URL or upload a file and the chosen image persists in the same field.</p>
                    </div>
                    {editor.image ? (
                      <div className="checkout-note">
                        <p>{parseSpecs(editor.specs).length} specs ready</p>
                      </div>
                    ) : null}
                    <div className="button-row">
                      <button
                        className="primary-btn small"
                        type="button"
                        onClick={() => void saveProduct()}
                        disabled={!editor.id}
                      >
                        Save product
                      </button>
                      <button
                        className="ghost-btn small"
                        type="button"
                        onClick={() => duplicateProductToDraft(catalogProducts.find((item) => item.id === editor.id))}
                        disabled={!editor.id}
                      >
                        Copy to draft
                      </button>
                      <button className="ghost-btn small" type="button" onClick={() => setEditor(emptyEditor)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
                <div className="page-panel">
                  <div className="section-head compact">
                    <div>
                      <span className="eyebrow">Product board</span>
                      <h3>Batch merchandise actions</h3>
                    </div>
                    <p>{selectedProductIds.length ? `${selectedProductIds.length} selected` : 'Select one or more products to batch edit.'}</p>
                  </div>
                  <div className="button-row">
                    <button className="ghost-btn small" type="button" onClick={() => toggleAllAdminProducts(true)}>
                      {allAdminProductsSelected ? 'All selected' : 'Select all'}
                    </button>
                    <button className="ghost-btn small" type="button" onClick={() => setSelectedProductIds([])}>
                      Clear selection
                    </button>
                    <button
                      className="ghost-btn small"
                      type="button"
                      disabled={!selectedProductIds.length}
                      onClick={() => void updateSelectedProducts({ archived: true }, 'Batch archive failed')}
                    >
                      Archive selected
                    </button>
                    <button
                      className="ghost-btn small"
                      type="button"
                      disabled={!selectedProductIds.length}
                      onClick={() => void updateSelectedProducts({ archived: false }, 'Batch restore failed')}
                    >
                      Restore selected
                    </button>
                    <button
                      className="ghost-btn small"
                      type="button"
                      disabled={!selectedProductIds.length}
                      onClick={() => void updateSelectedProducts({ visible: false }, 'Batch hide failed')}
                    >
                      Hide selected
                    </button>
                    <button
                      className="ghost-btn small"
                      type="button"
                      disabled={!selectedProductIds.length}
                      onClick={() => void updateSelectedProducts({ visible: true }, 'Batch show failed')}
                    >
                      Show selected
                    </button>
                    <button
                      className="ghost-btn small"
                      type="button"
                      disabled={!selectedProductIds.length}
                      onClick={() => void updateSelectedProducts({ featured: true }, 'Batch feature failed')}
                    >
                      Feature selected
                    </button>
                    <button
                      className="ghost-btn small"
                      type="button"
                      disabled={!selectedProductIds.length}
                      onClick={() => void updateSelectedProducts({ featured: false }, 'Batch unfeature failed')}
                    >
                      Unfeature selected
                    </button>
                  </div>
                  <div className="admin-list">
                    {adminProducts.map((product) => (
                      <article
                        key={product.id}
                        className={product.archived ? 'admin-row archived' : 'admin-row'}
                        style={{ opacity: product.visible && !product.archived ? 1 : 0.72 }}
                      >
                        <div className="admin-row-main">
                          <label className="status-select" onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedProductIds.includes(product.id)}
                              onChange={(event) => {
                                setSelectedProductIds((current) =>
                                  event.target.checked
                                    ? current.includes(product.id)
                                      ? current
                                      : [...current, product.id]
                                    : current.filter((id) => id !== product.id),
                                )
                              }}
                            />
                            <span>Select</span>
                          </label>
                          <strong>{product.translations[locale].name}</strong>
                          <span>{`${product.sku} | ${product.category}`}</span>
                          <span>{`${product.stock} in stock | $${product.price} | ${product.rating.toFixed(1)} / 5`}</span>
                          <div className="meta-row">
                            <span>{product.featured ? 'Featured' : 'Standard'}</span>
                            <span>{product.visible ? 'Live on storefront' : 'Hidden from storefront'}</span>
                            <span>{product.archived ? 'Archived' : 'Active catalog'}</span>
                          </div>
                          {product.archived ? <span className="category-chip">Archived products stay in admin</span> : null}
                        </div>
                        <div className="editor-meta">
                          <button className="ghost-btn small" type="button" onClick={() => openEditor(product)}>
                            Edit
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            onClick={() => seedDraftFromProduct(product)}
                          >
                            Duplicate
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            onClick={() => void toggleCatalogFlag(product.id, { featured: !product.featured })}
                          >
                            {product.featured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            onClick={() => void toggleCatalogFlag(product.id, { visible: !product.visible })}
                          >
                            {product.visible ? 'Hide' : 'Show'}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            onClick={() =>
                              void toggleCatalogFlag(product.id, {
                                archived: product.archived !== true,
                              } as Partial<Pick<Product, 'featured' | 'visible'>> & { archived: boolean })
                            }
                          >
                            {product.archived ? 'Restore' : 'Archive'}
                          </button>
                          <div className="quantity-controls">
                            <button type="button" onClick={() => void adjustStock(product.id, -1)}>-</button>
                            <button type="button" onClick={() => void adjustStock(product.id, 1)}>+</button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {adminProducts.length === 0 ? <p>No products match the current filters.</p> : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Internal</span>
                  <h2>{t.adminTitle}</h2>
                </div>
                <button className="ghost-btn small" type="button" onClick={() => void resetStore()}>
                  Reset demo data
                </button>
              </div>
              <p>
                Orders, stock, payment callbacks, and email configuration now run through the server.
                Payment status must be completed on the hosted checkout before an order appears here.
              </p>
            </section>

            <section className="admin-columns">
              <div className="page-panel">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Operations</span>
                    <h2>Orders</h2>
                  </div>
                  <p>Search, filter, and inspect orders without leaving the admin area.</p>
                </div>
                <div className="checkout-form admin-filters">
                  <label className="field">
                    Search orders
                    <input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Customer, email, order ID, reference, or address"
                    />
                  </label>
                  <label className="field">
                    Status
                    <select
                      value={orderStatusFilter}
                      onChange={(event) => setOrderStatusFilter(event.target.value as 'All' | OrderStatus)}
                    >
                      <option value="All">All statuses</option>
                      <option value="Paid">Paid</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Refunded">Refunded</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label className="field">
                    Sort
                    <select value={orderSort} onChange={(event) => setOrderSort(event.target.value as typeof orderSort)}>
                      <option value="recent">Most recent</option>
                      <option value="oldest">Oldest first</option>
                      <option value="total">Highest total</option>
                    </select>
                  </label>
                  <div className="checkout-note">
                    <p>Click any order to load a detail view with customer, items, totals, and payment reference.</p>
                    <p>Status updates continue to work from both the list and the detail panel.</p>
                  </div>
                  <div className="button-row">
                    <button className="ghost-btn small" type="button" onClick={() => void refreshAdminStore()}>
                      Refresh orders
                    </button>
                    <button className="primary-btn small" type="button" onClick={() => void exportOrdersCsv()}>
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="admin-split">
                  <div className="admin-list">
                    {adminOrders.length === 0 ? (
                      <p>No orders match the current filters.</p>
                    ) : (
                      adminOrders.map((order) => {
                        const isSelected = selectedOrder?.id === order.id
                        return (
                          <article
                            key={order.id}
                            className={isSelected ? 'admin-row selected' : 'admin-row'}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <div className="admin-row-main">
                              <strong>{order.id}</strong>
                              <span>{`${order.customerName} / ${order.country} / $${order.total.toFixed(2)}`}</span>
                              <span>{`${new Date(order.createdAt).toLocaleString()} / ${order.language.toUpperCase()}`}</span>
                              <div className="meta-row">
                                <span className={`status-pill ${order.fulfillmentStatus === 'Shipped' ? 'success' : order.fulfillmentStatus === 'Refunded' || order.fulfillmentStatus === 'Cancelled' ? 'error' : 'warn'}`}>
                                  {order.fulfillmentStatus}
                                </span>
                                {order.paymentReference ? <span>{order.paymentReference}</span> : <span>No payment ref</span>}
                                <span>{order.items.length} items</span>
                              </div>
                            </div>
                            <label className="status-select" onClick={(event) => event.stopPropagation()}>
                              <span>Status</span>
                              <select
                                value={order.fulfillmentStatus}
                                onChange={(event) =>
                                  void updateOrderStatus(order.id, event.target.value as OrderStatus)
                                }
                              >
                                <option value="Paid">Paid</option>
                                <option value="Processing">Processing</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Refunded">Refunded</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </label>
                          </article>
                        )
                      })
                    )}
                  </div>
                  <div className="page-panel">
                    <div className="section-head compact">
                      <div>
                        <span className="eyebrow">Selected order</span>
                        <h3>{selectedOrder ? selectedOrder.id : 'Pick an order'}</h3>
                      </div>
                      {selectedOrder ? (
                        <label className="status-select" onClick={(event) => event.stopPropagation()}>
                          <span>Status</span>
                          <select
                            value={selectedOrder.fulfillmentStatus}
                            onChange={(event) =>
                              void updateOrderStatus(selectedOrder.id, event.target.value as OrderStatus)
                            }
                          >
                            <option value="Paid">Paid</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Refunded">Refunded</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </label>
                      ) : null}
                    </div>
                    {selectedOrder ? (
                      <div className="order-detail-card">
                        <div className="detail-grid">
                          <article className="detail-metric">
                            <span className="eyebrow">Customer</span>
                            <strong>{selectedOrder.customerName}</strong>
                            <p>{selectedOrder.customerEmail}</p>
                            <p>{selectedOrder.phone}</p>
                          </article>
                          <article className="detail-metric">
                            <span className="eyebrow">Delivery</span>
                            <strong>{selectedOrder.country}</strong>
                            <p>{selectedOrder.address}</p>
                            <p>{selectedOrder.language.toUpperCase()}</p>
                          </article>
                          <article className="detail-metric">
                            <span className="eyebrow">Payment</span>
                            <strong>${selectedOrder.total.toFixed(2)}</strong>
                            <p>{selectedOrder.paymentReference || 'Payment reference not provided'}</p>
                            <p>{selectedOrder.paymentStatus}</p>
                          </article>
                          <article className="detail-metric">
                            <span className="eyebrow">Timeline</span>
                            <strong>{new Date(selectedOrder.createdAt).toLocaleString()}</strong>
                            <p>{selectedOrder.items.length} items</p>
                            <p>{selectedOrder.fulfillmentStatus}</p>
                          </article>
                        </div>
                        <div className="order-detail-summary">
                          <div>
                            <span>Order total</span>
                            <strong>${selectedOrder.total.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>Payment reference</span>
                            <strong>{selectedOrder.paymentReference || 'Not provided'}</strong>
                          </div>
                        </div>
                        <div className="order-note-editor">
                          <label className="field">
                            Internal note
                            <textarea
                              rows={4}
                              value={orderNoteDraft}
                              onChange={(event) => setOrderNoteDraft(event.target.value)}
                              placeholder="Leave packing, fraud check, customer service, or follow-up notes..."
                            />
                          </label>
                          <div className="helper-text">
                            <strong>Shared with the admin workspace</strong>
                            <span>Use this to track packing instructions, support follow-up, or fraud review context.</span>
                          </div>
                          <div className="order-note-actions">
                            <button
                              className="primary-btn small"
                              type="button"
                              onClick={() => void saveOrderNote()}
                              disabled={orderNoteSaving}
                            >
                              {orderNoteSaving ? 'Saving...' : 'Save note'}
                            </button>
                            <button
                              className="ghost-btn small"
                              type="button"
                              onClick={() => {
                                setOrderNoteDraft('')
                              }}
                              disabled={orderNoteSaving}
                            >
                              Clear note
                            </button>
                          </div>
                          <div className="order-note-status">
                            {selectedOrder.internalNote ? 'Saved to order record' : 'No internal note saved yet'}
                          </div>
                          <div className="checkout-note">
                            <p>Saved notes stay with the order record and appear again after refresh or export.</p>
                            <p>Clear the field and save once if you want to remove an existing note.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>Select an order to see customer and payment details.</p>
                    )}
                    {selectedOrder ? (
                      <div className="admin-list">
                        {selectedOrder.items.map((item) => (
                          <article key={`${selectedOrder.id}-${item.productId}`} className="admin-row">
                            <div className="admin-row-main">
                              <strong>{item.productName}</strong>
                              <span>{`Qty ${item.quantity}`}</span>
                              <span>{`$${item.unitPrice.toFixed(2)} each`}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="page-panel">
                <h3>Inventory manager</h3>
                <div className="admin-list">
                  {products.map((product) => (
                    <article key={product.id} className="admin-row">
                      <div className="admin-row-main">
                        <strong>{product.translations[locale].name}</strong>
                        <span>{`SKU ${product.sku} / ${product.category}`}</span>
                        <span>{product.stock} units available</span>
                      </div>
                      <div className="quantity-controls">
                        <button type="button" onClick={() => void adjustStock(product.id, -1)}>-</button>
                        <button type="button" onClick={() => void adjustStock(product.id, 1)}>+</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
              </section>
          )
        ) : null}
      </main>

      <footer className="site-footer">
        <div>
          <strong>{t.brand}</strong>
          <p>{t.tagline}</p>
        </div>
        <div className="footer-links">
          <button type="button" onClick={() => setActiveSection('shipping')}>{t.nav.shipping}</button>
          <button type="button" onClick={() => setActiveSection('returns')}>{t.nav.returns}</button>
          <button type="button" onClick={() => setActiveSection('compliance')}>{t.nav.compliance}</button>
          <button type="button" onClick={() => setActiveSection('contact')}>{t.nav.contact}</button>
          <button type="button" onClick={() => setActiveSection('admin')}>Store admin</button>
        </div>
      </footer>

      {checkoutOpen ? (
        <div className="checkout-overlay" role="dialog" aria-modal="true">
          <div className="checkout-panel">
            <div className="checkout-header">
              <h2>{paymentConfigured ? 'Secure checkout' : t.checkout}</h2>
              <button className="ghost-btn small" type="button" onClick={() => setCheckoutOpen(false)}>
                Close
              </button>
            </div>
            <div className="checkout-layout">
              <section className="cart-panel">
                <h3>{t.orderSummary}</h3>
                {cartItems.length === 0 ? <p>{t.emptyCart}</p> : null}
                {cartItems.map(({ product, quantity }) => (
                  <article className="cart-line" key={product.id}>
                    <div>
                      <strong>{product.translations[locale].name}</strong>
                      <span>${product.price}</span>
                    </div>
                    <div className="quantity-controls">
                      <button type="button" onClick={() => updateQuantity(product.id, -1)}>-</button>
                      <span>{quantity}</span>
                      <button type="button" onClick={() => updateQuantity(product.id, 1)}>+</button>
                    </div>
                  </article>
                ))}
                <div className="totals-card">
                  <div>
                    <span>Subtotal</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Shipping</span>
                    <strong>${shipping.toFixed(2)}</strong>
                  </div>
                  <div className="grand-total">
                    <span>Total</span>
                    <strong>${total.toFixed(2)}</strong>
                  </div>
                </div>
              </section>
              <form className="checkout-form" onSubmit={(event) => void beginCheckout(event)}>
                <label>
                  Full name
                  <input
                    required
                    value={checkoutForm.name}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={checkoutForm.email}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Phone
                  <input
                    required
                    value={checkoutForm.phone}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Country
                  <select
                    value={checkoutForm.country}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, country: event.target.value }))
                    }
                  >
                    {markets.map((market) => (
                      <option key={market} value={market}>
                        {market}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Delivery address
                  <textarea
                    required
                    rows={4}
                    value={checkoutForm.address}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, address: event.target.value }))
                    }
                  />
                </label>
                <div className="checkout-note">
                  <p>
                    {paymentConfigured
                      ? 'Submitting will redirect to a hosted Flutterwave checkout. The order is created only after server-side payment verification.'
                      : 'Flutterwave keys are not configured yet. Add server environment variables before enabling real checkout.'}
                  </p>
                  <p>
                    {emailConfigured
                      ? 'Confirmation emails are enabled.'
                      : 'Order confirmation emails will activate after Resend credentials are added.'}
                  </p>
                </div>
                <button className="primary-btn" type="submit" disabled={!cartItems.length || !paymentConfigured}>
                  Proceed to secure payment
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App

