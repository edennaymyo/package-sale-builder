import { v4 as uuidv4 } from 'uuid'
import { findCatalogProductByShortCode } from './productCatalog'

export interface ProductOption {
  id: string
  name: string
  shortCode?: string
  reamsPerBox?: number
  odooProductId?: number
  odooProductName?: string
  odooBoxPrice?: number
  odooPriceMinQuantity?: number
  odooPriceRule?: 'round-down' | 'nearest-minimum'
  odooPriceUpdatedAt?: string
  qty: number
  originalPrice: number
  promoPrice: number
}

export interface ProductLine {
  id: string
  type: 'fixed' | 'or-group'
  fixedProduct?: ProductOption
  orOptions?: ProductOption[]
}

export interface Package {
  id: string
  name: string
  description: string
  isActive?: boolean
  validFrom: string
  validTo: string
  totalDiscount?: number
  productLines: ProductLine[]
  createdAt: string
  updatedAt: string
}

export function createEmptyProduct(): ProductOption {
  return {
    id: uuidv4(),
    name: '',
    qty: 1,
    originalPrice: 0,
    promoPrice: 0,
  }
}

export function createEmptyProductLine(): ProductLine {
  return {
    id: uuidv4(),
    type: 'fixed',
    fixedProduct: createEmptyProduct(),
  }
}

