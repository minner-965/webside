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
const port = Number(process.env.PORT || 3001)
const dataPath = process.env.STORE_DATA_PATH || path.join(__dirname, 'data', 'store.json')
const seedPath = path.join(__dirname, 'store.seed.json')
const distPath = path.join(__dirname, 'dist')
const flutterwaveSecretKey = process.env.FLW_SECRET_KEY || ''
const resendApiKey = process.env.RESEND_API_KEY || ''
const supportEmail = process.env.SUPPORT_EMAIL || 'support@asterwellness.example'
const orderFromEmail = process.env.ORDER_FROM_EMAIL || ''
const adminEmail = process.env.ADMIN_EMAIL || supportEmail
const appBaseUrl =
  process.env.APP_BASE_URL || (process.env.NODE_ENV === 'production' ? `http://localhost:${port}` : 'http://localhost:5173')
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`

const resend = resendApiKey ? new Resend(resendApiKey) : null

app.use(express.json())

function normalizeProduct(product) {
  return {
    ...product,
    visible: product.visible !== false,
  }
}

function normalizeStore(store) {
  return {
    ...store,
    pendingPayments: Array.isArray(store.pendingPayments) ? store.pendingPayments : [],
    products: Array.isArray(store.products) ? store.products.map(normalizeProduct) : [],
  }
}

async function ensureStoreFile() {
  const dir = path.dirname(dataPath)
  await mkdir(dir, { recursive: true })
  try {
    const raw = await readFile(dataPath, 'utf8')
    const parsed = normalizeStore(JSON.parse(raw))
    if (!Array.isArray(parsed.pendingPayments)) {
      parsed.pendingPayments = []
    }
    await writeFile(dataPath, JSON.stringify(parsed, null, 2), 'utf8')
  } catch {
    const seed = normalizeStore(JSON.parse(await readFile(seedPath, 'utf8')))
    await writeFile(dataPath, JSON.stringify(seed, null, 2), 'utf8')
  }
}

async function readStore() {
  await ensureStoreFile()
  const raw = await readFile(dataPath, 'utf8')
  return normalizeStore(JSON.parse(raw))
}

async function writeStore(store) {
  await writeFile(dataPath, JSON.stringify(store, null, 2), 'utf8')
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
  if (!['South Africa', 'Nigeria', 'Kenya'].includes(body.country)) {
    return 'Unsupported destination country.'
  }
  return null
}

function publicStore(store) {
  return {
    products: store.products.filter((product) => product.visible !== false),
    orders: store.orders,
    config: {
      paymentConfigured: Boolean(flutterwaveSecretKey),
      emailConfigured: Boolean(resendApiKey && orderFromEmail),
      supportEmail,
      appBaseUrl,
    },
  }
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
    <h2>Your Aster Wellness order is confirmed</h2>
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

app.get('/api/store', async (_req, res, next) => {
  try {
    const store = await readStore()
    res.json(publicStore(store))
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
            title: 'Aster Wellness',
            description: 'Secure checkout for Aster Wellness',
          },
          meta: {
            source: 'aster-wellness-storefront',
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
      if (!product || product.stock < item.quantity) {
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
      if (!product || product.stock < item.quantity) {
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

app.patch('/api/orders/:id', async (req, res, next) => {
  try {
    const { fulfillmentStatus } = req.body
    const allowed = ['Paid', 'Processing', 'Shipped', 'Refunded', 'Cancelled']
    if (!allowed.includes(fulfillmentStatus)) {
      return res.status(400).json({ error: 'Invalid fulfillment status.' })
    }

    const store = await readStore()
    const order = store.orders.find((entry) => entry.id === req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    order.fulfillmentStatus = fulfillmentStatus
    await writeStore(store)
    return res.json({ order, store: publicStore(store) })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/products/:id/stock', async (req, res, next) => {
  try {
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
    return res.json({ product, store: publicStore(store) })
  } catch (error) {
    next(error)
  }
})

app.patch('/api/products/:id', async (req, res, next) => {
  try {
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
        if (field === 'featured' || field === 'beginnerFriendly' || field === 'rechargeable' || field === 'quiet' || field === 'travelFriendly' || field === 'waterResistant' || field === 'bundleEligible' || field === 'visible') {
          product[field] = parseBoolean(value)
          continue
        }
        if (typeof value === 'string' || value === null) {
          product[field] = value ?? product[field]
        }
      }
    }

    await writeStore(store)
    return res.json({ product, store: publicStore(store) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/reset', async (_req, res, next) => {
  try {
    const seedRaw = await readFile(seedPath, 'utf8')
    const seed = JSON.parse(seedRaw)
    await writeStore(seed)
    return res.json(publicStore(seed))
  } catch (error) {
    next(error)
  }
})

app.use(express.static(distPath))

app.get(/^(?!\/api).*/, async (_req, res, next) => {
  try {
    return res.sendFile(path.join(distPath, 'index.html'))
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
  console.log(`Aster Wellness server running on http://localhost:${port}`)
})
