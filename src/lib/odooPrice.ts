import { ProductOption } from './packages'

export interface OdooPriceResult {
  price: number
  boxPrice: number
  reamPrice: number
  reamsPerBox: number
  minQuantity: number
  productId: number
  productName: string
  pricelistId: number
  pricelistName: string
  quantity: number
  rule: 'round-down' | 'nearest-minimum'
}

function odooQuantity(product: ProductOption): number {
  return Math.max(Number(product.qty) || 0, 0)
}

function priceEndpoint(): string {
  return '/api/odoo-price'
}

export async function fetchOdooPrice(product: ProductOption): Promise<OdooPriceResult> {
  const params = new URLSearchParams({
    product_name: product.name,
    short_code: product.shortCode || '',
    quantity: String(odooQuantity(product)),
    reams_per_box: String(Math.max(Number(product.reamsPerBox || 1), 1)),
  })

  const response = await fetch(`${priceEndpoint()}?${params.toString()}`, {
    cache: 'no-store',
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || 'Failed to load Odoo price')
  }

  if (!data?.reamPrice) {
    throw new Error(data?.error || 'Odoo price response is missing ream price')
  }

  return data as OdooPriceResult
}
