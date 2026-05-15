export interface CatalogProduct {
  name: string
  shortCode: string
  reamsPerBox: number
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  { name: '100gsm A4 Paper One', shortCode: 'PO-A4-100', reamsPerBox: 4 },
  { name: '70gsm A3 Copy & Laser', shortCode: 'CL-A3-70', reamsPerBox: 5 },
  { name: '70gsm A3 Double A', shortCode: 'DA-A3-70', reamsPerBox: 5 },
  { name: '70gsm A3 Paper One', shortCode: 'PO-A3-70', reamsPerBox: 5 },
  { name: '70gsm A4 ACE', shortCode: 'AC-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 Alcott (Blue)', shortCode: 'AL-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 Double A', shortCode: 'DA-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 Go On', shortCode: 'GO-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 Paper One', shortCode: 'PO-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 Quality', shortCode: 'QU-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 Smartist', shortCode: 'SM-A4-70', reamsPerBox: 5 },
  { name: '70gsm A4 ZAP Premium', shortCode: 'ZP-A4-70', reamsPerBox: 5 },
  { name: '70gsm A5 Alcott', shortCode: 'AL-A5-70', reamsPerBox: 10 },
  { name: '70gsm A5 Paper One', shortCode: 'PO-A5-70', reamsPerBox: 10 },
  { name: '70gsm B4 Double A', shortCode: 'DA-B4-70', reamsPerBox: 5 },
  { name: '70gsm B4 Paper One', shortCode: 'PO-B4-70', reamsPerBox: 5 },
  { name: '70gsm F14 Legal Smartist', shortCode: 'SM-LG-70', reamsPerBox: 5 },
  { name: '70gsm Legal Excellent', shortCode: 'EX-LG-70', reamsPerBox: 5 },
  { name: '70gsm Legal F14 Alcott', shortCode: 'AL-LG-70', reamsPerBox: 5 },
  { name: '70gsm Legal F14 Double', shortCode: 'DA-LG-70', reamsPerBox: 5 },
  { name: '75gsm Legal Paper One 5R/box', shortCode: 'PO-LG-75', reamsPerBox: 5 },
  { name: '80gsm A3 Double A', shortCode: 'DA-A3-80', reamsPerBox: 5 },
  { name: '80gsm A3 Paper One', shortCode: 'PO-A3-80', reamsPerBox: 5 },
  { name: '80gsm A4 Double A', shortCode: 'DA-A4-80', reamsPerBox: 5 },
  { name: '80gsm A4 Paper One (All Purpose)', shortCode: 'PO-AP-A4-80', reamsPerBox: 5 },
  { name: '80gsm A4 Paper One (Digital)', shortCode: 'PO-DG-A4-80', reamsPerBox: 5 },
  { name: '80gsm Legal Double A', shortCode: 'DA-LG-80', reamsPerBox: 5 },
]

export function findCatalogProduct(name: string): CatalogProduct | undefined {
  return PRODUCT_CATALOG.find(product => product.name === name)
}
