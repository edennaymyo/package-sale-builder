import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import {
  ArrowLeft,
  Package as PackageIcon,
  Calendar,
  Percent,
  Download,
  MessageCircle,
  Check,
  Copy
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

function productMeta(product: ProductOption): string {
  const parts = []
  if (product.shortCode) parts.push(product.shortCode)
  if (product.reamsPerBox) parts.push(`${product.reamsPerBox} ream/box`)
  return parts.join(' | ')
}

export function PackageDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
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
    const pkgTotals = calculatePackageTotals(pkg, selections)
    const text = `🎁 ${pkg.name}\n\n` +
      `💰 Special Price: ${formatCurrency(pkgTotals.promoTotal)}\n` +
      `📦 Save ${formatPercent(pkgTotals.discountPercent)}!\n\n` +
      `📅 Valid: ${pkg.validFrom} to ${pkg.validTo}\n\n` +
      `Contact Modern Science Co.,Ltd. for inquiry!`
    
    // Viber share URL
    const viberUrl = `viber://forward?text=${encodeURIComponent(text)}`
    window.open(viberUrl, '_blank')
  }, [pkg, selections])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

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
        
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button
            onClick={shareToViber}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7360f2] text-white hover:bg-[#6050d2] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Viber</span>
          </button>
          <button
            onClick={generateImage}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-navy hover:bg-gold-dark transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">
              {generating ? 'Generating...' : 'Download Card'}
            </span>
          </button>
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
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gold rounded-lg flex items-center justify-center">
                  <PackageIcon className="w-7 h-7 text-navy" />
                </div>
                <div>
                  <p className="text-gold text-xs font-medium">Modern Science Co.,Ltd.</p>
                  <p className="text-white/80 text-xs">Premium Paper Wholesale</p>
                </div>
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
                  const selected = line.type === 'fixed' 
                    ? line.fixedProduct 
                    : line.orOptions?.find(o => o.id === selections[line.id]) || line.orOptions?.[0]
                  
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
                          {productMeta(selected) && (
                            <p className="text-xs text-muted-foreground">
                              {productMeta(selected)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {selected.qty} ream{selected.qty > 1 ? 's' : ''}
                            {line.type === 'or-group' && (
                              <span className="text-gold ml-1">(or choice)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(lineTotal.original)}
                        </p>
                        <p className="font-semibold text-gold">
                          {formatCurrency(lineTotal.promo)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pricing Summary */}
              <div className="bg-navy/5 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Original Price:</span>
                  <span className="line-through text-muted-foreground">
                    {formatCurrency(totals.originalTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Package Price:</span>
                  <span className="text-2xl font-bold text-gold">
                    {formatCurrency(totals.promoTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-navy/10">
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    You Save:
                  </span>
                  <span className="text-green-600 font-bold">
                    {formatCurrency(totals.discountAmount)} ({formatPercent(totals.discountPercent)})
                  </span>
                </div>
              </div>

              {/* Validity */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Valid: {pkg.validFrom} to {pkg.validTo}</span>
              </div>

              {/* CTA */}
              <div className="bg-gold text-navy text-center py-3 rounded-lg font-semibold">
                Contact us on Viber for inquiry!
              </div>
            </div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-navy text-white text-sm font-bold rounded-full flex items-center justify-center">
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{line.fixedProduct.name}</p>
              {productMeta(line.fixedProduct) && (
                <p className="text-xs text-muted-foreground">
                  {productMeta(line.fixedProduct)}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {line.fixedProduct.qty} ream{line.fixedProduct.qty > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground line-through">
              {formatCurrency(lineTotal.original)}
            </p>
            <p className="font-bold text-gold">
              {formatCurrency(lineTotal.promo)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (line.type === 'or-group' && line.orOptions) {
    return (
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-8 h-8 bg-gold text-navy text-sm font-bold rounded-full flex items-center justify-center">
            {index + 1}
          </span>
          <div>
            <p className="font-medium text-sm text-muted-foreground">Choose one option:</p>
          </div>
        </div>
        
        <div className="space-y-2 ml-11">
          {line.orOptions.map(option => {
            const isSelected = selectedOptionId === option.id || (!selectedOptionId && line.orOptions?.[0]?.id === option.id)
            const optTotal = option.qty * option.promoPrice
            const optOriginal = option.qty * option.originalPrice
            
            return (
              <button
                key={option.id}
                onClick={() => onSelectOption(option.id)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left',
                  isSelected
                    ? 'border-gold bg-gold/5'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    isSelected ? 'border-gold' : 'border-muted-foreground/30'
                  )}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-gold rounded-full" />}
                  </div>
                  <div>
                    <p className="font-medium">{option.name}</p>
                    {productMeta(option) && (
                      <p className="text-xs text-muted-foreground">
                        {productMeta(option)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {option.qty} ream{option.qty > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground line-through">
                    {formatCurrency(optOriginal)}
                  </p>
                  <p className={cn(
                    'font-bold',
                    isSelected ? 'text-gold' : 'text-muted-foreground'
                  )}>
                    {formatCurrency(optTotal)}
                  </p>
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
