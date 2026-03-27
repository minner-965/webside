import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import express from 'express'
import postgres from 'postgres'
import { Resend } from 'resend'
import Stripe from 'stripe'
import paypal from '@paypal/checkout-server-sdk'
import * as XLSX from 'xlsx'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
app.set('trust proxy', true)
const port = Number(process.env.PORT || 3000)
const dataPath = process.env.STORE_DATA_PATH || path.join(__dirname, 'data', 'store.json')
const seedPath = path.join(__dirname, 'store.seed.json')
const databaseUrl = String(process.env.DATABASE_URL || '').trim()
const storeBackendPreference = String(process.env.STORE_BACKEND || '').trim().toLowerCase()
if (storeBackendPreference === 'postgres' && !databaseUrl) {
  throw new Error('STORE_BACKEND=postgres requires DATABASE_URL to be set.')
}
const usePostgresStorage = Boolean(databaseUrl) && storeBackendPreference !== 'file'
const storeBackend = usePostgresStorage ? 'postgres' : 'file'
const postgresPoolMaxRaw = Number(process.env.POSTGRES_POOL_MAX || 5)
const postgresPoolMax = Number.isFinite(postgresPoolMaxRaw) && postgresPoolMaxRaw > 0 ? postgresPoolMaxRaw : 5
const sql = usePostgresStorage
  ? postgres(databaseUrl, {
      ssl: databaseUrl.includes('sslmode=disable') ? false : 'require',
      max: postgresPoolMax,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null
const storeStateId = 'store'
let postgresSchemaReady = false
const distPath = path.join(__dirname, 'dist')
const storefrontHtmlPath = path.join(distPath, 'index.html')
const adminHtmlPath = path.join(distPath, 'admin.html')
const storefrontHost = process.env.STOREFRONT_HOST || 'www.sexwomen.mom'
const adminHost = process.env.ADMIN_HOST || 'admin.sexwomen.mom'
const apexHost = process.env.APEX_HOST || 'sexwomen.mom'
const storefrontOrigin = `https://${storefrontHost}`
const adminOrigin = `https://${adminHost}`
const apexOrigin = `https://${apexHost}`
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const resendApiKey = process.env.RESEND_API_KEY || ''
const supportEmail = process.env.SUPPORT_EMAIL || 'support@astersupply.example'
const orderFromEmail = process.env.ORDER_FROM_EMAIL || ''
const adminEmail = process.env.ADMIN_EMAIL || supportEmail
const adminUsername = process.env.ADMIN_USERNAME || ''
const adminPassword = process.env.ADMIN_PASSWORD || ''
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex')
const adminSessionCookieName = 'aster_admin_session'
const paypalClientId = process.env.PAYPAL_CLIENT_ID || ''
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || ''
const cryptoWalletAddress = process.env.CRYPTO_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000'

let paypalClient = null
if (paypalClientId && paypalClientSecret) {
  const environment = process.env.NODE_ENV === 'production'
    ? new paypal.core.LiveEnvironment(paypalClientId, paypalClientSecret)
    : new paypal.core.SandboxEnvironment(paypalClientId, paypalClientSecret)
  paypalClient = new paypal.core.PayPalHttpClient(environment)
}
const adminSessions = new Map()
const serverStartTimestamp = new Date().toISOString()
const appBaseUrl =
  process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' ? storefrontOrigin : `http://localhost:${port}`)
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`
const adminCredentialsConfigured = Boolean(adminUsername && adminPassword)
const allowedOrigins = new Set(
  [
    appBaseUrl,
    storefrontOrigin,
    adminOrigin,
    apexOrigin,
    'http://localhost:5173',
    'https://stately-fenglisu-74a882.netlify.app',
    'https://admin.sexwomen.mom',
    'https://sexwomen.mom',
    'https://www.sexwomen.mom',
    ...(process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  ].map((value) => value.replace(/\/$/, '')),
)

const resend = resendApiKey ? new Resend(resendApiKey) : null
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

const supportedCheckoutCountries = ['United States', 'Canada', 'United Kingdom', 'Europe']
const defaultShippingFeeRaw = Number(process.env.DEFAULT_SHIPPING_FEE || 9)
const defaultShippingFee = Number.isFinite(defaultShippingFeeRaw) && defaultShippingFeeRaw >= 0 ? defaultShippingFeeRaw : 9
const defaultEtaDaysRaw = Number(process.env.DEFAULT_DELIVERY_DAYS || 7)
const defaultEtaDays = Number.isFinite(defaultEtaDaysRaw) && defaultEtaDaysRaw >= 1 ? Math.floor(defaultEtaDaysRaw) : 7
const homepageFields = [
  'heroEyebrow',
  'heroTitle',
  'heroBody',
  'heroPrimary',
  'heroSecondary',
  'shopIntro',
  'focusTitle',
  'focusBody',
  'trustLine',
]
const defaultHomepageContent = {
  en: {
    heroEyebrow: '',
    heroTitle: 'Useful things, simply sorted.',
    heroBody: 'Everyday picks for home, work, and gifting.',
    heroPrimary: 'Shop now',
    heroSecondary: '',
    shopIntro: 'Browse practical goods curated for everyday life.',
    focusTitle: 'Shop details',
    focusBody: 'Shipping, returns, and support are easy to find.',
    trustLine: 'Fast shipping, clear returns, and direct support.',
  },
  fr: {
    heroEyebrow: '',
    heroTitle: 'Objets utiles, simplement classes.',
    heroBody: 'Des choix du quotidien pour la maison, le travail et les cadeaux.',
    heroPrimary: 'Acheter',
    heroSecondary: '',
    shopIntro: 'Parcourez une selection pratique pour le quotidien.',
    focusTitle: 'Details de la boutique',
    focusBody: 'Livraison, retours et support sont faciles a trouver.',
    trustLine: 'Livraison rapide, retours clairs et support direct.',
  },
}

function normalizeHostHeader(value) {
  return String(value || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
}

function getRequestHost(req) {
  return normalizeHostHeader(req.get('x-forwarded-host') || req.get('host') || req.hostname || '')
}

function isAdminHost(host) {
  return host === adminHost || host.startsWith(`${adminHost}.`)
}

function isApexHost(host) {
  return host === apexHost
}

function canServeAdminHtml(host) {
  return isAdminHost(host) || host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.onrender.com')
}

function redirectToStorefront(res, originalUrl = '/') {
  return res.redirect(302, `${storefrontOrigin}${originalUrl}`)
}

function redirectToAdmin(res, originalUrl = '/') {
  return res.redirect(302, `${adminOrigin}${originalUrl}`)
}

function sendStorefrontHtml(res) {
  if (process.env.NODE_ENV !== 'production') {
    return res.sendFile(path.join(__dirname, 'index.html'))
  }
  return res.sendFile(storefrontHtmlPath)
}

function sendAdminHtml(res) {
  if (process.env.NODE_ENV !== 'production') {
    return res.sendFile(path.join(__dirname, 'admin.html'))
  }
  return res.sendFile(adminHtmlPath)
}

function parseCookies(rawCookieHeader = '') {
  return String(rawCookieHeader)
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, pair) => {
      const separatorIndex = pair.indexOf('=')
      if (separatorIndex < 0) return accumulator
      const key = pair.slice(0, separatorIndex).trim()
      const value = pair.slice(separatorIndex + 1).trim()
      if (!key) return accumulator
      accumulator[key] = decodeURIComponent(value)
      return accumulator
    }, {})
}

function signAdminSessionToken(token) {
  return crypto.createHmac('sha256', adminSessionSecret).update(token).digest('hex')
}

function createAdminSession(username) {
  const token = crypto.randomBytes(24).toString('hex')
  adminSessions.set(token, {
    username,
    createdAt: Date.now(),
  })
  return `${token}.${signAdminSessionToken(token)}`
}

function getAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie || '')
  const rawValue = cookies[adminSessionCookieName]
  if (!rawValue || !rawValue.includes('.')) return null
  const [token, signature] = rawValue.split('.', 2)
  if (!token || !signature) return null
  if (signAdminSessionToken(token) !== signature) return null
  const session = adminSessions.get(token)
  if (!session) return null
  return { token, ...session }
}

function serializeCookie(name, value, options = {}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`]
  attributes.push(`Path=${options.path || '/'}`)
  if (options.httpOnly !== false) attributes.push('HttpOnly')
  if (options.sameSite) attributes.push(`SameSite=${options.sameSite}`)
  if (options.secure) attributes.push('Secure')
  if (options.maxAge !== undefined) attributes.push(`Max-Age=${options.maxAge}`)
  return attributes.join('; ')
}

app.use((req, res, next) => {
  const origin = String(req.get('origin') || '').replace(/\/$/, '')
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Code, X-Admin-Access-Code')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  next()
})

app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  if (!stripe || !stripeWebhookSecret) {
    return res.status(500).send('Stripe is not configured')
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const metadata = session.metadata && typeof session.metadata === 'object' ? session.metadata : {}
    const metadataItems = parseJsonish(metadata.items, [])
    const items = Array.isArray(metadataItems) ? metadataItems : []

    try {
      await finalizePaidOrder({
        orderId: normalizeText(metadata.orderId),
        customerName: normalizeText(metadata.customerName),
        customerEmail: normalizeText(session.customer_details?.email || session.customer_email || metadata.customerEmail),
        customerPhone: normalizeText(metadata.customerPhone),
        customerCountry: normalizeText(metadata.customerCountry),
        customerAddress: normalizeText(metadata.customerAddress),
        language: metadata.language === 'fr' ? 'fr' : 'en',
        items,
        total: Number(session.amount_total || 0) / 100,
        subtotal: Number(metadata.subtotal || 0),
        shipping: Number(metadata.shipping || 0),
        tax: Number(metadata.tax || 0),
        discount: Number(metadata.discount || 0),
        currency: normalizeText(metadata.currency, 'USD'),
        freeShippingApplied: parseBoolean(metadata.freeShippingApplied),
        shippingMethod: normalizeText(metadata.shippingMethod, 'standard'),
        expectedDeliveryAt: normalizeText(metadata.expectedDeliveryAt),
        paymentProvider:
          Array.isArray(session.payment_method_types) && session.payment_method_types.includes('alipay') ? 'alipay' : 'stripe',
        paymentReference: normalizeText(session.id),
        paymentTransactionId: normalizeText(session.payment_intent),
      })
    } catch (error) {
      console.error('Stripe Webhook Processing Error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  res.json({ received: true })
})

app.use(express.json())

app.post('/api/payments/stripe/confirm', async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not configured yet.' })
    }

    const sessionId = normalizeText(req.body?.sessionId || req.body?.session_id)
    const fallbackOrderId = normalizeText(req.body?.orderId)
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (!session || session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Stripe session is not paid.' })
    }

    const metadata = session.metadata && typeof session.metadata === 'object' ? session.metadata : {}
    const metadataItems = parseJsonish(metadata.items, [])
    const result = await finalizePaidOrder({
      orderId: normalizeText(metadata.orderId || fallbackOrderId),
      customerName: normalizeText(metadata.customerName),
      customerEmail: normalizeText(session.customer_details?.email || session.customer_email || metadata.customerEmail),
      customerPhone: normalizeText(metadata.customerPhone),
      customerCountry: normalizeText(metadata.customerCountry),
      customerAddress: normalizeText(metadata.customerAddress),
      language: metadata.language === 'fr' ? 'fr' : 'en',
      items: Array.isArray(metadataItems) ? metadataItems : [],
      total: Number(session.amount_total || 0) / 100,
      subtotal: Number(metadata.subtotal || 0),
      shipping: Number(metadata.shipping || 0),
      tax: Number(metadata.tax || 0),
      discount: Number(metadata.discount || 0),
      currency: normalizeText(metadata.currency, 'USD'),
      freeShippingApplied: parseBoolean(metadata.freeShippingApplied),
      shippingMethod: normalizeText(metadata.shippingMethod, 'standard'),
      expectedDeliveryAt: normalizeText(metadata.expectedDeliveryAt),
      paymentProvider:
        Array.isArray(session.payment_method_types) && session.payment_method_types.includes('alipay') ? 'alipay' : 'stripe',
      paymentReference: normalizeText(session.id),
      paymentTransactionId: normalizeText(session.payment_intent),
    })

    return res.json({
      ok: true,
      created: result.created,
      order: { id: result.order.id },
      store: publicStore(result.store),
    })
  } catch (error) {
    next(error)
  }
})

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function normalizeTimestamp(value) {
  if (value instanceof Date) return value.toISOString()
  return normalizeText(value)
}

