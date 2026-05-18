const DEFAULT_PRICELIST_NAME = 'Dealer Price'
const ODOO_API_BASE = 'https://odoo-pricelist-api.vercel.app'

function send(res, status, body) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')
  res.setHeader('cache-control', 'no-store')
  return res.status(status).json(body)
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/gsm/g, 'g')
    .replace(/(\d+)g\b/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value) {
  return normalize(value)
    .split(' ')
    .filter(token => token.length > 0)
}

function itemProductId(item) {
  if (Array.isArray(item.product_id)) return Number(item.product_id[0])
  if (Array.isArray(item.product_tmpl_id)) return Number(item.product_tmpl_id[0])
  return null
}

function itemProductName(item) {
  if (Array.isArray(item.product_id)) return String(item.product_id[1] || '')
  if (Array.isArray(item.product_tmpl_id)) return String(item.product_tmpl_id[1] || '')
  return ''
}

async function findPricelist(pricelistName) {
  const response = await fetch(`${ODOO_API_BASE}/api/odoo/pricelists?limit=100`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Odoo pricelist list request failed with ${response.status}`)
  }

  const payload = await response.json()
  const pricelists = Array.isArray(payload.data) ? payload.data : []
  const targetName = normalize(pricelistName)
  return pricelists.find(pricelist => normalize(pricelist.name) === targetName) || null
}

function productMatches(item, { productId, productName, shortCode }) {
  if (productId && itemProductId(item) === Number(productId)) return true

  const itemName = normalize(itemProductName(item))
  const name = normalize(productName)
  const code = normalize(shortCode)
  const nameTokens = tokens(productName)
  const itemTokens = new Set(tokens(itemProductName(item)))

  if (!itemName) return false

  if (code && itemName.includes(code)) return true
  if (name && itemName === name) return true
  if (name && itemName.includes(name)) return true
  if (name && name.includes(itemName)) return true
  if (nameTokens.length >= 2 && nameTokens.every(token => itemTokens.has(token))) return true

  return false
}

function pickTier(items, quantity) {
  const sorted = [...items].sort((a, b) => Number(a.min_quantity || 0) - Number(b.min_quantity || 0))
  const requestedQty = Math.max(Number(quantity) || 0, 0)
  const roundDownTier = [...sorted]
    .reverse()
    .find(item => Number(item.min_quantity || 0) <= requestedQty)

  return roundDownTier || sorted[0] || null
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-methods', 'GET, OPTIONS')
    res.setHeader('access-control-allow-headers', 'content-type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return send(res, 405, { error: 'Method not allowed' })
  }

  const {
    product_id: productId,
    product_name: productName,
    short_code: shortCode,
    quantity,
    reams_per_box: reamsPerBox,
    pricelist_id: requestedPricelistId,
    pricelist_name: requestedPricelistName = process.env.ODOO_PRICELIST_NAME || DEFAULT_PRICELIST_NAME,
  } = req.query

  try {
    const pricelist = requestedPricelistId
      ? { id: Number(requestedPricelistId), name: String(requestedPricelistName || '') }
      : await findPricelist(requestedPricelistName)

    if (!pricelist?.id) {
      return send(res, 404, { error: `Odoo pricelist "${requestedPricelistName}" not found` })
    }

    const pricelistId = Number(pricelist.id)
    const response = await fetch(`${ODOO_API_BASE}/api/odoo/pricelists/${pricelistId}/items?limit=1000`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return send(res, response.status, { error: `Odoo pricelist request failed with ${response.status}` })
    }

    const payload = await response.json()
    const items = Array.isArray(payload.data) ? payload.data : []
    const matchingItems = items.filter(item => productMatches(item, { productId, productName, shortCode }))
    const tier = pickTier(matchingItems, quantity)

    if (!tier) {
      return send(res, 404, {
        error: 'No Odoo price found for this product',
        productName,
        shortCode,
        quantity: Number(quantity) || 0,
      })
    }

    const boxPrice = Number(tier.fixed_price || 0)
    const reamCount = Math.max(Number(reamsPerBox) || 1, 1)

    return send(res, 200, {
      price: boxPrice,
      boxPrice,
      reamPrice: boxPrice / reamCount,
      reamsPerBox: reamCount,
      minQuantity: Number(tier.min_quantity || 0),
      productId: itemProductId(tier),
      productName: itemProductName(tier),
      pricelistId,
      pricelistName: pricelist.name,
      quantity: Number(quantity) || 0,
      rule: Number(tier.min_quantity || 0) <= Number(quantity || 0)
        ? 'round-down'
        : 'nearest-minimum',
    })
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'Odoo price lookup failed' })
  }
}
