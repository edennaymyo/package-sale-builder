import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package as PackageIcon,
  GripVertical,
  AlertCircle
} from 'lucide-react'
import { cn, formatCurrency, formatPercent, parseCurrencyAmount } from '@/lib/utils'
import { PRODUCT_CATALOG, findCatalogProduct } from '@/lib/productCatalog'
import {
  Package,
  ProductLine,
  ProductOption,
  createEmptyPackage,
  createEmptyProductLine,
  createEmptyProduct,
  loadPackages,
  addPackage,
  updatePackage,
  getPackageById,
  calculatePackageTotals,
} from '@/lib/packages'

export function BuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<Package>(createEmptyPackage())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (id) {
      const existing = getPackageById(id)
      if (existing) {
        setPkg(existing)
      } else {
        navigate('/builder')
      }
    } else {
      setPkg(createEmptyPackage())
    }
  }, [id, navigate])

  const totals = calculatePackageTotals(pkg)

  const validatePackage = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!pkg.name.trim()) {
      newErrors.name = 'Package name is required'
    }
    
    if (pkg.productLines.length === 0) {
      newErrors.lines = 'At least one product line is required'
    }
    
    pkg.productLines.forEach((line, idx) => {
      if (line.type === 'fixed') {
        if (!line.fixedProduct?.name.trim()) {
          newErrors[`line-${idx}-name`] = 'Product name is required'
        }
      } else if (line.type === 'or-group') {
        if (!line.orOptions || line.orOptions.length === 0) {
          newErrors[`line-${idx}-options`] = 'At least one option is required'
        } else {
          line.orOptions.forEach((opt, optIdx) => {
            if (!opt.name.trim()) {
              newErrors[`line-${idx}-opt-${optIdx}-name`] = 'Option name is required'
            }
          })
        }
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validatePackage()) return
    
    setSaving(true)
    try {
      const packages = loadPackages()
      if (!id && packages.length >= 20) {
        setErrors({ save: 'Maximum of 20 packages allowed. Please delete some packages first.' })
        setSaving(false)
        return
      }
      
      if (id) {
        updatePackage(pkg)
      } else {
        addPackage(pkg)
      }
      
      setSaved(true)
      setTimeout(() => {
        navigate('/explore')
      }, 1000)
    } catch (error) {
      setErrors({ save: error instanceof Error ? error.message : 'Failed to save package' })
    } finally {
      setSaving(false)
    }
  }

  const updateProductLine = (lineId: string, updates: Partial<ProductLine>) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.map(line =>
        line.id === lineId ? { ...line, ...updates } : line
      )
    }))
  }

  const updateFixedProduct = (lineId: string, updates: Partial<ProductOption>) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.map(line =>
        line.id === lineId && line.fixedProduct
          ? { ...line, fixedProduct: { ...line.fixedProduct, ...updates } }
          : line
      )
    }))
  }

  const updateOrOption = (lineId: string, optionId: string, updates: Partial<ProductOption>) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.map(line =>
        line.id === lineId && line.orOptions
          ? {
              ...line,
              orOptions: line.orOptions.map(opt =>
                opt.id === optionId ? { ...opt, ...updates } : opt
              )
            }
          : line
      )
    }))
  }

  const addProductLine = () => {
    if (pkg.productLines.length >= 10) return
    setPkg(prev => ({
      ...prev,
      productLines: [...prev.productLines, createEmptyProductLine()]
    }))
  }

  const removeProductLine = (lineId: string) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.filter(line => line.id !== lineId)
    }))
  }

  const toggleLineType = (lineId: string) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.map(line => {
        if (line.id !== lineId) return line
        if (line.type === 'fixed') {
          return {
            ...line,
            type: 'or-group' as const,
            fixedProduct: undefined,
            orOptions: [createEmptyProduct()]
          }
        } else {
          return {
            ...line,
            type: 'fixed' as const,
            orOptions: undefined,
            fixedProduct: createEmptyProduct()
          }
        }
      })
    }))
  }

  const addOrOption = (lineId: string) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.map(line => {
        if (line.id !== lineId || line.type !== 'or-group') return line
        if ((line.orOptions?.length || 0) >= 3) return line
        return {
          ...line,
          orOptions: [...(line.orOptions || []), createEmptyProduct()]
        }
      })
    }))
  }

  const removeOrOption = (lineId: string, optionId: string) => {
    setPkg(prev => ({
      ...prev,
      productLines: prev.productLines.map(line => {
        if (line.id !== lineId || line.type !== 'or-group') return line
        return {
          ...line,
          orOptions: line.orOptions?.filter(opt => opt.id !== optionId)
        }
      })
    }))
  }

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
            <h1 className="text-2xl font-bold text-navy">
              {id ? 'Edit Package' : 'Create Package'}
            </h1>
            <p className="text-muted-foreground text-sm">
              Build promotional packages for your customers
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all',
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gold hover:bg-gold-dark text-navy'
          )}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Package'}
        </button>
      </div>

      {errors.save && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{errors.save}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-gold" />
              Package Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Package Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pkg.name}
                  onChange={e => setPkg(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Office Bundle"
                  className={cn(
                    'w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all',
                    errors.name && 'border-red-500'
                  )}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={pkg.description}
                  onChange={e => setPkg(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this promotional package..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Valid From</label>
                  <input
                    type="date"
                    value={pkg.validFrom}
                    onChange={e => setPkg(prev => ({ ...prev, validFrom: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Valid To</label>
                  <input
                    type="date"
                    value={pkg.validTo}
                    onChange={e => setPkg(prev => ({ ...prev, validTo: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy">
                Product Lines ({pkg.productLines.length}/10)
              </h2>
              <button
                onClick={addProductLine}
                disabled={pkg.productLines.length >= 10}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-navy text-white hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </button>
            </div>

            {errors.lines && (
              <p className="text-red-500 text-sm mb-4">{errors.lines}</p>
            )}

            <div className="space-y-4">
              {pkg.productLines.map((line, lineIdx) => (
                <div
                  key={line.id}
                  className="border rounded-lg p-4 bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-2 text-muted-foreground cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-navy">
                            Line {lineIdx + 1}
                          </span>
                          <button
                            onClick={() => toggleLineType(line.id)}
                            className={cn(
                              'px-3 py-1 text-xs rounded-full font-medium transition-colors',
                              line.type === 'fixed'
                                ? 'bg-navy text-white'
                                : 'bg-gold text-navy'
                            )}
                          >
                            {line.type === 'fixed' ? 'Fixed Product' : 'OR Options'}
                          </button>
                        </div>
                        <button
                          onClick={() => removeProductLine(line.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {line.type === 'fixed' && line.fixedProduct && (
                        <ProductInput
                          product={line.fixedProduct}
                          onChange={updates => updateFixedProduct(line.id, updates)}
                          error={errors[`line-${lineIdx}-name`]}
                        />
                      )}

                      {line.type === 'or-group' && (
                        <div className="space-y-3">
                          {line.orOptions?.map((opt, optIdx) => (
                            <div key={opt.id} className="relative">
                              <div className="absolute -left-6 top-3 text-xs font-medium text-gold">
                                {optIdx > 0 && 'OR'}
                              </div>
                              <ProductInput
                                product={opt}
                                onChange={updates => updateOrOption(line.id, opt.id, updates)}
                                error={errors[`line-${lineIdx}-opt-${optIdx}-name`]}
                                onRemove={
                                  (line.orOptions?.length || 0) > 1
                                    ? () => removeOrOption(line.id, opt.id)
                                    : undefined
                                }
                              />
                            </div>
                          ))}
                          
                          {(line.orOptions?.length || 0) < 3 && (
                            <button
                              onClick={() => addOrOption(line.id)}
                              className="flex items-center gap-1.5 text-sm text-gold hover:text-gold-dark transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add OR Option ({line.orOptions?.length || 0}/3)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {pkg.productLines.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <PackageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No product lines yet. Add your first product line above.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-navy text-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-gold" />
              Package Summary
            </h3>
            
            <div className="space-y-4">
              <div className="pb-4 border-b border-white/20">
                <p className="text-white/60 text-sm mb-1">Original Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.originalTotal)}
                </p>
              </div>
              
              <div className="pb-4 border-b border-white/20">
                <p className="text-white/60 text-sm mb-1">Promotional Price</p>
                <p className="text-2xl font-bold text-gold">
                  {formatCurrency(totals.promoTotal)}
                </p>
              </div>
              
              <div className="bg-gold/20 rounded-lg p-4">
                <p className="text-white/80 text-sm mb-1">You Save</p>
                <p className="text-xl font-bold text-gold">
                  {formatCurrency(totals.discountAmount)}
                </p>
                <p className="text-sm text-gold/80">
                  ({formatPercent(totals.discountPercent)} off)
                </p>
              </div>
              
              <div className="pt-4 text-sm text-white/60">
                <p>{pkg.productLines.length} product line(s)</p>
                <p>Valid: {pkg.validFrom} to {pkg.validTo}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ProductInputProps {
  product: ProductOption
  onChange: (updates: Partial<ProductOption>) => void
  error?: string
  onRemove?: () => void
}

function ProductInput({ product, onChange, error, onRemove }: ProductInputProps) {
  const hasCatalogProduct = PRODUCT_CATALOG.some(item => item.name === product.name)
  const handleProductChange = (name: string) => {
    const catalogProduct = findCatalogProduct(name)
    onChange({
      name,
      shortCode: catalogProduct?.shortCode || '',
      reamsPerBox: catalogProduct?.reamsPerBox,
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-5">
        <select
          value={product.name}
          onChange={e => handleProductChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all',
            error && 'border-red-500'
          )}
        >
          <option value="">Select product</option>
          {product.name && !hasCatalogProduct && (
            <option value={product.name}>{product.name}</option>
          )}
          {PRODUCT_CATALOG.map(item => (
            <option key={item.shortCode} value={item.name}>
              {item.name} - {item.shortCode} - {item.reamsPerBox} ream/box
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <div className="lg:col-span-2">
        <input
          type="text"
          value={product.shortCode || ''}
          onChange={e => onChange({ shortCode: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-lg border bg-muted/50 focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
          placeholder="Short code"
        />
      </div>

      <div className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={product.reamsPerBox || ''}
            onChange={e => onChange({ reamsPerBox: parseInt(e.target.value) || undefined })}
            min="1"
            className="w-full px-3 py-2 text-sm rounded-lg border bg-muted/50 focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
            placeholder="ream/box"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">/box</span>
        </div>
      </div>

      <div className="lg:col-span-1">
        <input
          type="number"
          value={product.qty}
          onChange={e => onChange({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
          min="1"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
          placeholder="Qty"
        />
      </div>

      <div className="lg:col-span-2 flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            type="number"
            value={product.originalPrice || ''}
            onChange={e => onChange({ originalPrice: parseCurrencyAmount(e.target.value) })}
            placeholder="Original"
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
          />
          <input
            type="number"
            value={product.promoPrice || ''}
            onChange={e => onChange({ promoPrice: parseCurrencyAmount(e.target.value) })}
            placeholder="Promo"
            className="w-full px-3 py-2 text-sm rounded-lg border bg-gold/10 focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
          />
        </div>
        
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
