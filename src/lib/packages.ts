import { v4 as uuidv4 } from 'uuid'

export interface ProductOption {
  id: string
  name: string
  shortCode?: string
  reamsPerBox?: number
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
  validFrom: string
  validTo: string
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
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    return {
      original: parseAmount(line.fixedProduct.qty) * parseAmount(line.fixedProduct.originalPrice),
      promo: parseAmount(line.fixedProduct.qty) * parseAmount(line.fixedProduct.promoPrice),
    }
  }
  
  if (line.type === 'or-group' && line.orOptions) {
    const selected = selectedOptionId 
      ? line.orOptions.find(o => o.id === selectedOptionId)
      : line.orOptions[0]
    
    if (selected) {
      return {
        original: parseAmount(selected.qty) * parseAmount(selected.originalPrice),
        promo: parseAmount(selected.qty) * parseAmount(selected.promoPrice),
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
  let promoTotal = 0
  
  pkg.productLines.forEach(line => {
    const selectedId = selections?.[line.id]
    const totals = calculateLineTotal(line, selectedId)
    originalTotal += totals.original
    promoTotal += totals.promo
  })
  
  const discountAmount = originalTotal - promoTotal
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
  const productLabel = (product: ProductOption) =>
    product.shortCode ? `${product.name} (${product.shortCode})` : product.name
  
  pkg.productLines.forEach(line => {
    if (line.type === 'fixed' && line.fixedProduct?.name) {
      products.push(productLabel(line.fixedProduct))
    } else if (line.type === 'or-group' && line.orOptions) {
      line.orOptions.forEach(opt => {
        if (opt.name) products.push(productLabel(opt))
      })
    }
  })
  
  return products
}

const STORAGE_KEY = 'modern-science-packages'

export function loadPackages(): Package[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
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
