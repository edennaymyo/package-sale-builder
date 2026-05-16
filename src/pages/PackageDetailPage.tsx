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

function buildViberForwardText(pkg: Package, selections: Record<string, string>): string {
  const totals = calculatePackageTotals(pkg, selections)
  const lines = pkg.productLines
    .map((line, index) => {
      const selected = getSelectedProduct(line, selections[line.id])
      if (!selected) return null
      const productName = selected.shortCode || selected.name
      return `${index + 1}) ${productName} ${selected.qty}bx@${formatCurrency(selected.originalPrice)}`
    })
    .filter(Boolean)
    .join('\n')

  return `${pkg.name}\n${lines}\n` +
    `T:${formatCurrency(totals.originalTotal)} ` +
    `D:${formatCurrency(totals.discountAmount)} ` +
    `P:${formatCurrency(totals.promoTotal)}`
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
    const clipboardText = buildOrderText(pkg, selections)
    const viberText = buildViberForwardText(pkg, selections)
    navigator.clipboard?.writeText(clipboardText).catch(() => undefined)
    
    // Viber share URL
    const viberUrl = `viber://forward?text=${encodeURIComponent(viberText)}`
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

      <div className="mx-auto max-w-[440px] space-y-4">
          {/* The actual card that will be converted to image */}
          <div
            ref={cardRef}
            className="overflow-hidden rounded-xl border bg-white shadow-lg"
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
                {pkg.productLines.map((line, idx) => (
                  <ShareCardLine
                    key={line.id}
                    line={line}
                    index={idx}
                    selectedOptionId={selections[line.id]}
                    onSelectOption={optionId => handleSelectOption(line.id, optionId)}
                  />
                ))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
  )
}

interface ShareCardLineProps {
  line: ProductLine
  index: number
  selectedOptionId?: string
  onSelectOption: (optionId: string) => void
}

function ShareCardLine({ line, index, selectedOptionId, onSelectOption }: ShareCardLineProps) {
  const lineTotal = calculateLineTotal(line, selectedOptionId)

  if (line.type === 'fixed' && line.fixedProduct) {
    return (
      <div className="border-b py-2 last:border-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate whitespace-nowrap text-sm font-medium text-navy">{line.fixedProduct.name}</p>
              <p className="text-sm font-semibold text-navy">
                {boxInfo(line.fixedProduct)}
                <span className="text-xs font-normal text-muted-foreground"> x {reamPriceInfo(line.fixedProduct)}</span>
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-lg font-bold text-gold">{formatCurrency(lineTotal.original)}</p>
          </div>
        </div>
      </div>
    )
  }

  if (line.type === 'or-group' && line.orOptions) {
    return (
      <div className="animate-choice-shake border-b py-3 last:border-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
            {index + 1}
          </span>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gold-dark">
            Choose one option
          </span>
        </div>

        <div className="space-y-2">
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
                  'w-full rounded-lg border-2 p-3 text-left transition-all',
                  isSelected
                    ? 'border-gold bg-gold/10 shadow-sm ring-2 ring-gold/20'
                    : 'border-border bg-white hover:border-gold/50 hover:bg-gold/5'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
                      isSelected ? 'border-gold bg-white' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-gold" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate whitespace-nowrap text-sm font-semibold text-navy">{option.name}</p>
                      <p className="text-sm font-semibold text-navy">
                        {boxInfo(option)}
                        <span className="text-xs font-normal text-muted-foreground"> x {reamPriceInfo(option)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className={cn(
                      'text-base font-bold',
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