function normalizeMoney(value, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Number(numeric.toFixed(2))
}

function parseJsonish(value, fallback) {
  if (value && typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return fallback
}

function normalizeImageList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return [...fallback]
    if (trimmed.startsWith('[')) {
      const parsed = parseJsonish(trimmed, null)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalizeText(item)).filter(Boolean)
      }
    }
    return [trimmed]
  }
  return [...fallback]
}

function normalizeTranslationEntry(value, fallback) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    name: normalizeText(source.name, fallback.name),
    short: normalizeText(source.short, fallback.short),
    description: normalizeText(source.description, fallback.description),
    why: Array.isArray(source.why) ? source.why.map((item) => normalizeText(item)).filter(Boolean) : [...fallback.why],
    care: normalizeText(source.care, fallback.care),
    notice: normalizeText(source.notice, fallback.notice),
  }
}

function normalizeProduct(product) {
  const source = product && typeof product === 'object' ? product : {}
  const images = normalizeImageList(source.images, source.image ? [source.image] : [])
  const coverImage =
    normalizeText(source.coverImage) || images[0] || normalizeText(source.image) || ''
  const price = Number(source.price)
  const compareAtPrice =
    source.compareAtPrice === null || source.compareAtPrice === undefined || source.compareAtPrice === ''
      ? null
      : Number(source.compareAtPrice)
  const stock = Number(source.stock)
  return {
    id: normalizeText(source.id),
    sku: normalizeText(source.sku),
    slug: normalizeText(source.slug),
    category: normalizeText(source.category, 'Uncategorized'),
    price: Number.isFinite(price) ? price : 0,
    compareAtPrice: Number.isFinite(compareAtPrice) ? compareAtPrice : null,
    stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
    featured: source.featured === true,
    visible: source.visible !== false,
    archived: source.archived === true,
    beginnerFriendly: source.beginnerFriendly === true,
    rechargeable: source.rechargeable === true,
    quiet: source.quiet === true,
    travelFriendly: source.travelFriendly === true,
    waterResistant: source.waterResistant === true,
    bundleEligible: source.bundleEligible === true,
    coverImage,
    images,
    image: coverImage,
    deleted_at: normalizeTimestamp(source.deleted_at || source.deletedAt),
    specs: Array.isArray(source.specs)
      ? source.specs.map((item) => normalizeText(item)).filter(Boolean)
      : normalizeText(source.specs)
        ? String(source.specs)
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    translations: {
      en: normalizeTranslationEntry(source.translations?.en, {
        name: 'Untitled product',
        short: '',
        description: '',
        why: [],
        care: '',
        notice: '',
      }),
      fr: normalizeTranslationEntry(source.translations?.fr, {
        name: 'Produit sans titre',
        short: '',
        description: '',
        why: [],
        care: '',
        notice: '',
      }),
    },
    createdAt: normalizeText(source.createdAt),
    updatedAt: normalizeText(source.updatedAt),
  }
}

function normalizeOrder(order) {
  const source = order && typeof order === 'object' ? order : {}
  const normalizedItems = Array.isArray(source.items)
    ? source.items.map((item) => ({
        productId: normalizeText(item.productId),
        productName: normalizeText(item.productName),
        quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Math.floor(Number(item.quantity))) : 1,
        unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
      }))
    : []
  const derivedSubtotal = normalizedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  )
  const total = Number.isFinite(Number(source.total)) ? Number(source.total) : 0
  const subtotal = Number.isFinite(Number(source.subtotal)) ? Number(source.subtotal) : derivedSubtotal
  const shipping = Number.isFinite(Number(source.shipping))
    ? Number(source.shipping)
    : Math.max(0, Number((total - subtotal).toFixed(2)))
  const tax = Number.isFinite(Number(source.tax)) ? Number(source.tax) : 0
  const discount = Number.isFinite(Number(source.discount)) ? Number(source.discount) : 0
  const createdAtValue = normalizeText(source.createdAt, new Date().toISOString())
  const expectedDeliveryAt = normalizeText(
    source.expectedDeliveryAt,
    new Date(Date.parse(createdAtValue) + defaultEtaDays * 24 * 60 * 60 * 1000).toISOString(),
  )
  return {
    id: normalizeText(source.id),
    customerName: normalizeText(source.customerName),
    customerEmail: normalizeText(source.customerEmail),
    phone: normalizeText(source.phone),
    country: normalizeText(source.country),
    address: normalizeText(source.address),
    language: source.language === 'fr' ? 'fr' : 'en',
    paymentStatus: source.paymentStatus === 'Paid' ? 'Paid' : 'Paid',
    fulfillmentStatus: ['Paid', 'Processing', 'Shipped', 'Refunded', 'Cancelled'].includes(source.fulfillmentStatus)
      ? source.fulfillmentStatus
      : 'Processing',
    internalNote: normalizeText(source.internalNote),
    subtotal: normalizeMoney(subtotal, 0),
    shipping: normalizeMoney(shipping, 0),
    tax: normalizeMoney(tax, 0),
    discount: normalizeMoney(discount, 0),
    total: normalizeMoney(total, 0),
    currency: normalizeText(source.currency, 'USD').toUpperCase(),
    freeShippingApplied: source.freeShippingApplied === true,
    shippingMethod: normalizeText(source.shippingMethod, 'standard'),
    expectedDeliveryAt,
    createdAt: createdAtValue,
    paymentReference: normalizeText(source.paymentReference),
    paymentProvider: normalizeText(source.paymentProvider),
    paymentTransactionId: normalizeText(source.paymentTransactionId),
    items: normalizedItems,
  }
}

function normalizePendingPayment(pendingPayment) {
  const source = pendingPayment && typeof pendingPayment === 'object' ? pendingPayment : {}
  const normalizedItems = Array.isArray(source.items)
    ? source.items.reduce((accumulator, item) => {
        const raw = item && typeof item === 'object' ? item : {}
        const legacyProduct = raw.product && typeof raw.product === 'object' ? raw.product : null
        const productId = normalizeText(raw.productId || legacyProduct?.id)
        if (!productId) return accumulator
        const quantity = Number.isFinite(Number(raw.quantity)) ? Math.max(1, Math.floor(Number(raw.quantity))) : 1
        const unitPrice = Number.isFinite(Number(raw.unitPrice))
          ? Number(raw.unitPrice)
          : Number.isFinite(Number(legacyProduct?.price))
            ? Number(legacyProduct.price)
            : 0
        const productName = normalizeText(
          raw.productName || legacyProduct?.translations?.en?.name || legacyProduct?.translations?.fr?.name || productId,
        )
        accumulator.push({
          productId,
          productName,
          quantity,
          unitPrice,
        })
        return accumulator
      }, [])
    : []

  return {
    txRef: normalizeText(source.txRef),
    locale: source.locale === 'fr' ? 'fr' : 'en',
    total: Number.isFinite(Number(source.total)) ? Number(source.total) : 0,
    currency: normalizeText(source.currency, 'USD'),
    customer: {
      name: normalizeText(source.customer?.name),
      email: normalizeText(source.customer?.email),
      phone: normalizeText(source.customer?.phone),
      country: normalizeText(source.customer?.country),
      address: normalizeText(source.customer?.address),
    },
    items: normalizedItems,
    createdAt: normalizeText(source.createdAt),
    status: normalizeText(source.status, 'pending'),
  }
}

