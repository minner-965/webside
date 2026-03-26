import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import express from 'express'
import postgres from 'postgres'
import { Resend } from 'resend'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
app.set('trust proxy', true)
const port = Number(process.env.PORT || 3001)
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
const flutterwaveSecretKey = process.env.FLW_SECRET_KEY || ''
const resendApiKey = process.env.RESEND_API_KEY || ''
const supportEmail = process.env.SUPPORT_EMAIL || 'support@astersupply.example'
const orderFromEmail = process.env.ORDER_FROM_EMAIL || ''
const adminEmail = process.env.ADMIN_EMAIL || supportEmail
const adminUsername = process.env.ADMIN_USERNAME || ''
const adminPassword = process.env.ADMIN_PASSWORD || ''
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex')
const adminSessionCookieName = 'aster_admin_session'
const adminSessions = new Map()
const serverStartTimestamp = new Date().toISOString()
const appBaseUrl =
  process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' ? storefrontOrigin : 'http://localhost:5173')
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

const supportedCheckoutCountries = ['United States', 'Canada', 'United Kingdom', 'Europe']
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
  return res.sendFile(storefrontHtmlPath)
}

function sendAdminHtml(res) {
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

app.use(express.json())

function normalizeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
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
    total: Number.isFinite(Number(source.total)) ? Number(source.total) : 0,
    createdAt: normalizeText(source.createdAt),
    paymentReference: normalizeText(source.paymentReference),
    paymentProvider: normalizeText(source.paymentProvider),
    paymentTransactionId: normalizeText(source.paymentTransactionId),
    items: Array.isArray(source.items)
      ? source.items.map((item) => ({
          productId: normalizeText(item.productId),
          productName: normalizeText(item.productName),
          quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Math.floor(Number(item.quantity))) : 1,
          unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
        }))
      : [],
  }
}

function normalizePendingPayment(pendingPayment) {
  const source = pendingPayment && typeof pendingPayment === 'object' ? pendingPayment : {}
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
    items: Array.isArray(source.items)
      ? source.items.map((item) => ({
          product: normalizeProduct(item.product),
          quantity: Number.isFinite(Number(item.quantity)) ? Math.max(1, Math.floor(Number(item.quantity))) : 1,
        }))
      : [],
    createdAt: normalizeText(source.createdAt),
    status: normalizeText(source.status, 'pending'),
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
    homepage: normalizeHomepage(source.homepage),
  }
}

async function readSeedStore() {
  return normalizeStore(JSON.parse(await readFile(seedPath, 'utf8')))
}

