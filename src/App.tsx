import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  X,
} from 'lucide-react'
import './index.css'
import { categoryLabels, markets, uiText } from './storeData'
import type { Locale, NavSection, Product } from './storeData'
import { phoneCountryCodes } from './lib/phoneCodes'
import { PaymentSuccessModal } from './components/PaymentSuccessModal'

type CartItem = {
  productId: string
  quantity: number
}

type CheckoutForm = {
  name: string
  email: string
  phoneCountryCode: string
  phoneNumber: string
  phone: string
  country: string
  address: string
  provider: 'stripe' | 'alipay' | 'paypal' | 'crypto'
}

type OrderStatus = 'Paid' | 'Processing' | 'Shipped' | 'Refunded' | 'Cancelled'

type ProductSort = 'featured' | 'stock' | 'price'
type ProductScope = 'All' | 'Featured' | 'Low stock' | 'Archived' | 'Deleted'
type EditorPanelMode = 'closed' | 'existing' | 'new'
type ShopSort = 'featured' | 'priceLow' | 'priceHigh'
type ShopIntent = 'All' | 'Quick picks' | 'Gift-ready' | 'Travel-friendly' | 'Low stock'
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

type CatalogProduct = Product & {
  coverImage?: string
  images?: string[]
  deleted_at?: string
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
  coverImage: string
  images: string[]
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
  coverImage: string
  images: string[]
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
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  currency: string
  freeShippingApplied: boolean
  shippingMethod: string
  expectedDeliveryAt: string
  createdAt: string
  paymentReference?: string
  trackingCarrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
  }>
}

type StorePayload = {
  products: CatalogProduct[]
  orders: OrderRecord[]
  homepage: {
    contentByLocale: Record<Locale, HomepageContent>
    heroProductId: string
  }
  config: {
    paymentConfigured: boolean
    paymentMethods?: {
      stripeEnabled?: boolean
      paypalEnabled?: boolean
      alipayEnabled?: boolean
      applePayEnabled?: boolean
      cryptoEnabled?: boolean
    }
    emailConfigured: boolean
    supportEmail: string
    appBaseUrl: string
    adminAuthEnabled?: boolean
  }
}

type AdminSessionPayload = {
  authenticated: boolean
  username?: string
  adminAuthEnabled?: boolean
}

type AdminMetricsPayload = {
  metrics: {
    range: '7d' | '30d' | '90d' | 'custom'
    from?: string
    to?: string
    gmv: number
    paidOrders: number
    aov: number
    refundRate: number
    topSkus: Array<{
      productId: string
      productName: string
      quantity: number
      revenue: number
    }>
    lowStock: Array<{
      productId: string
      productName: string
      sku: string
      stock: number
      category: string
    }>
    trendData: Array<{
      name: string
      revenue: number
      orders: number
    }>
  }
}

type AppMode = 'storefront' | 'admin'

type PaymentReceipt = {
  orderId: string
  total?: number
  currency?: string
  trackingUrl?: string
  trackingCarrier?: string
  trackingNumber?: string
  shippedAt?: string
  expectedDeliveryAt?: string
}

type PublicTrackingOrder = {
  id: string
  customerName?: string
  customerEmail?: string
  fulfillmentStatus: OrderStatus
  shippingMethod?: string
  trackingCarrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  expectedDeliveryAt?: string
  createdAt?: string
}

type InventoryLedgerEntry = {
  id: string
  productId: string
  productName: string
  delta: number
  reason: string
  orderId?: string
  adminUsername?: string
  createdAt: string
  order?: {
    id: string
    customerName?: string
    customerEmail?: string
    fulfillmentStatus?: string
    paymentStatus?: string
    total?: number
    currency?: string
    createdAt?: string
  } | null
}

type AppProps = {
  appMode?: AppMode
}

type AdminUiLang = 'en' | 'zh'

type NavMenuItem = {
  label: string
  section: NavSection
  category?: string
  intent?: ShopIntent
  description?: string
  targetId?: string
}

const orderStatusValues: OrderStatus[] = ['Paid', 'Processing', 'Shipped', 'Refunded', 'Cancelled']

function normalizeImageList(images: Array<string | undefined | null>, coverImage?: string) {
  const merged = [coverImage, ...images].filter((image): image is string => Boolean(image && image.trim()))
  return Array.from(new Set(merged.map((image) => image.trim())))
}

function mergeImageList(existing: string[], additions: Array<string | undefined | null>) {
  return Array.from(
    new Set(
      [...existing, ...additions]
        .map((image) => image?.trim() ?? '')
        .filter((image) => Boolean(image)),
    ),
  )
}

function removeImageAt(images: string[], index: number) {
  return images.filter((_, imageIndex) => imageIndex !== index)
}

function setCoverImageAt(images: string[], index: number) {
  if (index < 0 || index >= images.length) return images
  return [images[index], ...images.filter((_, imageIndex) => imageIndex !== index)]
}

function prepareImagePayload(images: string[], coverImage: string) {
  const cover = coverImage.trim()
  const ordered = cover ? [cover, ...images.filter((image) => image !== cover)] : [...images]
  const deduped = Array.from(new Set(ordered.map((image) => image.trim()).filter(Boolean)))
  return {
    coverImage: deduped[0] || '',
    images: deduped,
  }
}

function normalizeCatalogProduct(product: Product | CatalogProduct): CatalogProduct {
  const catalogProduct = product as CatalogProduct
  const candidateImages = Array.isArray(catalogProduct.images) ? [...catalogProduct.images] : []
  const images = normalizeImageList(candidateImages, catalogProduct.coverImage || product.image)
  return {
    ...product,
    image: images[0] || product.image || '',
    images,
    coverImage: images[0] || catalogProduct.coverImage || product.image || '',
  }
}