export function createEmptyPackage(): Package {
  return {
    id: uuidv4(),
    name: '',
    description: '',
    isActive: true,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalDiscount: 0,
    productLines: [createEmptyProductLine()],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function parseAmount(value: number | string): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const parsed = Number(value.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateLineTotal(line: ProductLine, selectedOptionId?: string): { original: number; promo: number } {
  if (line.type === 'fixed' && line.fixedProduct) {
    const boxes = parseAmount(line.fixedProduct.qty)
    const reamsPerBox = parseAmount(line.fixedProduct.reamsPerBox || 1)
    const reamPrice = parseAmount(line.fixedProduct.originalPrice)
    return {
      original: boxes * reamsPerBox * reamPrice,
      promo: boxes * reamsPerBox * reamPrice,
    }
  }
  
  if (line.type === 'or-group' && line.orOptions) {
    const selected = selectedOptionId 
      ? line.orOptions.find(o => o.id === selectedOptionId)
      : line.orOptions[0]
    
    if (selected) {
      const boxes = parseAmount(selected.qty)
      const reamsPerBox = parseAmount(selected.reamsPerBox || 1)
      const reamPrice = parseAmount(selected.originalPrice)
      return {
        original: boxes * reamsPerBox * reamPrice,
        promo: boxes * reamsPerBox * reamPrice,
      }
    }
  }
  
  return { original: 0, promo: 0 }
}

export function calculatePackageTotals(pkg: Package | null, selections?: Record<string, string>): { 
  originalTotal: number
  promoTotal: number
  discountAmount: number
  discountPercent: number
} {
  if (!pkg) {
    return {
      originalTotal: 0,
      promoTotal: 0,
      discountAmount: 0,
      discountPercent: 0,
    }
  }
  
  let originalTotal = 0
  
  pkg.productLines.forEach(line => {
    const selectedId = selections?.[line.id]
    const totals = calculateLineTotal(line, selectedId)
    originalTotal += totals.original
  })
  
  const requestedDiscount = parseAmount(pkg.totalDiscount || 0)
  const discountAmount = Math.min(Math.max(requestedDiscount, 0), originalTotal)
  const promoTotal = originalTotal - discountAmount
  const discountPercent = originalTotal > 0 ? (discountAmount / originalTotal) * 100 : 0
  
  return {
    originalTotal,
    promoTotal,
    discountAmount,
    discountPercent,
  }
}

export function getPackageProducts(pkg: Package): string[] {
  const products: string[] = []
  
  pkg.productLines.forEach(line => {
    if (line.type === 'fixed' && line.fixedProduct?.name) {
      products.push(line.fixedProduct.name)
    } else if (line.type === 'or-group' && line.orOptions) {
      line.orOptions.forEach(opt => {
        if (opt.name) products.push(opt.name)
      })
    }
  })
  
  return products
}

const STORAGE_KEY = 'modern-science-packages'
const API_ENDPOINT = '/api/packages'

function isLocalDevHost(): boolean {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
}

export type PackageStatus = 'active' | 'inactive' | 'expired'

export function getPackageStatus(pkg: Package): PackageStatus {
  if (pkg.isActive === false) return 'inactive'

  const today = new Date().toISOString().split('T')[0]
  return pkg.validFrom <= today && pkg.validTo >= today ? 'active' : 'expired'
}

function normalizeProduct(product: ProductOption): ProductOption {
  const catalogProduct = findCatalogProductByShortCode(product.shortCode)
  return catalogProduct ? {
    ...product,
    name: catalogProduct.name,
    reamsPerBox: catalogProduct.reamsPerBox,
  } : product
}

function normalizePackage(pkg: Package): Package {
  return {
    ...pkg,
    productLines: pkg.productLines.map(line => ({
      ...line,
      fixedProduct: line.fixedProduct ? normalizeProduct(line.fixedProduct) : undefined,
      orOptions: line.orOptions?.map(normalizeProduct),
    })),
  }
}

function normalizePackages(packages: Package[]): Package[] {
  return packages.map(normalizePackage)
}

export function loadPackages(): Package[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? normalizePackages(JSON.parse(stored)) : []
  } catch {
    return []
  }
}

export function savePackages(packages: Package[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packages))
}

export function addPackage(pkg: Package): Package[] {
  const packages = loadPackages()
  if (packages.length >= 20) {
    throw new Error('Maximum of 20 packages allowed')
  }
  packages.push(pkg)
  savePackages(packages)
  return packages
}

export function updatePackage(pkg: Package): Package[] {
  const packages = loadPackages()
  const index = packages.findIndex(p => p.id === pkg.id)
  if (index !== -1) {
    packages[index] = { ...pkg, updatedAt: new Date().toISOString() }
    savePackages(packages)
  }
  return packages
}

export function deletePackage(id: string): Package[] {
  const packages = loadPackages().filter(p => p.id !== id)
  savePackages(packages)
  return packages
}

export function getPackageById(id: string): Package | undefined {
  return loadPackages().find(p => p.id === id)
}

async function requestPackages(): Promise<Package[]> {
  const response = await fetch(API_ENDPOINT, {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Failed to load packages')
  }

  return normalizePackages(await response.json())
}

async function persistPackages(packages: Package[]): Promise<Package[]> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(packages),
      credentials: 'same-origin',
    })

    if (!response.ok) {
      if (isLocalDevHost()) {
        savePackages(packages)
        return packages
      }

      const data = await response.json().catch(() => null)
      throw new Error(data?.error || 'Failed to save packages')
    }

    savePackages(packages)
    return response.json()
  } catch (error) {
    if (isLocalDevHost()) {
      savePackages(packages)
      return packages
    }

    throw error
  }
}

export async function fetchPackages(): Promise<Package[]> {
  try {
    const packages = await requestPackages()
    savePackages(packages)
    return packages
  } catch {
    return loadPackages()
  }
}

export async function fetchPackageById(id: string): Promise<Package | undefined> {
  return (await fetchPackages()).find(p => p.id === id)
}

export async function addPackageRemote(pkg: Package): Promise<Package[]> {
  const packages = await fetchPackages()
  if (packages.length >= 20) {
    throw new Error('Maximum of 20 packages allowed')
  }

  const updatedPackages = [...packages, pkg]
  return persistPackages(updatedPackages)
}

export async function updatePackageRemote(pkg: Package): Promise<Package[]> {
  const packages = await fetchPackages()
  const index = packages.findIndex(p => p.id === pkg.id)
  const updatedPackage = { ...pkg, updatedAt: new Date().toISOString() }
  const updatedPackages = index === -1
    ? [...packages, updatedPackage]
    : packages.map(p => p.id === pkg.id ? updatedPackage : p)

  return persistPackages(updatedPackages)
}

export async function deletePackageRemote(id: string): Promise<Package[]> {
  const packages = await fetchPackages()
  const updatedPackages = packages.filter(pkg => pkg.id !== id)
  return persistPackages(updatedPackages)
}