async function ensurePostgresSchema() {
  if (!sql || postgresSchemaReady) return
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
  await sql`CREATE INDEX IF NOT EXISTS idx_products_featured_stock ON products (featured, stock)`
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product_id ON inventory_ledger (product_id, created_at DESC)`
  postgresSchemaReady = true
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
          cover_image, images, specs, translations, created_at, updated_at
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

    for (const order of store.orders) {
      await tx`
        INSERT INTO orders (
          id, customer_name, customer_email, phone, country, address, language, payment_status,
          fulfillment_status, internal_note, total, created_at, payment_reference, payment_provider,
          payment_transaction_id, updated_at
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
          ${order.total},
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
  const [productRows, imageRows, orderRows, orderItemRows, homepageRows, pendingRows, settingRows] = await Promise.all([
    sql`SELECT * FROM products ORDER BY created_at ASC, id ASC`,
    sql`SELECT * FROM product_images ORDER BY product_id ASC, position ASC, id ASC`,
    sql`SELECT * FROM orders ORDER BY created_at DESC, id DESC`,
    sql`SELECT * FROM order_items ORDER BY order_id ASC, id ASC`,
    sql`SELECT * FROM homepage_content ORDER BY locale ASC`,
    sql`SELECT * FROM pending_payments ORDER BY created_at DESC, tx_ref DESC`,
    sql`SELECT setting_key, setting_value FROM admin_settings`,
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
        total: row.total,
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
  })
}

async function recordInventoryLedger(entries) {
  if (!usePostgresStorage || !Array.isArray(entries) || !entries.length) return
  await ensurePostgresSchema()
  await sql.begin(async (tx) => {
    for (const entry of entries) {
      if (!entry || !entry.productId || !Number.isFinite(Number(entry.delta)) || Number(entry.delta) === 0) {
        continue
      }
      await tx`
        INSERT INTO inventory_ledger (product_id, delta, reason, order_id, admin_username, created_at)
        VALUES (
          ${entry.productId},
          ${Number(entry.delta)},
          ${normalizeText(entry.reason, 'adjustment')},
          ${entry.orderId || null},
          ${entry.adminUsername || null},
          NOW()
        )
      `
    }
  })
}

async function getAdminMetrics(range = '30d') {
  const store = await readStore()
  const days = [7, 30, 90].includes(Number.parseInt(String(range).replace(/[^0-9]/g, ''), 10))
    ? Number.parseInt(String(range), 10)
    : 30
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const activeOrders = store.orders.filter((order) => {
    const createdAt = Date.parse(order.createdAt)
    return Number.isFinite(createdAt) && createdAt >= cutoff
  })
  const paidOrders = activeOrders.filter((order) => order.paymentStatus === 'Paid')
  const gmv = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const refundedOrders = activeOrders.filter((order) => order.fulfillmentStatus === 'Refunded')
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
    .filter((product) => product.stock <= 12 && product.archived !== true)
    .sort((left, right) => left.stock - right.stock || left.category.localeCompare(right.category))
    .slice(0, 10)
    .map((product) => ({
      productId: product.id,
      productName: product.translations?.en?.name || product.translations?.fr?.name || product.id,
      sku: product.sku,
      stock: product.stock,
      category: product.category,
    }))

  return {
    range: `${days}d`,
    gmv: Number(gmv.toFixed(2)),
    paidOrders: paidOrders.length,
    aov: paidOrders.length ? Number((gmv / paidOrders.length).toFixed(2)) : 0,
    refundRate: activeOrders.length ? Number((refundedOrders.length / activeOrders.length).toFixed(4)) : 0,
    topSkus,
    lowStock,
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
  const requiredStrings = ['name', 'email', 'phone', 'country', 'address', 'locale']
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
  return isAdminHost(host) ? adminHtmlPath : storefrontHtmlPath
}

function publicStore(store, options = {}) {
  const includeHidden = options.includeHidden === true
  const includeArchived = options.includeArchived === true
  const includeOrders = options.includeOrders === true
  return {
    products: (includeHidden ? store.products : store.products.filter((product) => product.visible !== false)).filter(
      (product) => includeArchived || product.archived !== true,
    ),
    orders: includeOrders ? store.orders : [],
    config: {
      paymentConfigured: Boolean(flutterwaveSecretKey),
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

function escapeCsv(value) {
  const stringValue = String(value ?? '')
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
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
    'total_usd',
    'item_count',
    'items_summary',
  ]

  const rows = orders.map((order) => {
    const itemsSummary = order.items
      .map((item) => `${item.productName} x${item.quantity} @ $${item.unitPrice.toFixed(2)}`)
      .join(' | ')
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
      order.total.toFixed(2),
      String(order.items.length),
      itemsSummary,
    ]
      .map(escapeCsv)
      .join(',')
  })

  return [headers.join(','), ...rows].join('\n')
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

async function verifyFlutterwaveTransaction(transactionId) {
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
    headers: {
      Authorization: `Bearer ${flutterwaveSecretKey}`,
    },
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload?.message || 'Flutterwave verification failed')
  }
  return payload
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

app.get('/api/admin/metrics', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const range = typeof req.query?.range === 'string' ? req.query.range : '30d'
    const metrics = await getAdminMetrics(range)
    return res.json({ metrics })
  } catch (error) {
    next(error)
  }
})

app.get('/api/store', async (_req, res, next) => {
  try {
    const store = await readStore()
    const includeHidden = _req.query.includeHidden === '1'
    const includeArchived = _req.query.includeArchived === '1'
    if ((includeHidden || includeArchived) && !requireAdminSession(_req, res)) return
    res.json(publicStore(store, { includeHidden, includeArchived, includeOrders: includeHidden || includeArchived }))
  } catch (error) {
    next(error)
  }
})

app.post('/api/checkout-session', async (req, res, next) => {
  try {
    if (!flutterwaveSecretKey) {
      return res.status(400).json({ error: 'Flutterwave is not configured yet.' })
    }

    const validationError = validateCheckoutPayload(req.body)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const store = await readStore()
    const items = req.body.items.map((item) => {
      const product = store.products.find((entry) => entry.id === item.productId)
      if (!product) {
        throw new Error(`Unknown product: ${item.productId}`)
      }
      if (product.visible === false || product.archived === true) {
        throw new Error(`Product is not available for checkout: ${item.productId}`)
      }
      const quantity = Number(item.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for ${item.productId}`)
      }
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for ${product.id}`)
      }
      return { product, quantity }
    })

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 9)
  const txRef = buildTxRef()
  const pendingPayment = {
      txRef,
      locale: req.body.locale,
      total,
      currency: 'USD',
      customer: {
        name: req.body.name.trim(),
        email: req.body.email.trim(),
        phone: req.body.phone.trim(),
        country: req.body.country.trim(),
        address: req.body.address.trim(),
      },
      items,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    store.pendingPayments = store.pendingPayments.filter((entry) => entry.txRef !== txRef)
    store.pendingPayments.unshift(pendingPayment)
    await writeStore(store)

    let payload
    try {
      const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: total,
          currency: 'USD',
          redirect_url: `${apiBaseUrl}/api/payments/flutterwave/callback`,
          customer: {
            email: pendingPayment.customer.email,
            phonenumber: pendingPayment.customer.phone,
            name: pendingPayment.customer.name,
          },
          customizations: {
            title: 'Aster Supply',
            description: 'Secure checkout for Aster Supply',
          },
          meta: {
            source: 'aster-supply-storefront',
            customer_country: pendingPayment.customer.country,
          },
        }),
      })

      payload = await flutterwaveResponse.json()
      if (!flutterwaveResponse.ok || !payload?.data?.link) {
        throw new Error(payload?.message || 'Failed to initialize payment.')
      }
    } catch (paymentError) {
      store.pendingPayments = store.pendingPayments.filter((entry) => entry.txRef !== txRef)
      await writeStore(store)
      throw paymentError
    }

    return res.status(201).json({
      paymentLink: payload.data.link,
      txRef,
    })
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }
    next(error)
  }
})

