export interface CatalogProduct {
  name: string
  shortCode: string
  reamsPerBox: number
}

const STORAGE_KEY = 'modern-science-standard-box-qty'
const API_ENDPOINT = '/api/box-qty'

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { name: 'Paper One 100gsm A4', shortCode: 'PO-A4-100', reamsPerBox: 4 },
  { name: 'Copy & Laser 70gsm A3', shortCode: 'CL-A3-70', reamsPerBox: 5 },
  { name: 'Double A 70gsm A3', shortCode: 'DA-A3-70', reamsPerBox: 5 },
  { name: 'Paper One 70gsm A3', shortCode: 'PO-A3-70', reamsPerBox: 5 },
  { name: 'ACE 70gsm A4', shortCode: 'AC-A4-70', reamsPerBox: 5 },
  { name: 'Alcott (Blue) 70gsm A4', shortCode: 'AL-A4-70', reamsPerBox: 5 },
  { name: 'Double A 70gsm A4', shortCode: 'DA-A4-70', reamsPerBox: 5 },
  { name: 'Go On 70gsm A4', shortCode: 'GO-A4-70', reamsPerBox: 5 },
  { name: 'Paper One 70gsm A4', shortCode: 'PO-A4-70', reamsPerBox: 5 },
  { name: 'Quality 70gsm A4', shortCode: 'QU-A4-70', reamsPerBox: 5 },
  { name: 'Smartist 70gsm A4', shortCode: 'SM-A4-70', reamsPerBox: 5 },
  { name: 'ZAP Premium 70gsm A4', shortCode: 'ZP-A4-70', reamsPerBox: 5 },
  { name: 'Alcott 70gsm A5', shortCode: 'AL-A5-70', reamsPerBox: 10 },
  { name: 'Paper One 70gsm A5', shortCode: 'PO-A5-70', reamsPerBox: 10 },
  { name: 'Double A 70gsm B4', shortCode: 'DA-B4-70', reamsPerBox: 5 },
  { name: 'Paper One 70gsm B4', shortCode: 'PO-B4-70', reamsPerBox: 5 },
  { name: 'Smartist 70gsm Legal F14', shortCode: 'SM-LG-70', reamsPerBox: 5 },
  { name: 'Excellent 70gsm Legal', shortCode: 'EX-LG-70', reamsPerBox: 5 },
  { name: 'Alcott 70gsm Legal F14', shortCode: 'AL-LG-70', reamsPerBox: 5 },
  { name: 'Double A 70gsm Legal F14', shortCode: 'DA-LG-70', reamsPerBox: 5 },
  { name: 'Paper One 75gsm Legal 5R/Box', shortCode: 'PO-LG-75', reamsPerBox: 5 },
  { name: 'Double A 80gsm A3', shortCode: 'DA-A3-80', reamsPerBox: 5 },
  { name: 'Paper One 80gsm A3', shortCode: 'PO-A3-80', reamsPerBox: 5 },
  { name: 'Double A 80gsm A4', shortCode: 'DA-A4-80', reamsPerBox: 5 },
  { name: 'Paper One 80gsm A4 (All Purpose) နက်ပြာ', shortCode: 'PO-AP-A4-80', reamsPerBox: 5 },
  { name: 'Paper One 80gsm A4 (Digital) အနီ', shortCode: 'PO-DG-A4-80', reamsPerBox: 5 },
  { name: 'Double A 80gsm Legal F14', shortCode: 'DA-LG-80', reamsPerBox: 5 },
]

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readBoxQtyOverrides(): Record<string, number> {
  if (!canUseStorage()) return {}

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function writeBoxQtyOverrides(overrides: Record<string, number>): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

function normalizeCatalogProduct(product: CatalogProduct, overrides = readBoxQtyOverrides()): CatalogProduct {
  const override = overrides[product.shortCode]
  return Number.isFinite(override) && override > 0
    ? { ...product, reamsPerBox: override }
    : product
}

export function getCatalogProducts(): CatalogProduct[] {
  const overrides = readBoxQtyOverrides()
  return PRODUCT_CATALOG.map(product => normalizeCatalogProduct(product, overrides))
}

export function updateCatalogProductBoxQty(shortCode: string, reamsPerBox: number): CatalogProduct[] {
  if (!canUseStorage()) return getCatalogProducts()

  const normalizedQty = Math.max(1, Math.floor(reamsPerBox || 1))
  const overrides = readBoxQtyOverrides()
  const defaultProduct = PRODUCT_CATALOG.find(product => product.shortCode === shortCode)

  if (defaultProduct && defaultProduct.reamsPerBox === normalizedQty) {
    delete overrides[shortCode]
  } else {
    overrides[shortCode] = normalizedQty
  }

  writeBoxQtyOverrides(overrides)
  return getCatalogProducts()
}

export function resetCatalogProductBoxQty(shortCode: string): CatalogProduct[] {
  if (!canUseStorage()) return getCatalogProducts()

  const overrides = readBoxQtyOverrides()
  delete overrides[shortCode]
  writeBoxQtyOverrides(overrides)
  return getCatalogProducts()
}

async function requestBoxQtyOverrides(): Promise<Record<string, number>> {
  const response = await fetch(API_ENDPOINT, {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Failed to load standard box qty')
  }

  return response.json()
}

async function persistBoxQtyOverrides(overrides: Record<string, number>): Promise<Record<string, number>> {
  const response = await fetch(API_ENDPOINT, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(overrides),
    credentials: 'same-origin',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Failed to save standard box qty')
  }

  return response.json()
}

export async function fetchCatalogProducts(): Promise<CatalogProduct[]> {
  try {
    const overrides = await requestBoxQtyOverrides()
    writeBoxQtyOverrides(overrides)
    return getCatalogProducts()
  } catch {
    return getCatalogProducts()
  }
}

export async function updateCatalogProductBoxQtyRemote(shortCode: string, reamsPerBox: number): Promise<CatalogProduct[]> {
  const nextProducts = updateCatalogProductBoxQty(shortCode, reamsPerBox)
  try {
    await persistBoxQtyOverrides(readBoxQtyOverrides())
  } catch {
    return nextProducts
  }

  return getCatalogProducts()
}

export async function resetCatalogProductBoxQtyRemote(shortCode: string): Promise<CatalogProduct[]> {
  const nextProducts = resetCatalogProductBoxQty(shortCode)
  try {
    await persistBoxQtyOverrides(readBoxQtyOverrides())
  } catch {
    return nextProducts
  }

  return getCatalogProducts()
}

export function findCatalogProduct(name: string): CatalogProduct | undefined {
  return getCatalogProducts().find(product => product.name === name || product.shortCode === name)
}

export function findCatalogProductByShortCode(shortCode?: string): CatalogProduct | undefined {
  return shortCode ? getCatalogProducts().find(product => product.shortCode === shortCode) : undefined
}
