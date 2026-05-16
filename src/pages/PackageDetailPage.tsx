import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import {
  ArrowLeft,
  Calendar,
  Download,
  MessageCircle,
} from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import {
  Package,
  ProductLine,
  ProductOption,
  fetchPackageById,
  calculatePackageTotals,
  calculateLineTotal,
} from '@/lib/packages'

const VIBER_NUMBER = '09965162112'

function boxInfo(product: ProductOption): string {
  const boxLabel = product.qty === 1 ? 'box' : 'boxes'
  return `${product.qty} ${boxLabel}`
}

function reamPriceInfo(product: ProductOption): string {
  return `${formatCurrency(product.originalPrice)} / ream`
}

function getSelectedProduct(line: ProductLine, selectedOptionId?: string): ProductOption | undefined {
  return line.type === 'fixed'
    ? line.fixedProduct
    : line.orOptions?.find(option => option.id === selectedOptionId) || line.orOptions?.[0]
}

function buildOrderText(pkg: Package, selections: Record<string, string>): string {
  const totals = calculatePackageTotals(pkg, selections)
  const lines = pkg.productLines
    .map((line, index) => {
      const selected = getSelectedProduct(line, selections[line.id])
      if (!selected) return null
      const amount = calculateLineTotal(line, selections[line.id]).original
      return `${index + 1}. ${selected.name} - ${boxInfo(selected)} x ${reamPriceInfo(selected)} = ${formatCurrency(amount)}`
    })
    .filter(Boolean)
    .join('\n')

  return `${pkg.name}\n` +
    `Order Detail (${pkg.productLines.length} items)\n` +
    `${lines}\n` +
    `Total: ${formatCurrency(totals.originalTotal)}\n` +
    `Discount: ${formatCurrency(totals.discountAmount)} (${formatPercent(totals.discountPercent)})\n` +
    `Package Price: ${formatCurrency(totals.promoTotal)}\n` +
    `Valid: ${pkg.validFrom} to ${pkg.validTo}\n\n` +
    `Viber: ${VIBER_NUMBER}`
}

