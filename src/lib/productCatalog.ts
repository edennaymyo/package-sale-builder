export interface CatalogProduct {
  name: string
  shortCode: string
  reamsPerBox: number
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { name: 'Paper One A4 100g', shortCode: 'PO-A4-100', reamsPerBox: 4 },
  { name: 'Copy & Laser A3 70g', shortCode: 'CL-A3-70', reamsPerBox: 5 },
  { name: 'Double A A3 70g', shortCode: 'DA-A3-70', reamsPerBox: 5 },
  { name: 'Paper One A3 70g', shortCode: 'PO-A3-70', reamsPerBox: 5 },
  { name: 'ACE A4 70g', shortCode: 'AC-A4-70', reamsPerBox: 5 },
  { name: 'Alcott A4 70g Blue', shortCode: 'AL-A4-70', reamsPerBox: 5 },
  { name: 'Double A A4 70g', shortCode: 'DA-A4-70', reamsPerBox: 5 },
  { name: 'Go On A4 70g', shortCode: 'GO-A4-70', reamsPerBox: 5 },
  { name: 'Paper One A4 70g', shortCode: 'PO-A4-70', reamsPerBox: 5 },
  { name: 'Quality A4 70g', shortCode: 'QU-A4-70', reamsPerBox: 5 },
  { name: 'Smartist A4 70g', shortCode: 'SM-A4-70', reamsPerBox: 5 },
  { name: 'ZAP Premium A4 70g', shortCode: 'ZP-A4-70', reamsPerBox: 5 },
  { name: 'Alcott A5 70g', shortCode: 'AL-A5-70', reamsPerBox: 10 },
  { name: 'Paper One A5 70g', shortCode: 'PO-A5-70', reamsPerBox: 10 },
  { name: 'Double A B4 70g', shortCode: 'DA-B4-70', reamsPerBox: 5 },
  { name: 'Paper One B4 70g', shortCode: 'PO-B4-70', reamsPerBox: 5 },
  { name: 'Smartist F14 Legal 70g', shortCode: 'SM-LG-70', reamsPerBox: 5 },
  { name: 'Excellent Legal 70g', shortCode: 'EX-LG-70', reamsPerBox: 5 },
  { name: 'Alcott Legal F14 70g', shortCode: 'AL-LG-70', reamsPerBox: 5 },
  { name: 'Double A Legal F14 70g', shortCode: 'DA-LG-70', reamsPerBox: 5 },
  { name: 'Paper One Legal 75g 5R/box', shortCode: 'PO-LG-75', reamsPerBox: 5 },
  { name: 'Double A A3 80g', shortCode: 'DA-A3-80', reamsPerBox: 5 },
  { name: 'Paper One A3 80g', shortCode: 'PO-A3-80', reamsPerBox: 5 },
  { name: 'Double A A4 80g', shortCode: 'DA-A4-80', reamsPerBox: 5 },
  { name: 'Paper One A4 80g All Purpose', shortCode: 'PO-AP-A4-80', reamsPerBox: 5 },
  { name: 'Paper One A4 80g Digital', shortCode: 'PO-DG-A4-80', reamsPerBox: 5 },
  { name: 'Double A Legal 80g', shortCode: 'DA-LG-80', reamsPerBox: 5 },
]

export function findCatalogProduct(name: string): CatalogProduct | undefined {
  return PRODUCT_CATALOG.find(product => product.name === name || product.shortCode === name)
}

export function findCatalogProductByShortCode(shortCode?: string): CatalogProduct | undefined {
  return shortCode ? PRODUCT_CATALOG.find(product => product.shortCode === shortCode) : undefined
}