function moveItem<T>(items: T[], index: number, offset: number) {
  const nextIndex = index + offset
  if (nextIndex < 0 || nextIndex >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  return next
}

const adminUiText: Record<
  AdminUiLang,
  {
    language: string
    english: string
    chinese: string
    sessionChecking: string
    loginEyebrow: string
    loginTitle: string
    loginHint: string
    username: string
    password: string
    signIn: string
    signingIn: string
    workspaceEyebrow: string
    workspaceTitle: string
    unlockedTitle: string
    sectionNavTitle: string
    sectionNavHint: string
    sectionOverview: string
    sectionPublishing: string
    sectionEditing: string
    sectionInventory: string
    sectionHomepage: string
    sectionOrders: string
    sectionMaintenance: string
    publishSelected: string
    unpublishSelected: string
    publish: string
    unpublish: string
    archiveSelected: string
    restoreSelected: string
    selectAll: string
    clearSelection: string
    allSelected: string
    selectedSuffix: string
    productCol: string
    metricsCol: string
    statusCol: string
    actionsCol: string
    select: string
    featured: string
    standard: string
    published: string
    unpublished: string
    archived: string
    active: string
    edit: string
    duplicate: string
    feature: string
    unfeature: string
    restore: string
    archive: string
    noProducts: string
    inStock: string
    save: string
    reset: string
    logout: string
    backToStorefront: string
    maintenanceEyebrow: string
    maintenanceTitle: string
    maintenanceHint: string
    orderStatusLabel: string
    allStatuses: string
    sort: string
    mostRecent: string
    oldestFirst: string
    highestTotal: string
    searchOrders: string
    refreshOrders: string
    exportCsv: string
    exportXlsx: string
    noOrders: string
    noPaymentRef: string
    items: string
    selectedOrder: string
    pickOrder: string
    customer: string
    delivery: string
    payment: string
    timeline: string
    orderTotal: string
    paymentReference: string
    paymentRefMissing: string
    internalNote: string
    saveNote: string
    saving: string
    clearNote: string
    noteSaved: string
    noNote: string
    tracking: string
    trackingCarrier: string
    trackingNumber: string
    trackingUrl: string
    saveTracking: string
    openTracking: string
    trackingSaved: string
    trackingSaveFailed: string
    selectOrderFirstTracking: string
    shippedAt: string
    inventoryTitle: string
    unitsAvailable: string
    scopeAllProducts: string
    scopeFeatured: string
    scopeLowStock: string
    scopeArchived: string
    scopeDeleted: string
    sortFeaturedFirst: string
    sortLowestStock: string
    sortLowestPrice: string
    scope: string
    searchProducts: string
    noCatalogMatch: string
    publishedProducts: string
    existingProductEditor: string
    newProductListing: string
    closeEditorPanel: string
    confirm: string
    delete: string
    recycleBin: string
    restoreFromBin: string
    deleteForever: string
    orderStatusMap: Record<OrderStatus, string>
  }
> = {
  en: {
    language: 'Language',
    english: 'English',
    chinese: 'Chinese',
    sessionChecking: 'Checking login status...',
    loginEyebrow: 'Admin login',
    loginTitle: 'Sign in to merchant dashboard',
    loginHint: 'Session expires when the browser is closed.',
    username: 'Username',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    workspaceEyebrow: 'Admin',
    workspaceTitle: 'Admin workspace',
    unlockedTitle: 'Unlocked',
    sectionNavTitle: 'Admin sections',
    sectionNavHint: 'Jump directly to each module.',
    sectionOverview: 'Overview',
    sectionPublishing: 'Product publishing',
    sectionEditing: 'Product editing',
    sectionInventory: 'Inventory',
    sectionHomepage: 'Homepage',
    sectionOrders: 'Orders',
    sectionMaintenance: 'Maintenance',
    publishSelected: 'Publish selected',
    unpublishSelected: 'Unpublish selected',
    publish: 'Publish',
    unpublish: 'Unpublish',
    archiveSelected: 'Archive selected',
    restoreSelected: 'Restore selected',
    selectAll: 'Select all',
    clearSelection: 'Clear selection',
    allSelected: 'All selected',
    selectedSuffix: 'selected',
    productCol: 'Product',
    metricsCol: 'Metrics',
    statusCol: 'Status',
    actionsCol: 'Actions',
    select: 'Select',
    featured: 'Featured',
    standard: 'Standard',
    published: 'Published',
    unpublished: 'Unpublished',
    archived: 'Archived',
    active: 'Active',
    edit: 'Edit',
    duplicate: 'Duplicate',
    feature: 'Feature',
    unfeature: 'Unfeature',
    restore: 'Restore',
    archive: 'Archive',
    noProducts: 'No products match the current filters.',
    inStock: 'in stock',
    save: 'Save',
    reset: 'Reset store',
    logout: 'Logout',
    backToStorefront: 'Back to storefront',
    maintenanceEyebrow: 'System maintenance',
    maintenanceTitle: 'Maintenance and access',
    maintenanceHint: 'Use reset with caution. All actions sync to storefront immediately.',
    orderStatusLabel: 'Status',
    allStatuses: 'All statuses',
    sort: 'Sort',
    mostRecent: 'Most recent',
    oldestFirst: 'Oldest first',
    highestTotal: 'Highest total',
    searchOrders: 'Search orders',
    refreshOrders: 'Refresh orders',
    exportCsv: 'Export CSV',
    exportXlsx: 'Export XLSX',
    noOrders: 'No orders match the current filters.',
    noPaymentRef: 'No payment ref',
    items: 'items',
    selectedOrder: 'Selected order',
    pickOrder: 'Pick an order',
    customer: 'Customer',
    delivery: 'Delivery',
    payment: 'Payment',
    timeline: 'Timeline',
    orderTotal: 'Order total',
    paymentReference: 'Payment reference',
    paymentRefMissing: 'Not provided',
    internalNote: 'Internal note',
    saveNote: 'Save note',
    saving: 'Saving...',
    clearNote: 'Clear note',
    noteSaved: 'Saved to order record',
    noNote: 'No internal note saved yet',
    tracking: 'Tracking',
    trackingCarrier: 'Carrier',
    trackingNumber: 'Tracking number',
    trackingUrl: 'Tracking URL',
    saveTracking: 'Save tracking',
    openTracking: 'Open tracking',
    trackingSaved: 'Shipment details saved',
    trackingSaveFailed: 'Shipment update failed',
    selectOrderFirstTracking: 'Pick an order before saving shipment details.',
    shippedAt: 'Shipped at',
    inventoryTitle: 'Inventory manager',
    unitsAvailable: 'units available',
    scopeAllProducts: 'All products',
    scopeFeatured: 'Featured only',
    scopeLowStock: 'Low stock',
    scopeArchived: 'Archived only',
    scopeDeleted: 'Recycle bin',
    sortFeaturedFirst: 'Featured first',
    sortLowestStock: 'Lowest stock first',
    sortLowestPrice: 'Lowest price first',
    scope: 'Scope',
    searchProducts: 'Search products',
    noCatalogMatch: 'No products match the current filters.',
    publishedProducts: 'Published products',
    existingProductEditor: 'Edit existing product',
    newProductListing: 'New product listing',
    closeEditorPanel: 'Close editor panel',
    confirm: 'Confirm',
    delete: 'Delete',
    recycleBin: 'Recycle bin',
    restoreFromBin: 'Restore',
    deleteForever: 'Delete forever',
    orderStatusMap: {
      Paid: 'Paid',
      Processing: 'Processing',
      Shipped: 'Shipped',
      Refunded: 'Refunded',
      Cancelled: 'Cancelled',
    },
  },
  zh: {
    language: '语言',
    english: 'English',
    chinese: '中文',
    sessionChecking: '正在检查登录状态...',
    loginEyebrow: '后台登录',
    loginTitle: '登录商家管理后台',
    loginHint: '浏览器关闭后会话会自动失效。',
    username: '用户名',
    password: '密码',
    signIn: '登录',
    signingIn: '登录中...',
    workspaceEyebrow: '商家工作台',
    workspaceTitle: '以商品为核心的后台',
    unlockedTitle: '后台已解锁',
    sectionNavTitle: '后台分区',
    sectionNavHint: '可直接跳到对应模块。',
    sectionOverview: '概览',
    sectionPublishing: '商品发布',
    sectionEditing: '商品编辑',
    sectionInventory: '库存管理',
    sectionHomepage: '首页文案',
    sectionOrders: '订单管理',
    sectionMaintenance: '系统维护',
    publishSelected: '批量上架',
    unpublishSelected: '批量下架',
    publish: '上架',
    unpublish: '下架',
    archiveSelected: '批量归档',
    restoreSelected: '批量恢复',
    selectAll: '全选',
    clearSelection: '清空选择',
    allSelected: '已全选',
    selectedSuffix: '已选',
    productCol: '商品',
    metricsCol: '指标',
    statusCol: '状态',
    actionsCol: '操作',
    select: '选择',
    featured: '推荐',
    standard: '常规',
    published: '已上架',
    unpublished: '已下架',
    archived: '已归档',
    active: '启用中',
    edit: '编辑',
    duplicate: '复制',
    feature: '设为推荐',
    unfeature: '取消推荐',
    restore: '恢复',
    archive: '归档',
    noProducts: '当前筛选下没有商品。',
    inStock: '库存',
    save: '保存',
    reset: '重置店铺',
    logout: '退出登录',
    backToStorefront: '返回前台',
    maintenanceEyebrow: '系统维护',
    maintenanceTitle: '维护与权限',
    maintenanceHint: '重置会覆盖线上数据，请谨慎操作。',
    orderStatusLabel: '状态',
    allStatuses: '全部状态',
    sort: '排序',
    mostRecent: '最新优先',
    oldestFirst: '最早优先',
    highestTotal: '金额最高',
    searchOrders: '搜索订单',
    refreshOrders: '刷新订单',
    exportCsv: '导出 CSV',
    exportXlsx: '导出 Excel',
    noOrders: '当前筛选下没有订单。',
    noPaymentRef: '无支付参考号',
    items: '件',
    selectedOrder: '当前订单',
    pickOrder: '请选择订单',
    customer: '客户',
    delivery: '配送',
    payment: '支付',
    timeline: '时间线',
    orderTotal: '订单总额',
    paymentReference: '支付参考号',
    paymentRefMissing: '未提供',
    internalNote: '内部备注',
    saveNote: '保存备注',
    saving: '保存中...',
    clearNote: '清空备注',
    noteSaved: '备注已保存',
    noNote: '暂无内部备注',
    tracking: '物流追踪',
    trackingCarrier: '承运商',
    trackingNumber: '追踪单号',
    trackingUrl: '追踪链接',
    saveTracking: '保存追踪',
    openTracking: '打开追踪',
    trackingSaved: '发货信息已保存',
    trackingSaveFailed: '发货信息更新失败',
    selectOrderFirstTracking: '请先选择订单再保存发货信息。',
    shippedAt: '发货时间',
    inventoryTitle: '库存管理',
    unitsAvailable: '可用库存',
    scopeAllProducts: '全部商品',
    scopeFeatured: '仅推荐',
    scopeLowStock: '低库存',
    scopeArchived: '仅归档',
    scopeDeleted: '回收站',
    sortFeaturedFirst: '推荐优先',
    sortLowestStock: '库存最低优先',
    sortLowestPrice: '价格最低优先',
    scope: '范围',
    searchProducts: '搜索商品',
    noCatalogMatch: '当前筛选下没有商品。',
    publishedProducts: '已上架商品',
    existingProductEditor: '现有商品编辑',
    newProductListing: '新商品上架',
    closeEditorPanel: '收起编辑栏',
    confirm: '确定',
    delete: '删除',
    recycleBin: '回收站',
    restoreFromBin: '恢复',
    deleteForever: '彻底删除',
    orderStatusMap: {
      Paid: '已支付',
      Processing: '处理中',
      Shipped: '已发货',
      Refunded: '已退款',
      Cancelled: '已取消',
    },
  },
}

const initialForm: CheckoutForm = {
  name: '',
  email: '',
  phoneCountryCode: '+1',
  phoneNumber: '',
  phone: '',
  country: markets[0],
  address: '',
  provider: 'stripe' as 'stripe' | 'alipay' | 'paypal' | 'crypto',
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
  coverImage: '',
  images: [],
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
  coverImage: '',
  images: [],
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
  cart: 'aster-cart',
  adminUiLang: 'aster-admin-ui-lang',
} as const

function firstEnabledPaymentProvider(methods: {
  stripeEnabled?: boolean
  paypalEnabled?: boolean
  alipayEnabled?: boolean
  cryptoEnabled?: boolean
}) {
  if (methods.paypalEnabled) return 'paypal' as const
  if (methods.stripeEnabled) return 'stripe' as const
  if (methods.alipayEnabled) return 'alipay' as const
  if (methods.cryptoEnabled) return 'crypto' as const
  return 'stripe' as const
}

const storefrontNavSections: NavSection[] = ['home', 'shop', 'contact']
const ALL_PRODUCTS_CATEGORY = 'All'

function isAllProductsCategory(value: string | null | undefined) {
  if (!value) return true
  const normalized = String(value).trim().toLowerCase()
  return normalized === 'all' || normalized === 'all products'
}

const storefrontMenus: Record<Exclude<NavSection, 'launch' | 'admin'>, NavMenuItem[]> = {
  home: [
    { label: 'Hero picks', section: 'home', description: 'Jump back to the top of the page.', targetId: 'home-hero' },
    { label: 'Featured products', section: 'home', description: 'See the current top picks.', targetId: 'home-featured' },
    { label: 'Shipping and returns', section: 'shipping', description: 'Review delivery and return details.' },
  ],
  shop: [{ label: 'All products', section: 'shop', category: ALL_PRODUCTS_CATEGORY, intent: 'All', targetId: 'shop-products' }],
  faq: [],
  shipping: [],
  returns: [],
  compliance: [],
  contact: [],
}

const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function buildApiUrl(path: string) {
  if (!API_BASE_URL) return path
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

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
    heroEyebrow: '',
    heroTitle: ui.heroTitle,
    heroBody: ui.heroBody,
    heroPrimary: ui.heroPrimary,
    heroSecondary: ui.heroSecondary,
    shopIntro: ui.shopIntro,
    focusTitle: 'Shop details',
    focusBody: 'Shipping, returns, and support are easy to find.',
    trustLine: 'Fast shipping, clear returns, and direct support.',
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      reject(new Error('Please choose an image smaller than 5 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

async function request<T>(input: RequestInfo, init?: RequestInit) {
  const resolvedInput = typeof input === 'string' ? buildApiUrl(input) : input
  const method = init?.method?.toUpperCase() || 'GET'
  const response = await fetch(resolvedInput, {
    credentials: 'include',
    cache: method === 'GET' ? 'no-store' : init?.cache,
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

function App({ appMode = 'storefront' }: AppProps) {
  const isAdminApp = appMode === 'admin'
  const locale: Locale = 'en'
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('.site-header')
      if (header) {
        if (window.scrollY > 50) {
          header.classList.add('scrolled')
        } else {
          header.classList.remove('scrolled')
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [activeSection, setActiveSection] = useState<NavSection>(isAdminApp ? 'admin' : 'home')
  const [activeMenu, setActiveMenu] = useState<NavSection | null>(null)
  const [selectedCategory, setSelectedCategory] = useState(ALL_PRODUCTS_CATEGORY)
  const [shopSort] = useState<ShopSort>('featured')
  const [cart, setCart] = useState<CartItem[]>(() => readLocal(storageKeys.cart, []))
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutReopenGuardUntil, setCheckoutReopenGuardUntil] = useState(0)
  const [cartFlash, setCartFlash] = useState(false)
  const [cartNotice, setCartNotice] = useState<string | null>(null)
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(initialForm)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [paymentConfigured, setPaymentConfigured] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState({
    stripeEnabled: false,
    paypalEnabled: false,
    alipayEnabled: false,
    applePayEnabled: false,
    cryptoEnabled: false,
  })
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [supportEmail, setSupportEmail] = useState('support@astersupply.example')
  const [paymentReceipt, setPaymentReceipt] = useState<PaymentReceipt | null>(null)
  const [trackingLookupOpen, setTrackingLookupOpen] = useState(false)
  const [trackingLookupForm, setTrackingLookupForm] = useState({ orderId: '', email: '' })
  const [trackingLookupResult, setTrackingLookupResult] = useState<PublicTrackingOrder | null>(null)
  const [trackingLookupPending, setTrackingLookupPending] = useState(false)
  const [trackingLookupError, setTrackingLookupError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncStore = useCallback((payload: StorePayload) => {
    setProducts(payload.products)
    setOrders(payload.orders)
    setPaymentConfigured(payload.config.paymentConfigured)
    const nextPaymentMethods = {
      stripeEnabled: Boolean(payload.config.paymentMethods?.stripeEnabled),
      paypalEnabled: Boolean(payload.config.paymentMethods?.paypalEnabled),
      alipayEnabled: Boolean(payload.config.paymentMethods?.alipayEnabled),
      applePayEnabled: Boolean(payload.config.paymentMethods?.applePayEnabled),
      cryptoEnabled: Boolean(payload.config.paymentMethods?.cryptoEnabled),
    }
    setPaymentMethods(nextPaymentMethods)
    setCheckoutForm((current) => {
      const enabledMap = {
        stripe: nextPaymentMethods.stripeEnabled,
        paypal: nextPaymentMethods.paypalEnabled,
        alipay: nextPaymentMethods.alipayEnabled,
        crypto: nextPaymentMethods.cryptoEnabled,
      }
      if (enabledMap[current.provider]) return current
      return { ...current, provider: firstEnabledPaymentProvider(nextPaymentMethods) }
    })
    setEmailConfigured(payload.config.emailConfigured)
    setSupportEmail(payload.config.supportEmail)
    setAdminAuthEnabled(Boolean(payload.config.adminAuthEnabled))
    setHomepageContentByLocale({
      en: payload.homepage?.contentByLocale?.en ?? buildHomepageContent('en', uiText.en),
      fr: payload.homepage?.contentByLocale?.fr ?? buildHomepageContent('fr', uiText.fr),
    })
    setHomepageHeroProductId(payload.homepage?.heroProductId || '')
  }, [])

  const [cryptoInstructions, setCryptoInstructions] = useState<{ address: string; total: string; orderId: string } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    const orderId = params.get('orderId')
    const paypalToken = params.get('token')
    const stripeSessionId = params.get('session_id')

    if (paymentStatus === 'success' && orderId) {
      if (paypalToken) {
        const capturePayPal = async () => {
          try {
            const payload = await request<{ store: StorePayload; order?: OrderRecord }>('/api/payments/paypal/capture', {
              method: 'POST',
              body: JSON.stringify({ orderId, paypalOrderId: paypalToken }),
            })
            syncStore(payload.store)
            const paidOrder =
              payload.order ??
              payload.store.orders.find((entry) => entry.id === orderId) ??
              payload.store.orders[0]
            setPaymentReceipt(
              paidOrder
                ? {
                    orderId: paidOrder.id,
                    total: paidOrder.total,
                    currency: paidOrder.currency,
                    trackingUrl: paidOrder.trackingUrl,
                    trackingCarrier: paidOrder.trackingCarrier,
                    trackingNumber: paidOrder.trackingNumber,
                    shippedAt: paidOrder.shippedAt,
                    expectedDeliveryAt: paidOrder.expectedDeliveryAt,
                  }
                : { orderId },
            )
            setActiveSection('home')
            setCheckoutOpen(false)
            setCart([])
            setCheckoutForm(initialForm)
            showToast((locale as string) === 'zh' ? '支付成功' : 'Payment successful!')
            window.history.replaceState({}, '', window.location.pathname)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'PayPal capture failed')
            showToast(err instanceof Error ? err.message : 'PayPal capture failed', 'error')
          }
        }
        void capturePayPal()
      } else {
        const confirmStripe = async () => {
          try {
            let nextReceipt: PaymentReceipt = { orderId }
            if (stripeSessionId) {
              const payload = await request<{ store: StorePayload; order?: { id: string } }>('/api/payments/stripe/confirm', {
                method: 'POST',
                body: JSON.stringify({ sessionId: stripeSessionId, orderId }),
              })
              syncStore(payload.store)
              const paidOrderId = payload.order?.id || orderId
              const paidOrder = payload.store.orders.find((entry) => entry.id === paidOrderId)
              nextReceipt = paidOrder
                ? {
                    orderId: paidOrder.id,
                    total: paidOrder.total,
                    currency: paidOrder.currency,
                    trackingUrl: paidOrder.trackingUrl,
                    trackingCarrier: paidOrder.trackingCarrier,
                    trackingNumber: paidOrder.trackingNumber,
                    shippedAt: paidOrder.shippedAt,
                    expectedDeliveryAt: paidOrder.expectedDeliveryAt,
                  }
                : { orderId: paidOrderId }
            }
            setPaymentReceipt(nextReceipt)
            setActiveSection('home')
            setCheckoutOpen(false)
            setCart([])
            setCheckoutForm(initialForm)
            writeLocal(storageKeys.cart, [])
            showToast((locale as string) === 'zh' ? '支付成功' : 'Payment successful!')
            window.history.replaceState({}, '', window.location.pathname)
          } catch (confirmError) {
            setError(confirmError instanceof Error ? confirmError.message : 'Payment confirmation failed')
            showToast(confirmError instanceof Error ? confirmError.message : 'Payment confirmation failed', 'error')
          }
        }
        void confirmStripe()
      }
    } else if (paymentStatus === 'crypto' && orderId) {
      const address = params.get('address') || ''
      const total = params.get('total') || ''
      setCryptoInstructions({ address, total, orderId })
      setCart([])
      setCheckoutOpen(false)
      writeLocal(storageKeys.cart, [])
      window.history.replaceState({}, '', window.location.pathname)
    } else if (paymentStatus === 'cancelled') {
      showToast((locale as string) === 'zh' ? '支付已取消' : 'Payment cancelled', 'error')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (paymentStatus === 'failed') {
      setError('Payment was not completed. You can try again from checkout.')
      showToast('Payment failed', 'error')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [locale, syncStore])
  const [adminAuthEnabled, setAdminAuthEnabled] = useState(false)
  const [adminAuthenticated, setAdminAuthenticated] = useState(!isAdminApp)
  const [adminSessionLoading, setAdminSessionLoading] = useState(isAdminApp)
  const [adminLoginUsername, setAdminLoginUsername] = useState('')
  const [adminLoginPassword, setAdminLoginPassword] = useState('')
  const [adminLoginPending, setAdminLoginPending] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [adminScope, setAdminScope] = useState<ProductScope>('All')
  const [editorPanelMode, setEditorPanelMode] = useState<EditorPanelMode>('closed')
  const [adminSort, setAdminSort] = useState<ProductSort>('featured')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All')
  const [orderSort, setOrderSort] = useState<'recent' | 'oldest' | 'total'>('recent')
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [orderNoteDraft, setOrderNoteDraft] = useState('')
  const [orderNoteSaving, setOrderNoteSaving] = useState(false)
  const [orderTrackingDraft, setOrderTrackingDraft] = useState({
    carrier: '',
    number: '',
    url: '',
  })
  const [orderTrackingSaving, setOrderTrackingSaving] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedProductDetailId, setSelectedProductDetailId] = useState<string>('')
  const [detailQuantity, setDetailQuantity] = useState(1)
  const [editor, setEditor] = useState<ProductEditor>(emptyEditor)
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft)
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftImageInput, setDraftImageInput] = useState('')
  const [editorImageInput, setEditorImageInput] = useState('')
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})
  const [homepageContentByLocale, setHomepageContentByLocale] = useState<Record<Locale, HomepageContent>>({
    en: buildHomepageContent('en', uiText.en),
    fr: buildHomepageContent('fr', uiText.fr),
  })
  const [homepageHeroProductId, setHomepageHeroProductId] = useState<string>('')
  const [homepageSaving, setHomepageSaving] = useState(false)
  const [lastAddedProductId, setLastAddedProductId] = useState<string>('')
  const [catalogMutationPending, setCatalogMutationPending] = useState(false)
  const [rowMutationPendingId, setRowMutationPendingId] = useState('')
  const [productSavePending, setProductSavePending] = useState(false)
  const [productCreatePending, setProductCreatePending] = useState(false)
  const [stockMutationPendingId, setStockMutationPendingId] = useState<string>('')
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, OrderStatus>>({})
  const [orderStatusSavingId, setOrderStatusSavingId] = useState('')
  const [adminUiLang, setAdminUiLang] = useState<AdminUiLang>(() =>
    readLocal<AdminUiLang>(storageKeys.adminUiLang, 'en'),
  )
  const [metricsRange, setMetricsRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [metricsFrom, setMetricsFrom] = useState('')
  const [metricsTo, setMetricsTo] = useState('')
  const [adminMetrics, setAdminMetrics] = useState<AdminMetricsPayload['metrics'] | null>(null)
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false)
  const [inventoryLedger, setInventoryLedger] = useState<InventoryLedgerEntry[]>([])
  const [isFetchingLedger, setIsFetchingLedger] = useState(false)
  const [toast, setToast] = useState<{ id: number; kind: 'success' | 'error'; message: string } | null>(null)

  const adminGateRequired = isAdminApp && adminAuthEnabled && !adminAuthenticated

  const showToast = (message: string, kind: 'success' | 'error' = 'success') => {
    setToast({
      id: Date.now(),
      kind,
      message,
    })
  }

  const adminRequest = useCallback(async <T,>(input: RequestInfo, init?: RequestInit) => {
    try {
      return await request<T>(input, init)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : ''
      if (/admin login required/i.test(message)) {
        setAdminAuthenticated(false)
      }
      throw requestError
    }
  }, [])

  const refreshAdminMetrics = useCallback(
    async (
      range: '7d' | '30d' | '90d' = metricsRange,
      customFrom = metricsFrom,
      customTo = metricsTo,
    ) => {
      try {
        setAdminMetricsLoading(true)
        const params = new URLSearchParams()
        if (customFrom && customTo) {
          params.set('from', customFrom)
          params.set('to', customTo)
        } else {
          params.set('range', range)
        }
        const payload = await adminRequest<AdminMetricsPayload>(`/api/admin/metrics?${params.toString()}`)
        setAdminMetrics(payload.metrics)
      } catch (metricsError) {
        setError(metricsError instanceof Error ? metricsError.message : 'Metrics refresh failed')
      } finally {
        setAdminMetricsLoading(false)
      }
    },
    [adminRequest, metricsFrom, metricsRange, metricsTo],
  )

  const applyCustomMetricsRange = async () => {
    if (!metricsFrom || !metricsTo) {
      setError('Pick both start and end dates.')
      return
    }
    if (metricsFrom > metricsTo) {
      setError('Start date must be before end date.')
      return
    }
    setError(null)
    await refreshAdminMetrics(metricsRange, metricsFrom, metricsTo)
  }

  const refreshInventoryLedger = useCallback(async () => {
    try {
      setIsFetchingLedger(true)
      const data = await adminRequest<InventoryLedgerEntry[]>('/api/admin/inventory/ledger')
      setInventoryLedger(data)
    } catch (ledgerError) {
      setError(ledgerError instanceof Error ? ledgerError.message : 'Ledger refresh failed')
    } finally {
      setIsFetchingLedger(false)
    }
  }, [adminRequest])

  useEffect(() => {
    writeLocal(storageKeys.cart, cart)
  }, [cart])

  useEffect(() => {
    writeLocal(storageKeys.adminUiLang, adminUiLang)
  }, [adminUiLang])

  useEffect(() => {
    if (!cartFlash) return
    const timeout = window.setTimeout(() => setCartFlash(false), 900)
    return () => window.clearTimeout(timeout)
  }, [cartFlash])

  useEffect(() => {
    if (!cartNotice) return
    const timeout = window.setTimeout(() => setCartNotice(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [cartNotice])

  useEffect(() => {
    if (!toast || toast.kind !== 'success') return
    const timeout = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (isAdminApp || !activeMenu || typeof document === 'undefined') return
    const closeMenu = () => setActiveMenu(null)
    document.addEventListener('click', closeMenu)
    return () => document.removeEventListener('click', closeMenu)
  }, [activeMenu, isAdminApp])

  useEffect(() => {
    setStockDrafts((current) => {
      const next = { ...current }
      for (const product of products) {
        if (next[product.id] === undefined) {
          next[product.id] = String(product.stock)
        }
      }
      return next
    })
  }, [products])

  useEffect(() => {
    if (!lastAddedProductId) return
    const timeout = window.setTimeout(() => setLastAddedProductId(''), 900)
    return () => window.clearTimeout(timeout)
  }, [lastAddedProductId])

  useEffect(() => {
    setDetailQuantity(1)
  }, [selectedProductDetailId])

  const blurActiveElement = useCallback(() => {
    if (typeof document === 'undefined') return
    const active = document.activeElement
    if (active instanceof HTMLElement) {
      active.blur()
    }
  }, [])

  const closeCheckoutDrawer = useCallback(() => {
    blurActiveElement()
    setCheckoutReopenGuardUntil(Date.now() + 700)
    setCheckoutOpen(false)
  }, [blurActiveElement])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const overlayOpen = checkoutOpen || Boolean(selectedProductDetailId) || trackingLookupOpen
    const root = document.documentElement
    const { body } = document

    if (overlayOpen) {
      root.classList.add('overlay-open')
      body.classList.add('overlay-open')
    } else {
      root.classList.remove('overlay-open')
      body.classList.remove('overlay-open')
    }

    return () => {
      root.classList.remove('overlay-open')
      body.classList.remove('overlay-open')
    }
  }, [checkoutOpen, selectedProductDetailId, trackingLookupOpen])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (!checkoutOpen) {
      root.style.removeProperty('--checkout-vh')
      return
    }

    const updateViewportVars = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      root.style.setProperty('--checkout-vh', `${Math.max(320, Math.floor(viewportHeight))}px`)
    }

    updateViewportVars()
    window.visualViewport?.addEventListener('resize', updateViewportVars)
    window.visualViewport?.addEventListener('scroll', updateViewportVars)
    window.addEventListener('resize', updateViewportVars)
    window.addEventListener('orientationchange', updateViewportVars)

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportVars)
      window.visualViewport?.removeEventListener('scroll', updateViewportVars)
      window.removeEventListener('resize', updateViewportVars)
      window.removeEventListener('orientationchange', updateViewportVars)
      root.style.removeProperty('--checkout-vh')
    }
  }, [checkoutOpen])

  useEffect(() => {
    const sync = async () => {
      try {
        setLoading(true)
        const payload = await request<StorePayload>('/api/store')
        syncStore(payload)
        setError(null)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load store')
      } finally {
        setLoading(false)
      }
    }

    void sync()
  }, [syncStore])

  useEffect(() => {
    if (!isAdminApp) return
    const syncSession = async () => {
      try {
        setAdminSessionLoading(true)
        const payload = await request<AdminSessionPayload>('/api/admin/session')
        setAdminAuthenticated(Boolean(payload.authenticated))
        if (typeof payload.adminAuthEnabled === 'boolean') {
          setAdminAuthEnabled(payload.adminAuthEnabled)
        }
      } catch {
        setAdminAuthenticated(false)
      } finally {
        setAdminSessionLoading(false)
      }
    }

    void syncSession()
  }, [isAdminApp])

  useEffect(() => {
    if (activeSection !== 'admin' || !isAdminApp || !adminAuthenticated) return

    const syncAdmin = async () => {
      try {
        const payload = await request<StorePayload>('/api/store?includeHidden=1&includeArchived=1&includeDeleted=1')
        syncStore(payload)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load admin catalog')
      }
    }

    void syncAdmin()
  }, [activeSection, adminAuthenticated, isAdminApp, syncStore])

  useEffect(() => {
    if (activeSection !== 'admin' || !isAdminApp || !adminAuthenticated) return
    void refreshAdminMetrics(metricsRange, metricsFrom, metricsTo)
    void refreshInventoryLedger()
  }, [
    activeSection,
    adminAuthenticated,
    isAdminApp,
    metricsRange,
    metricsFrom,
    metricsTo,
    refreshAdminMetrics,
    refreshInventoryLedger,
  ])

  useEffect(() => {
    if (isAdminApp || typeof document === 'undefined' || typeof window === 'undefined') return

    const syncStorefront = async () => {
      try {
        const payload = await request<StorePayload>('/api/store')
        syncStore(payload)
      } catch {
        // Keep existing storefront state if background refresh fails.
      }
    }

    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') {
        void syncStorefront()
      }
    }
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncStorefront()
      }
    }, 15000)

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [isAdminApp, syncStore])

  const t = uiText[locale]
  const adminText = adminUiText[adminUiLang]
  const formatOrderStatus = (status: OrderStatus) => adminText.orderStatusMap[status] ?? status
  const formatMonthDay = (value: string, mode: 'admin' | 'storefront' = 'admin') => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const useZh = mode === 'admin' ? adminUiLang === 'zh' : (locale as string) === 'zh'
    return useZh
      ? `${date.getMonth() + 1}月${date.getDate()}日`
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const adminSectionAnchors = [
    { id: 'admin-overview', label: adminText.sectionOverview },
    { id: 'admin-publishing', label: adminText.sectionPublishing },
    { id: 'admin-editing', label: adminText.sectionEditing },
    { id: 'admin-inventory', label: adminText.sectionInventory },
    { id: 'admin-homepage', label: adminText.sectionHomepage },
    { id: 'admin-orders', label: adminText.sectionOrders },
    { id: 'admin-maintenance', label: adminText.sectionMaintenance },
  ] as const
  const adminScopeOptions: Array<{ value: ProductScope; label: string }> = [
    { value: 'All', label: adminText.scopeAllProducts },
    { value: 'Featured', label: adminText.scopeFeatured },
    { value: 'Low stock', label: adminText.scopeLowStock },
    { value: 'Archived', label: adminText.scopeArchived },
    { value: 'Deleted', label: adminText.scopeDeleted },
  ]
  const adminSortOptions: Array<{ value: ProductSort; label: string }> = [
    { value: 'featured', label: adminText.sortFeaturedFirst },
    { value: 'stock', label: adminText.sortLowestStock },
    { value: 'price', label: adminText.sortLowestPrice },
  ]
  const orderSortOptions: Array<{ value: 'recent' | 'oldest' | 'total'; label: string }> = [
    { value: 'recent', label: adminText.mostRecent },
    { value: 'oldest', label: adminText.oldestFirst },
    { value: 'total', label: adminText.highestTotal },
  ]
  const showLegacyAdminPanels = false
  const homepageContent = {
    ...buildHomepageContent(locale, t),
    ...(homepageContentByLocale[locale] ?? {}),
  }
  const catalogProducts = products.map(normalizeCatalogProduct)
  const storefrontProducts = catalogProducts.filter(
    (product) => product.visible !== false && product.archived !== true && !product.deleted_at,
  )

  const visibleProducts = useMemo(() => {
    const byCategory =
      isAllProductsCategory(selectedCategory)
        ? storefrontProducts
        : storefrontProducts.filter((product) => product.category === selectedCategory)

    return [...byCategory].sort((left, right) => {
      if (shopSort === 'priceLow') return left.price - right.price
      if (shopSort === 'priceHigh') return right.price - left.price
      return Number(right.featured) - Number(left.featured) || left.price - right.price
    })
  }, [selectedCategory, shopSort, storefrontProducts])

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
  const freeShippingEnabled = false
  const freeShippingRequested = false
  const shipping = subtotal > 0 && !freeShippingRequested ? 9 : 0
  const tax = 0
  const discount = 0
  const total = subtotal + shipping + tax - discount
  const selectedPaymentMethodEnabled =
    (checkoutForm.provider === 'paypal' && paymentMethods.paypalEnabled) ||
    (checkoutForm.provider === 'stripe' && paymentMethods.stripeEnabled) ||
    (checkoutForm.provider === 'alipay' && paymentMethods.alipayEnabled) ||
    (checkoutForm.provider === 'crypto' && paymentMethods.cryptoEnabled)
  const paidOrdersFallback = orders.filter((order) => order.paymentStatus === 'Paid').length
  const refundedOrdersFallback = orders.filter((order) => order.fulfillmentStatus === 'Refunded').length
  const revenueFallback = orders.reduce((sum, order) => sum + order.total, 0)
  const refundRateFallback = paidOrdersFallback > 0 ? (refundedOrdersFallback / paidOrdersFallback) * 100 : 0
  const inventoryUnits = catalogProducts.reduce((sum, product) => sum + product.stock, 0)
  const lowStockItems = catalogProducts.filter((product) => product.stock <= 12).length
  const paidOrders = adminMetrics?.paidOrders ?? paidOrdersFallback
  const revenue = adminMetrics?.gmv ?? revenueFallback
  const averageOrderValue = adminMetrics?.aov ?? (paidOrders > 0 ? revenue / paidOrders : 0)
  const refundRate = adminMetrics ? adminMetrics.refundRate * 100 : refundRateFallback
  const featuredProducts = storefrontProducts.filter((product) => product.featured).slice(0, 3)
  const homepageHeroProduct =
    storefrontProducts.find((product) => product.id === homepageHeroProductId) ??
    featuredProducts[0] ??
    storefrontProducts[0] ??
    null
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
  const showDeprecatedSections = false
  const dynamicShopCategories = useMemo(() => {
    const liveCategories = new Set(storefrontProducts.map((product) => product.category))
    const fromCatalogOrder = categoryLabels.filter((category) => liveCategories.has(category))
    const uncatalogued = Array.from(liveCategories).filter((category) => !categoryLabels.includes(category)).sort()
    return [...fromCatalogOrder, ...uncatalogued]
  }, [storefrontProducts])
  const shopMenuItems = useMemo<NavMenuItem[]>(
    () => [
      {
        label: 'All products',
        section: 'shop',
        category: ALL_PRODUCTS_CATEGORY,
        intent: 'All',
        targetId: 'shop-products',
      },
      ...dynamicShopCategories.map((category) => ({
        label: category,
        section: 'shop' as const,
        category,
      })),
    ],
    [dynamicShopCategories],
  )
  const activeNavMenuItems =
    !isAdminApp && activeMenu && activeMenu in storefrontMenus
      ? activeMenu === 'shop'
        ? shopMenuItems
        : storefrontMenus[activeMenu as keyof typeof storefrontMenus] ?? []
      : []
  useEffect(() => {
    if (isAllProductsCategory(selectedCategory)) return
    if (dynamicShopCategories.includes(selectedCategory)) return
    setSelectedCategory(ALL_PRODUCTS_CATEGORY)
  }, [dynamicShopCategories, selectedCategory])
  const categoryHighlights = collectionCards
    .filter((collection) => collection.hero)
    .slice(0, 3)
    .map((collection, index) => ({
      ...collection,
      label: index === 0 ? 'Top pick' : index === 1 ? 'Best seller' : 'Gift pick',
    }))
  const bundleHighlights: Array<{ label: string; category: string; title: string; body: string }> = []
  const hiddenProductCount = catalogProducts.filter((product) => product.visible === false && !product.archived).length
  const archivedProductCount = catalogProducts.filter((product) => product.archived).length
  const openOrderCount = orders.filter((order) => order.fulfillmentStatus === 'Paid' || order.fulfillmentStatus === 'Processing').length
  const reassuranceCards = [
    {
      title: 'Fast shipping',
      body: 'Delivery details stay clear before checkout so shoppers know what to expect.',
    },
    {
      title: 'Direct support',
      body: `Questions go straight to ${supportEmail} for quick help before or after an order.`,
    },
    {
      title: 'Easy returns',
      body: 'Returns stay simple and visible, with the full policy one tap away.',
    },
  ]
  const adminSummaryCards = useMemo(() => {
    return [
      { label: 'Total Revenue', value: revenue ? `$${revenue.toFixed(2)}` : '$0.00', icon: <DollarSign size={16} />, note: 'All-time captured' },
      { label: 'Orders', value: String(paidOrders), icon: <ShoppingCart size={16} />, note: openOrderCount ? `${openOrderCount} still open` : 'All settled' },
      { label: 'Average Ticket', value: averageOrderValue ? `$${averageOrderValue.toFixed(2)}` : '$0.00', icon: <Activity size={16} />, note: 'AOV across paid orders' },
      { label: 'Refund Rate', value: `${refundRate.toFixed(1)}%`, icon: <RefreshCw size={16} />, note: 'Based on live ledger' },
      { label: 'Inventory', value: String(inventoryUnits), icon: <Package size={16} />, note: 'Total units in stock' },
      { label: 'Low Stock', value: String(lowStockItems), icon: <Activity size={16} />, note: 'Items needing restock' },
    ]
  }, [revenue, paidOrders, openOrderCount, averageOrderValue, refundRate, inventoryUnits, lowStockItems])

  const trendData = useMemo(() => {
    if (adminMetrics?.trendData && adminMetrics.trendData.length > 0) {
      return adminMetrics.trendData
    }
    // Fallback to empty or mock if loading
    return []
  }, [adminMetrics])
  const topSkuCards = adminMetrics?.topSkus ?? []
  const productAttentionCount = hiddenProductCount + archivedProductCount + lowStockItems
  const orderAttentionCount = orders.filter(
    (order) => order.fulfillmentStatus === 'Paid' || order.fulfillmentStatus === 'Processing',
  ).length
  const selectedProductDetail =
    catalogProducts.find((product) => product.id === selectedProductDetailId) ?? null
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const scrollToAdminSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const openShopView = (category = ALL_PRODUCTS_CATEGORY, options?: { keepMenu?: boolean; scrollToGrid?: boolean }) => {
    const normalizedCategory = isAllProductsCategory(category)
      ? ALL_PRODUCTS_CATEGORY
      : dynamicShopCategories.includes(category)
        ? category
        : ALL_PRODUCTS_CATEGORY
    setSelectedCategory(normalizedCategory)
    setActiveSection('shop')
    if (options?.keepMenu) {
      setActiveMenu('shop')
    } else {
      setActiveMenu(null)
    }
    if (options?.scrollToGrid) {
      requestAnimationFrame(() => {
        document.getElementById('shop-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }
  const openCheckoutDrawer = useCallback(
    (options?: { force?: boolean }) => {
      if (!options?.force && Date.now() < checkoutReopenGuardUntil) {
        return
      }
      setCheckoutOpen(true)
    },
    [checkoutReopenGuardUntil],
  )
  const navigateFromSubmenu = (item: NavMenuItem) => {
    if (item.section === 'shop') {
      openShopView(item.category || ALL_PRODUCTS_CATEGORY, { scrollToGrid: true })
      return
    }

    setActiveSection(item.section)
    setActiveMenu(null)
    if (item.targetId) {
      const scrollToTarget = () => {
        const target = document.getElementById(item.targetId!)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }
      requestAnimationFrame(() => {
        scrollToTarget()
        window.setTimeout(scrollToTarget, 70)
      })
    }
  }
  const toggleMenu = (section: NavSection) => {
    const nextItems = storefrontMenus[section as Exclude<NavSection, 'launch' | 'admin'>] ?? []
    if (!nextItems.length) {
      setActiveMenu(null)
      setActiveSection(section)
      if (section === 'shop') {
        setSelectedCategory(ALL_PRODUCTS_CATEGORY)
      }
      return
    }
    setActiveMenu((current) => (current === section ? null : section))
    setActiveSection(section)
  }
  const clampPurchaseQuantity = (quantity: number, maxStock: number) => {
    const safeMax = Math.max(1, maxStock)
    const safeQuantity = Number.isFinite(quantity) ? quantity : 1
    return Math.min(safeMax, Math.max(1, Math.floor(safeQuantity)))
  }
  const clampCartQuantity = (quantity: number, maxStock: number) => {
    const safeMax = Math.max(1, maxStock)
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0
    return Math.min(safeMax, Math.max(0, Math.floor(safeQuantity)))
  }
  const addButtonLabel = (productId: string) => (lastAddedProductId === productId ? 'Added' : t.addToCart)
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
      setOrderTrackingDraft({ carrier: '', number: '', url: '' })
      return
    }
    setOrderNoteDraft(selectedOrder.internalNote || '')
  }, [selectedOrder])

  useEffect(() => {
    if (!selectedOrder) return
    setOrderTrackingDraft({
      carrier: selectedOrder.trackingCarrier || '',
      number: selectedOrder.trackingNumber || '',
      url: selectedOrder.trackingUrl || '',
    })
  }, [selectedOrder])

  useEffect(() => {
    setOrderStatusDrafts((current) => {
      const next: Record<string, OrderStatus> = { ...current }
      const allowedIds = new Set(orders.map((order) => order.id))
      for (const order of orders) {
        if (!next[order.id]) {
          next[order.id] = order.fulfillmentStatus
        }
      }
      for (const id of Object.keys(next)) {
        if (!allowedIds.has(id)) {
          delete next[id]
        }
      }
      return next
    })
  }, [orders])
  const [bulkActionPending, setBulkActionPending] = useState(false)

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const runBulkAction = async (
    action: 'visible' | 'archived' | 'featured' | 'category',
    value: string | boolean | number,
  ) => {
    if (!selectedProductIds.length) return
    setBulkActionPending(true)
    try {
      const result = await adminRequest<{ updatedCount: number; store: StorePayload }>(
        '/api/admin/products/bulk',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: selectedProductIds, action, value }),
        },
      )
      syncStore(result.store)
      setSelectedProductIds([])
      setToast({ id: Date.now(), message: `Updated ${result.updatedCount} products.`, kind: 'success' })
    } catch (error) {
      setToast({
        id: Date.now(),
        message: error instanceof Error ? error.message : 'Bulk action failed.',
        kind: 'error',
      })
    } finally {
      setBulkActionPending(false)
    }
  }

  const refundOrder = async (orderId: string, restock = true) => {
    if (!window.confirm('Are you sure you want to refund this order?')) return
    try {
      const result = await adminRequest<{ order: OrderRecord; store: StorePayload }>(
        `/api/admin/orders/${orderId}/refund`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restock }),
        },
      )
      syncStore(result.store)
      setToast({ id: Date.now(), message: `Order ${orderId} refunded.`, kind: 'success' })
    } catch (error) {
      setToast({
        id: Date.now(),
        message: error instanceof Error ? error.message : 'Refund failed.',
        kind: 'error',
      })
    }
  }

  const downloadExportFile = async (path: string, fallbackName: string) => {
    const response = await fetch(buildApiUrl(path), { credentials: 'include' })
    if (!response.ok) {
      const message = await response.text().catch(() => '')
      throw new Error(message || 'Export failed')
    }
    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i)
    const fileName = fileNameMatch?.[1] || fallbackName
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  const exportInventoryLedger = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setError(null)
      await downloadExportFile(
        `/api/admin/inventory/ledger/export.${format}`,
        `inventory-ledger-${new Date().toISOString().slice(0, 10)}.${format}`,
      )
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed')
      showToast(exportError instanceof Error ? exportError.message : 'Export failed', 'error')
    }
  }

  const adminProducts = catalogProducts
    .filter((product) => {
      const haystack = `${product.id} ${product.sku} ${product.category} ${product.translations[locale].name} ${product.translations[locale].short}`.toLowerCase()
      const matchesSearch = haystack.includes(adminSearch.trim().toLowerCase())
      const isDeleted = Boolean(product.deleted_at)
      const matchesScope =
        (adminScope === 'All' && !isDeleted) ||
        (adminScope === 'Featured' && product.featured && !isDeleted) ||
        (adminScope === 'Low stock' && product.stock <= 12 && !isDeleted) ||
        (adminScope === 'Archived' && product.archived === true && !isDeleted) ||
        (adminScope === 'Deleted' && isDeleted)
      return matchesSearch && matchesScope
    })
    .sort((left, right) => {
      if (adminSort === 'stock') return left.stock - right.stock
      if (adminSort === 'price') return left.price - right.price
      return Number(right.featured) - Number(left.featured) || left.price - right.price
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
  }, [adminProducts, selectedProductIds, setSelectedProductIds])

  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loginAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setAdminLoginPending(true)
      setError(null)
      const payload = await request<AdminSessionPayload>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: adminLoginUsername.trim(),
          password: adminLoginPassword,
        }),
      })
      setAdminAuthenticated(Boolean(payload.authenticated))
      setAdminLoginPassword('')
      const store = await adminRequest<StorePayload>('/api/store?includeHidden=1&includeArchived=1&includeDeleted=1')
      syncStore(store)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed')
      setAdminAuthenticated(false)
    } finally {
      setAdminLoginPending(false)
    }
  }

  const logoutAdmin = async () => {
    try {
      await request('/api/admin/logout', { method: 'POST' })
    } catch {
      // Best effort logout.
    } finally {
      setAdminAuthenticated(false)
      setAdminLoginUsername('')
      setAdminLoginPassword('')
      setSelectedProductIds([])
      setSelectedOrderId('')
      setError(null)
      if (!isAdminApp) {
        setActiveSection('home')
      }
    }
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

  const saveHomepageContent = async () => {
    try {
      setHomepageSaving(true)
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>('/api/admin/homepage', {
        method: 'PATCH',
        body: JSON.stringify({
          contentByLocale: homepageContentByLocale,
          heroProductId: homepageHeroProductId,
        }),
      })
      syncStore(payload.store)
    showToast(adminUiLang === 'zh' ? '\u9996\u9875\u6587\u6848\u5df2\u4fdd\u5b58' : 'Homepage saved')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Homepage save failed')
      showToast(saveError instanceof Error ? saveError.message : 'Homepage save failed', 'error')
    } finally {
      setHomepageSaving(false)
    }
  }

  const setHeroProduct = async (productId: string) => {
    try {
      setHomepageSaving(true)
      setError(null)
      setHomepageHeroProductId(productId)
      const payload = await adminRequest<{ store: StorePayload }>('/api/admin/homepage', {
        method: 'PATCH',
        body: JSON.stringify({
          contentByLocale: homepageContentByLocale,
          heroProductId: productId,
        }),
      })
      syncStore(payload.store)
      showToast(adminUiLang === 'zh' ? '首页主图已更新' : 'Homepage hero updated')
    } catch (heroError) {
      setError(heroError instanceof Error ? heroError.message : 'Hero update failed')
      showToast(heroError instanceof Error ? heroError.message : 'Hero update failed', 'error')
    } finally {
      setHomepageSaving(false)
    }
  }

  const updateDraftImages = (updater: (images: string[], coverImage: string) => { images: string[]; coverImage: string }) => {
    setDraft((current) => {
      const next = updater(current.images, current.coverImage)
      const images = next.images.filter((image) => image.trim())
      const coverImage = next.coverImage.trim() || images[0] || ''
      return {
        ...current,
        images,
        coverImage,
      }
    })
  }

  const updateEditorImages = (updater: (images: string[], coverImage: string) => { images: string[]; coverImage: string }) => {
    setEditor((current) => {
      const next = updater(current.images, current.coverImage)
      const images = next.images.filter((image) => image.trim())
      const coverImage = next.coverImage.trim() || images[0] || ''
      return {
        ...current,
        images,
        coverImage,
      }
    })
  }

  const setDraftImagesFromFiles = async (files?: FileList | null) => {
    if (!files?.length) return
    try {
      const nextImages = await Promise.all(Array.from(files).map((file) => readFileAsDataUrl(file)))
      updateDraftImages((images, coverImage) => {
        const merged = mergeImageList(images, nextImages)
        return prepareImagePayload(merged, coverImage)
      })
      setDraftImageInput('')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed')
      showToast(uploadError instanceof Error ? uploadError.message : 'Image upload failed', 'error')
    }
  }

  const setEditorImagesFromFiles = async (files?: FileList | null) => {
    if (!files?.length) return
    try {
      const nextImages = await Promise.all(Array.from(files).map((file) => readFileAsDataUrl(file)))
      updateEditorImages((images, coverImage) => {
        const merged = mergeImageList(images, nextImages)
        return prepareImagePayload(merged, coverImage)
      })
      setEditorImageInput('')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed')
      showToast(uploadError instanceof Error ? uploadError.message : 'Image upload failed', 'error')
    }
  }

  const addDraftImageUrl = () => {
    const nextUrl = draftImageInput.trim()
    if (!nextUrl) return
    updateDraftImages((images, coverImage) => {
      const merged = mergeImageList(images, [nextUrl])
      return prepareImagePayload(merged, coverImage)
    })
    setDraftImageInput('')
  }

  const addEditorImageUrl = () => {
    const nextUrl = editorImageInput.trim()
    if (!nextUrl) return
    updateEditorImages((images, coverImage) => {
      const merged = mergeImageList(images, [nextUrl])
      return prepareImagePayload(merged, coverImage)
    })
    setEditorImageInput('')
  }

  const removeDraftImage = (index: number) => {
    updateDraftImages((images, coverImage) => {
      const nextImages = removeImageAt(images, index)
      const nextCover = coverImage && nextImages.includes(coverImage) ? coverImage : nextImages[0] || ''
      return prepareImagePayload(nextImages, nextCover)
    })
  }

  const removeEditorImage = (index: number) => {
    updateEditorImages((images, coverImage) => {
      const nextImages = removeImageAt(images, index)
      const nextCover = coverImage && nextImages.includes(coverImage) ? coverImage : nextImages[0] || ''
      return prepareImagePayload(nextImages, nextCover)
    })
  }

  const moveDraftImage = (index: number, offset: number) => {
    updateDraftImages((images, coverImage) => {
      const nextImages = moveItem(images, index, offset)
      const nextCover = coverImage && nextImages.includes(coverImage) ? coverImage : nextImages[0] || ''
      return prepareImagePayload(nextImages, nextCover)
    })
  }

  const moveEditorImage = (index: number, offset: number) => {
    updateEditorImages((images, coverImage) => {
      const nextImages = moveItem(images, index, offset)
      const nextCover = coverImage && nextImages.includes(coverImage) ? coverImage : nextImages[0] || ''
      return prepareImagePayload(nextImages, nextCover)
    })
  }

  const setDraftCoverImage = (index: number) => {
    updateDraftImages((images, coverImage) => {
      const nextImages = setCoverImageAt(images, index)
      return prepareImagePayload(nextImages, nextImages[0] || coverImage)
    })
  }

  const setEditorCoverImage = (index: number) => {
    updateEditorImages((images, coverImage) => {
      const nextImages = setCoverImageAt(images, index)
      return prepareImagePayload(nextImages, nextImages[0] || coverImage)
    })
  }

  const closeEditorPanel = () => {
    setDraftOpen(false)
    setEditorPanelMode('closed')
    setDraft(emptyProductDraft)
    setEditor(emptyEditor)
    setDraftImageInput('')
    setEditorImageInput('')
    setError(null)
  }

  const openExistingEditorPanel = () => {
    setDraftOpen(false)
    setEditorPanelMode('existing')
    setError(null)
  }

  const startNewProduct = () => {
    setDraft(emptyProductDraft)
    setEditor(emptyEditor)
    setDraftImageInput('')
    setEditorImageInput('')
    setDraftOpen(true)
    setEditorPanelMode('new')
    setError(null)
  }

  const seedDraftFromProduct = (product: Product) => {
    const normalized = normalizeCatalogProduct(product)
    setDraftImageInput('')
    setEditor(emptyEditor)
    setDraft({
      name: normalized.translations.en.name,
      nameEn: normalized.translations.en.name,
      nameFr: normalized.translations.fr.name,
      slug: normalized.slug,
      sku: normalized.sku,
      category: normalized.category,
      price: String(normalized.price),
      compareAtPrice: normalized.compareAtPrice ? String(normalized.compareAtPrice) : '',
      coverImage: normalized.coverImage || normalized.image || '',
      images: normalized.images || (normalized.image ? [normalized.image] : []),
      short: normalized.translations.en.short,
      description: normalized.translations.en.description,
      shortEn: normalized.translations.en.short,
      shortFr: normalized.translations.fr.short,
      descriptionEn: normalized.translations.en.description,
      descriptionFr: normalized.translations.fr.description,
      specs: joinSpecs(normalized.specs),
      featured: normalized.featured,
      visible: normalized.visible,
      archived: normalized.archived === true,
    })
    setDraftOpen(true)
    setEditorPanelMode('new')
    setError(null)
  }

  const duplicateProductToDraft = (product: Product | undefined) => {
    if (!product) return
    seedDraftFromProduct(product)
  }

  const openEditor = (product: Product) => {
    const normalized = normalizeCatalogProduct(product)
    setEditorImageInput('')
    setDraftOpen(false)
    setEditorPanelMode('existing')
    setEditor({
      id: normalized.id,
      slug: normalized.slug,
      nameEn: normalized.translations.en.name,
      nameFr: normalized.translations.fr.name,
      sku: normalized.sku,
      category: normalized.category,
      price: String(normalized.price),
      compareAtPrice: normalized.compareAtPrice ? String(normalized.compareAtPrice) : '',
      coverImage: normalized.coverImage || normalized.image || '',
      images: normalized.images || (normalized.image ? [normalized.image] : []),
      shortEn: normalized.translations.en.short,
      shortFr: normalized.translations.fr.short,
      descriptionEn: normalized.translations.en.description,
      descriptionFr: normalized.translations.fr.description,
      specs: joinSpecs(normalized.specs),
      featured: normalized.featured,
      visible: normalized.visible,
      archived: normalized.archived === true,
    })
  }

  const syncLatestAdminStore = async () => {
    const latestStore = await adminRequest<StorePayload>('/api/store?includeHidden=1&includeArchived=1&includeDeleted=1')
    syncStore(latestStore)
    return latestStore
  }

  const toggleCatalogFlag = async (productId: string, body: Record<string, unknown>) => {
    try {
      setRowMutationPendingId(productId)
      setError(null)
      await adminRequest<{ store: StorePayload }>(`/api/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      await syncLatestAdminStore()
      void refreshAdminMetrics()
      if ('visible' in body) {
        showToast(
          adminUiLang === 'zh'
            ? body.visible
              ? '\u4e0a\u67b6\u6210\u529f'
              : '\u4e0b\u67b6\u6210\u529f'
            : body.visible
              ? 'Publish successful'
              : 'Unpublish successful',
        )
      } else if ('featured' in body) {
        showToast(adminUiLang === 'zh' ? '\u63a8\u8350\u72b6\u6001\u5df2\u66f4\u65b0' : 'Featured status updated')
      } else if ('archived' in body) {
        showToast(adminUiLang === 'zh' ? '\u5f52\u6863\u72b6\u6001\u5df2\u66f4\u65b0' : 'Archive status updated')
      } else {
        showToast(adminUiLang === 'zh' ? '\u5546\u54c1\u5df2\u66f4\u65b0' : 'Product updated')
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Catalog update failed')
      showToast(updateError instanceof Error ? updateError.message : 'Catalog update failed', 'error')
    } finally {
      setRowMutationPendingId('')
    }
  }

  const updateSelectedProducts = async (body: Record<string, unknown>, fallbackMessage: string) => {
    const productIds = selectedProductIds
    if (!productIds.length) {
      setError('Select one or more products first.')
      return
    }

    try {
      setCatalogMutationPending(true)
      setError(null)
      for (const productId of productIds) {
        await adminRequest<{ store: StorePayload }>(`/api/products/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      await syncLatestAdminStore()
      setSelectedProductIds([])
      void refreshAdminMetrics()
      showToast(adminUiLang === 'zh' ? '\u6279\u91cf\u64cd\u4f5c\u5df2\u5b8c\u6210' : 'Batch action completed')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : fallbackMessage)
      showToast(updateError instanceof Error ? updateError.message : fallbackMessage, 'error')
    } finally {
      setCatalogMutationPending(false)
    }
  }

  const toggleAllAdminProducts = (checked: boolean) => {
    setSelectedProductIds(checked ? adminProducts.map((product) => product.id) : [])
  }

  const softDeleteProduct = async (productId: string) => {
    try {
      setRowMutationPendingId(productId)
      setError(null)
      await adminRequest(`/api/admin/products/${productId}/delete`, { method: 'POST' })
      await syncLatestAdminStore()
      setSelectedProductIds((current) => current.filter((id) => id !== productId))
      showToast(adminUiLang === 'zh' ? '商品已移入回收站' : 'Moved to recycle bin')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed')
      showToast(deleteError instanceof Error ? deleteError.message : 'Delete failed', 'error')
    } finally {
      setRowMutationPendingId('')
    }
  }

  const restoreDeletedProduct = async (productId: string) => {
    try {
      setRowMutationPendingId(productId)
      setError(null)
      await adminRequest(`/api/admin/products/${productId}/restore`, { method: 'POST' })
      await syncLatestAdminStore()
      setSelectedProductIds((current) => current.filter((id) => id !== productId))
      showToast(adminUiLang === 'zh' ? '商品已恢复' : 'Product restored')
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Restore failed')
      showToast(restoreError instanceof Error ? restoreError.message : 'Restore failed', 'error')
    } finally {
      setRowMutationPendingId('')
    }
  }

  const permanentlyDeleteProduct = async (productId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        adminUiLang === 'zh' ? '彻底删除后无法恢复，确认继续？' : 'Delete permanently? This action cannot be undone.',
      )
      if (!confirmed) return
    }
    try {
      setRowMutationPendingId(productId)
      setError(null)
      await adminRequest(`/api/admin/products/${productId}`, { method: 'DELETE' })
      await syncLatestAdminStore()
      setSelectedProductIds((current) => current.filter((id) => id !== productId))
      showToast(adminUiLang === 'zh' ? '商品已彻底删除' : 'Product deleted permanently')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed')
      showToast(deleteError instanceof Error ? deleteError.message : 'Delete failed', 'error')
    } finally {
      setRowMutationPendingId('')
    }
  }

  const saveProduct = async () => {
    if (!editor.id) return

    try {
      setProductSavePending(true)
      setError(null)
      const images = mergeImageList(editor.images, editor.coverImage ? [editor.coverImage] : [])
      const imagePayload = prepareImagePayload(images, editor.coverImage)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/products/${editor.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sku: editor.sku,
          slug: editor.slug.trim() || slugifyProductName(editor.nameEn),
          category: editor.category,
          price: Number(editor.price),
          compareAtPrice: editor.compareAtPrice === '' ? null : Number(editor.compareAtPrice),
          image: imagePayload.coverImage,
          coverImage: imagePayload.coverImage,
          images: imagePayload.images,
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
      void refreshAdminMetrics()
      setEditor(emptyEditor)
      showToast(adminUiLang === 'zh' ? '\u5546\u54c1\u5df2\u4fdd\u5b58' : 'Product saved')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Product update failed')
      showToast(saveError instanceof Error ? saveError.message : 'Product update failed', 'error')
    } finally {
      setProductSavePending(false)
    }
  }

  const createProduct = async () => {
    try {
      setProductCreatePending(true)
      setError(null)
      const images = mergeImageList(draft.images, draft.coverImage ? [draft.coverImage] : [])
      const imagePayload = prepareImagePayload(images, draft.coverImage)
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
          image: imagePayload.coverImage,
          coverImage: imagePayload.coverImage,
          images: imagePayload.images,
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
      void refreshAdminMetrics()
      setDraft(emptyProductDraft)
      setDraftOpen(false)
      setEditorPanelMode('closed')
      showToast(adminUiLang === 'zh' ? '\u5546\u54c1\u5df2\u521b\u5efa' : 'Product created')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Product creation failed')
      showToast(createError instanceof Error ? createError.message : 'Product creation failed', 'error')
    } finally {
      setProductCreatePending(false)
    }
  }

  const addToCart = (productId: string, quantity = 1) => {
    const product = catalogProducts.find((entry) => entry.id === productId)
    const amount = clampPurchaseQuantity(quantity, product?.stock ?? 99)
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId)
      if (existing) {
        const nextQuantity = clampPurchaseQuantity(existing.quantity + amount, product?.stock ?? 99)
        return current.map((item) =>
          item.productId === productId ? { ...item, quantity: nextQuantity } : item,
        )
      }
      return [...current, { productId, quantity: amount }]
    })
    setCartFlash(true)
    setLastAddedProductId(productId)
    setCartNotice(product ? `${product.translations[locale].name} added to cart` : 'Added to cart')
    if (!isAdminApp) {
      openCheckoutDrawer({ force: true })
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    const currentQuantity = cart.find((item) => item.productId === productId)?.quantity ?? 0
    const product = catalogProducts.find((entry) => entry.id === productId)
    setCartQuantity(productId, currentQuantity + delta, product?.stock ?? 99)
  }

  const setCartQuantity = (productId: string, quantity: number, maxStock: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: clampCartQuantity(quantity, maxStock) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const beginCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!cartItems.length) return

    try {
      blurActiveElement()
      setError(null)
      const normalizedPhoneNumber = checkoutForm.phoneNumber.trim()
      const normalizedDialCode = checkoutForm.phoneCountryCode.trim() || '+1'
      const normalizedPhone = normalizedPhoneNumber
        ? [normalizedDialCode, normalizedPhoneNumber].filter(Boolean).join(' ')
        : ''
      const payload = await request<{ paymentLink: string; txRef: string }>('/api/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          ...checkoutForm,
          phone: normalizedPhone,
          contactEmail: checkoutForm.email.trim(),
          phoneCountryCode: normalizedDialCode,
          phoneNumber: normalizedPhoneNumber,
          locale,
          subtotal,
          shipping,
          tax,
          discount,
          total,
          currency: 'USD',
          freeShippingRequested,
          shippingMethod: freeShippingRequested ? 'free_shipping' : 'standard',
          items: cartItems.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
          })),
          provider: checkoutForm.provider,
        }),
      })
      window.location.assign(payload.paymentLink)
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout failed')
    }
  }

  const updateOrderStatus = async (orderIdToUpdate: string) => {
    const fulfillmentStatus =
      orderStatusDrafts[orderIdToUpdate] ??
      orders.find((entry) => entry.id === orderIdToUpdate)?.fulfillmentStatus
    if (!fulfillmentStatus) return
    try {
      setOrderStatusSavingId(orderIdToUpdate)
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/orders/${orderIdToUpdate}`, {
        method: 'PATCH',
        body: JSON.stringify({ fulfillmentStatus, confirm: true }),
      })
      syncStore(payload.store)
      void refreshAdminMetrics()
      showToast(adminUiLang === 'zh' ? '\u8ba2\u5355\u72b6\u6001\u5df2\u66f4\u65b0' : 'Order status updated')
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Status update failed')
      showToast(statusError instanceof Error ? statusError.message : 'Status update failed', 'error')
    } finally {
      setOrderStatusSavingId('')
    }
  }

  const adjustStockDraft = (productId: string, delta: number) => {
    const product = products.find((entry) => entry.id === productId)
    if (!product) return
    const baseValue = Number(stockDrafts[productId] ?? product.stock)
    const normalizedBase = Number.isFinite(baseValue) ? Math.floor(baseValue) : product.stock
    const nextValue = Math.max(0, normalizedBase + delta)
    setStockDrafts((current) => ({ ...current, [productId]: String(nextValue) }))
  }

  const submitStockDraft = async (productId: string, delta: number) => {
    try {
      setStockMutationPendingId(productId)
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ delta }),
      })
      syncStore(payload.store)
      await refreshInventoryLedger()
      void refreshAdminMetrics()
      showToast(adminUiLang === 'zh' ? '\u5e93\u5b58\u5df2\u66f4\u65b0' : 'Stock updated')
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : 'Stock update failed')
      showToast(stockError instanceof Error ? stockError.message : 'Stock update failed', 'error')
    } finally {
      setStockMutationPendingId('')
    }
  }

  const commitStockDraft = async (productId: string) => {
    const product = products.find((entry) => entry.id === productId)
    if (!product) return

    const rawValue = stockDrafts[productId] ?? String(product.stock)
    const parsedValue = Number(rawValue)
    if (!Number.isFinite(parsedValue)) {
      setStockDrafts((current) => ({ ...current, [productId]: String(product.stock) }))
      return
    }

    const nextStock = Math.max(0, Math.floor(parsedValue))
    if (nextStock === product.stock) {
      setStockDrafts((current) => ({ ...current, [productId]: String(nextStock) }))
      return
    }

    await submitStockDraft(productId, nextStock - product.stock)
    setStockDrafts((current) => ({ ...current, [productId]: String(nextStock) }))
  }

  const resetStore = async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Reset store now? This will replace live products/homepage with seed data and clear orders.',
      )
      if (!confirmed) return
    }
    try {
      setError(null)
      const payload = await adminRequest<StorePayload>('/api/reset', { method: 'POST' })
      syncStore(payload)
      void refreshAdminMetrics()
      setCart([])
      setPaymentReceipt(null)
      showToast(adminUiLang === 'zh' ? '\u5e97\u94fa\u5df2\u91cd\u7f6e' : 'Store reset')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Reset failed')
      showToast(resetError instanceof Error ? resetError.message : 'Reset failed', 'error')
    }
  }

  const refreshAdminStore = async () => {
    try {
      setError(null)
      const payload = await adminRequest<StorePayload>('/api/store?includeHidden=1&includeArchived=1&includeDeleted=1')
      syncStore(payload)
      await refreshInventoryLedger()
      await refreshAdminMetrics(metricsRange, metricsFrom, metricsTo)
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
      showToast(adminUiLang === 'zh' ? '\u8ba2\u5355\u5907\u6ce8\u5df2\u4fdd\u5b58' : 'Order note saved')
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Order note update failed')
      showToast(noteError instanceof Error ? noteError.message : 'Order note update failed', 'error')
    } finally {
      setOrderNoteSaving(false)
    }
  }

  const saveOrderTracking = async () => {
    if (!selectedOrder) {
      setError(adminText.selectOrderFirstTracking)
      return
    }

    try {
      setOrderTrackingSaving(true)
      setError(null)
      const payload = await adminRequest<{ store: StorePayload }>(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          trackingCarrier: orderTrackingDraft.carrier.trim(),
          trackingNumber: orderTrackingDraft.number.trim(),
          trackingUrl: orderTrackingDraft.url.trim(),
        }),
      })
      syncStore(payload.store)
      showToast(adminText.trackingSaved)
    } catch (trackingError) {
      const message = trackingError instanceof Error ? trackingError.message : adminText.trackingSaveFailed
      setError(message)
      showToast(message, 'error')
    } finally {
      setOrderTrackingSaving(false)
    }
  }

  const lookupOrderTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const orderId = trackingLookupForm.orderId.trim()
    const email = trackingLookupForm.email.trim()
    if (!orderId || !email) {
      setTrackingLookupError((locale as string) === 'zh' ? '请填写订单号和邮箱。' : 'Enter both order ID and email.')
      return
    }

    try {
      setTrackingLookupPending(true)
      setTrackingLookupError(null)
      const payload = await request<{ order: PublicTrackingOrder }>('/api/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderId, email }),
      })
      setTrackingLookupResult(payload.order)
      showToast((locale as string) === 'zh' ? '已加载物流信息' : 'Tracking details loaded')
    } catch (lookupError) {
      setTrackingLookupResult(null)
      const message =
        lookupError instanceof Error
          ? lookupError.message
          : (locale as string) === 'zh'
            ? '未找到订单，请确认订单号和邮箱。'
            : 'Order not found. Check order ID and email.'
      setTrackingLookupError(message)
      showToast(message, 'error')
    } finally {
      setTrackingLookupPending(false)
    }
  }

  const openTrackingLookup = () => {
    setTrackingLookupError(null)
    setTrackingLookupOpen(true)
  }

  const exportOrders = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setError(null)
      await downloadExportFile(
        `/api/orders/export.${format}`,
        `orders-export-${new Date().toISOString().slice(0, 10)}.${format}`,
      )
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed')
      showToast(exportError instanceof Error ? exportError.message : 'Export failed', 'error')
    }
  }

  const exportMetrics = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (metricsFrom && metricsTo) {
        params.set('from', metricsFrom)
        params.set('to', metricsTo)
      } else {
        params.set('range', metricsRange)
      }
      const suffix = params.toString() ? `?${params.toString()}` : ''
      await downloadExportFile(
        `/api/admin/metrics/export.${format}${suffix}`,
        `admin-metrics-${new Date().toISOString().slice(0, 10)}.${format}`,
      )
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed')
      showToast(exportError instanceof Error ? exportError.message : 'Export failed', 'error')
    }
  }

  const renderOverlay = (node: ReactNode) => {
    if (typeof document === 'undefined') return node
    return createPortal(node, document.body)
  }

  return (
    <div
      className={isAdminApp ? 'page-shell admin-mode' : 'page-shell'}
      onClick={() => (!isAdminApp && activeMenu ? setActiveMenu(null) : undefined)}
    >
      {!isAdminApp ? (
        <div className="announcement-bar">
          <span>New arrivals each week.</span>
        </div>
      ) : null}
      <header className={scrolled ? 'site-header scrolled' : 'site-header'}>
        <div className="brand-block">
          <h1 className="brand-mark">{isAdminApp ? 'Admin' : 'ASTER'}</h1>
        </div>
        <div className="header-actions">
          {isAdminApp ? (
            <>
              <div className="admin-lang-toggle" aria-label="Admin interface language">
                <button
                  className={adminUiLang === 'en' ? 'primary-btn small' : 'ghost-btn small'}
                  type="button"
                  onClick={() => setAdminUiLang('en')}
                  aria-pressed={adminUiLang === 'en'}
                >
                  EN
                </button>
                <button
                  className={adminUiLang === 'zh' ? 'primary-btn small' : 'ghost-btn small'}
                  type="button"
                  onClick={() => setAdminUiLang('zh')}
                  aria-pressed={adminUiLang === 'zh'}
                >
                  CN
                </button>
              </div>
            </>
          ) : null}
          {!isAdminApp ? (
            <button
              className={trackingLookupOpen ? 'cart-pill header-track-btn highlighted' : 'cart-pill header-track-btn'}
              type="button"
              onClick={openTrackingLookup}
            >
              {(locale as string) === 'zh' ? '物流' : 'Track'}
            </button>
          ) : null}
          {!isAdminApp ? (
            <button
              className={cartFlash ? 'cart-pill highlighted' : 'cart-pill'}
              type="button"
              onClick={() => openCheckoutDrawer()}
            >
              {t.cart} ({cartCount})
            </button>
          ) : null}
          {isAdminApp && !adminGateRequired ? (
            <button
              className="ghost-btn small"
              type="button"
              onClick={() => {
                void logoutAdmin()
              }}
            >
              Logout
            </button>
          ) : null}
        </div>
      </header>

      {!isAdminApp ? (
        <div className="site-nav-stack" onClick={(event) => event.stopPropagation()}>
          <nav className="site-nav">
            {storefrontNavSections.map((section) => (
              <button
                key={section}
                type="button"
                className={activeSection === section || activeMenu === section ? 'nav-link active' : 'nav-link'}
                onClick={() => toggleMenu(section)}
              >
                {t.nav[section]}
              </button>
            ))}
          </nav>
          {activeMenu ? (
            <div className="submenu-shell">
              <div className="submenu-panel" aria-label={`${t.nav[activeMenu]} submenu`}>
                {activeNavMenuItems.length ? (
                  activeNavMenuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={
                        `secondary-btn small ${
                          item.section === 'shop'
                            ? activeSection === 'shop' &&
                              (isAllProductsCategory(item.category || ALL_PRODUCTS_CATEGORY)
                                ? isAllProductsCategory(selectedCategory)
                                : selectedCategory === (item.category || ALL_PRODUCTS_CATEGORY))
                              ? 'active'
                              : ''
                            : activeSection === item.section
                              ? 'active'
                              : ''
                        }`
                      }
                      onClick={() => navigateFromSubmenu(item)}
                    >
                      {item.label}
                    </button>
                  ))
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <main className="content-shell">
        {error ? (
          <section className="error-banner">
            <strong>Action needed</strong>
            <p>{error}</p>
          </section>
        ) : null}

        {!isAdminApp && cartNotice ? (
          <section className="cart-feedback-banner" aria-live="polite">
            <strong>{cartNotice}</strong>
            <button type="button" onClick={() => openCheckoutDrawer()}>
              View cart
            </button>
          </section>
        ) : null}

        {loading ? (
          <section className="page-panel">
            <h2>Loading products</h2>
            <p>Just a moment while the latest items load.</p>
          </section>
        ) : null}

        {!isAdminApp && !loading && activeSection === 'home' ? (
          <>
            <section id="home-hero" className="hero-panel storefront-hero">
              <div className="hero-stage">
                {homepageHeroProduct ? (
                  <img
                    className="hero-stage-image"
                    src={homepageHeroProduct.image}
                    alt={homepageHeroProduct.translations[locale].name}
                  />
                ) : null}
                <div className="hero-stage-overlay">
                  <span className="eyebrow">{homepageContent.heroEyebrow}</span>
                  <h2>{homepageContent.heroTitle}</h2>
                  <p>{homepageContent.heroBody}</p>
                  <div className="hero-actions">
                    <button className="primary-btn" type="button" onClick={() => openShopView(ALL_PRODUCTS_CATEGORY)}>
                      {homepageContent.heroPrimary}
                    </button>
                    {homepageContent.heroSecondary ? (
                      <button className="secondary-btn" type="button" onClick={() => openCheckoutDrawer()}>
                        {homepageContent.heroSecondary}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section id="home-featured" className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Featured products</span>
                  <h2>Popular picks</h2>
                </div>
                <p>Clean essentials, useful gadgets, and ready-to-ship gifts.</p>
              </div>
              <div className="product-grid">
                {featuredProducts.map((product) => (
                    <article key={product.id} className="product-card">
                      <div className="product-card-info">
                        <h3>{product.translations[locale].name}</h3>
                        <p>{product.translations[locale].short}</p>
                      </div>
                      <img src={product.image} alt={product.translations[locale].name} />
                      <div className="product-card-actions">
                        <button className="secondary-btn small" type="button" onClick={() => setSelectedProductDetailId(product.id)}>
                          View details
                        </button>
                        <button className="primary-btn small" type="button" onClick={() => addToCart(product.id)}>
                          {addButtonLabel(product.id)}
                        </button>
                      </div>
                    </article>
                ))}
              </div>
            </section>

            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Trust</span>
                  <h2>Clear policies, easy support</h2>
                </div>
                <p>Shipping, returns, and support stay easy to find before you order.</p>
              </div>
              <div className="trust-grid">
                {reassuranceCards.slice(0, 3).map((card) => (
                  <article key={card.title} className="admin-trust-card">
                    <span className="eyebrow">{card.title}</span>
                    <p>{card.body}</p>
                  </article>
                ))}
              </div>
              <div className="button-row trust-actions">
                <button className="primary-btn small" type="button" onClick={() => setActiveSection('shipping')}>
                  Review shipping
                </button>
                <button className="secondary-btn small" type="button" onClick={() => setActiveSection('returns')}>
                  Easy returns
                </button>
              </div>
            </section>

            {showDeprecatedSections ? (
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Shop by intent</span>
                  <h2>Collections with a clear job</h2>
                </div>
                <p>Give each category a job in the journey: discovery, gifting, or repeat buying.</p>
              </div>
              <div className="category-strip">
                {categoryHighlights.map((collection) => (
                  <article key={collection.category} className="category-feature-card">
                    <h3>{collection.category}</h3>
                    <p>
                      {collection.hero?.translations[locale].short ||
                        'A focused collection ready for repeat browsing.'}
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
            ) : null}

            {showDeprecatedSections ? (
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Featured lanes</span>
                  <h2>Gift picks and pairings</h2>
                </div>
                <p>Show shoppers one giftable lane, one hero pick, and one easy pairing.</p>
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
            ) : null}

            {showDeprecatedSections ? (
            <section className="trust-grid">
              {t.trust.map((item) => (
                <article key={item} className="mini-card">
                  <h3>{item}</h3>
                </article>
              ))}
            </section>
            ) : null}

            {showDeprecatedSections ? (
            <section className="section-head">
              <div>
                <span className="eyebrow">{t.categories}</span>
                <h2>{t.featured}</h2>
              </div>
            </section>
            ) : null}

            {showDeprecatedSections ? (
            <section className="cta-showcase">
              <div className="product-grid">
                {storefrontProducts
                  .filter((product) => product.featured)
                  .map((product) => {
                    return (
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
                    )
                  })}
              </div>
              <aside className="cta-stack">
                <article className="cta-card">
                  <span className="eyebrow">Best next step</span>
                  <h3>Lead shoppers to a tighter first view</h3>
                  <p>Keep the home page selective, then move shoppers into a filtered shop view with stronger intent.</p>
                  <button className="primary-btn small" type="button" onClick={() => setActiveSection('shop')}>
                    Browse all live products
                  </button>
                </article>
                <article className="cta-card subtle">
                  <span className="eyebrow">Customer support</span>
                  <h3>Need shipping or returns help?</h3>
                  <p>Keep policies close to the shopper and make the next action obvious from the same panel.</p>
                  <div className="button-row">
                    <button className="ghost-btn small" type="button" onClick={() => setActiveSection('shipping')}>
                      Review shipping
                    </button>
                    <button className="ghost-btn small" type="button" onClick={() => setActiveSection('contact')}>
                      Contact support
                    </button>
                  </div>
                </article>
              </aside>
            </section>
            ) : null}
          </>
        ) : null}

        {!isAdminApp && !loading && activeSection === 'shop' ? (
          <section id="shop-top" className="page-panel shop-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">Shop</span>
                  <h2>{t.nav.shop}</h2>
                </div>
                <p>{homepageContent.shopIntro}</p>
              </div>
              <div className="shop-meta-line">
                <p>{visibleProducts.length} live products shown.</p>
              </div>
              <div id="shop-products" className="product-grid">
                {visibleProducts.map((product) => {
                  return (
                    <article key={product.id} className="product-card">
                      <img src={product.image} alt={product.translations[locale].name} />
                      <div className="product-body">
                        <h3>{product.translations[locale].name}</h3>
                        <p>{product.translations[locale].short}</p>
                        <div className="price-row">
                          <strong>${product.price}</strong>
                          {product.compareAtPrice ? <span>${product.compareAtPrice}</span> : null}
                        </div>
                        <div className="product-actions">
                          <button
                            className="ghost-btn small"
                            type="button"
                            onClick={() => setSelectedProductDetailId(product.id)}
                          >
                            View details
                          </button>
                          <button
                            className="primary-btn small"
                            type="button"
                            onClick={() => addToCart(product.id)}
                            disabled={product.stock === 0}
                          >
                            {t.addToCart}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
          </section>
        ) : null}

        {!isAdminApp && !loading && activeSection === 'shipping' ? (
          <section className="page-panel">
            <h2>{t.shippingTitle}</h2>
            <p>{t.shippingBody}</p>
          </section>
        ) : null}

        {!isAdminApp && !loading && activeSection === 'returns' ? (
          <section className="page-panel">
            <h2>{t.returnsTitle}</h2>
            <p>{t.returnsBody}</p>
            <ul className="info-list">
              <li>Unopened items only when policy allows</li>
              <li>Admin keeps returns and cancellations visible</li>
              <li>Refund and cancellation states stay visible in admin</li>
            </ul>
          </section>
        ) : null}

        {!isAdminApp && !loading && activeSection === 'compliance' ? (
          <section className="page-panel">
            <h2>{t.complianceTitle}</h2>
            <p>{t.complianceBody}</p>
            <div className="compliance-grid">
              <article className="mini-card">
                <h3>Accurate listings</h3>
                <p>Product names, photos, and descriptions should stay aligned across the storefront and admin.</p>
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

        {!isAdminApp && !loading && activeSection === 'contact' ? (
          <section className="page-panel">
            <h2>{t.contactTitle}</h2>
            <p>{t.supportNote}</p>
            <div className="contact-card">
              <p>Email: {supportEmail}</p>
              <p>Response window: 24-48 hours</p>
              <p>Primary operational language: English</p>
            </div>
            <div className="button-row compact">
              <button className="secondary-btn small" type="button" onClick={openTrackingLookup}>
                {(locale as string) === 'zh' ? '查询物流' : 'Track order'}
              </button>
            </div>
          </section>
        ) : null}

        {!loading && (isAdminApp || activeSection === 'admin') ? (
          isAdminApp && adminSessionLoading ? (
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.loginEyebrow}</span>
                  <h2>{adminText.sessionChecking}</h2>
                </div>
              </div>
            </section>
          ) : adminGateRequired ? (
            <section className="page-panel">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.loginEyebrow}</span>
                  <h2>{adminText.loginTitle}</h2>
                </div>
                <div className="admin-lang-toggle">
                  <span className="eyebrow">{adminText.language}</span>
                  <button
                    className={adminUiLang === 'en' ? 'primary-btn small' : 'ghost-btn small'}
                    type="button"
                    onClick={() => setAdminUiLang('en')}
                  >
                    {adminText.english}
                  </button>
                  <button
                    className={adminUiLang === 'zh' ? 'primary-btn small' : 'ghost-btn small'}
                    type="button"
                    onClick={() => setAdminUiLang('zh')}
                  >
                    {adminText.chinese}
                  </button>
                </div>
              </div>
              <p>{adminText.loginHint}</p>
              <form className="checkout-form" onSubmit={loginAdmin}>
                <label className="field">
                  {adminText.username}
                  <input
                    autoComplete="username"
                    value={adminLoginUsername}
                    onChange={(event) => setAdminLoginUsername(event.target.value)}
                    placeholder="admin"
                  />
                </label>
                <label className="field">
                  {adminText.password}
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={adminLoginPassword}
                    onChange={(event) => setAdminLoginPassword(event.target.value)}
                    placeholder="Enter password"
                  />
                </label>
                <div className="button-row">
                  <button className="primary-btn small" type="submit" disabled={adminLoginPending}>
                    {adminLoginPending ? adminText.signingIn : adminText.signIn}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="admin-layout">
            <section className="page-panel admin-section-nav">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.sectionOverview}</span>
                  <h2>{adminText.sectionNavTitle}</h2>
                </div>
                <p>{adminText.sectionNavHint}</p>
              </div>
              <div className="admin-anchor-row">
                {adminSectionAnchors.map((section) => (
                  <button
                    key={section.id}
                    className="ghost-btn small"
                    type="button"
                    onClick={() => scrollToAdminSection(section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </section>
            <section className="page-panel" id="admin-overview">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.sectionOverview}</span>
                  <h2>{adminText.sectionOverview}</h2>
                </div>
                <div className="button-row">
                  <button
                    className={metricsRange === '7d' ? 'primary-btn tiny' : 'ghost-btn tiny'}
                    type="button"
                    onClick={() => {
                      setMetricsRange('7d')
                      void refreshAdminMetrics('7d', '', '')
                    }}
                    disabled={adminMetricsLoading}
                  >
                    7D
                  </button>
                  <button
                    className={metricsRange === '30d' ? 'primary-btn tiny' : 'ghost-btn tiny'}
                    type="button"
                    onClick={() => {
                      setMetricsRange('30d')
                      void refreshAdminMetrics('30d', '', '')
                    }}
                    disabled={adminMetricsLoading}
                  >
                    30D
                  </button>
                  <button
                    className={metricsRange === '90d' ? 'primary-btn tiny' : 'ghost-btn tiny'}
                    type="button"
                    onClick={() => {
                      setMetricsRange('90d')
                      void refreshAdminMetrics('90d', '', '')
                    }}
                    disabled={adminMetricsLoading}
                  >
                    90D
                  </button>
                  <button className="ghost-btn tiny" type="button" onClick={() => void refreshAdminMetrics(metricsRange)}>
                    {adminMetricsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button className="ghost-btn tiny" type="button" onClick={() => void exportMetrics('csv')}>
                    {adminText.exportCsv}
                  </button>
                  <button className="ghost-btn tiny" type="button" onClick={() => void exportMetrics('xlsx')}>
                    {adminText.exportXlsx}
                  </button>
                </div>
              </div>
              <div className="button-row compact date-range-controls">
                <label className="field tiny">
                  From
                  <input type="date" value={metricsFrom} onChange={(event) => setMetricsFrom(event.target.value)} />
                </label>
                <label className="field tiny">
                  To
                  <input type="date" value={metricsTo} onChange={(event) => setMetricsTo(event.target.value)} />
                </label>
                <button className="secondary-btn tiny" type="button" onClick={() => void applyCustomMetricsRange()} disabled={adminMetricsLoading}>
                  Apply
                </button>
              </div>
              <div className="compliance-grid">
                {adminSummaryCards.map((card) => (
                  <article key={card.label} className="admin-summary-card">
                    <div className="admin-card-header">
                      <span className="eyebrow">{card.label}</span>
                      {card.icon}
                    </div>
                    <strong className="metric-value">{card.value}</strong>
                    <p>{card.note}</p>
                  </article>
                ))}
              </div>

              <div className="admin-chart-section">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Performance Trend</span>
                    <h3>Revenue & Orders</h3>
                  </div>
                </div>
                <div className="admin-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#171717" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#171717" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#171717" 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="admin-chart-section">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">Inventory History</span>
                    <h3>Recent Ledger Entries</h3>
                  </div>
                  <div className="button-row">
                    <button className="ghost-btn tiny" onClick={() => void exportInventoryLedger('csv')}>
                      Export CSV
                    </button>
                    <button className="ghost-btn tiny" onClick={() => void exportInventoryLedger('xlsx')}>
                      {adminText.exportXlsx}
                    </button>
                    <button className="ghost-btn tiny" onClick={() => void refreshInventoryLedger()}>
                      {isFetchingLedger ? 'Syncing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                <div className="admin-ledger-list">
                  {inventoryLedger.length > 0 ? (
                    inventoryLedger.map((entry) => (
                      <div key={entry.id} className="admin-row">
                        <div className="admin-row-main">
                          <div className="admin-row-title">
                            <strong>{entry.productName}</strong>
                            <span className={`status-pill ${entry.delta > 0 ? 'active' : 'archived'}`}>
                              {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                            </span>
                          </div>
                          <div className="admin-row-meta">
                            <span>{entry.reason}</span>
                            {entry.adminUsername ? <span>{` · By ${entry.adminUsername}`}</span> : null}
                            {entry.orderId ? (
                              <button
                                type="button"
                                className="ghost-btn tiny"
                                onClick={() => {
                                  setSelectedOrderId(entry.orderId || '')
                                  scrollToAdminSection('admin-orders')
                                }}
                              >
                                {`Order #${entry.orderId.slice(0, 8)}`}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="admin-row-side">
                          <span className="timestamp">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No inventory movements recorded yet.</div>
                  )}
                </div>
              </div>
              {topSkuCards.length ? (
                <div className="admin-list compact">
                  {topSkuCards.map((item) => (
                    <article key={item.productId} className="admin-row">
                      <div className="admin-row-main">
                        <strong>{item.productName}</strong>
                        <span>{`Sold ${item.quantity}`}</span>
                      </div>
                      <div className="admin-row-metrics">
                        <span>{`$${item.revenue.toFixed(2)}`}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
            <section className="page-panel" id="admin-homepage">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.sectionHomepage}</span>
                  <h2>{adminText.sectionHomepage}</h2>
                </div>
                <div className="button-row">
                  <button
                    className="primary-btn small"
                    type="button"
                    onClick={() => {
                      void saveHomepageContent()
                    }}
                    disabled={homepageSaving}
                  >
                    {homepageSaving ? adminText.saving : adminText.save}
                  </button>
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
                  <label className="field">
                    {adminUiLang === 'zh' ? '首页第一张大图商品' : 'Homepage first hero product'}
                    <select
                      value={homepageHeroProductId}
                      onChange={(event) => setHomepageHeroProductId(event.target.value)}
                    >
                      <option value="">
                        {adminUiLang === 'zh'
                          ? '自动选择首个已推荐商品'
                          : 'Auto-pick first featured product'}
                      </option>
                      {storefrontProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.translations[locale].name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="checkout-note">
                    <p>
                      {adminUiLang === 'zh'
                        ? '主图由 homepageHeroProductId 控制，保存后前台首页会立即更新。'
                        : 'Hero image is controlled by homepageHeroProductId and updates storefront after save.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
            {showLegacyAdminPanels ? (
            <section className="page-panel" id="admin-queue">
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
                  <p>Hidden, archived, and low-stock items are the first items to review.</p>
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
            ) : null}

            <section className="page-panel" id="admin-editing">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.sectionEditing}</span>
                  <h2>{adminText.sectionEditing}</h2>
                </div>
                <div className="button-row">
                  <button
                    className={`segmented-toggle small ${editorPanelMode === 'existing' ? 'is-active' : 'is-inactive'}`}
                    type="button"
                    onClick={openExistingEditorPanel}
                  >
                    {adminText.existingProductEditor}
                  </button>
                  <button
                    className={`segmented-toggle small ${editorPanelMode === 'new' && draftOpen ? 'is-active' : 'is-inactive'}`}
                    type="button"
                    onClick={startNewProduct}
                  >
                    {adminText.newProductListing}
                  </button>
                  <button
                    className={`segmented-toggle small ${editorPanelMode === 'closed' ? 'is-active' : 'is-inactive'}`}
                    type="button"
                    onClick={closeEditorPanel}
                  >
                    {adminText.closeEditorPanel}
                  </button>
                </div>
              </div>
              <div className="admin-split">
                <div className="checkout-form admin-filters">
                  <label className="field">
                    {adminText.searchProducts}
                    <input
                      value={adminSearch}
                      onChange={(event) => setAdminSearch(event.target.value)}
                      placeholder="Search by name, SKU, or category"
                    />
                  </label>
                  <label className="field">
                    {adminText.scope}
                    <select
                      value={adminScope}
                      onChange={(event) => setAdminScope(event.target.value as ProductScope)}
                    >
                      {adminScopeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {adminText.sort}
                    <select
                      value={adminSort}
                      onChange={(event) => setAdminSort(event.target.value as ProductSort)}
                    >
                      {adminSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="checkout-note">
                    <p>Manage publish status, stock, and product content from one compact workspace.</p>
                  </div>
                  {editorPanelMode === 'new' && draftOpen ? (
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
                        <div className="field full image-field">
                          <span>Product images</span>
                          <div className="image-dropzone">
                            <strong>Upload images or add image URLs</strong>
                            <p className="image-upload-hint">
                              {adminUiLang === 'zh'
                                ? '单张图片最大 5MB，建议 1600x1600，JPG/WebP。'
                                : 'Max 5 MB per image. Recommended 1600x1600 JPG/WebP.'}
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) => void setDraftImagesFromFiles(event.target.files)}
                            />
                            <div className="image-url-row">
                              <input
                                value={draftImageInput}
                                onChange={(event) => setDraftImageInput(event.target.value)}
                                placeholder="https://images.unsplash.com/..."
                              />
                              <button className="secondary-btn small" type="button" onClick={addDraftImageUrl}>
                                Add URL
                              </button>
                            </div>
                          </div>
                          {draft.images.length ? (
                            <div className="image-manager-list">
                              {draft.images.map((image, index) => (
                                <article key={`${image}-${index}`} className="image-manager-item">
                                  <img src={image} alt={`Draft image ${index + 1}`} />
                                  <div className="image-manager-meta">
                                    <span>{index === 0 ? 'Cover image' : `Image ${index + 1}`}</span>
                                    <div className="button-row compact">
                                      <button className="ghost-btn tiny" type="button" onClick={() => setDraftCoverImage(index)}>
                                        Set cover
                                      </button>
                                      <button className="ghost-btn tiny" type="button" onClick={() => moveDraftImage(index, -1)} disabled={index === 0}>
                                        Up
                                      </button>
                                      <button
                                        className="ghost-btn tiny"
                                        type="button"
                                        onClick={() => moveDraftImage(index, 1)}
                                        disabled={index === draft.images.length - 1}
                                      >
                                        Down
                                      </button>
                                      <button className="danger-btn tiny" type="button" onClick={() => removeDraftImage(index)}>
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="image-placeholder">Add at least one image to publish this product.</div>
                          )}
                        </div>
                        {draft.coverImage ? (
                          <div className="editor-preview">
                            <span className="preview-chip">{draft.category || 'Draft preview'}</span>
                            <img src={draft.coverImage} alt={draft.nameEn || draft.nameFr || 'Draft preview'} />
                            <div className="editor-stack">
                              <strong>{draft.nameEn || draft.nameFr || 'Untitled draft'}</strong>
                              <p>{draft.shortEn || 'Cover image preview appears here.'}</p>
                              <span>{`${draft.images.length} image${draft.images.length > 1 ? 's' : ''} ready`}</span>
                            </div>
                          </div>
                        ) : null}
                        {draft.images.length ? (
                          <div className="button-row">
                            <button
                              className="ghost-btn small"
                              type="button"
                              onClick={() => setDraft((current) => ({ ...current, images: [], coverImage: '' }))}
                            >
                              Clear all images
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
                            placeholder="Gift-ready, Travel-friendly, Easy daily use"
                          />
                        </label>
                        <label className="field full">
                          Short copy (EN)
                          <input
                            value={draft.shortEn}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, shortEn: event.target.value }))
                            }
                            placeholder="Short product pitch for storefront cards."
                          />
                        </label>
                        <label className="field full">
                          Short copy (FR)
                          <input
                            value={draft.shortFr}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, shortFr: event.target.value }))
                            }
                            placeholder="Texte court pour la carte produit."
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
                            placeholder="Describe core use, materials, and shopper benefits."
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
                            placeholder="Decrivez la coupe, le style et la presentation."
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
                          {`${adminText.publish} storefront`}
                        </label>
                      </div>
                      <div className="checkout-note">
                        <p>New products start with the exact stock value you enter and save to database immediately.</p>
                      </div>
                      <div className="button-row">
                        <button
                          className="primary-btn small"
                          type="button"
                          onClick={() => void createProduct()}
                          disabled={productCreatePending}
                        >
                          {productCreatePending ? (adminUiLang === 'zh' ? '鍒涘缓涓?..' : 'Creating...') : 'Create product'}
                        </button>
                        <button className="ghost-btn small" type="button" onClick={closeEditorPanel}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {editorPanelMode === 'existing' ? (
                    <div className="editor-card">
                      <div className="editor-head">
                      <div>
                        <span className="eyebrow">Product editor</span>
                        <h3>{editor.id ? editor.nameEn || editor.nameFr : 'Select a product to edit'}</h3>
                      </div>
                      {editor.id ? (
                        <button
                          className="ghost-btn small"
                          type="button"
                          onClick={() => {
                            setEditor(emptyEditor)
                            setEditorImageInput('')
                          }}
                        >
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
                          placeholder="Cloudloop Knit Sneaker"
                        />
                      </label>
                      <label className="field">
                        Product name (FR)
                        <input
                          value={editor.nameFr}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, nameFr: event.target.value }))
                          }
                          placeholder="Cloudloop Knit Sneaker"
                        />
                      </label>
                      <label className="field">
                        SKU
                        <input
                          value={editor.sku}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, sku: event.target.value }))
                          }
                          placeholder="AS-APP-001"
                        />
                      </label>
                      <label className="field">
                        Slug
                        <input
                          value={editor.slug}
                          onChange={(event) =>
                            setEditor((current) => ({ ...current, slug: slugifyProductName(event.target.value) }))
                          }
                          placeholder="cloudloop-knit-sneaker"
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
                        <span>Product images</span>
                        <div className="image-dropzone">
                          <strong>Upload images or add image URLs</strong>
                          <p className="image-upload-hint">
                            {adminUiLang === 'zh'
                              ? '单张图片最大 5MB，建议 1600x1600，JPG/WebP。'
                              : 'Max 5 MB per image. Recommended 1600x1600 JPG/WebP.'}
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => void setEditorImagesFromFiles(event.target.files)}
                          />
                          <div className="image-url-row">
                            <input
                              value={editorImageInput}
                              onChange={(event) => setEditorImageInput(event.target.value)}
                              placeholder="https://images.unsplash.com/..."
                            />
                            <button className="secondary-btn small" type="button" onClick={addEditorImageUrl}>
                              Add URL
                            </button>
                          </div>
                        </div>
                        {editor.images.length ? (
                          <div className="image-manager-list">
                            {editor.images.map((image, index) => (
                              <article key={`${image}-${index}`} className="image-manager-item">
                                <img src={image} alt={`Product image ${index + 1}`} />
                                <div className="image-manager-meta">
                                  <span>{index === 0 ? 'Cover image' : `Image ${index + 1}`}</span>
                                  <div className="button-row compact">
                                    <button className="ghost-btn tiny" type="button" onClick={() => setEditorCoverImage(index)}>
                                      Set cover
                                    </button>
                                    <button className="ghost-btn tiny" type="button" onClick={() => moveEditorImage(index, -1)} disabled={index === 0}>
                                      Up
                                    </button>
                                    <button
                                      className="ghost-btn tiny"
                                      type="button"
                                      onClick={() => moveEditorImage(index, 1)}
                                      disabled={index === editor.images.length - 1}
                                    >
                                      Down
                                    </button>
                                    <button className="danger-btn tiny" type="button" onClick={() => removeEditorImage(index)}>
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="image-placeholder">No images yet. Add one to publish to storefront.</div>
                        )}
                      </div>
                      {editor.coverImage ? (
                        <div className="editor-preview">
                          <span className="preview-chip">{editor.category || 'Preview'}</span>
                          <img src={editor.coverImage} alt={editor.nameEn || editor.nameFr || 'Product preview'} />
                          <div className="editor-stack">
                            <strong>{editor.nameEn || editor.nameFr || 'Untitled product'}</strong>
                            <p>{editor.shortEn || 'Cover image preview appears here.'}</p>
                            <span>{`${editor.images.length} image${editor.images.length > 1 ? 's' : ''} ready`}</span>
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
                          {`${adminText.publish} storefront`}
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
                    <div className="button-row">
                      <button
                        className="primary-btn small"
                        type="button"
                        onClick={() => void saveProduct()}
                        disabled={!editor.id || productSavePending}
                      >
                        {productSavePending ? (adminUiLang === 'zh' ? '保存中...' : 'Saving...') : 'Save product'}
                      </button>
                      <button
                        className="ghost-btn small"
                        type="button"
                        onClick={() => duplicateProductToDraft(catalogProducts.find((item) => item.id === editor.id))}
                        disabled={!editor.id}
                      >
                        Copy to draft
                      </button>
                      <button
                        className="ghost-btn small"
                        type="button"
                        onClick={() => {
                          setEditor(emptyEditor)
                          setEditorImageInput('')
                          setEditorPanelMode('closed')
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    </div>
                  ) : null}
                </div>
                <div className="page-panel" id="admin-publishing">
                  <div className="section-head compact">
                    <div>
                      <span className="eyebrow">{adminText.sectionPublishing}</span>
                      <h3>{adminText.sectionPublishing}</h3>
                    </div>
                    <p>
                      {selectedProductIds.length
                        ? `${selectedProductIds.length} ${adminText.selectedSuffix}`
                        : adminText.sectionNavHint}
                    </p>
                  </div>
                  <div className="batch-toolbar">
                    <div className="button-row">
                      <button
                        className={adminScope === 'All' ? 'segmented-toggle small is-active' : 'segmented-toggle small is-inactive'}
                        type="button"
                        onClick={() => setAdminScope('All')}
                      >
                        {adminText.publishedProducts}
                      </button>
                      <button
                        className={
                          adminScope === 'Deleted'
                            ? 'segmented-toggle small is-active'
                            : 'segmented-toggle small is-inactive'
                        }
                        type="button"
                        onClick={() => setAdminScope('Deleted')}
                      >
                        {adminText.recycleBin}
                      </button>
                      <button className="ghost-btn small" type="button" onClick={() => toggleAllAdminProducts(true)}>
                        {allAdminProductsSelected ? adminText.allSelected : adminText.selectAll}
                      </button>
                      <button className="ghost-btn small" type="button" onClick={() => setSelectedProductIds([])}>
                        {adminText.clearSelection}
                      </button>
                    </div>
                    <div className="button-row">
                      <button
                        className="ghost-btn small"
                        type="button"
                        disabled={catalogMutationPending || !selectedProductIds.length}
                        onClick={() =>
                          void updateSelectedProducts(
                            { visible: true, archived: false },
                            'Batch publish failed',
                          )
                        }
                      >
                        {adminText.publishSelected}
                      </button>
                      <button
                        className="ghost-btn small"
                        type="button"
                        disabled={catalogMutationPending || !selectedProductIds.length}
                        onClick={() =>
                          void updateSelectedProducts({ visible: false }, 'Batch unpublish failed')
                        }
                      >
                        {adminText.unpublishSelected}
                      </button>
                      <button
                        className="ghost-btn small"
                        type="button"
                        disabled={!selectedProductIds.length}
                        onClick={() => void updateSelectedProducts({ archived: true }, 'Batch archive failed')}
                      >
                        {adminText.archiveSelected}
                      </button>
                      <button
                        className="ghost-btn small"
                        type="button"
                        disabled={!selectedProductIds.length}
                        onClick={() => void updateSelectedProducts({ archived: false }, 'Batch restore failed')}
                      >
                        {adminText.restoreSelected}
                      </button>
                    </div>
                  </div>
                  <div className="admin-table-head" aria-hidden="true">
                    <span>{adminText.productCol}</span>
                    <span>{adminText.metricsCol}</span>
                    <span>{adminText.statusCol}</span>
                    <span>{adminText.actionsCol}</span>
                  </div>
                  <div className="admin-list">
                    {adminProducts.map((product) => (
                      <article
                        key={product.id}
                        className={product.archived ? 'admin-row archived' : 'admin-row'}
                        style={{
                          opacity: product.deleted_at
                            ? 0.5
                            : product.visible && !product.archived
                              ? 1
                              : 0.72,
                        }}
                      >
                        <div className="admin-row-main">
                          <div className="admin-row-topline">
                            <label className="status-select compact" onClick={(event) => event.stopPropagation()}>
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
                              <span>{adminText.select}</span>
                            </label>
                            <strong>{product.translations[locale].name}</strong>
                          </div>
                          <div className="admin-row-subline">
                            <span>{product.sku}</span>
                            <span>{product.category}</span>
                          </div>
                        </div>
                        <div className="admin-row-metrics">
                          <span>{`$${product.price}`}</span>
                          <span>{`${product.stock} ${adminText.inStock}`}</span>
                        </div>
                        <div className="admin-row-status">
                          <span className="category-chip">
                            {product.featured ? adminText.featured : adminText.standard}
                          </span>
                          <span className="category-chip">
                            {product.visible && !product.archived
                              ? adminText.published
                              : adminText.unpublished}
                          </span>
                          <span className="category-chip">
                            {product.deleted_at
                              ? adminText.recycleBin
                              : product.archived
                                ? adminText.archived
                                : adminText.active}
                          </span>
                        </div>
                        <div className="editor-meta admin-row-actions">
                          <button className="ghost-btn small" type="button" onClick={() => openEditor(product)}>
                            {adminText.edit}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            onClick={() => seedDraftFromProduct(product)}
                          >
                            {adminText.duplicate}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            disabled={rowMutationPendingId === product.id || Boolean(product.deleted_at)}
                            onClick={() => void toggleCatalogFlag(product.id, { featured: !product.featured })}
                          >
                            {product.featured ? adminText.unfeature : adminText.feature}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            disabled={
                              rowMutationPendingId === product.id ||
                              Boolean(product.deleted_at) ||
                              (product.visible === true && product.archived !== true)
                            }
                            onClick={() =>
                              void toggleCatalogFlag(product.id, { visible: true, archived: false })
                            }
                          >
                            {adminText.publish}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            disabled={
                              rowMutationPendingId === product.id ||
                              Boolean(product.deleted_at) ||
                              product.visible === false
                            }
                            onClick={() => void toggleCatalogFlag(product.id, { visible: false })}
                          >
                            {adminText.unpublish}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            disabled={rowMutationPendingId === product.id || Boolean(product.deleted_at)}
                            onClick={() =>
                              void toggleCatalogFlag(product.id, {
                                archived: product.archived !== true,
                              } as Partial<Pick<Product, 'featured' | 'visible'>> & { archived: boolean })
                            }
                          >
                            {product.archived ? adminText.restore : adminText.archive}
                          </button>
                          <button
                            className="ghost-btn small"
                            type="button"
                            disabled={homepageSaving || Boolean(product.deleted_at)}
                            onClick={() => void setHeroProduct(product.id)}
                          >
                            {homepageHeroProductId === product.id
                              ? adminUiLang === 'zh'
                                ? '当前主图'
                                : 'Hero active'
                              : adminUiLang === 'zh'
                                ? '设为主图'
                                : 'Set hero'}
                          </button>
                          <span className="category-chip">
                            {homepageHeroProductId === product.id
                              ? adminUiLang === 'zh'
                                ? '首页主图：当前'
                                : 'Homepage hero: active'
                              : adminUiLang === 'zh'
                                ? '首页主图：可设'
                                : 'Homepage hero: available'}
                          </span>
                          {product.deleted_at ? (
                            <>
                              <button
                                className="ghost-btn small"
                                type="button"
                                disabled={rowMutationPendingId === product.id}
                                onClick={() => void restoreDeletedProduct(product.id)}
                              >
                                {adminText.restoreFromBin}
                              </button>
                              <button
                                className="danger-btn small"
                                type="button"
                                disabled={rowMutationPendingId === product.id}
                                onClick={() => void permanentlyDeleteProduct(product.id)}
                              >
                                {adminText.deleteForever}
                              </button>
                            </>
                          ) : (
                            <button
                              className="danger-btn small"
                              type="button"
                              disabled={rowMutationPendingId === product.id}
                              onClick={() => void softDeleteProduct(product.id)}
                            >
                              {adminText.delete}
                            </button>
                          )}
                          <div className="quantity-controls">
                            <button
                              type="button"
                              onClick={() => adjustStockDraft(product.id, -1)}
                              disabled={stockMutationPendingId === product.id}
                            >
                              -
                            </button>
                            <input
                              aria-label={`${product.translations[locale].name} stock`}
                              inputMode="numeric"
                              min={0}
                              step={1}
                              type="number"
                              value={stockDrafts[product.id] ?? String(product.stock)}
                              onChange={(event) =>
                                setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  void commitStockDraft(product.id)
                                }
                              }}
                              style={{ width: 84, textAlign: 'center' }}
                            />
                            <button
                              type="button"
                              onClick={() => adjustStockDraft(product.id, 1)}
                              disabled={stockMutationPendingId === product.id}
                            >
                              +
                            </button>
                            <button
                              className="secondary-btn tiny"
                              type="button"
                              onClick={() => void commitStockDraft(product.id)}
                              disabled={stockMutationPendingId === product.id}
                            >
                              {adminText.confirm}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {adminProducts.length === 0 ? <p>{adminText.noCatalogMatch}</p> : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="page-panel" id="admin-maintenance">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.maintenanceEyebrow}</span>
                  <h2>{adminText.maintenanceTitle}</h2>
                </div>
                <button className="ghost-btn small" type="button" onClick={() => void resetStore()}>
                  {adminText.reset}
                </button>
              </div>
              <p>
                {adminText.maintenanceHint}
              </p>
            </section>

            <section className="page-panel" id="admin-orders">
                <div className="section-head compact">
                  <div>
                    <span className="eyebrow">{adminText.sectionOrders}</span>
                    <h2>{adminText.sectionOrders}</h2>
                  </div>
                </div>
                <div className="checkout-form admin-filters compact">
                  <label className="field">
                    {adminText.searchOrders}
                    <input
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Customer, email, order ID, reference, or address"
                    />
                  </label>
                  <label className="field">
                    {adminText.orderStatusLabel}
                    <select
                      value={orderStatusFilter}
                      onChange={(event) => setOrderStatusFilter(event.target.value as 'All' | OrderStatus)}
                    >
                      <option value="All">{adminText.allStatuses}</option>
                      {orderStatusValues.map((status) => (
                        <option key={status} value={status}>
                          {formatOrderStatus(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    {adminText.sort}
                    <select value={orderSort} onChange={(event) => setOrderSort(event.target.value as typeof orderSort)}>
                      {orderSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="button-row">
                    <button className="ghost-btn small" type="button" onClick={() => void refreshAdminStore()}>
                      {adminText.refreshOrders}
                    </button>
                    <button className="primary-btn small" type="button" onClick={() => void exportOrders('csv')}>
                      {adminText.exportCsv}
                    </button>
                    <button className="ghost-btn small" type="button" onClick={() => void exportOrders('xlsx')}>
                      {adminText.exportXlsx}
                    </button>
                  </div>
                </div>
                <div className="admin-orders-layout">
                  <div className="admin-list admin-orders-list">
                    {adminOrders.length === 0 ? (
                      <p>{adminText.noOrders}</p>
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
                                  <span>{`${order.customerName} / ${order.country}`}</span>
                                  <span>{`${new Date(order.createdAt).toLocaleString()} / $${order.total.toFixed(2)}`}</span>
                                  <div className="meta-row compact">
                                  <span className={`status-pill ${order.fulfillmentStatus === 'Shipped' ? 'success' : order.fulfillmentStatus === 'Refunded' || order.fulfillmentStatus === 'Cancelled' ? 'error' : 'warn'}`}>
                                  {formatOrderStatus(order.fulfillmentStatus)}
                                  </span>
                                {order.paymentReference ? <span>{order.paymentReference}</span> : <span>{adminText.noPaymentRef}</span>}
                                <span>{`${order.items.length} ${adminText.items}`}</span>
                              </div>
                            </div>
                            <label className="status-select" onClick={(event) => event.stopPropagation()}>
                              <span>{adminText.orderStatusLabel}</span>
                              <select
                                value={orderStatusDrafts[order.id] ?? order.fulfillmentStatus}
                                onChange={(event) =>
                                  setOrderStatusDrafts((current) => ({
                                    ...current,
                                    [order.id]: event.target.value as OrderStatus,
                                  }))
                                }
                              >
                                {orderStatusValues.map((status) => (
                                  <option key={status} value={status}>
                                    {formatOrderStatus(status)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              className="secondary-btn tiny"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void updateOrderStatus(order.id)
                              }}
                              disabled={
                                orderStatusSavingId === order.id ||
                                (orderStatusDrafts[order.id] ?? order.fulfillmentStatus) === order.fulfillmentStatus
                              }
                            >
                              {orderStatusSavingId === order.id ? adminText.saving : adminText.confirm}
                            </button>
                          </article>
                        )
                      })
                    )}
                  </div>
                  <div className="order-detail-panel">
                    <div className="section-head compact">
                      <div>
                        <span className="eyebrow">{adminText.selectedOrder}</span>
                        <h3>{selectedOrder ? selectedOrder.id : adminText.pickOrder}</h3>
                      </div>
                      {selectedOrder ? (
                        <div className="button-row compact">
                          <label className="status-select" onClick={(event) => event.stopPropagation()}>
                            <span>{adminText.orderStatusLabel}</span>
                            <select
                              value={orderStatusDrafts[selectedOrder.id] ?? selectedOrder.fulfillmentStatus}
                              onChange={(event) =>
                                setOrderStatusDrafts((current) => ({
                                  ...current,
                                  [selectedOrder.id]: event.target.value as OrderStatus,
                                }))
                              }
                            >
                              {orderStatusValues.map((status) => (
                                <option key={status} value={status}>
                                  {formatOrderStatus(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="secondary-btn small"
                            type="button"
                            onClick={() => void updateOrderStatus(selectedOrder.id)}
                            disabled={
                              orderStatusSavingId === selectedOrder.id ||
                              (orderStatusDrafts[selectedOrder.id] ?? selectedOrder.fulfillmentStatus) ===
                                selectedOrder.fulfillmentStatus
                            }
                          >
                            {orderStatusSavingId === selectedOrder.id ? adminText.saving : adminText.confirm}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {selectedOrder ? (
                      <div className="order-detail-card">
                        <div className="detail-grid">
                          <article className="detail-metric">
                            <span className="eyebrow">{adminText.customer}</span>
                            <strong>{selectedOrder.customerName}</strong>
                            <p>{selectedOrder.customerEmail}</p>
                            <p>{selectedOrder.phone}</p>
                          </article>
                          <article className="detail-metric">
                            <span className="eyebrow">{adminText.delivery}</span>
                            <strong>{selectedOrder.country}</strong>
                            <p>{selectedOrder.address}</p>
                            <p>{selectedOrder.language.toUpperCase()}</p>
                          </article>
                          <article className="detail-metric">
                            <span className="eyebrow">{adminText.payment}</span>
                            <strong>${selectedOrder.total.toFixed(2)} {selectedOrder.currency || 'USD'}</strong>
                            <p>{selectedOrder.paymentReference || adminText.paymentRefMissing}</p>
                            <p>{selectedOrder.paymentStatus}</p>
                          </article>
                          <article className="detail-metric">
                            <span className="eyebrow">{adminText.timeline}</span>
                            <strong>{new Date(selectedOrder.createdAt).toLocaleString()}</strong>
                            <p>{`${selectedOrder.items.length} ${adminText.items}`}</p>
                            <p>
                              {selectedOrder.shippedAt
                                ? `${adminText.shippedAt} ${formatMonthDay(selectedOrder.shippedAt)}`
                                : ''}
                              {selectedOrder.shippedAt && selectedOrder.expectedDeliveryAt ? ' · ' : ''}
                              {selectedOrder.expectedDeliveryAt
                                ? `${
                                    adminUiLang === 'zh' ? '预计到达' : 'Estimated arrival'
                                  } ${formatMonthDay(selectedOrder.expectedDeliveryAt)}`
                                : !selectedOrder.shippedAt
                                  ? formatOrderStatus(selectedOrder.fulfillmentStatus)
                                  : ''}
                            </p>
                          </article>
                        </div>
                        <div className="order-detail-summary">
                          <div>
                            <span>Subtotal</span>
                            <strong>${Number(selectedOrder.subtotal || 0).toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>Shipping</span>
                            <strong>${Number(selectedOrder.shipping || 0).toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>Tax</span>
                            <strong>${Number(selectedOrder.tax || 0).toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>Discount</span>
                            <strong>-${Number(selectedOrder.discount || 0).toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>{adminText.orderTotal}</span>
                            <strong>${selectedOrder.total.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span>{adminText.paymentReference}</span>
                            <strong>{selectedOrder.paymentReference || adminText.paymentRefMissing}</strong>
                          </div>
                        </div>
                        <div className="order-note-editor">
                          <div className="section-head compact">
                            <div>
                              <span className="eyebrow">{adminText.tracking}</span>
                              <h4>{selectedOrder.trackingCarrier || adminText.tracking}</h4>
                            </div>
                            <div className="button-row compact">
                              <button
                                className="primary-btn small"
                                type="button"
                                onClick={() => void saveOrderTracking()}
                                disabled={
                                  orderTrackingSaving ||
                                  !selectedOrder ||
                                  (
                                    orderTrackingDraft.carrier.trim() === (selectedOrder.trackingCarrier || '').trim() &&
                                    orderTrackingDraft.number.trim() === (selectedOrder.trackingNumber || '').trim() &&
                                    orderTrackingDraft.url.trim() === (selectedOrder.trackingUrl || '').trim()
                                  )
                                }
                              >
                                {orderTrackingSaving ? adminText.saving : adminText.saveTracking}
                              </button>
                              {orderTrackingDraft.url.trim() ? (
                                <button
                                  className="ghost-btn small"
                                  type="button"
                                  onClick={() => window.open(orderTrackingDraft.url.trim(), '_blank', 'noopener,noreferrer')}
                                >
                                  {adminText.openTracking}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="field-grid compact">
                            <label className="field">
                              <span>{adminText.trackingCarrier}</span>
                              <input
                                type="text"
                                value={orderTrackingDraft.carrier}
                                onChange={(event) =>
                                  setOrderTrackingDraft((current) => ({ ...current, carrier: event.target.value }))
                                }
                                placeholder="DHL / UPS / FedEx"
                              />
                            </label>
                            <label className="field">
                              <span>{adminText.trackingNumber}</span>
                              <input
                                type="text"
                                value={orderTrackingDraft.number}
                                onChange={(event) =>
                                  setOrderTrackingDraft((current) => ({ ...current, number: event.target.value }))
                                }
                                placeholder="1Z..."
                              />
                            </label>
                            <label className="field full">
                              <span>{adminText.trackingUrl}</span>
                              <input
                                type="url"
                                value={orderTrackingDraft.url}
                                onChange={(event) =>
                                  setOrderTrackingDraft((current) => ({ ...current, url: event.target.value }))
                                }
                                placeholder="https://..."
                              />
                            </label>
                          </div>
                        </div>
                        <div className="order-note-editor">
                          <label className="field">
                            {adminText.internalNote}
                            <textarea
                              rows={4}
                              value={orderNoteDraft}
                              onChange={(event) => setOrderNoteDraft(event.target.value)}
                              placeholder="Leave packing, fraud check, customer service, or follow-up notes..."
                            />
                          </label>
                          <div className="order-note-actions">
                            <button
                              className="primary-btn small"
                              type="button"
                              onClick={() => void saveOrderNote()}
                              disabled={orderNoteSaving}
                            >
                              {orderNoteSaving ? adminText.saving : adminText.saveNote}
                            </button>
                            {selectedOrder.fulfillmentStatus !== 'Refunded' && (
                              <button
                                className="danger-btn small"
                                type="button"
                                onClick={() => void refundOrder(selectedOrder.id)}
                              >
                                Refund Order
                              </button>
                            )}
                            <button
                              className="ghost-btn small"
                              type="button"
                              onClick={() => {
                                setOrderNoteDraft('')
                              }}
                              disabled={orderNoteSaving}
                            >
                              {adminText.clearNote}
                            </button>
                          </div>
                          <div className="order-note-status">
                            {selectedOrder.internalNote ? adminText.noteSaved : adminText.noNote}
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
                              <span>{`${adminText.items} ${item.quantity}`}</span>
                              <span>{`$${item.unitPrice.toFixed(2)} each / $${(item.unitPrice * item.quantity).toFixed(2)} line`}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                </div>
                </div>
            </section>
            <section className="page-panel" id="admin-inventory">
              <div className="section-head compact">
                <div>
                  <span className="eyebrow">{adminText.sectionInventory}</span>
                  <h2>{adminText.inventoryTitle}</h2>
                </div>
                {selectedProductIds.length > 0 && (
                  <div className="bulk-action-bar">
                    <span className="eyebrow">{selectedProductIds.length} selected</span>
                    <div className="button-row">
                      <button className="ghost-btn tiny" onClick={() => void runBulkAction('visible', true)} disabled={bulkActionPending}>Publish</button>
                      <button className="ghost-btn tiny" onClick={() => void runBulkAction('visible', false)} disabled={bulkActionPending}>Unpublish</button>
                      <button className="ghost-btn tiny" onClick={() => setSelectedProductIds([])}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="admin-list">
                {catalogProducts.filter((product) => !product.deleted_at).map((product) => (
                  <article key={product.id} className={selectedProductIds.includes(product.id) ? "admin-row selected" : "admin-row"} onClick={() => toggleProductSelection(product.id)} style={{ cursor: 'pointer' }}>
                    <div className="admin-row-main">
                      <strong>{product.translations[locale].name}</strong>
                      <span>{`SKU ${product.sku} / ${product.category}`}</span>
                      <span>{`${product.stock} ${adminText.unitsAvailable}`}</span>
                    </div>
                    <div className="quantity-controls" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => adjustStockDraft(product.id, -1)}
                        disabled={stockMutationPendingId === product.id}
                      >
                        -
                      </button>
                      <input
                        aria-label={`${product.translations[locale].name} stock`}
                        inputMode="numeric"
                        min={0}
                        step={1}
                        type="number"
                        value={stockDrafts[product.id] ?? String(product.stock)}
                        onChange={(event) =>
                          setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            void commitStockDraft(product.id)
                          }
                        }}
                        style={{ width: 84, textAlign: 'center' }}
                      />
                      <button
                        type="button"
                        onClick={() => adjustStockDraft(product.id, 1)}
                        disabled={stockMutationPendingId === product.id}
                      >
                        +
                      </button>
                      <button
                        className="secondary-btn tiny"
                        type="button"
                        onClick={() => void commitStockDraft(product.id)}
                        disabled={stockMutationPendingId === product.id}
                      >
                        {adminText.confirm}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
              </section>
          )
        ) : null}
      </main>

      {toast ? (
        <aside className={toast.kind === 'error' ? 'admin-toast error' : 'admin-toast success'} aria-live="polite">
          <span>{toast.message}</span>
          {toast.kind === 'error' ? (
            <button type="button" onClick={() => setToast(null)}>
              Close
            </button>
          ) : null}
        </aside>
      ) : null}

        {!isAdminApp ? (
          <>
          <footer className="site-footer">
            <div aria-hidden="true" />
            <div className="footer-links">
              <button type="button" onClick={() => setActiveSection('shipping')}>{t.nav.shipping}</button>
              <button type="button" onClick={() => setActiveSection('returns')}>{t.nav.returns}</button>
              <button type="button" onClick={() => setActiveSection('contact')}>{t.nav.contact}</button>
            </div>
          </footer>

          <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
            <button type="button" className={activeSection === 'home' ? 'mobile-nav-link active' : 'mobile-nav-link'} onClick={() => setActiveSection('home')}>
              <span>Home</span>
            </button>
            <button
              type="button"
              className={activeSection === 'shop' ? 'mobile-nav-link active' : 'mobile-nav-link'}
              onClick={() => openShopView(ALL_PRODUCTS_CATEGORY)}
            >
              <span>Shop</span>
            </button>
            <button type="button" className={checkoutOpen ? 'mobile-nav-link active' : 'mobile-nav-link'} onClick={() => openCheckoutDrawer()}>
              <span>{`Cart (${cartCount})`}</span>
            </button>
            <button type="button" className={trackingLookupOpen ? 'mobile-nav-link active' : 'mobile-nav-link'} onClick={openTrackingLookup}>
              <span>{(locale as string) === 'zh' ? '物流' : 'Track'}</span>
            </button>
          </nav>
        </>
      ) : null}

      {trackingLookupOpen
        ? renderOverlay(
            <div className="checkout-overlay" role="dialog" aria-modal="true" onClick={() => setTrackingLookupOpen(false)}>
              <div className="tracking-modal" onClick={(event) => event.stopPropagation()}>
                <div className="tracking-modal-head">
                  <div>
                    <span className="eyebrow">{(locale as string) === 'zh' ? '物流查询' : 'Shipment tracking'}</span>
                    <h3>{(locale as string) === 'zh' ? '查询订单物流' : 'Track your order'}</h3>
                  </div>
                  <button className="ghost-btn small" type="button" onClick={() => setTrackingLookupOpen(false)}>
                    Close
                  </button>
                </div>
                <form className="tracking-lookup-form" onSubmit={lookupOrderTracking}>
                  <label className="field">
                    {(locale as string) === 'zh' ? '订单号' : 'Order ID'}
                    <input
                      value={trackingLookupForm.orderId}
                      onChange={(event) =>
                        setTrackingLookupForm((current) => ({ ...current, orderId: event.target.value }))
                      }
                      placeholder="AST-TX-..."
                    />
                  </label>
                  <label className="field">
                    {(locale as string) === 'zh' ? '下单邮箱' : 'Order email'}
                    <input
                      type="email"
                      value={trackingLookupForm.email}
                      onChange={(event) =>
                        setTrackingLookupForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="you@example.com"
                    />
                  </label>
                  <div className="button-row compact">
                    <button className="primary-btn small" type="submit" disabled={trackingLookupPending}>
                      {trackingLookupPending
                        ? (locale as string) === 'zh'
                          ? '查询中...'
                          : 'Loading...'
                        : (locale as string) === 'zh'
                          ? '查询物流'
                          : 'Track order'}
                    </button>
                  </div>
                </form>
                {trackingLookupError ? <p className="error-text">{trackingLookupError}</p> : null}
                {trackingLookupResult ? (
                  <div className="order-tracking-summary">
                    <p>
                      <strong>{(locale as string) === 'zh' ? '订单号' : 'Order ID'}:</strong> {trackingLookupResult.id}
                    </p>
                    <p>
                      <strong>{(locale as string) === 'zh' ? '状态' : 'Status'}:</strong>{' '}
                      {trackingLookupResult.fulfillmentStatus}
                    </p>
                    <p>
                      <strong>{(locale as string) === 'zh' ? '预计到达' : 'Estimated arrival'}:</strong>{' '}
                      {trackingLookupResult.expectedDeliveryAt
                        ? formatMonthDay(trackingLookupResult.expectedDeliveryAt, 'storefront')
                        : (locale as string) === 'zh'
                          ? '待更新'
                          : 'Pending update'}
                    </p>
                    {trackingLookupResult.shippedAt ? (
                      <p>
                        <strong>{(locale as string) === 'zh' ? '发货日期' : 'Shipped on'}:</strong>{' '}
                        {formatMonthDay(trackingLookupResult.shippedAt, 'storefront')}
                      </p>
                    ) : null}
                    {trackingLookupResult.trackingNumber ? (
                      <p>
                        <strong>{(locale as string) === 'zh' ? '物流单号' : 'Tracking number'}:</strong>{' '}
                        {trackingLookupResult.trackingNumber}
                      </p>
                    ) : null}
                    {trackingLookupResult.trackingUrl ? (
                      <a
                        className="secondary-btn small"
                        href={trackingLookupResult.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {(locale as string) === 'zh' ? '打开物流链接' : 'Open tracking link'}
                      </a>
                    ) : (
                      <p>
                        {(locale as string) === 'zh'
                          ? '物流链接将在发货后显示。'
                          : 'Tracking link will appear once the parcel ships.'}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>,
          )
        : null}

      {selectedProductDetail ? renderOverlay(
        <div className="checkout-overlay" role="dialog" aria-modal="true" onClick={() => setSelectedProductDetailId('')}>
          <div className="product-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="detail-head">
              <div>
                <span className="eyebrow">Product detail</span>
                <h2>{selectedProductDetail.translations[locale].name}</h2>
              </div>
              <button className="ghost-btn small" type="button" onClick={() => setSelectedProductDetailId('')}>
                Close
              </button>
            </div>
            <div className="product-detail-hero">
              <div className="product-detail-gallery">
                <div className="product-detail-figure">
                  <img
                    src={selectedProductDetail.coverImage || selectedProductDetail.image}
                    alt={selectedProductDetail.translations[locale].name}
                  />
                </div>
                {selectedProductDetail.images?.length ? (
                  <div className="detail-thumb-row">
                    {selectedProductDetail.images.slice(0, 4).map((image) => (
                      <img key={image} src={image} alt={selectedProductDetail.translations[locale].name} />
                    ))}
                  </div>
                ) : null}
                <div className="product-detail-gallery-copy">
                  <p>{selectedProductDetail.translations[locale].description}</p>
                </div>
              </div>
              <div className="product-detail-info">
                <div className="product-detail-summary">
                  <div className="price-row">
                    <strong>${selectedProductDetail.price}</strong>
                    {selectedProductDetail.compareAtPrice ? <span>${selectedProductDetail.compareAtPrice}</span> : null}
                  </div>
                  <p>{selectedProductDetail.stock > 0 ? `${selectedProductDetail.stock} available` : 'Sold out'}</p>
                </div>
                <div className="product-detail-purchase">
                  <div className="quantity-controls quantity-controls-detail">
                    <button type="button" onClick={() => setDetailQuantity((current) => Math.max(1, current - 1))}>
                      -
                    </button>
                    <input
                      aria-label="Product quantity"
                      className="quantity-input"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      type="number"
                      value={detailQuantity}
                      onChange={(event) =>
                        setDetailQuantity(
                          clampPurchaseQuantity(Number(event.target.value), selectedProductDetail.stock || 99),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDetailQuantity((current) =>
                          clampPurchaseQuantity(current + 1, selectedProductDetail.stock || 99),
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                  <div className="product-detail-actions">
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => {
                        addToCart(selectedProductDetail.id, detailQuantity)
                        setSelectedProductDetailId('')
                      }}
                      disabled={selectedProductDetail.stock === 0}
                    >
                      {t.addToCart}
                    </button>
                  </div>
                </div>
                <div className="product-detail-scroll">
                  {selectedProductDetail.specs.length ? <p>{selectedProductDetail.specs.join(' · ')}</p> : null}
                  <div className="checkout-note">
                    <p>{selectedProductDetail.translations[locale].care}</p>
                  </div>
                  <div className="product-detail-note">
                    <p>{selectedProductDetail.translations[locale].notice}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? renderOverlay(
        <div
          className="checkout-overlay checkout-overlay--drawer"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeCheckoutDrawer()
            }
          }}
        >
          <div
            className="checkout-panel"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="checkout-header">
              <h2>{paymentConfigured ? 'Secure checkout' : t.checkout}</h2>
              <button
                className="ghost-btn small"
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  closeCheckoutDrawer()
                }}
              >
                Close
              </button>
            </div>
            <div className="checkout-scroll">
              <div className="checkout-layout">
                <section className="cart-panel">
                  <h3>{t.orderSummary}</h3>
                  {cartItems.length === 0 ? (
                    <div className="cart-empty-state">
                      <p>{t.emptyCart}</p>
                      <p>Add a few pieces from the shop and come back here to checkout.</p>
                      <button
                        className="secondary-btn small"
                        type="button"
                        onClick={() => openShopView(ALL_PRODUCTS_CATEGORY)}
                      >
                        Continue shopping
                      </button>
                    </div>
                  ) : (
                    <>
                      {cartItems.map(({ product, quantity }) => (
                        <article className="cart-line" key={product.id}>
                          <div>
                            <strong>{product.translations[locale].name}</strong>
                            <span>{`$${product.price.toFixed(2)} x ${quantity}`}</span>
                          </div>
                          <div className="quantity-controls">
                            <button type="button" onClick={() => updateQuantity(product.id, -1)}>-</button>
                            <input
                              aria-label={`${product.translations[locale].name} quantity`}
                              inputMode="numeric"
                              min={0}
                              step={1}
                              type="number"
                              value={quantity}
                              onChange={(event) =>
                                setCartQuantity(product.id, Number(event.target.value), product.stock || 99)
                              }
                              style={{ width: 72, textAlign: 'center' }}
                            />
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
                        <div className="checkout-note compact">
                          <label className="field checkbox-field">
                            <span>Free shipping (coming soon)</span>
                            <input
                              type="checkbox"
                              disabled={!freeShippingEnabled}
                              checked={freeShippingRequested}
                              aria-disabled={!freeShippingEnabled}
                              readOnly
                            />
                          </label>
                        </div>
                        <div>
                          <span>Tax</span>
                          <strong>${tax.toFixed(2)}</strong>
                        </div>
                        <div>
                          <span>Discount</span>
                          <strong>-${discount.toFixed(2)}</strong>
                        </div>
                        <div className="grand-total">
                          <span>Total</span>
                          <strong>${total.toFixed(2)}</strong>
                        </div>
                      </div>
                    </>
                  )}
                </section>
                <form className="checkout-form" onSubmit={(event) => void beginCheckout(event)}>
                  {!cartItems.length ? (
                    <div className="checkout-note">
                      <p>Add items from the shop to unlock secure checkout.</p>
                    </div>
                  ) : null}
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
                    Phone (optional)
                    <div className="phone-row">
                      <select
                        value={checkoutForm.phoneCountryCode}
                        onChange={(event) =>
                          setCheckoutForm((current) => ({ ...current, phoneCountryCode: event.target.value }))
                        }
                      >
                        {phoneCountryCodes.map((entry) => (
                          <option key={entry.iso2} value={entry.dialCode}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                      <input
                        value={checkoutForm.phoneNumber}
                        placeholder="Phone number"
                        onChange={(event) =>
                          setCheckoutForm((current) => ({ ...current, phoneNumber: event.target.value }))
                        }
                      />
                    </div>
                  </label>
                  <label>
                    Country
                    <select
                      value={checkoutForm.country}
                      onChange={(event) =>
                        setCheckoutForm((current) => {
                          const nextCountry = event.target.value
                          const matchedDialCode =
                            phoneCountryCodes.find((entry) => entry.country === nextCountry)?.dialCode ??
                            current.phoneCountryCode
                          return { ...current, country: nextCountry, phoneCountryCode: matchedDialCode }
                        })
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
                  <label>
                    Payment method
                    <select
                      value={checkoutForm.provider}
                      onChange={(event) =>
                        setCheckoutForm((current) => ({ ...current, provider: event.target.value as 'stripe' | 'alipay' | 'paypal' | 'crypto' }))
                      }
                    >
                      <option value="paypal" disabled={!paymentMethods.paypalEnabled}>
                        {paymentMethods.paypalEnabled ? 'PayPal' : 'PayPal (Unavailable)'}
                      </option>
                      <option value="stripe" disabled={!paymentMethods.stripeEnabled}>
                        {paymentMethods.stripeEnabled ? 'Credit Card (Stripe)' : 'Credit Card (Unavailable)'}
                      </option>
                      <option value="alipay" disabled={!paymentMethods.alipayEnabled}>
                        {paymentMethods.alipayEnabled ? 'Alipay' : 'Alipay (Unavailable)'}
                      </option>
                      <option value="crypto" disabled={!paymentMethods.cryptoEnabled}>
                        {paymentMethods.cryptoEnabled ? 'Cryptocurrency (Manual)' : 'Cryptocurrency (Unavailable)'}
                      </option>
                    </select>
                  </label>
                  <div className="checkout-note">
                    <p>
                      {paymentConfigured
                        ? selectedPaymentMethodEnabled
                          ? 'You can pay securely on the next page.'
                          : 'The selected payment method is not enabled right now.'
                        : 'Checkout is temporarily unavailable right now.'}
                    </p>
                    <p>{emailConfigured ? 'Order confirmation is sent after payment.' : 'Order details still show on the confirmation screen.'}</p>
                  </div>
                  <div className="checkout-submit-bar">
                    <button
                      className="primary-btn"
                      type="submit"
                      disabled={!cartItems.length || !paymentConfigured || !selectedPaymentMethodEnabled}
                    >
                      Proceed to secure payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {paymentReceipt ? (
        <PaymentSuccessModal
          key={paymentReceipt.orderId}
          open={Boolean(paymentReceipt)}
          orderId={paymentReceipt.orderId}
          total={paymentReceipt.total}
          currency={paymentReceipt.currency || 'USD'}
          trackingUrl={paymentReceipt.trackingUrl}
          trackingCarrier={paymentReceipt.trackingCarrier}
          trackingNumber={paymentReceipt.trackingNumber}
          shippedAt={paymentReceipt.shippedAt}
          expectedDeliveryAt={paymentReceipt.expectedDeliveryAt}
          trackingLabel={(locale as string) === 'zh' ? '查看物流' : 'Track shipment'}
          etaLabel={(locale as string) === 'zh' ? '预计到达' : 'Estimated arrival'}
          shippedLabel={(locale as string) === 'zh' ? '发货日期' : 'Shipped on'}
          noTrackingLabel={
            (locale as string) === 'zh'
              ? '发货后会显示物流链接。'
              : 'Tracking link will appear after dispatch.'
          }
          onClose={() => setPaymentReceipt(null)}
        />
      ) : null}

      {cryptoInstructions && (
        <div className="modal-overlay" onClick={() => setCryptoInstructions(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{(locale as string) === 'zh' ? '加密货币支付说明' : 'Cryptocurrency Payment Instructions'}</h2>
              <button className="close-btn" onClick={() => setCryptoInstructions(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="crypto-instructions">
                <p className="instruction-text">
                  {(locale as string) === 'zh' 
                    ? '请将以下金额发送到我们的钱包地址。支付完成后，请联系客服并提供您的订单 ID。'
                    : 'Please send the following amount to our wallet address. Once paid, contact support with your Order ID.'}
                </p>
                
                <div className="info-row">
                  <span className="label">{(locale as string) === 'zh' ? '订单 ID' : 'Order ID'}:</span>
                  <span className="value font-mono">{cryptoInstructions.orderId}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">{(locale as string) === 'zh' ? '总计金额' : 'Total Amount'}:</span>
                  <span className="value font-mono">${cryptoInstructions.total} USD</span>
                </div>
                
                <div className="info-row">
                  <span className="label">{(locale as string) === 'zh' ? '钱包地址' : 'Wallet Address'}:</span>
                  <span className="value font-mono break-all">{cryptoInstructions.address}</span>
                </div>

                <div className="crypto-note">
                  <p>{(locale as string) === 'zh' ? '支持网络：ERC20 / TRC20 (USDT)' : 'Supported Networks: ERC20 / TRC20 (USDT)'}</p>
                </div>

                <button 
                  className="primary-btn mt-4" 
                  onClick={() => {
                    navigator.clipboard.writeText(cryptoInstructions.address)
                    showToast((locale as string) === 'zh' ? '地址已复制' : 'Address copied')
                  }}
                >
                  {(locale as string) === 'zh' ? '复制钱包地址' : 'Copy Wallet Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