app.get('/api/payments/flutterwave/callback', async (req, res, next) => {
  try {
    const transactionId = req.query.transaction_id
    const txRef = req.query.tx_ref
    const status = req.query.status

    if (typeof txRef !== 'string') {
      return res.redirect(`${appBaseUrl}/?payment=failed`)
    }

    const store = await readStore()
    const pendingPayment = store.pendingPayments.find((entry) => entry.txRef === txRef)
    if (!pendingPayment) {
      return res.redirect(`${appBaseUrl}/?payment=failed&reason=missing_payment`)
    }

    if (status !== 'successful' || typeof transactionId !== 'string') {
      return res.redirect(`${appBaseUrl}/?payment=failed&txRef=${encodeURIComponent(txRef)}`)
    }

    const verification = await verifyFlutterwaveTransaction(transactionId)
    const data = verification?.data

    if (
      data?.status !== 'successful' ||
      data?.tx_ref !== txRef ||
      Number(data?.amount) < Number(pendingPayment.total) ||
      data?.currency !== pendingPayment.currency
    ) {
      return res.redirect(`${appBaseUrl}/?payment=failed&txRef=${encodeURIComponent(txRef)}`)
    }

    const alreadyCreated = store.orders.find((entry) => entry.paymentReference === txRef)
    if (alreadyCreated) {
      return res.redirect(`${appBaseUrl}/?payment=success&orderId=${alreadyCreated.id}`)
    }

    for (const item of pendingPayment.items) {
      const product = store.products.find((entry) => entry.id === item.product.id)
      if (!product || product.visible === false || product.archived === true || product.stock < item.quantity) {
        return res.redirect(`${appBaseUrl}/?payment=failed&reason=stock`)
      }
      product.stock -= item.quantity
    }
    await recordInventoryLedger(
      pendingPayment.items.map((item) => ({
        productId: item.product.id,
        delta: -item.quantity,
        reason: 'checkout',
        orderId: txRef,
      })),
    )

    const order = {
      ...createOrderFromPending(pendingPayment),
      paymentReference: txRef,
      paymentProvider: 'flutterwave',
      paymentTransactionId: String(transactionId),
    }

    store.orders.unshift(order)
    store.pendingPayments = store.pendingPayments.filter((entry) => entry.txRef !== txRef)
    await writeStore(store)

    try {
      await sendOrderEmails(order)
    } catch (mailError) {
      console.error('Failed to send order email', mailError)
    }

    return res.redirect(`${appBaseUrl}/?payment=success&orderId=${order.id}`)
  } catch (error) {
    next(error)
  }
})