function buildLedgerId() {
  return `LEDGER-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
}

function normalizeInventoryLedgerEntry(entry) {
  const source = entry && typeof entry === 'object' ? entry : {}
  const id = normalizeText(source.id)
  return {
    id: id || buildLedgerId(),
    productId: normalizeText(source.productId),
    delta: Number.isFinite(Number(source.delta)) ? Number(source.delta) : 0,
    reason: normalizeText(source.reason, 'adjustment'),
    orderId: normalizeText(source.orderId),
    adminUsername: normalizeText(source.adminUsername),
    createdAt: normalizeTimestamp(source.createdAt || new Date().toISOString()),
  }
}

function normalizeHomepageContent(value, fallback) {
  const source = value && typeof value === 'object' ? value : {}
  const normalized = {}
  for (const field of homepageFields) {
    const raw = source[field]
    normalized[field] = typeof raw === 'string' ? raw : fallback[field]
  }
  return normalized
}

function normalizeHomepage(homepage) {
  const source = homepage && typeof homepage === 'object' ? homepage : {}
  const contentByLocale = source.contentByLocale && typeof source.contentByLocale === 'object' ? source.contentByLocale : {}
  return {
    contentByLocale: {
      en: normalizeHomepageContent(contentByLocale.en, defaultHomepageContent.en),
      fr: normalizeHomepageContent(contentByLocale.fr, defaultHomepageContent.fr),
    },
    heroProductId: typeof source.heroProductId === 'string' ? source.heroProductId : '',
  }
}

function normalizeStore(store) {
  const source = store && typeof store === 'object' ? store : {}
  return {
    catalogVersion: normalizeText(source.catalogVersion),
    pendingPayments: Array.isArray(source.pendingPayments) ? source.pendingPayments.map(normalizePendingPayment) : [],
    products: Array.isArray(source.products) ? source.products.map(normalizeProduct) : [],
    orders: Array.isArray(source.orders) ? source.orders.map(normalizeOrder) : [],
    inventoryLedger: Array.isArray(source.inventoryLedger)
      ? source.inventoryLedger.map(normalizeInventoryLedgerEntry)
      : [],
    homepage: normalizeHomepage(source.homepage),
  }
}

async function readSeedStore() {
  return normalizeStore(JSON.parse(await readFile(seedPath, 'utf8')))
}

async function ensurePostgresSchema() {
  if (!sql || postgresSchemaReady) return
  console.log('Initializing PostgreSQL schema...')
  try {
    const dbName = await sql`SELECT current_database()`
    console.log(`Connected to database: ${dbName[0].current_database}`)
    await sql`
      CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      compare_at_price NUMERIC(12,2),
      stock INTEGER NOT NULL DEFAULT 0,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      visible BOOLEAN NOT NULL DEFAULT TRUE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      beginner_friendly BOOLEAN NOT NULL DEFAULT FALSE,
      rechargeable BOOLEAN NOT NULL DEFAULT FALSE,
      quiet BOOLEAN NOT NULL DEFAULT FALSE,
      travel_friendly BOOLEAN NOT NULL DEFAULT FALSE,
      water_resistant BOOLEAN NOT NULL DEFAULT FALSE,
      bundle_eligible BOOLEAN NOT NULL DEFAULT FALSE,
      cover_image TEXT NOT NULL DEFAULT '',
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      specs JSONB NOT NULL DEFAULT '[]'::jsonb,
      translations JSONB NOT NULL DEFAULT '{}'::jsonb,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS product_images (
      id BIGSERIAL PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      is_cover BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id BIGSERIAL PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      order_id TEXT,
      admin_username TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      address TEXT NOT NULL,
      language TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      fulfillment_status TEXT NOT NULL,
      internal_note TEXT NOT NULL DEFAULT '',
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payment_reference TEXT,
      payment_provider TEXT,
      payment_transaction_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) NOT NULL DEFAULT 0`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping NUMERIC(12,2) NOT NULL DEFAULT 0`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12,2) NOT NULL DEFAULT 0`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD'`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_shipping_applied BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT NOT NULL DEFAULT 'standard'`
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS expected_delivery_at TIMESTAMPTZ`
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`
  await sql`ALTER TABLE inventory_ledger ADD COLUMN IF NOT EXISTS order_id TEXT`
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    WITH item_totals AS (
      SELECT order_id, SUM(quantity * unit_price)::NUMERIC(12,2) AS subtotal
      FROM order_items
      GROUP BY order_id
    )
    UPDATE orders o
    SET
      subtotal = COALESCE(item_totals.subtotal, o.total, 0),
      shipping = GREATEST(COALESCE(o.total, 0) - COALESCE(item_totals.subtotal, o.total, 0), 0),
      tax = COALESCE(o.tax, 0),
      discount = COALESCE(o.discount, 0),
      currency = COALESCE(NULLIF(o.currency, ''), 'USD'),
      free_shipping_applied = COALESCE(o.free_shipping_applied, FALSE),
      shipping_method = COALESCE(NULLIF(o.shipping_method, ''), 'standard'),
      expected_delivery_at = COALESCE(
        o.expected_delivery_at,
        o.created_at + (${defaultEtaDays}::int || ' days')::interval
      )
    FROM item_totals
    WHERE o.id = item_totals.order_id
  `
  await sql`
    UPDATE orders
    SET
      subtotal = COALESCE(subtotal, total, 0),
      shipping = COALESCE(shipping, 0),
      tax = COALESCE(tax, 0),
      discount = COALESCE(discount, 0),
      currency = COALESCE(NULLIF(currency, ''), 'USD'),
      free_shipping_applied = COALESCE(free_shipping_applied, FALSE),
      shipping_method = COALESCE(NULLIF(shipping_method, ''), 'standard'),
      expected_delivery_at = COALESCE(
        expected_delivery_at,
        created_at + (${defaultEtaDays}::int || ' days')::interval
      )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS homepage_content (
      locale TEXT PRIMARY KEY,
      content JSONB NOT NULL,
      hero_product_id TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS pending_payments (
      tx_ref TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      customer JSONB NOT NULL,
      items JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_products_visible_archived ON products (visible, archived)`
  await sql`CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products (deleted_at)`
  await sql`CREATE INDEX IF NOT EXISTS idx_products_featured_stock ON products (featured, stock)`
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product_id ON inventory_ledger (product_id, created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_ledger_order_id ON inventory_ledger (order_id, created_at DESC)`
    postgresSchemaReady = true
    console.log('PostgreSQL schema initialized successfully.')
  } catch (error) {
    console.error('Failed to initialize PostgreSQL schema:', error)
    throw error
  }
}

function rowToProduct(row, imagesByProduct) {
  const imagesFromRows = imagesByProduct.get(row.id) || []
  const imagesFromRow = normalizeImageList(parseJsonish(row.images, []))
  const images = imagesFromRows.length ? imagesFromRows : imagesFromRow
  const coverImage = normalizeText(row.cover_image) || images[0] || ''
  return normalizeProduct({
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    category: row.category,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    stock: row.stock,
    featured: row.featured,
    visible: row.visible,
    archived: row.archived,
    beginnerFriendly: row.beginner_friendly,
    rechargeable: row.rechargeable,
    quiet: row.quiet,
    travelFriendly: row.travel_friendly,
    waterResistant: row.water_resistant,
    bundleEligible: row.bundle_eligible,
    coverImage,
    images,
    specs: parseJsonish(row.specs, []),
    translations: parseJsonish(row.translations, {}),
    deleted_at: row.deleted_at instanceof Date ? row.deleted_at.toISOString() : normalizeText(row.deleted_at),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  })
}

async function writePostgresStore(normalizedStore, options = {}) {
  if (!sql) return
  await ensurePostgresSchema()
  const store = normalizeStore(normalizedStore)
  const { clearLedger = false } = options
  await sql.begin(async (tx) => {
    if (clearLedger) {
      await tx`DELETE FROM inventory_ledger`
    }
    await tx`DELETE FROM order_items`
    await tx`DELETE FROM orders`
    await tx`DELETE FROM product_images`
    await tx`DELETE FROM products`
    await tx`DELETE FROM homepage_content`
    await tx`DELETE FROM pending_payments`

    for (const product of store.products) {
      await tx`
        INSERT INTO products (
          id, sku, slug, category, price, compare_at_price, stock, featured, visible, archived,
          beginner_friendly, rechargeable, quiet, travel_friendly, water_resistant, bundle_eligible,
          cover_image, images, specs, translations, deleted_at, created_at, updated_at
        ) VALUES (
          ${product.id},
          ${product.sku},
          ${product.slug},
          ${product.category},
          ${product.price},
          ${product.compareAtPrice},
          ${product.stock},
          ${product.featured},
          ${product.visible},
          ${product.archived},
          ${product.beginnerFriendly},
          ${product.rechargeable},
          ${product.quiet},
          ${product.travelFriendly},
          ${product.waterResistant},
          ${product.bundleEligible},
          ${product.coverImage || product.image || ''},
          ${sql.json(product.images || [])},
          ${sql.json(product.specs || [])},
          ${sql.json(product.translations || {})},
          ${product.deleted_at || null},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          sku = EXCLUDED.sku,
          slug = EXCLUDED.slug,
          category = EXCLUDED.category,
          price = EXCLUDED.price,
          compare_at_price = EXCLUDED.compare_at_price,
          stock = EXCLUDED.stock,
          featured = EXCLUDED.featured,
          visible = EXCLUDED.visible,
          archived = EXCLUDED.archived,
          beginner_friendly = EXCLUDED.beginner_friendly,
          rechargeable = EXCLUDED.rechargeable,
          quiet = EXCLUDED.quiet,
          travel_friendly = EXCLUDED.travel_friendly,
          water_resistant = EXCLUDED.water_resistant,
          bundle_eligible = EXCLUDED.bundle_eligible,
          cover_image = EXCLUDED.cover_image,
          images = EXCLUDED.images,
          specs = EXCLUDED.specs,
          translations = EXCLUDED.translations,
          deleted_at = EXCLUDED.deleted_at,
          updated_at = NOW()
      `
      const productImages = product.images && product.images.length ? product.images : product.coverImage ? [product.coverImage] : []
      for (let index = 0; index < productImages.length; index += 1) {
        await tx`
          INSERT INTO product_images (product_id, url, position, is_cover, created_at, updated_at)
          VALUES (${product.id}, ${productImages[index]}, ${index}, ${index === 0}, NOW(), NOW())
        `
      }
    }

    if (clearLedger && Array.isArray(store.inventoryLedger)) {
      for (const entry of store.inventoryLedger) {
        const normalizedEntry = normalizeInventoryLedgerEntry(entry)
        if (!normalizedEntry.productId || !Number.isFinite(Number(normalizedEntry.delta)) || Number(normalizedEntry.delta) === 0) {
          continue
        }
        await tx`
          INSERT INTO inventory_ledger (product_id, delta, reason, order_id, admin_username, created_at)
          VALUES (
            ${normalizedEntry.productId},
            ${Number(normalizedEntry.delta)},
            ${normalizeText(normalizedEntry.reason, 'adjustment')},
            ${normalizedEntry.orderId || null},
            ${normalizedEntry.adminUsername || null},
            ${normalizedEntry.createdAt || new Date().toISOString()}
          )
        `
      }
    }

    for (const order of store.orders) {
      await tx`
        INSERT INTO orders (
          id, customer_name, customer_email, phone, country, address, language, payment_status,
          fulfillment_status, internal_note, subtotal, shipping, tax, discount, total, currency,
          free_shipping_applied, shipping_method, expected_delivery_at, created_at, payment_reference,
          payment_provider, payment_transaction_id, updated_at
        ) VALUES (
          ${order.id},
          ${order.customerName},
          ${order.customerEmail},
          ${order.phone},
          ${order.country},
          ${order.address},
          ${order.language},
          ${order.paymentStatus},
          ${order.fulfillmentStatus},
          ${order.internalNote || ''},
          ${normalizeMoney(order.subtotal)},
          ${normalizeMoney(order.shipping)},
          ${normalizeMoney(order.tax)},
          ${normalizeMoney(order.discount)},
          ${normalizeMoney(order.total)},
          ${normalizeText(order.currency, 'USD')},
          ${order.freeShippingApplied === true},
          ${normalizeText(order.shippingMethod, 'standard')},
          ${normalizeText(order.expectedDeliveryAt) || null},
          ${order.createdAt || new Date().toISOString()},
          ${order.paymentReference || null},
          ${order.paymentProvider || null},
          ${order.paymentTransactionId || null},
          NOW()
        )
      `
      for (const item of order.items || []) {
        await tx`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, created_at)
          VALUES (${order.id}, ${item.productId}, ${item.productName}, ${item.quantity}, ${item.unitPrice}, NOW())
        `
      }
    }

    for (const [locale, content] of Object.entries(store.homepage?.contentByLocale || {})) {
      await tx`
        INSERT INTO homepage_content (locale, content, hero_product_id, updated_at)
        VALUES (${locale}, ${sql.json(content)}, ${store.homepage?.heroProductId || ''}, NOW())
        ON CONFLICT (locale) DO UPDATE SET
          content = EXCLUDED.content,
          hero_product_id = EXCLUDED.hero_product_id,
          updated_at = NOW()
      `
    }

    for (const payment of store.pendingPayments || []) {
      await tx`
        INSERT INTO pending_payments (
          tx_ref, locale, total, currency, customer, items, status, created_at, updated_at
        ) VALUES (
          ${payment.txRef},
          ${payment.locale},
          ${payment.total},
          ${payment.currency || 'USD'},
          ${sql.json(payment.customer || {})},
          ${sql.json(payment.items || [])},
          ${payment.status || 'pending'},
          ${payment.createdAt || new Date().toISOString()},
          NOW()
        )
        ON CONFLICT (tx_ref) DO UPDATE SET
          locale = EXCLUDED.locale,
          total = EXCLUDED.total,
          currency = EXCLUDED.currency,
          customer = EXCLUDED.customer,
          items = EXCLUDED.items,
          status = EXCLUDED.status,
          updated_at = NOW()
      `
    }

    await tx`
      INSERT INTO admin_settings (setting_key, setting_value, updated_at)
      VALUES ('catalog_version', ${sql.json(store.catalogVersion || '')}, NOW())
      ON CONFLICT (setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `

    await tx`
      INSERT INTO app_state (id, payload, updated_at)
      VALUES (${storeStateId}, ${sql.json(store)}, NOW())
      ON CONFLICT (id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `
  })
}

async function loadPostgresStore() {
  await ensurePostgresSchema()
  const [productRows, imageRows, orderRows, orderItemRows, homepageRows, pendingRows, settingRows, ledgerRows] = await Promise.all([
    sql`SELECT * FROM products ORDER BY created_at ASC, id ASC`,
    sql`SELECT * FROM product_images ORDER BY product_id ASC, position ASC, id ASC`,
    sql`SELECT * FROM orders ORDER BY created_at DESC, id DESC`,
    sql`SELECT * FROM order_items ORDER BY order_id ASC, id ASC`,
    sql`SELECT * FROM homepage_content ORDER BY locale ASC`,
    sql`SELECT * FROM pending_payments ORDER BY created_at DESC, tx_ref DESC`,
    sql`SELECT setting_key, setting_value FROM admin_settings`,
    sql`
      SELECT
        l.*,
        p.translations->'en'->>'name' AS product_name,
        p.translations->'fr'->>'name' AS product_name_fr,
        o.customer_name AS order_customer_name,
        o.customer_email AS order_customer_email,
        o.fulfillment_status AS order_fulfillment_status,
        o.payment_status AS order_payment_status,
        o.total AS order_total,
        o.currency AS order_currency,
        o.created_at AS order_created_at
      FROM inventory_ledger l
      LEFT JOIN products p ON l.product_id = p.id
      LEFT JOIN orders o ON l.order_id = o.id
      ORDER BY l.created_at DESC, l.id DESC
    `,
  ])

  const imagesByProduct = new Map()
  for (const row of imageRows) {
    const list = imagesByProduct.get(row.product_id) || []
    list.push(normalizeText(row.url))
    imagesByProduct.set(row.product_id, list.filter(Boolean))
  }

  const itemsByOrder = new Map()
  for (const row of orderItemRows) {
    const list = itemsByOrder.get(row.order_id) || []
    list.push({
      productId: normalizeText(row.product_id),
      productName: normalizeText(row.product_name),
      quantity: Number.isFinite(Number(row.quantity)) ? Math.max(1, Math.floor(Number(row.quantity))) : 1,
      unitPrice: Number.isFinite(Number(row.unit_price)) ? Number(row.unit_price) : 0,
    })
    itemsByOrder.set(row.order_id, list)
  }

  const homepageContentByLocale = {}
  for (const row of homepageRows) {
    homepageContentByLocale[row.locale] = normalizeHomepageContent(
      parseJsonish(row.content, {}),
      defaultHomepageContent[row.locale] || defaultHomepageContent.en,
    )
  }

  const settingsMap = new Map(settingRows.map((row) => [row.setting_key, parseJsonish(row.setting_value, '')]))
  const catalogVersionSetting = settingsMap.get('catalog_version')
  const catalogVersion =
    typeof catalogVersionSetting === 'string'
      ? catalogVersionSetting
      : normalizeText(catalogVersionSetting?.value)

  return normalizeStore({
    catalogVersion,
    products: productRows.map((row) => rowToProduct(row, imagesByProduct)),
    orders: orderRows.map((row) =>
      normalizeOrder({
        id: row.id,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        phone: row.phone,
        country: row.country,
        address: row.address,
        language: row.language,
        paymentStatus: row.payment_status,
        fulfillmentStatus: row.fulfillment_status,
        internalNote: row.internal_note,
        subtotal: row.subtotal,
        shipping: row.shipping,
        tax: row.tax,
        discount: row.discount,
        total: row.total,
        currency: row.currency,
        freeShippingApplied: row.free_shipping_applied,
        shippingMethod: row.shipping_method,
        expectedDeliveryAt: row.expected_delivery_at instanceof Date ? row.expected_delivery_at.toISOString() : row.expected_delivery_at,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        paymentReference: row.payment_reference,
        paymentProvider: row.payment_provider,
        paymentTransactionId: row.payment_transaction_id,
        items: itemsByOrder.get(row.id) || [],
      }),
    ),
    homepage: {
      contentByLocale: {
        en: homepageContentByLocale.en || defaultHomepageContent.en,
        fr: homepageContentByLocale.fr || defaultHomepageContent.fr,
      },
      heroProductId:
        homepageRows.find((row) => row.locale === 'en')?.hero_product_id ||
        homepageRows.find((row) => row.locale === 'fr')?.hero_product_id ||
        '',
    },
    pendingPayments: pendingRows.map((row) =>
      normalizePendingPayment({
        txRef: row.tx_ref,
        locale: row.locale,
        total: row.total,
        currency: row.currency,
        customer: parseJsonish(row.customer, {}),
        items: parseJsonish(row.items, []),
        status: row.status,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      }),
    ),
    inventoryLedger: ledgerRows.map((row) => ({
      id: normalizeText(row.id),
      productId: normalizeText(row.product_id),
      delta: Number.isFinite(Number(row.delta)) ? Number(row.delta) : 0,
      reason: normalizeText(row.reason, 'adjustment'),
      orderId: normalizeText(row.order_id),
      adminUsername: normalizeText(row.admin_username),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : normalizeText(row.created_at),
      productName: normalizeText(row.product_name || row.product_name_fr),
      order: normalizeText(row.order_id)
        ? {
            id: normalizeText(row.order_id),
            customerName: normalizeText(row.order_customer_name),
            customerEmail: normalizeText(row.order_customer_email),
            fulfillmentStatus: normalizeText(row.order_fulfillment_status),
            paymentStatus: normalizeText(row.order_payment_status),
            total: Number.isFinite(Number(row.order_total)) ? Number(row.order_total) : 0,
            currency: normalizeText(row.order_currency, 'USD'),
            createdAt:
              row.order_created_at instanceof Date
                ? row.order_created_at.toISOString()
                : normalizeText(row.order_created_at),
          }
        : null,
    })),
  })
}

async function recordInventoryLedger(entries) {
  if (!Array.isArray(entries) || !entries.length) return

  if (!usePostgresStorage) {
    const store = await readStore()
    const normalizedEntries = entries
      .map(normalizeInventoryLedgerEntry)
      .filter((entry) => entry.productId && Number.isFinite(Number(entry.delta)) && Number(entry.delta) !== 0)
    if (!normalizedEntries.length) return
    store.inventoryLedger = [...normalizedEntries, ...(Array.isArray(store.inventoryLedger) ? store.inventoryLedger : [])]
    await writeStore(store)
    return
  }

  await ensurePostgresSchema()
  await sql.begin(async (tx) => {
    for (const entry of entries) {
      const normalizedEntry = normalizeInventoryLedgerEntry(entry)
      if (!normalizedEntry.productId || !Number.isFinite(Number(normalizedEntry.delta)) || Number(normalizedEntry.delta) === 0) {
        continue
      }
      await tx`
        INSERT INTO inventory_ledger (product_id, delta, reason, order_id, admin_username, created_at)
        VALUES (
          ${normalizedEntry.productId},
          ${Number(normalizedEntry.delta)},
          ${normalizeText(normalizedEntry.reason, 'adjustment')},
          ${normalizedEntry.orderId || null},
          ${normalizedEntry.adminUsername || null},
          ${normalizedEntry.createdAt || new Date().toISOString()}
        )
      `
    }
  })
}

async function getAdminMetrics(range = '30d', fromDate = '', toDate = '') {
  const store = await readStore()
  const customFrom = fromDate ? Date.parse(`${fromDate}T00:00:00.000Z`) : Number.NaN
  const customTo = toDate ? Date.parse(`${toDate}T23:59:59.999Z`) : Number.NaN
  const days = [7, 30, 90].includes(Number.parseInt(String(range).replace(/[^0-9]/g, ''), 10))
    ? Number.parseInt(String(range), 10)
    : 30
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const activeOrders = store.orders.filter((order) => {
    const createdAt = Date.parse(order.createdAt)
    if (!Number.isFinite(createdAt)) return false
    if (Number.isFinite(customFrom) && Number.isFinite(customTo)) {
      return createdAt >= customFrom && createdAt <= customTo
    }
    return createdAt >= cutoff
  })
  const paidOrders = activeOrders.filter((order) => order.paymentStatus === 'Paid')
  const refundedOrders = activeOrders.filter((order) => order.fulfillmentStatus === 'Refunded')
  const gmv = paidOrders.reduce((sum, order) => {
    const isRefunded = order.fulfillmentStatus === 'Refunded'
    return sum + (isRefunded ? 0 : Number(order.total || 0))
  }, 0)
  const itemTotals = new Map()
  for (const order of paidOrders) {
    for (const item of order.items || []) {
      const current = itemTotals.get(item.productId) || {
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        revenue: 0,
      }
      current.quantity += Number(item.quantity || 0)
      current.revenue += Number(item.quantity || 0) * Number(item.unitPrice || 0)
      itemTotals.set(item.productId, current)
    }
  }

  const topSkus = [...itemTotals.values()]
    .sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue)
    .slice(0, 5)
    .map((entry) => ({
      productId: entry.productId,
      productName: entry.productName,
      quantity: entry.quantity,
      revenue: Number(entry.revenue.toFixed(2)),
    }))

  const lowStock = store.products
    .filter((product) => product.stock <= 12 && product.archived !== true && !product.deleted_at)
    .sort((left, right) => left.stock - right.stock || left.category.localeCompare(right.category))
    .slice(0, 10)
    .map((product) => ({
      productId: product.id,
      productName: product.translations?.en?.name || product.translations?.fr?.name || product.id,
      sku: product.sku,
      stock: product.stock,
      category: product.category,
    }))

  const trendMap = new Map()
  const trendSpanDays =
    Number.isFinite(customFrom) && Number.isFinite(customTo)
      ? Math.max(1, Math.floor((customTo - customFrom) / (24 * 60 * 60 * 1000)) + 1)
      : days
  for (let i = 0; i < trendSpanDays; i++) {
    const base = Number.isFinite(customTo) ? customTo : Date.now()
    const date = new Date(base - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    trendMap.set(date, { name: date, revenue: 0, orders: 0 })
  }

  for (const order of paidOrders) {
    const date = String(order.createdAt || '').split('T')[0]
    if (trendMap.has(date)) {
      const current = trendMap.get(date)
      current.revenue += Number(order.total || 0)
      current.orders += 1
    }
  }

  const trendData = [...trendMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => ({
      ...entry,
      revenue: Number(entry.revenue.toFixed(2)),
    }))

  return {
    range: Number.isFinite(customFrom) && Number.isFinite(customTo) ? 'custom' : `${days}d`,
    from: Number.isFinite(customFrom) ? fromDate : '',
    to: Number.isFinite(customTo) ? toDate : '',
    gmv: Number(gmv.toFixed(2)),
    paidOrders: paidOrders.length,
    aov: paidOrders.length ? Number((gmv / paidOrders.length).toFixed(2)) : 0,
    refundRate: activeOrders.length ? Number((refundedOrders.length / activeOrders.length).toFixed(4)) : 0,
    topSkus,
    lowStock,
    trendData,
  }
}

async function ensurePostgresStore(seed) {
  if (!sql) return
  await ensurePostgresSchema()
  const productCountRows = await sql`SELECT COUNT(*)::int AS count FROM products`
  const productCount = Number(productCountRows[0]?.count || 0)
  if (!productCount) {
    const legacyRows = await sql`SELECT payload FROM app_state WHERE id = ${storeStateId} LIMIT 1`
    if (legacyRows.length) {
      const migrated = normalizeStore(parseJsonish(legacyRows[0].payload, {}))
      await writePostgresStore(migrated, { clearLedger: true })
      return
    }
    await writePostgresStore(seed, { clearLedger: true })
    return
  }
  await sql`
    INSERT INTO app_state (id, payload, updated_at)
    VALUES (${storeStateId}, ${sql.json(await loadPostgresStore())}, NOW())
    ON CONFLICT (id)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
  `
}

async function ensureFileStore(seed) {
  const dir = path.dirname(dataPath)
  await mkdir(dir, { recursive: true })
  try {
    const raw = await readFile(dataPath, 'utf8')
    const parsed = normalizeStore(JSON.parse(raw))
    if (!parsed.catalogVersion || parsed.catalogVersion !== seed.catalogVersion) {
      await writeFile(dataPath, JSON.stringify(seed, null, 2), 'utf8')
      return
    }
    if (!Array.isArray(parsed.pendingPayments)) {
      parsed.pendingPayments = []
    }
    await writeFile(dataPath, JSON.stringify(parsed, null, 2), 'utf8')
  } catch {
    await writeFile(dataPath, JSON.stringify(seed, null, 2), 'utf8')
  }
}

async function ensureStoreData() {
  const seed = await readSeedStore()
  if (usePostgresStorage) {
    await ensurePostgresStore(seed)
    return
  }
  await ensureFileStore(seed)
}

async function readStore() {
  const seed = await readSeedStore()
  if (usePostgresStorage) {
    await ensurePostgresStore(seed)
    return loadPostgresStore()
  }

  await ensureFileStore(seed)
  const raw = await readFile(dataPath, 'utf8')
  return normalizeStore(JSON.parse(raw))
}

async function writeStore(store) {
  const normalized = normalizeStore(store)
  if (usePostgresStorage) {
    await writePostgresStore(normalized)
    return
  }
  await writeFile(dataPath, JSON.stringify(normalized, null, 2), 'utf8')
}

function buildOrderId() {
  return `AST-${Date.now().toString().slice(-6)}`
}

function buildTxRef() {
  return `AST-TX-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === '1'
  if (typeof value === 'number') return value !== 0
  return Boolean(value)
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : Number.NaN
}

function parseSpecList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return null
}

function requireAdminSession(req, res) {
  if (!adminCredentialsConfigured) {
    res.status(503).json({ error: 'Admin credentials are not configured on the server.' })
    return false
  }
  const session = getAdminSession(req)
  if (session) {
    req.adminSession = session
    return true
  }
  res.status(401).json({ error: 'Admin login required.' })
  return false
}

function validateCheckoutPayload(body) {
  if (!body || typeof body !== 'object') return 'Invalid payload.'
  const requiredStrings = ['name', 'email', 'country', 'address', 'locale']
  for (const field of requiredStrings) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      return `Missing field: ${field}`
    }
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return 'Order must include at least one item.'
  }
  const country = body.country.trim()
  if (!supportedCheckoutCountries.includes(country)) {
    return 'Unsupported destination country.'
  }
  return null
}

