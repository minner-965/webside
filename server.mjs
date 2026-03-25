import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import express from 'express'
import { Resend } from 'resend'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express()
app.set('trust proxy', true)
const port = Number(process.env.PORT || 3001)
const dataPath = process.env.STORE_DATA_PATH || path.join(__dirname, 'data', 'store.json')
const seedPath = path.join(__dirname, 'store.seed.json')
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

function normalizeProduct(product) {
  return {
    ...product,
    visible: product.visible !== false,
    archived: product.archived === true,
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
  const contentByLocale = source.contentByLocale && typeof source.contentByLocale === 'object'
    ? source.contentByLocale
    : {}
  return {
    contentByLocale: {
      en: normalizeHomepageContent(contentByLocale.en, defaultHomepageContent.en),
      fr: normalizeHomepageContent(contentByLocale.fr, defaultHomepageContent.fr),
    },
    heroProductId: typeof source.heroProductId === 'string' ? source.heroProductId : '',
  }
}

function normalizeStore(store) {
  return {
    ...store,
    catalogVersion: typeof store.catalogVersion === 'string' ? store.catalogVersion : '',
    pendingPayments: Array.isArray(store.pendingPayments) ? store.pendingPayments : [],
    products: Array.isArray(store.products) ? store.products.map(normalizeProduct) : [],
    orders: Array.isArray(store.orders)
      ? store.orders.map((order) => ({
          ...order,
          internalNote: typeof order.internalNote === 'string' ? order.internalNote : '',
        }))
      : [],
    homepage: normalizeHomepage(store.homepage),
  }
}

async function ensureStoreFile() {
  const dir = path.dirname(dataPath)
  await mkdir(dir, { recursive: true })
  const seed = normalizeStore(JSON.parse(await readFile(seedPath, 'utf8')))
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

async function readStore() {
  await ensureStoreFile()
  const raw = await readFile(dataPath, 'utf8')
  return normalizeStore(JSON.parse(raw))
}

async function writeStore(store) {
  const normalized = normalizeStore(store)
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
  const image = String(
    source.image || 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=80',
  ).trim()
  const slug = slugifyValue(source.slug || name) || `product-${store.products.length + 1}`
  const price = Number(source.price)
  const rating = Number(source.rating)
  const compareAtPrice = Object.prototype.hasOwnProperty.call(source, 'compareAtPrice')
    ? parseOptionalNumber(source.compareAtPrice)
    : null
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
  if (source.rating !== undefined && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
    throw new Error('Product rating must be between 0 and 5.')
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
    rating: Number.isFinite(rating) ? rating : 0,
    featured: source.featured === undefined ? false : parseBoolean(source.featured),
    visible: source.visible === undefined ? true : parseBoolean(source.visible),
    beginnerFriendly: source.beginnerFriendly === undefined ? false : parseBoolean(source.beginnerFriendly),
    rechargeable: false,
    quiet: false,
    travelFriendly: source.travelFriendly === undefined ? false : parseBoolean(source.travelFriendly),
    waterResistant: false,
    bundleEligible: source.bundleEligible === undefined ? false : parseBoolean(source.bundleEligible),
    image,
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
  res.json({ ok: true })
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
      'rating',
      'featured',
      'beginnerFriendly',
      'rechargeable',
      'quiet',
      'travelFriendly',
      'waterResistant',
      'bundleEligible',
      'image',
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
        if (field === 'price' || field === 'stock' || field === 'rating') {
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
    await writeStore(seed)
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
  await ensureStoreFile()
  console.log(`Aster Supply server running on http://localhost:${port}`)
})