export function PackageDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true

    if (id) {
      fetchPackageById(id).then(found => {
        if (!active) return
        if (found) {
          setPkg(found)
          const initialSelections: Record<string, string> = {}
          found.productLines.forEach(line => {
            if (line.type === 'or-group' && line.orOptions?.[0]) {
              initialSelections[line.id] = line.orOptions[0].id
            }
          })
          setSelections(initialSelections)
        } else {
          navigate('/explore')
        }
      })
    }

    return () => {
      active = false
    }
  }, [id, navigate])

  const handleSelectOption = (lineId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [lineId]: optionId }))
  }

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return
    
    setGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      })
      
      // Create download link
      const link = document.createElement('a')
      link.download = `${pkg?.name || 'package'}-promo.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Failed to generate image:', error)
    } finally {
      setGenerating(false)
    }
  }, [pkg?.name])

  const shareToViber = useCallback(() => {
    if (!pkg) return
    const text = buildOrderText(pkg, selections)
    navigator.clipboard?.writeText(text).catch(() => undefined)
    
    // Viber share URL
    const viberUrl = `viber://forward?text=${encodeURIComponent(text)}`
    window.open(viberUrl, '_blank')
  }, [pkg, selections])

  if (!pkg) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
      </div>
    )
  }

  const totals = calculatePackageTotals(pkg, selections)
  const isActive = (() => {
    const today = new Date().toISOString().split('T')[0]
    return pkg.validFrom <= today && pkg.validTo >= today
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/explore')}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy">{pkg.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              )}>
                {isActive ? 'Active' : 'Expired'}
              </span>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {pkg.validFrom} to {pkg.validTo}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-navy">Select Your Products</h2>
          
          {pkg.description && (
            <p className="text-muted-foreground">{pkg.description}</p>
          )}

          <div className="space-y-4">
            {pkg.productLines.map((line, idx) => (
              <ProductLineCard
                key={line.id}
                line={line}
                index={idx}
                selectedOptionId={selections[line.id]}
                onSelectOption={optionId => handleSelectOption(line.id, optionId)}
              />
            ))}
          </div>
        </div>

        {/* Shareable Card Preview */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy">Share Card Preview</h2>
            <span className="text-xs text-muted-foreground">Image will be generated from this</span>
          </div>
          
          {/* The actual card that will be converted to image */}
          <div
            ref={cardRef}
            className="bg-white rounded-xl overflow-hidden shadow-lg border"
            style={{ maxWidth: '400px' }}
          >
            {/* Card Header */}
            <div className="bg-navy p-5 text-white">
              <div className="mb-4">
                <img
                  src="/brand/modern-science-logo-reverse.png"
                  alt="Modern Science Co.,Ltd."
                  className="mb-1 h-10 w-auto max-w-full object-contain"
                />
                <p className="text-white/80 text-xs">Premium Paper Wholesale</p>
              </div>
              <h3 className="text-xl font-bold">{pkg.name}</h3>
              {pkg.description && (
                <p className="text-white/70 text-sm mt-1 line-clamp-2">{pkg.description}</p>
              )}
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-4">
              {/* Products List */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Package Includes:
                </p>
                {pkg.productLines.map((line, idx) => {
                  const selected = getSelectedProduct(line, selections[line.id])
                  
                  if (!selected) return null
                  
                  const lineTotal = calculateLineTotal(line, selections[line.id])
                  
                  return (
                    <div key={line.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-gold/20 text-gold text-xs font-bold rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{selected.name}</p>
                          <p className="text-sm font-semibold text-navy">
                            {boxInfo(selected)} <span className="text-xs font-normal text-muted-foreground">x {reamPriceInfo(selected)}</span>
                            {line.type === 'or-group' && (
                              <span className="text-gold ml-1">(or choice)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-gold">{formatCurrency(lineTotal.original)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pricing Summary */}
              <div className="bg-navy/5 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(totals.originalTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-green-600 font-medium">Total Discount:</span>
                  <span className="text-green-600 font-bold">{formatCurrency(totals.discountAmount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-navy/10">
                  <span className="text-sm font-medium">Package Price:</span>
                  <span className="text-2xl font-bold text-gold">
                    {formatCurrency(totals.promoTotal)}
                  </span>
                </div>
              </div>

              {/* Validity */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Valid: {pkg.validFrom} to {pkg.validTo}</span>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ maxWidth: '400px' }}>
            <button
              onClick={shareToViber}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#7360f2] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6050d2] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Order via Viber
            </button>
            <button
              onClick={generateImage}
              disabled={generating}
              className="flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-navy hover:bg-gold-dark transition-colors disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {generating ? 'Saving...' : 'Save order image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProductLineCardProps {
  line: ProductLine
  index: number
  selectedOptionId?: string
  onSelectOption: (optionId: string) => void
}

function ProductLineCard({ line, index, selectedOptionId, onSelectOption }: ProductLineCardProps) {
  const lineTotal = calculateLineTotal(line, selectedOptionId)

  if (line.type === 'fixed' && line.fixedProduct) {
    return (
      <div className="bg-card rounded-xl border p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 bg-navy text-white text-sm font-bold rounded-full flex items-center justify-center">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate whitespace-nowrap text-lg font-semibold text-navy">{line.fixedProduct.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-navy/5 px-2.5 py-1 text-base font-bold text-navy">
                  {boxInfo(line.fixedProduct)}
                </span>
                <span className="text-sm text-muted-foreground">x {reamPriceInfo(line.fixedProduct)}</span>
              </div>
            </div>
          </div>
          <div className="border-t pt-3 text-right">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-xl font-bold text-gold">{formatCurrency(lineTotal.original)}</p>
          </div>
        </div>
      </div>
    )
  }

  if (line.type === 'or-group' && line.orOptions) {
    return (
      <div className="bg-card rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="w-9 h-9 bg-gold text-navy text-sm font-bold rounded-full flex items-center justify-center">
            {index + 1}
          </span>
          <div>
            <p className="font-semibold text-navy">Choose one option</p>
            <p className="text-sm text-muted-foreground">Select the product you want for this line.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {line.orOptions.map(option => {
            const isSelected = selectedOptionId === option.id || (!selectedOptionId && line.orOptions?.[0]?.id === option.id)
            const optTotal = calculateLineTotal({
              id: line.id,
              type: 'or-group',
              orOptions: [option],
            }, option.id).original
            
            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                className={cn(
                  'w-full rounded-xl border-2 p-4 text-left transition-all',
                  isSelected
                    ? 'border-gold bg-gold/10 shadow-sm'
                    : 'border-border bg-white hover:border-gold/40 hover:bg-gold/5'
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      isSelected ? 'border-gold bg-white' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && <div className="w-3 h-3 bg-gold rounded-full" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate whitespace-nowrap text-lg font-semibold text-navy">{option.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-navy/5 px-2.5 py-1 text-base font-bold text-navy">
                          {boxInfo(option)}
                        </span>
                        <span className="text-sm text-muted-foreground">x {reamPriceInfo(option)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-3 text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className={cn(
                      'text-xl font-bold',
                      isSelected ? 'text-gold' : 'text-muted-foreground'
                    )}>
                      {formatCurrency(optTotal)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}