function resolveAppHtml(req) {
  const host = getRequestHost(req)
  if (process.env.NODE_ENV !== 'production') {
    return isAdminHost(host) ? path.join(__dirname, 'admin.html') : path.join(__dirname, 'index.html')
  }
  return isAdminHost(host) ? adminHtmlPath : storefrontHtmlPath
}

function publicStore(store, options = {}) {
  const includeHidden = options.includeHidden === true
  const includeArchived = options.includeArchived === true
  const includeDeleted = options.includeDeleted === true
  const includeOrders = options.includeOrders === true
  return {
    products: store.products
      .filter((product) => includeDeleted || !product.deleted_at)
      .filter((product) => includeHidden || product.visible !== false)
      .filter((product) => includeArchived || product.archived !== true),
    orders: includeOrders ? store.orders : [],
    config: {
      paymentConfigured: Boolean(stripe || paypalClient || cryptoWalletAddress),
      emailConfigured: Boolean(resendApiKey && orderFromEmail),
      adminAuthEnabled: adminCredentialsConfigured,
      supportEmail,
      appBaseUrl,
    },
    homepage: store.homepage,
  }
}

function useSecureCookie(req) {
  if (process.env.NODE_ENV === 'production') return true
  return req.secure === true
}

function parseExportFormat(req, fallback = 'csv') {
  const pathValue = String(req.path || '').toLowerCase()
  if (pathValue.endsWith('.xlsx')) return 'xlsx'
  if (pathValue.endsWith('.csv')) return 'csv'
  const queryFormat = normalizeText(req.query?.format, '').toLowerCase()
  if (queryFormat === 'xlsx' || queryFormat === 'csv') return queryFormat
  return fallback
}

