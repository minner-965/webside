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
  }
}

const initialForm: CheckoutForm = {
  name: '',
  email: '',
  phone: '',
  country: markets[0],
  address: '',
}

const storageKeys = {
  locale: 'aster-locale',
  age: 'aster-age-confirmed',
  cart: 'aster-cart',
} as const

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

  const visibleProducts = useMemo(
    () =>
      selectedCategory === 'All'
        ? products
        : products.filter((product) => product.category === selectedCategory),
    [products, selectedCategory],
  )

  const cartItems = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((entry) => entry.id === item.productId)
          return product ? { product, quantity: item.quantity } : null
        })
        .filter((item): item is { product: Product; quantity: number } => Boolean(item)),
    [cart, products],
  )

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shipping = subtotal > 0 ? 9 : 0
  const total = subtotal + shipping
  const paidOrders = orders.filter((order) => order.paymentStatus === 'Paid').length
  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const inventoryUnits = products.reduce((sum, product) => sum + product.stock, 0)
  const lowStockItems = products.filter((product) => product.stock <= 12).length

  const syncStore = (payload: StorePayload) => {
    setProducts(payload.products)
    setOrders(payload.orders)
    setPaymentConfigured(payload.config.paymentConfigured)
    setEmailConfigured(payload.config.emailConfigured)
    setSupportEmail(payload.config.supportEmail)
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
      const payload = await request<{ store: StorePayload }>(`/api/orders/${orderIdToUpdate}`, {
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
      const payload = await request<{ store: StorePayload }>(`/api/products/${productId}/stock`, {
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
      const payload = await request<StorePayload>('/api/reset', { method: 'POST' })
      syncStore(payload)
      setCart([])
      setOrderId(null)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Reset failed')
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
                <span className="eyebrow">Premium lingerie | EN + FR</span>
                <h2>{t.heroTitle}</h2>
                <p>{t.heroBody}</p>
                <div className="hero-actions">
                  <button className="primary-btn" type="button" onClick={() => setActiveSection('shop')}>
                    {t.heroPrimary}
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => setActiveSection('compliance')}>
                    {t.heroSecondary}
                  </button>
                </div>
              </div>
              <div className="hero-sidecard">
                <h3>{t.shopIntro}</h3>
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

            <section className="product-grid">
              {products
                .filter((product) => product.featured)
                .map((product) => (
                  <article key={product.id} className="product-card">
                    <img src={product.image} alt={product.translations[locale].name} />
                    <div className="product-body">
                      <span className="category-chip">{product.category}</span>
                      <h3>{product.translations[locale].name}</h3>
                      <p>{product.translations[locale].short}</p>
                      <div className="price-row">
                        <strong>${product.price}</strong>
                        {product.compareAtPrice ? <span>${product.compareAtPrice}</span> : null}
                      </div>
                      <button className="primary-btn small" type="button" onClick={() => addToCart(product.id)}>
                        {t.addToCart}
                      </button>
                    </div>
                  </article>
                ))}
            </section>
          </>
        ) : null}

        {!loading && activeSection === 'shop' ? (
          <section className="shop-layout">
            <aside className="filter-card">
              <h3>{t.categories}</h3>
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
                <p>{t.shopIntro}</p>
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
          <section className="admin-layout">
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
                <h3>Recent orders</h3>
                {orders.length === 0 ? <p>No paid orders yet. Complete a payment to populate the dashboard.</p> : null}
                <div className="admin-list">
                  {orders.map((order) => (
                    <article key={order.id} className="admin-row">
                      <div className="admin-row-main">
                        <strong>{order.id}</strong>
                        <span>{`${order.customerName} / ${order.country} / $${order.total.toFixed(2)}`}</span>
                        <span>{`${new Date(order.createdAt).toLocaleString()} / ${order.language.toUpperCase()}`}</span>
                      </div>
                      <label className="status-select">
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
                  ))}
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