app.post('/api/payments/flutterwave/webhook', async (req, res, next) => {
  try {
    const event = req.body?.event
    const data = req.body?.data

    if (event !== 'charge.completed' || !data?.id || !data?.tx_ref) {
      return res.status(200).json({ ok: true })
    }

    const store = await readStore()
    const pendingPayment = store.pendingPayments.find((entry) => entry.txRef === data.tx_ref)
    if (!pendingPayment) {
      return res.status(200).json({ ok: true })
    }

    const verification = await verifyFlutterwaveTransaction(data.id)
    const verified = verification?.data
    if (
      verified?.status !== 'successful' ||
      verified?.tx_ref !== pendingPayment.txRef ||
      verified?.currency !== pendingPayment.currency
    ) {
      return res.status(200).json({ ok: true })
    }

    const existing = store.orders.find((entry) => entry.paymentReference === pendingPayment.txRef)
    if (existing) {
      return res.status(200).json({ ok: true })
    }

    for (const item of pendingPayment.items) {
      const product = store.products.find((entry) => entry.id === item.product.id)
      if (!product || product.visible === false || product.archived === true || product.stock < item.quantity) {
        return res.status(200).json({ ok: true })
      }
      product.stock -= item.quantity
    }
    await recordInventoryLedger(
      pendingPayment.items.map((item) => ({
        productId: item.product.id,
        delta: -item.quantity,
        reason: 'checkout_webhook',
        orderId: pendingPayment.txRef,
      })),
    )

    const order = {
      ...createOrderFromPending(pendingPayment),
      paymentReference: pendingPayment.txRef,
      paymentProvider: 'flutterwave',
      paymentTransactionId: String(data.id),
    }

    store.orders.unshift(order)
    store.pendingPayments = store.pendingPayments.filter((entry) => entry.txRef !== pendingPayment.txRef)
    await writeStore(store)

    try {
      await sendOrderEmails(order)
    } catch (mailError) {
      console.error('Failed to send order email from webhook', mailError)
    }

    return res.status(200).json({ ok: true })
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
      store: publicStore(store, { includeHidden: true, includeArchived: true, includeOrders: true }),
    })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/orders/:id', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const { fulfillmentStatus, internalNote } = req.body || {}
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
    return res.json({ order, store: publicStore(store, { includeHidden: true, includeArchived: true, includeOrders: true }) })
  } catch (error) {
    next(error)
  }
})

app.get('/api/orders/export.csv', async (req, res, next) => {
  try {
    if (!requireAdminSession(req, res)) return
    const store = await readStore()
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
    return res.json({ product, store: publicStore(store, { includeHidden: true, includeArchived: true, includeOrders: true }) })
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
    return res.json({ product, store: publicStore(store, { includeHidden: true, includeArchived: true, includeOrders: true }) })
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
    return res.status(201).json({ product, store: publicStore(store, { includeHidden: true, includeArchived: true, includeOrders: true }) })
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
    return res.json(publicStore(seed, { includeHidden: true, includeArchived: true, includeOrders: true }))
  } catch (error) {
    next(error)
  }
})

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next()
  }

  const requestHost = getRequestHost(req)
  const requestPath = req.path || '/'

  if (requestPath.startsWith('/api')) {
    return next()
  }

  if (requestPath === '/admin.html') {
    if (canServeAdminHtml(requestHost)) {
      return sendAdminHtml(res)
    }
    return redirectToAdmin(res, '/')
  }

  if (requestPath === '/index.html') {
    if (isAdminHost(requestHost)) {
      return sendAdminHtml(res)
    }
    if (isApexHost(requestHost)) {
      return redirectToStorefront(res, '/')
    }
    return sendStorefrontHtml(res)
  }

  if (isApexHost(requestHost)) {
    return redirectToStorefront(res, req.originalUrl)
  }

  return next()
})

app.use(express.static(distPath, { index: false }))

app.get(/^(?!\/api).*/, async (req, res, next) => {
  try {
    const requestHost = getRequestHost(req)
    if (isApexHost(requestHost)) {
      return redirectToStorefront(res, req.originalUrl)
    }
    return res.sendFile(resolveAppHtml(req))
  } catch (error) {
    next(error)
  }
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

app.listen(port, async () => {
  await ensureStoreData()
  console.log(`Aster Supply server running on http://localhost:${port} using ${storeBackend} storage`)
})