function rowsToCsv(headers, rows) {
  return [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n')
}

function buildXlsxBuffer(sheets) {
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const rows = Array.isArray(sheet.rows) ? sheet.rows : []
    const headerRow = Array.isArray(sheet.headers) ? sheet.headers : []
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows])
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  }
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
}

function formatMoneyValue(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00'
}

function getProductDisplayName(product, locale = 'en') {
  return product?.translations?.[locale]?.name || product?.translations?.en?.name || product?.translations?.fr?.name || product?.id || ''
}

function escapeCsv(value) {
  const stringValue = String(value ?? '')
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function buildOrderExportRows(orders = []) {
  return orders.map((order) => {
    const items = Array.isArray(order.items) ? order.items : []
    const itemsSummary = items.map((item) => `${item.productName} x${item.quantity} @ $${Number(item.unitPrice || 0).toFixed(2)}`).join(' | ')
    return [
      order.id,
      order.createdAt,
      order.customerName,
      order.customerEmail,
      order.phone,
      order.country,
      order.address,
      order.language,
      order.paymentStatus,
      order.fulfillmentStatus,
      order.internalNote || '',
      order.paymentReference || '',
      formatMoneyValue(order.subtotal),
      formatMoneyValue(order.shipping),
      formatMoneyValue(order.tax),
      formatMoneyValue(order.discount),
      formatMoneyValue(order.total),
      order.currency || 'USD',
      order.freeShippingApplied ? 'true' : 'false',
      order.shippingMethod || 'standard',
      order.expectedDeliveryAt || '',
      String(items.length),
      itemsSummary,
    ]
  })
}

function ordersToCsv(orders) {
  const headers = [
    'order_id',
    'created_at',
    'customer_name',
    'customer_email',
    'phone',
    'country',
    'address',
    'language',
    'payment_status',
    'fulfillment_status',
    'internal_note',
    'payment_reference',
    'subtotal_usd',
    'shipping_usd',
    'tax_usd',
    'discount_usd',
    'total_usd',
    'currency',
    'free_shipping_applied',
    'shipping_method',
    'expected_delivery_at',
    'item_count',
    'items_summary',
  ]
  return rowsToCsv(headers, buildOrderExportRows(orders))
}

function ordersToXlsxBuffer(orders) {
  const headers = [
    'order_id',
    'created_at',
    'customer_name',
    'customer_email',
    'phone',
    'country',
    'address',
    'language',
    'payment_status',
    'fulfillment_status',
    'internal_note',
    'payment_reference',
    'subtotal_usd',
    'shipping_usd',
    'tax_usd',
    'discount_usd',
    'total_usd',
    'currency',
    'free_shipping_applied',
    'shipping_method',
    'expected_delivery_at',
    'item_count',
    'items_summary',
  ]
  return buildXlsxBuffer([
    {
      name: 'Orders',
      headers,
      rows: buildOrderExportRows(orders),
    },
  ])
}

function buildInventoryLedgerRows(store, entries = []) {
  const productMap = new Map((store.products || []).map((product) => [product.id, product]))
  return entries.map((entry) => {
    const product = productMap.get(entry.productId)
    const order = entry.orderId ? (store.orders || []).find((item) => item.id === entry.orderId) : null
    return [
      entry.id,
      entry.createdAt,
      entry.productId,
      entry.productName || getProductDisplayName(product) || entry.productId,
      Number(entry.delta || 0),
      entry.reason,
      entry.orderId || '',
      order?.customerName || entry.order?.customerName || '',
      order?.customerEmail || entry.order?.customerEmail || '',
      order?.fulfillmentStatus || entry.order?.fulfillmentStatus || '',
      order?.paymentStatus || entry.order?.paymentStatus || '',
      order || entry.order ? formatMoneyValue(order?.total ?? entry.order?.total) : '',
      order || entry.order ? order?.currency || entry.order?.currency || 'USD' : '',
      order || entry.order ? order?.createdAt || entry.order?.createdAt || '' : '',
      entry.adminUsername || '',
    ]
  })
}

function inventoryLedgerToCsv(store, entries = []) {
  const headers = [
    'ledger_id',
    'created_at',
    'product_id',
    'product_name',
    'delta',
    'reason',
    'order_id',
    'order_customer_name',
    'order_customer_email',
    'order_fulfillment_status',
    'order_payment_status',
    'order_total_usd',
    'order_currency',
    'order_created_at',
    'admin_username',
  ]
  return rowsToCsv(headers, buildInventoryLedgerRows(store, entries))
}

function inventoryLedgerToXlsxBuffer(store, entries = []) {
  const headers = [
    'ledger_id',
    'created_at',
    'product_id',
    'product_name',
    'delta',
    'reason',
    'order_id',
    'order_customer_name',
    'order_customer_email',
    'order_fulfillment_status',
    'order_payment_status',
    'order_total_usd',
    'order_currency',
    'order_created_at',
    'admin_username',
  ]
  return buildXlsxBuffer([
    {
      name: 'Ledger',
      headers,
      rows: buildInventoryLedgerRows(store, entries),
    },
  ])
}

function metricsOverviewRows(metrics) {
  return [
    ['range', metrics.range],
    ['from', metrics.from || ''],
    ['to', metrics.to || ''],
    ['gmv', formatMoneyValue(metrics.gmv)],
    ['paid_orders', String(metrics.paidOrders || 0)],
    ['aov', formatMoneyValue(metrics.aov)],
    ['refund_rate', String(metrics.refundRate || 0)],
  ]
}

function metricsTrendRows(metrics) {
  return (metrics.trendData || []).map((entry) => [entry.name, formatMoneyValue(entry.revenue), String(entry.orders || 0)])
}

function metricsTopSkuRows(metrics) {
  return (metrics.topSkus || []).map((entry) => [
    entry.productId,
    entry.productName,
    String(entry.quantity || 0),
    formatMoneyValue(entry.revenue),
  ])
}

function metricsLowStockRows(metrics) {
  return (metrics.lowStock || []).map((entry) => [
    entry.productId,
    entry.productName,
    entry.sku,
    String(entry.stock || 0),
    entry.category,
  ])
}

function metricsTrendToCsv(metrics) {
  return rowsToCsv(['date', 'revenue_usd', 'orders'], metricsTrendRows(metrics))
}

function metricsTrendToXlsxBuffer(metrics) {
  return buildXlsxBuffer([
    {
      name: 'Overview',
      headers: ['metric', 'value'],
      rows: metricsOverviewRows(metrics),
    },
    {
      name: 'Trend',
      headers: ['date', 'revenue_usd', 'orders'],
      rows: metricsTrendRows(metrics),
    },
    {
      name: 'TopSkus',
      headers: ['product_id', 'product_name', 'quantity', 'revenue_usd'],
      rows: metricsTopSkuRows(metrics),
    },
    {
      name: 'LowStock',
      headers: ['product_id', 'product_name', 'sku', 'stock', 'category'],
      rows: metricsLowStockRows(metrics),
    },
  ])
}

function getInventoryLedgerEntries(store, filters = {}) {
  const orderId = normalizeText(filters.orderId)
  const productId = normalizeText(filters.productId)
  const from = filters.from ? Date.parse(`${filters.from}T00:00:00.000Z`) : Number.NaN
  const to = filters.to ? Date.parse(`${filters.to}T23:59:59.999Z`) : Number.NaN
  return (store.inventoryLedger || [])
    .filter((entry) => !orderId || normalizeText(entry.orderId) === orderId)
    .filter((entry) => !productId || normalizeText(entry.productId) === productId)
    .filter((entry) => {
      if (!Number.isFinite(from) && !Number.isFinite(to)) return true
      const createdAt = Date.parse(entry.createdAt)
      if (!Number.isFinite(createdAt)) return false
      if (Number.isFinite(from) && createdAt < from) return false
      if (Number.isFinite(to) && createdAt > to) return false
      return true
    })
    .slice()
    .sort((left, right) => {
      const rightTime = Date.parse(right.createdAt) || 0
      const leftTime = Date.parse(left.createdAt) || 0
      return rightTime - leftTime || String(right.id || '').localeCompare(String(left.id || ''))
    })
    .map((entry) => ({
      ...entry,
      productName:
        entry.productName ||
        getProductDisplayName((store.products || []).find((product) => product.id === entry.productId)) ||
        entry.productId,
      order:
        entry.order ||
        (entry.orderId
          ? (store.orders || [])
              .find((order) => order.id === entry.orderId)
          : null),
    }))
}

async function sendOrderEmails(order) {
  if (!resend || !orderFromEmail) return { sent: false, reason: 'email_not_configured' }

  const lineItemsHtml = order.items
    .map(
      (item) =>
        `<li>${item.productName} x ${item.quantity} - $${(item.unitPrice * item.quantity).toFixed(2)}</li>`,
    )
    .join('')

  const customerHtml = `
    <h2>Your Aster Supply order is confirmed</h2>
    <p>Order ID: <strong>${order.id}</strong></p>
    <p>We have received your payment and your order is now marked as ${order.fulfillmentStatus}.</p>
    <ul>${lineItemsHtml}</ul>
    <p>Total: <strong>$${order.total.toFixed(2)} USD</strong></p>
    <p>Support: ${supportEmail}</p>
  `

  const adminHtml = `
    <h2>New paid order</h2>
    <p>Order ID: <strong>${order.id}</strong></p>
    <p>${order.customerName} (${order.customerEmail})</p>
    <p>${order.country}</p>
    <ul>${lineItemsHtml}</ul>
    <p>Total: <strong>$${order.total.toFixed(2)} USD</strong></p>
  `

  await resend.emails.send({
    from: orderFromEmail,
    to: order.customerEmail,
    replyTo: supportEmail,
    subject: `Order confirmation ${order.id}`,
    html: customerHtml,
  })

  await resend.emails.send({
    from: orderFromEmail,
    to: adminEmail,
    replyTo: supportEmail,
    subject: `New order ${order.id}`,
    html: adminHtml,
  })

  return { sent: true }
}

function normalizeFinalizedItems(rawItems, store, locale = 'en') {
  if (!Array.isArray(rawItems)) return []
  return rawItems
    .map((item) => {
      const source = item && typeof item === 'object' ? item : {}
      const productId = normalizeText(source.productId)
      const product = store.products.find((entry) => entry.id === productId)
      const quantity = Number.isFinite(Number(source.quantity)) ? Math.max(1, Math.floor(Number(source.quantity))) : 1
      const unitPrice = Number.isFinite(Number(source.unitPrice))
        ? Number(source.unitPrice)
        : product
          ? Number(product.price || 0)
          : 0
      const productName = normalizeText(
        source.productName ||
          product?.translations?.[locale]?.name ||
          product?.translations?.en?.name ||
          productId,
      )
      return {
        productId,
        productName,
        quantity,
        unitPrice,
      }
    })
    .filter((item) => Boolean(item.productId) && Number.isFinite(item.unitPrice))
}

async function finalizePaidOrder({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  customerCountry,
  customerAddress,
  language = 'en',
  items = [],
  total = 0,
  subtotal = 0,
  shipping = 0,
  tax = 0,
  discount = 0,
  currency = 'USD',
  freeShippingApplied = false,
  shippingMethod = 'standard',
  expectedDeliveryAt = '',
  paymentProvider = 'stripe',
  paymentReference = '',
  paymentTransactionId = '',
  pendingTxRef = '',
}) {
  const normalizedOrderId = normalizeText(orderId)
  if (!normalizedOrderId) {
    throw new Error('Order ID is required.')
  }

  const store = await readStore()
  const normalizedItems = normalizeFinalizedItems(items, store, language)
  if (!normalizedItems.length) {
    throw new Error('Order must contain at least one valid item.')
  }

  const existingOrder = store.orders.find(
    (entry) =>
      entry.id === normalizedOrderId ||
      (paymentTransactionId && normalizeText(entry.paymentTransactionId) === normalizeText(paymentTransactionId)) ||
      (paymentReference && normalizeText(entry.paymentReference) === normalizeText(paymentReference)),
  )

  if (existingOrder) {
    if (pendingTxRef) {
      const nextPending = store.pendingPayments.filter((pending) => pending.txRef !== pendingTxRef)
      if (nextPending.length !== store.pendingPayments.length) {
        store.pendingPayments = nextPending
        await writeStore(store)
      }
    }
    return { created: false, order: existingOrder, store }
  }

  const inventoryEntries = []
  for (const item of normalizedItems) {
    const product = store.products.find((entry) => entry.id === item.productId)
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`)
    }
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.id}`)
    }
  }

  for (const item of normalizedItems) {
    const product = store.products.find((entry) => entry.id === item.productId)
    if (!product) continue
    product.stock = Math.max(0, product.stock - item.quantity)
    inventoryEntries.push({
      productId: item.productId,
      delta: -item.quantity,
      reason: 'paid_order',
      orderId: normalizedOrderId,
    })
  }

  const itemSubtotal = normalizedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  )
  const normalizedSubtotal = Number.isFinite(Number(subtotal)) ? Number(subtotal) : itemSubtotal
  const normalizedShipping =
    Number.isFinite(Number(shipping))
      ? Number(shipping)
      : Math.max(0, Number((Number(total || 0) - normalizedSubtotal).toFixed(2)))
  const normalizedTax = Number.isFinite(Number(tax)) ? Number(tax) : 0
  const normalizedDiscount = Number.isFinite(Number(discount)) ? Number(discount) : 0
  const normalizedTotal =
    Number.isFinite(Number(total)) && Number(total) > 0
      ? Number(total)
      : Number((normalizedSubtotal + normalizedShipping + normalizedTax - normalizedDiscount).toFixed(2))
  const createdAt = new Date().toISOString()
  const expectedDelivery =
    normalizeText(expectedDeliveryAt) ||
    new Date(Date.parse(createdAt) + defaultEtaDays * 24 * 60 * 60 * 1000).toISOString()

  const order = normalizeOrder({
    id: normalizedOrderId,
    customerName,
    customerEmail,
    phone: customerPhone,
    country: customerCountry,
    address: customerAddress,
    language,
    paymentStatus: 'Paid',
    fulfillmentStatus: 'Processing',
    internalNote: '',
    subtotal: normalizedSubtotal,
    shipping: normalizedShipping,
    tax: normalizedTax,
    discount: normalizedDiscount,
    total: normalizedTotal,
    currency: normalizeText(currency, 'USD').toUpperCase(),
    freeShippingApplied: freeShippingApplied === true,
    shippingMethod: normalizeText(shippingMethod, 'standard'),
    expectedDeliveryAt: expectedDelivery,
    createdAt,
    paymentReference,
    paymentProvider,
    paymentTransactionId,
    items: normalizedItems,
  })

  store.orders.unshift(order)
  if (pendingTxRef) {
    store.pendingPayments = store.pendingPayments.filter((pending) => pending.txRef !== pendingTxRef)
  }
  await writeStore(store)
  if (inventoryEntries.length) {
    await recordInventoryLedger(inventoryEntries)
  }

  try {
    await sendOrderEmails(order)
  } catch (emailError) {
    console.error('Order email send failed:', emailError)
  }

  return { created: true, order, store }
}

function createOrderFromPending(pendingPayment) {
  return {
    id: buildOrderId(),
    customerName: pendingPayment.customer.name,
    customerEmail: pendingPayment.customer.email,
    phone: pendingPayment.customer.phone,
    country: pendingPayment.customer.country,
    address: pendingPayment.customer.address,
    language: pendingPayment.locale,
    paymentStatus: 'Paid',
    fulfillmentStatus: 'Processing',
    internalNote: '',
    total: pendingPayment.total,
    createdAt: new Date().toISOString(),
    items: pendingPayment.items.map((item) => ({
      productId: item.product.id,
      productName:
        item.product.translations?.[pendingPayment.locale]?.name ||
        item.product.translations?.en?.name ||
        item.product.id,
      quantity: item.quantity,
      unitPrice: item.product.price,
    })),
  }
}

function slugifyValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildProductId(store, preferredSlug) {
  const base = slugifyValue(preferredSlug) || `product-${store.products.length + 1}`
  let candidate = base
  let counter = 2
  while (store.products.some((product) => product.id === candidate || product.slug === candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

function parseImageInput(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean)
        }
      } catch {
        return [trimmed]
      }
    }
    return [trimmed]
  }
  return []
}

function buildNewProduct(store, body) {
  const source = body && typeof body === 'object' ? body : {}
  const name = String(source.name || 'New Product').trim()
  const nameFr = String(source.nameFr || name).trim()
  const category = String(source.category || 'Uncategorized').trim()
  const sku = String(source.sku || `AW-NEW-${Date.now().toString().slice(-6)}`).trim()
  const short = String(source.short || `${name} from the ${category.toLowerCase()} collection.`).trim()
  const shortFr = String(source.shortFr || short).trim()
  const description = String(
    source.description || 'A newly created product ready for admin editing and storefront publishing.',
  ).trim()
  const descriptionFr = String(source.descriptionFr || description).trim()
  const slug = slugifyValue(source.slug || name) || `product-${store.products.length + 1}`
  const price = Number(source.price)
  const compareAtPrice = Object.prototype.hasOwnProperty.call(source, 'compareAtPrice')
    ? parseOptionalNumber(source.compareAtPrice)
    : null
  const legacyImage = String(
    source.image || 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80',
  ).trim()
  const coverImage = String(source.coverImage || legacyImage).trim()
  const images = parseImageInput(source.images)
  const parsedSpecs = Object.prototype.hasOwnProperty.call(source, 'specs')
    ? parseSpecList(source.specs)
    : ['Admin created', 'Ready for merchandising', 'Editable from admin']

  if (Object.prototype.hasOwnProperty.call(source, 'compareAtPrice') && Number.isNaN(compareAtPrice)) {
    throw new Error('Invalid compare-at price.')
  }
  if (parsedSpecs === null) {
    throw new Error('Specs must be an array or comma/newline separated string.')
  }
  if (source.price !== undefined && (!Number.isFinite(price) || price < 0)) {
    throw new Error('Invalid product price.')
  }
  if (source.stock !== undefined && (!Number.isFinite(Number(source.stock)) || Number(source.stock) < 0)) {
    throw new Error('Invalid stock value.')
  }

  return normalizeProduct({
    id: buildProductId(store, slug),
    sku,
    slug,
    category,
    price: Number.isFinite(price) ? price : 0,
    compareAtPrice,
    stock: Number.isFinite(Number(source.stock)) ? Math.max(0, Number(source.stock)) : 0,
    featured: source.featured === undefined ? false : parseBoolean(source.featured),
    visible: source.visible === undefined ? true : parseBoolean(source.visible),
    beginnerFriendly: source.beginnerFriendly === undefined ? false : parseBoolean(source.beginnerFriendly),
    rechargeable: false,
    quiet: false,
    travelFriendly: source.travelFriendly === undefined ? false : parseBoolean(source.travelFriendly),
    waterResistant: false,
    bundleEligible: source.bundleEligible === undefined ? false : parseBoolean(source.bundleEligible),
    coverImage,
    images: images.length ? images : [coverImage],
    specs: parsedSpecs.length ? parsedSpecs : ['Admin created', 'Ready for merchandising', 'Editable from admin'],
    translations: {
      en: {
        name,
        short,
        description,
        why: ['Created from admin', 'Ready for merchandising', 'Visible in reports and inventory'],
        care: 'See product-specific care instructions before shipping.',
        notice: 'Check the product details, shipping terms, and return policy before purchase.',
      },
      fr: {
        name: nameFr,
        short: shortFr,
        description: descriptionFr,
        why: ['Cree depuis l admin', 'Pret pour le merchandising', 'Visible dans le suivi de stock'],
        care: 'Voir les instructions d entretien avant expedition.',
        notice: 'Consultez la fiche produit, la livraison et la politique de retour avant achat.',
      },
    },
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: storeBackend })
})

app.get('/api/version', (_req, res) => {
  res.json({
    ok: true,
    storage: storeBackend,
    branch: process.env.RENDER_GIT_BRANCH || process.env.GIT_BRANCH || 'unknown',
    commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown',
    buildTime: process.env.BUILD_TIME || process.env.BUILD_TIMESTAMP || serverStartTimestamp,
  })
})

app.get('/api/admin/session', (req, res) => {
  const session = getAdminSession(req)
  if (!session) {
    return res.json({
      authenticated: false,
      adminAuthEnabled: adminCredentialsConfigured,
    })
  }
  return res.json({
    authenticated: true,
    username: session.username,
    adminAuthEnabled: adminCredentialsConfigured,
  })
})

app.post('/api/admin/login', (req, res) => {
  if (!adminCredentialsConfigured) {
    return res.status(503).json({ error: 'Admin credentials are not configured on the server.' })
  }
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' })
  }
  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' })
  }

  const sessionValue = createAdminSession(username)
  res.setHeader(
    'Set-Cookie',
    serializeCookie(adminSessionCookieName, sessionValue, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: useSecureCookie(req),
      path: '/',
    }),
  )
  return res.json({
    authenticated: true,
    username,
    adminAuthEnabled: adminCredentialsConfigured,
  })
})

app.post('/api/admin/logout', (req, res) => {
  const session = getAdminSession(req)
  if (session?.token) {
    adminSessions.delete(session.token)
  }
  res.setHeader(
    'Set-Cookie',
    serializeCookie(adminSessionCookieName, '', {
      httpOnly: true,
      sameSite: 'Lax',
      secure: useSecureCookie(req),
      path: '/',
      maxAge: 0,
    }),
  )
  return res.json({ authenticated: false })
})

app.get('/api/admin/inventory/ledger', async (req, res, next) => {
  try {
    const session = getAdminSession(req)
    if (!session) return res.status(401).json({ error: 'Unauthorized' })
    const store = await readStore()
    const ledger = getInventoryLedgerEntries(store, {
      orderId: req.query?.orderId,
      productId: req.query?.productId,
      from: req.query?.from,
      to: req.query?.to,
    })
    return res.json(ledger.slice(0, 250))
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/products/bulk', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const { productIds, action, value } = req.body || {}
    if (!Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({ error: 'Product IDs array is required.' })
    }
    const allowedActions = ['visible', 'archived', 'featured', 'category']
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid bulk action.' })
    }

    const store = await readStore()
    let updatedCount = 0
    for (const id of productIds) {
      const product = store.products.find((p) => p.id === id)
      if (product) {
        if (action === 'category') {
          product.category = String(value || 'Uncategorized').trim()
        } else {
          const boolValue = parseBoolean(value)
          product[action] = boolValue
          if (action === 'visible' && boolValue) product.archived = false
          if (action === 'archived' && boolValue) product.visible = false
        }
        updatedCount++
      }
    }

    await writeStore(store)
    return res.json({
      updatedCount,
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/orders/:id/refund', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const order = store.orders.find((o) => o.id === req.params.id)
    if (!order) return res.status(404).json({ error: 'Order not found.' })
    if (order.fulfillmentStatus === 'Refunded') return res.status(400).json({ error: 'Order already refunded.' })

    order.fulfillmentStatus = 'Refunded'
    order.internalNote = `${order.internalNote || ''}\n[Refunded on ${new Date().toLocaleString()} by ${req.adminSession?.username}]`.trim()

    // Optional: Restock items
    const restock = parseBoolean(req.body?.restock)
    if (restock) {
      for (const item of order.items) {
        const product = store.products.find((p) => p.id === item.productId)
        if (product) {
          product.stock += item.quantity
          await recordInventoryLedger([
            {
              productId: product.id,
              delta: item.quantity,
              reason: 'order_refund_restock',
              orderId: order.id,
              adminUsername: req.adminSession?.username,
            },
          ])
        }
      }
    }

    await writeStore(store)
    return res.json({ order, store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/orders', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const { status, search, range } = req.query || {}

    let filtered = [...store.orders]

    if (status && status !== 'All') {
      filtered = filtered.filter((o) => o.fulfillmentStatus === status || o.paymentStatus === status)
    }

    if (search) {
      const term = String(search).toLowerCase()
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerEmail.toLowerCase().includes(term) ||
          o.phone.toLowerCase().includes(term),
      )
    }

    if (range) {
      const days = Number.parseInt(String(range), 10)
      if (Number.isFinite(days)) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        filtered = filtered.filter((o) => Date.parse(o.createdAt) >= cutoff)
      }
    }

    return res.json({ orders: filtered })
  } catch (error) {
    next(error)
  }
})

app.get(['/api/admin/inventory/ledger/export', '/api/admin/inventory/ledger/export.csv', '/api/admin/inventory/ledger/export.xlsx'], async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const ledger = getInventoryLedgerEntries(store, {
      orderId: req.query?.orderId,
      productId: req.query?.productId,
      from: req.query?.from,
      to: req.query?.to,
    })
    const format = parseExportFormat(req, 'csv')

    if (format === 'xlsx') {
      const xlsxBuffer = inventoryLedgerToXlsxBuffer(store, ledger)
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-ledger-export.xlsx"')
      return res.status(200).send(xlsxBuffer)
    }

    const csv = inventoryLedgerToCsv(store, ledger)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-ledger-export.csv"')
    return res.status(200).send(csv)
  } catch (error) {
    next(error)
  }
})

app.get('/api/admin/metrics', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const range = typeof req.query?.range === 'string' ? req.query.range : '30d'
    const from = typeof req.query?.from === 'string' ? req.query.from : ''
    const to = typeof req.query?.to === 'string' ? req.query.to : ''
    const metrics = await getAdminMetrics(range, from, to)
    return res.json({ metrics })
  } catch (error) {
    next(error)
  }
})

app.get(['/api/admin/metrics/export', '/api/admin/metrics/export.csv', '/api/admin/metrics/export.xlsx', '/api/admin/metrics/trend/export', '/api/admin/metrics/trend/export.csv', '/api/admin/metrics/trend/export.xlsx'], async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const range = typeof req.query?.range === 'string' ? req.query.range : '30d'
    const from = typeof req.query?.from === 'string' ? req.query.from : ''
    const to = typeof req.query?.to === 'string' ? req.query.to : ''
    const metrics = await getAdminMetrics(range, from, to)
    const format = parseExportFormat(req, 'csv')

    if (format === 'xlsx') {
      const xlsxBuffer = metricsTrendToXlsxBuffer(metrics)
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      res.setHeader('Content-Disposition', 'attachment; filename="admin-metrics-export.xlsx"')
      return res.status(200).send(xlsxBuffer)
    }

    const csv = metricsTrendToCsv(metrics)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="admin-metrics-export.csv"')
    return res.status(200).send(csv)
  } catch (error) {
    next(error)
  }
})

app.get('/api/health', async (req, res) => {
  const health = {
    ok: true,
    storage: storeBackend,
    status: 'ok',
    database: storeBackend,
    postgresReady: postgresSchemaReady,
    tables: []
  }
  if (usePostgresStorage && sql) {
    try {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
      health.tables = tables.map(t => t.table_name)
      const dbName = await sql`SELECT current_database()`
      health.databaseName = dbName[0].current_database
    } catch (e) {
      health.databaseError = e.message
    }
  }
  res.json(health)
})

app.get('/api/store', async (_req, res, next) => {
  try {
    const store = await readStore()
    const includeHidden = _req.query.includeHidden === '1'
    const includeArchived = _req.query.includeArchived === '1'
    const includeDeleted = _req.query.includeDeleted === '1'
    if ((includeHidden || includeArchived || includeDeleted) && !requireAdminSession(_req, res)) return
    res.json(
      publicStore(store, {
        includeHidden,
        includeArchived,
        includeDeleted,
        includeOrders: includeHidden || includeArchived || includeDeleted,
      }),
    )
  } catch (error) {
    next(error)
  }
})

app.post('/api/checkout-session', async (req, res, next) => {
  try {
    const { provider = 'stripe' } = req.body

    const validationError = validateCheckoutPayload(req.body)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const store = await readStore()
    const checkoutItems = req.body.items.map((item) => {
      const product = store.products.find((entry) => entry.id === item.productId)
      if (!product) throw new Error(`Unknown product: ${item.productId}`)
      if (product.visible === false || product.archived === true || product.deleted_at) {
        throw new Error(`Product is not available: ${item.productId}`)
      }
      const quantity = Number(item.quantity)
      if (product.stock < quantity) throw new Error(`Insufficient stock for ${product.id}`)
      return { product, quantity }
    })

    const orderId = buildTxRef()
    const subtotal = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    const freeShippingRequested = parseBoolean(req.body?.freeShippingRequested)
    const shipping = subtotal > 0 && !freeShippingRequested ? defaultShippingFee : 0
    const tax = 0
    const discount = 0
    const total = Number((subtotal + shipping + tax - discount).toFixed(2))
    const shippingMethod = freeShippingRequested ? 'free_shipping' : 'standard'
    const expectedDeliveryAt = new Date(Date.now() + defaultEtaDays * 24 * 60 * 60 * 1000).toISOString()

    if (provider === 'stripe' || provider === 'alipay') {
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe is not configured yet.' })
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: provider === 'alipay' ? ['alipay', 'card'] : ['card'],
        phone_number_collection: {
          enabled: true,
        },
        line_items: [
          ...checkoutItems.map((item) => ({
            price_data: {
              currency: 'usd',
              product_data: {
                name: item.product.translations[req.body.locale || 'en']?.name || item.product.id,
                description: item.product.translations[req.body.locale || 'en']?.short || '',
              },
              unit_amount: Math.round(item.product.price * 100),
            },
            quantity: item.quantity,
          })),
          ...(shipping > 0
            ? [
                {
                  price_data: {
                    currency: 'usd',
                    product_data: {
                      name: 'Shipping',
                      description: 'Standard delivery',
                    },
                    unit_amount: Math.round(shipping * 100),
                  },
                  quantity: 1,
                },
              ]
            : []),
        ],
        mode: 'payment',
        success_url: `${appBaseUrl}/?payment=success&orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl}/?payment=cancelled`,
        metadata: {
          orderId,
          customerName: req.body.name.trim(),
          customerEmail: req.body.email.trim(),
          customerPhone: normalizeText(req.body.phone || `${normalizeText(req.body.phoneCountryCode)} ${normalizeText(req.body.phoneNumber)}`),
          customerCountry: req.body.country.trim(),
          customerAddress: req.body.address.trim(),
          language: req.body.locale || 'en',
          items: JSON.stringify(req.body.items),
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          tax: tax.toFixed(2),
          discount: discount.toFixed(2),
          currency: 'USD',
          freeShippingApplied: String(freeShippingRequested && shipping === 0),
          shippingMethod,
          expectedDeliveryAt,
          provider: provider === 'alipay' ? 'alipay' : 'stripe',
        },
      })

      return res.status(201).json({
        paymentLink: session.url,
        txRef: orderId,
      })
    }

    if (provider === 'paypal') {
      if (!paypalClient) {
        return res.status(400).json({ error: 'PayPal is not configured yet.' })
      }

      const itemSubtotal = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      const shippingCharge = itemSubtotal > 0 ? defaultShippingFee : 0
      const orderTotal = itemSubtotal + shippingCharge
      const request = new paypal.orders.OrdersCreateRequest()
      request.prefer("return=representation")
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: orderTotal.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: itemSubtotal.toFixed(2)
              },
              shipping: {
                currency_code: 'USD',
                value: shippingCharge.toFixed(2)
              },
            }
          },
          items: checkoutItems.map(item => ({
            name: item.product.translations[req.body.locale || 'en']?.name || item.product.id,
            unit_amount: {
              currency_code: 'USD',
              value: item.product.price.toFixed(2)
            },
            quantity: item.quantity.toString()
          }))
        }],
        application_context: {
          return_url: `${appBaseUrl}/?payment=success&orderId=${orderId}`,
          cancel_url: `${appBaseUrl}/?payment=cancelled`,
          brand_name: 'ASTER',
          user_action: 'PAY_NOW'
        }
      })

      const order = await paypalClient.execute(request)
      const approveLink = order.result.links.find(link => link.rel === 'approve').href

      // Store pending order for PayPal manually since we don't have a webhook yet
      const pendingPayment = {
        txRef: orderId,
        paypalOrderId: order.result.id,
        locale: req.body.locale,
        total: orderTotal,
        subtotal: itemSubtotal,
        shipping: shippingCharge,
        tax: 0,
        discount: 0,
        currency: 'USD',
        freeShippingApplied: false,
        shippingMethod: 'standard',
        expectedDeliveryAt,
        customer: {
          name: req.body.name.trim(),
          email: req.body.email.trim(),
          phone: req.body.phone.trim(),
          country: req.body.country.trim(),
          address: req.body.address.trim(),
        },
        items: checkoutItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.translations[req.body.locale || 'en']?.name || item.product.translations.en?.name || item.product.id,
          quantity: item.quantity,
          unitPrice: Number(item.product.price || 0),
        })),
        createdAt: new Date().toISOString(),
        status: 'pending',
        provider: 'paypal'
      }
      store.pendingPayments.unshift(pendingPayment)
      await writeStore(store)

      return res.status(201).json({
        paymentLink: approveLink,
        txRef: orderId,
      })
    }

    if (provider === 'crypto') {
      const itemSubtotal = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      const shippingCharge = itemSubtotal > 0 ? defaultShippingFee : 0
      const total = itemSubtotal + shippingCharge
      // For crypto, we just show the address and wait for manual confirmation or a hash submission
      // In this simple flow, we'll redirect to a "manual payment" page or just show the info in the confirmation
      // But for now, let's just return the info
      return res.status(201).json({
        paymentLink: `${appBaseUrl}/?payment=crypto&orderId=${orderId}&address=${cryptoWalletAddress}&total=${total}`,
        txRef: orderId,
      })
    }

    return res.status(400).json({ error: 'Invalid payment provider' })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

app.post('/api/payments/paypal/capture', async (req, res, next) => {
  try {
    const { orderId, paypalOrderId } = req.body
    if (!paypalClient) throw new Error('PayPal not configured')

    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId)
    request.requestBody({})
    const capture = await paypalClient.execute(request)

    if (capture.result.status === 'COMPLETED') {
      const store = await readStore()
      const pending = store.pendingPayments.find((p) => p.txRef === orderId)
      if (!pending) {
        return res.status(404).json({ error: 'Pending PayPal order not found.' })
      }

      const captureId = normalizeText(capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.id)
      const result = await finalizePaidOrder({
        orderId: normalizeText(orderId),
        customerName: normalizeText(pending.customer?.name),
        customerEmail: normalizeText(pending.customer?.email),
        customerPhone: normalizeText(pending.customer?.phone),
        customerCountry: normalizeText(pending.customer?.country),
        customerAddress: normalizeText(pending.customer?.address),
        language: pending.locale === 'fr' ? 'fr' : 'en',
        items: pending.items || [],
        total: Number(pending.total || 0),
        subtotal: Number(pending.subtotal || 0),
        shipping: Number(pending.shipping || 0),
        tax: Number(pending.tax || 0),
        discount: Number(pending.discount || 0),
        currency: normalizeText(pending.currency, 'USD'),
        freeShippingApplied: pending.freeShippingApplied === true,
        shippingMethod: normalizeText(pending.shippingMethod, 'standard'),
        expectedDeliveryAt: normalizeText(pending.expectedDeliveryAt),
        paymentProvider: 'paypal',
        paymentReference: normalizeText(paypalOrderId),
        paymentTransactionId: captureId,
        pendingTxRef: normalizeText(orderId),
      })

      return res.json({
        status: 'success',
        created: result.created,
        order: result.order,
        store: publicStore(result.store, { includeOrders: true }),
      })
    }
    res.status(400).json({ error: 'Payment not completed' })
  } catch (error) {
    next(error)
  }
})
app.patch('/api/admin/homepage', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const store = await readStore()
    const nextHomepage = normalizeHomepage({
      contentByLocale: body.contentByLocale,
      heroProductId: body.heroProductId,
    })
    if (
      nextHomepage.heroProductId &&
      !store.products.some((product) => product.id === nextHomepage.heroProductId)
    ) {
      return res.status(400).json({ error: 'Homepage hero product was not found.' })
    }
    store.homepage = nextHomepage
    await writeStore(store)
    return res.json({
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/orders/:id', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const { fulfillmentStatus, internalNote } = req.body || {}
    const confirmationReceived = parseBoolean(
      req.body?.confirm ?? req.body?.confirmed ?? req.body?.confirmStatusUpdate ?? req.body?.confirmChange,
    )
    const allowed = ['Paid', 'Processing', 'Shipped', 'Refunded', 'Cancelled']
    if (fulfillmentStatus !== undefined && !allowed.includes(fulfillmentStatus)) {
      return res.status(400).json({ error: 'Invalid fulfillment status.' })
    }

    const store = await readStore()
    const order = store.orders.find((entry) => entry.id === req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    if (fulfillmentStatus !== undefined) {
      order.fulfillmentStatus = fulfillmentStatus
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'internalNote')) {
      if (typeof internalNote !== 'string') {
        return res.status(400).json({ error: 'Internal note must be a string.' })
      }
      order.internalNote = internalNote
    }
    await writeStore(store)
    return res.json({
      order,
      confirmationReceived,
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.get(['/api/orders/export', '/api/orders/export.csv', '/api/orders/export.xlsx'], async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const format = parseExportFormat(req, 'csv')
    if (format === 'xlsx') {
      const xlsxBuffer = ordersToXlsxBuffer(store.orders)
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      res.setHeader('Content-Disposition', 'attachment; filename="orders-export.xlsx"')
      return res.status(200).send(xlsxBuffer)
    }

    const csv = ordersToCsv(store.orders)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"')
    return res.status(200).send(csv)
  } catch (error) {
    next(error)
  }
})

app.patch('/api/products/:id/stock', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const delta = Number(req.body?.delta)
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: 'Stock delta must be a non-zero number.' })
    }

    const store = await readStore()
    const product = store.products.find((entry) => entry.id === req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    product.stock = Math.max(0, product.stock + delta)
    await writeStore(store)
    await recordInventoryLedger([
      {
        productId: product.id,
        delta,
        reason: 'admin_adjustment',
        adminUsername: req.adminSession?.username,
      },
    ])
    return res.json({ product, store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }) })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/products/:id', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const allowedFields = [
      'sku',
      'slug',
      'category',
      'price',
      'compareAtPrice',
      'stock',
      'featured',
      'beginnerFriendly',
      'rechargeable',
      'quiet',
      'travelFriendly',
      'waterResistant',
      'bundleEligible',
      'image',
      'images',
      'coverImage',
      'visible',
      'nameEn',
      'nameFr',
      'shortEn',
      'shortFr',
      'descriptionEn',
      'descriptionFr',
      'specs',
      'archived',
    ]

    const store = await readStore()
    const product = store.products.find((entry) => entry.id === req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' })
    }

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        const value = req.body[field]
        if (field === 'price' || field === 'stock') {
          const numericValue = Number(value)
          if (!Number.isFinite(numericValue)) {
            return res.status(400).json({ error: `Invalid numeric value for ${field}.` })
          }
          product[field] = numericValue
          continue
        }
        if (field === 'compareAtPrice') {
          const numericValue = parseOptionalNumber(value)
          if (Number.isNaN(numericValue)) {
            return res.status(400).json({ error: 'Invalid numeric value for compareAtPrice.' })
          }
          product.compareAtPrice = numericValue
          continue
        }
        if (field === 'featured' || field === 'beginnerFriendly' || field === 'rechargeable' || field === 'quiet' || field === 'travelFriendly' || field === 'waterResistant' || field === 'bundleEligible' || field === 'visible' || field === 'archived') {
          product[field] = parseBoolean(value)
          if (field === 'visible' && parseBoolean(value)) {
            product.archived = false
          }
          if (field === 'archived' && parseBoolean(value)) {
            product.visible = false
          }
          continue
        }
        if (field === 'specs') {
          const parsedSpecs = parseSpecList(value)
          if (parsedSpecs === null) {
            return res.status(400).json({ error: 'Specs must be an array or comma/newline separated string.' })
          }
          product.specs = parsedSpecs
          continue
        }
        if (field === 'images') {
          const parsedImages = parseImageInput(value)
          product.images = parsedImages
          product.coverImage = parsedImages[0] || product.coverImage || product.image || ''
          product.image = product.coverImage
          continue
        }
        if (field === 'coverImage') {
          const nextCover = String(value || '').trim()
          if (nextCover) {
            product.coverImage = nextCover
            const remainingImages = parseImageInput(product.images).filter((item) => item !== nextCover)
            product.images = [nextCover, ...remainingImages]
            product.image = nextCover
          }
          continue
        }
        if (field === 'image') {
          const nextImage = String(value || '').trim()
          product.coverImage = nextImage
          product.image = nextImage
          product.images = nextImage ? [nextImage, ...parseImageInput(product.images).filter((item) => item !== nextImage)] : []
          continue
        }
        if (field === 'nameEn' || field === 'shortEn' || field === 'descriptionEn' || field === 'nameFr' || field === 'shortFr' || field === 'descriptionFr') {
          const locale = field.endsWith('En') ? 'en' : 'fr'
          const key = field.slice(0, -2).toLowerCase()
          const text = typeof value === 'string' ? value : value === null ? null : String(value)
          product.translations = product.translations || {}
          product.translations[locale] = product.translations[locale] || {}
          product.translations[locale][key] = text
          continue
        }
        if (typeof value === 'string' || value === null) {
          product[field] = value ?? product[field]
        }
      }
    }

    await writeStore(store)
    return res.json({ product, store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/products/:id/delete', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const product = store.products.find((entry) => entry.id === req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' })
    }
    if (!product.deleted_at) {
      product.deleted_at = new Date().toISOString()
    }
    await writeStore(store)
    return res.json({
      product,
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/admin/products/:id/restore', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const product = store.products.find((entry) => entry.id === req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' })
    }
    product.deleted_at = ''
    await writeStore(store)
    return res.json({
      product,
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/admin/products/:id', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const productId = req.params.id
    const hasOrderHistory = store.orders.some((order) =>
      Array.isArray(order.items) && order.items.some((item) => item.productId === productId),
    )
    const hasLedgerHistory = store.inventoryLedger.some((entry) => entry.productId === productId)
    if (hasOrderHistory || hasLedgerHistory) {
      return res.status(400).json({
        error:
          'This product has order or inventory history. Keep it in recycle bin (soft delete) to preserve reporting integrity.',
      })
    }
    const index = store.products.findIndex((entry) => entry.id === req.params.id)
    if (index < 0) {
      return res.status(404).json({ error: 'Product not found.' })
    }
    const [removed] = store.products.splice(index, 1)
    await writeStore(store)
    return res.json({
      product: removed,
      deleted: true,
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/products', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
    const product = buildNewProduct(store, req.body)
    store.products.unshift(product)
    await writeStore(store)
    return res.status(201).json({ product, store: publicStore(store, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }) })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

app.post('/api/reset', async (_req, res, next) => {
  try {
    if (!requireAdminSession(_req, res)) return
    const seedRaw = await readFile(seedPath, 'utf8')
    const seed = normalizeStore(JSON.parse(seedRaw))
    if (usePostgresStorage) {
      await writePostgresStore(seed, { clearLedger: true })
    } else {
      await writeStore(seed)
    }
    return res.json(publicStore(seed, { includeHidden: true, includeArchived: true, includeDeleted: true, includeOrders: true }))
  } catch (error) {
    next(error)
  }
})

let vite = null
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite')
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
}

async function sendAppHtml(req, res, next) {
  try {
    const host = getRequestHost(req)
    const htmlPath = resolveAppHtml(req)
    
    if (vite) {
      const rawHtml = await readFile(htmlPath, 'utf-8')
      const html = await vite.transformIndexHtml(req.originalUrl || req.url, rawHtml)
      return res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    }
    
    return res.sendFile(htmlPath)
  } catch (error) {
    next(error)
  }
}

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next()
  }

  const requestHost = getRequestHost(req)
  const requestPath = req.path || '/'

  if (requestPath.startsWith('/api')) {
    return next()
  }

  if (isApexHost(requestHost)) {
    return redirectToStorefront(res, req.originalUrl)
  }

  if (requestPath === '/' || requestPath === '/index.html' || requestPath === '/admin.html') {
    return sendAppHtml(req, res, next)
  }

  return next()
})

if (vite) {
  app.use(vite.middlewares)
}

app.use(express.static(distPath, { index: false }))

app.get(/^(?!\/api).*/, async (req, res, next) => {
  return sendAppHtml(req, res, next)
})

app.use((error, _req, res, _next) => {
  console.error(error)
  const status = Number(error?.statusCode || error?.status || 500)
  const message =
    status >= 400 && status < 500
      ? error?.message || 'Request failed'
      : 'Internal server error'
  res.status(status).json({ error: message })
})

async function startServer() {
  app.listen(port, async () => {
    await ensureStoreData()
    console.log(`Aster Supply server running on http://localhost:${port} using ${storeBackend} storage`)
  })
}

startServer()
