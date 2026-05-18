import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package as PackageIcon,
  GripVertical,
  AlertCircle,
  Edit,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn, formatCurrency, formatPercent, parseCurrencyAmount } from '@/lib/utils'
import { findCatalogProduct, getCatalogProducts } from '@/lib/productCatalog'
import {
  Package,
  ProductLine,
  ProductOption,
  createEmptyPackage,
  createEmptyProductLine,
  createEmptyProduct,
  fetchPackageById,
  fetchPackages,
  addPackageRemote,
  updatePackageRemote,
  deletePackageRemote,
  calculatePackageTotals,
  getPackageStatus,
} from '@/lib/packages'
import { fetchOdooPrice } from '@/lib/odooPrice'

export function BuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<Package>(createEmptyPackage())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedPackages, setSavedPackages] = useState<Package[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (id) {
      fetchPackageById(id).then(existing => {
        if (!active) return
        if (existing) {
          setPkg(existing)
        } else {
          navigate('/builder')
        }
      })
    } else {
      setPkg(createEmptyPackage())
      fetchPackages().then(packages => {
        if (active) setSavedPackages(packages)
      })
    }

    return () => {
      active = false
    }
  }, [id, navigate])

  const totals = calculatePackageTotals(pkg)
  const packageStatus = getPackageStatus(pkg)

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

  const handleSave = async () => {
    if (!validatePackage()) return
    
    setSaving(true)
    try {
      const packages = await fetchPackages()
      if (!id && packages.length >= 20) {
        setErrors({ save: 'Maximum of 20 packages allowed. Please delete some packages first.' })
        setSaving(false)
        return
      }
      
      if (id) {
        await updatePackageRemote(pkg)
      } else {
        const updatedPackages = await addPackageRemote(pkg)
        setSavedPackages(updatedPackages)
      }
      
      setSaved(true)
      setTimeout(() => {
        navigate('/builder')
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

  const moveProductLine = (lineId: string, direction: -1 | 1) => {
    setPkg(prev => {
      const currentIndex = prev.productLines.findIndex(line => line.id === lineId)
      const nextIndex = currentIndex + direction
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= prev.productLines.length) {
        return prev
      }

      const productLines = [...prev.productLines]
      const [line] = productLines.splice(currentIndex, 1)
      productLines.splice(nextIndex, 0, line)

      return { ...prev, productLines }
    })
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

  const handleDeletePackage = async (packageId: string) => {
    try {
      const updatedPackages = await deletePackageRemote(packageId)
      setSavedPackages(updatedPackages)
      setDeleteConfirmId(null)
    } catch (error) {
      setErrors({ save: error instanceof Error ? error.message : 'Failed to delete package' })
    }
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
          <div className="hidden h-12 w-12 flex-shrink-0 sm:block">
            <img
              src="/brand/modern-science-mark.png"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
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

      {!id && savedPackages.length > 0 && (
        <div className="bg-card rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
            <PackageIcon className="w-5 h-5 text-gold" />
            Saved Packages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedPackages.map(savedPackage => (
              <div
                key={savedPackage.id}
                className="rounded-lg border bg-muted/30 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => navigate(`/builder/${savedPackage.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-navy truncate">{savedPackage.name || 'Untitled Package'}</p>
                    <p className="text-xs text-muted-foreground">
                      {savedPackage.productLines.length} product line(s)
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/builder/${savedPackage.id}`)}
                      className="p-2 text-gold hover:bg-gold/10 rounded-lg transition-colors"
                      aria-label="Edit package"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(savedPackage.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {deleteConfirmId === savedPackage.id && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3">
                    <p className="flex-1 text-sm text-red-700">Delete this package?</p>
                    <button
                      onClick={() => handleDeletePackage(savedPackage.id)}
                      className="px-3 py-1.5 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1.5 rounded-md border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-sm font-medium">Package Status</label>
                    <p className="text-xs text-muted-foreground">
                      Date expired packages show as Expired automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      packageStatus === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {packageStatus === 'active' ? 'Active' : packageStatus === 'expired' ? 'Expired' : 'Inactive'}
                    </span>
                    <select
                      value={pkg.isActive === false ? 'inactive' : 'active'}
                      onChange={event => setPkg(prev => ({ ...prev, isActive: event.target.value === 'active' }))}
                      className="rounded-lg border bg-background px-3 py-2 text-sm font-medium outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
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
                    <div className="mt-1 flex flex-col items-center gap-1 text-muted-foreground">
                      <button
                        onClick={() => moveProductLine(line.id, -1)}
                        disabled={lineIdx === 0}
                        className="p-1 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move line up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <GripVertical className="w-5 h-5" />
                      <button
                        onClick={() => moveProductLine(line.id, 1)}
                        disabled={lineIdx === pkg.productLines.length - 1}
                        className="p-1 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move line down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
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
                <p className="text-white/60 text-sm mb-1">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totals.originalTotal)}
                </p>
              </div>
              
              <div className="pb-4 border-b border-white/20">
                <label className="block text-white/60 text-sm mb-1">Total Discount</label>
                <input
                  type="number"
                  value={pkg.totalDiscount || ''}
                  onChange={e => setPkg(prev => ({ ...prev, totalDiscount: parseCurrencyAmount(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-2xl font-bold text-gold outline-none focus:ring-2 focus:ring-gold/50"
                  placeholder="0"
                />
              </div>
              
              <div className="bg-gold/20 rounded-lg p-4">
                <p className="text-white/80 text-sm mb-1">Package Price</p>
                <p className="text-xl font-bold text-gold">{formatCurrency(totals.promoTotal)}</p>
                <p className="text-sm text-gold/80">
                  {formatCurrency(totals.discountAmount)} discount ({formatPercent(totals.discountPercent)} off)
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
  const [query, setQuery] = useState(product.name)
  const [showHints, setShowHints] = useState(false)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceMessage, setPriceMessage] = useState('')
  const [priceStatus, setPriceStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    setQuery(product.name)
  }, [product.name])

  const refreshOdooPrice = async (mode: 'auto' | 'manual' = 'manual') => {
    if (!product.name.trim()) {
      setPriceStatus('error')
      setPriceMessage('Choose product first')
      return
    }

    setPriceLoading(true)
    setPriceStatus('idle')
    setPriceMessage(mode === 'auto' ? '' : 'Loading Odoo price...')

    try {
      const result = await fetchOdooPrice(product)
      const reamPrice = Math.round(result.reamPrice)
      onChange({
        originalPrice: reamPrice,
        promoPrice: reamPrice,
        odooProductId: result.productId,
        odooProductName: result.productName,
        odooBoxPrice: result.boxPrice,
        odooPriceMinQuantity: result.minQuantity,
        odooPriceRule: result.rule,
        odooPriceUpdatedAt: new Date().toISOString(),
      })
      setPriceStatus('success')
      setPriceMessage(
        result.rule === 'round-down'
          ? `Odoo box price ${formatCurrency(result.boxPrice)} loaded (${formatCurrency(reamPrice)} / ream)`
          : `Odoo nearest min box price ${formatCurrency(result.boxPrice)} loaded (${formatCurrency(reamPrice)} / ream)`
      )
    } catch (error) {
      setPriceStatus('error')
      setPriceMessage(error instanceof Error ? error.message : 'Odoo price not found')
    } finally {
      setPriceLoading(false)
    }
  }

  useEffect(() => {
    if (!product.shortCode) return

    const timeoutId = window.setTimeout(() => {
      refreshOdooPrice('auto')
    }, 450)

    return () => window.clearTimeout(timeoutId)
  }, [product.shortCode, product.qty, product.reamsPerBox, product.name])

  const matchingProducts = getCatalogProducts().filter(item => {
    const search = query.trim().toLowerCase()
    if (!search) return true
    return item.name.toLowerCase().includes(search) || item.shortCode.toLowerCase().includes(search)
  }).slice(0, 8)

  const selectProduct = (name: string) => {
    const catalogProduct = findCatalogProduct(name)
    setQuery(catalogProduct?.name || name)
    setShowHints(false)
    onChange({
      name: catalogProduct?.name || name,
      shortCode: catalogProduct?.shortCode || '',
      reamsPerBox: catalogProduct?.reamsPerBox,
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-6 relative">
        <input
          type="text"
          value={query}
          onFocus={() => setShowHints(true)}
          onChange={e => {
            const value = e.target.value
            const catalogProduct = findCatalogProduct(value)
            setQuery(value)
            setShowHints(true)
            onChange({
              name: catalogProduct?.name || value,
              shortCode: catalogProduct?.shortCode || '',
              reamsPerBox: catalogProduct?.reamsPerBox,
            })
          }}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all',
            error && 'border-red-500'
          )}
          placeholder="Search product name or short code"
        />
        {showHints && matchingProducts.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white shadow-lg">
            {matchingProducts.map(item => (
              <button
                key={item.shortCode}
                type="button"
                onMouseDown={event => {
                  event.preventDefault()
                  selectProduct(item.name)
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gold/10 focus:bg-gold/10 focus:outline-none"
              >
                <span className="block font-medium text-navy">{item.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.shortCode} | {item.reamsPerBox} reams per box
                </span>
              </button>
            ))}
          </div>
        )}
        {showHints && query && matchingProducts.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-muted-foreground shadow-lg">
            No matching product
          </div>
        )}
        {showHints && (
          <button
            type="button"
            aria-label="Close product hints"
            className="fixed inset-0 z-10 cursor-default bg-transparent"
            onClick={() => setShowHints(false)}
            tabIndex={-1}
          />
        )}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <div className="lg:col-span-2">
        <input
          type="number"
          value={product.qty}
          onChange={e => onChange({ qty: Math.max(1, parseInt(e.target.value) || 1) })}
          min="1"
          className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
          placeholder="Box qty"
        />
      </div>

      <div className="lg:col-span-4 flex items-start gap-2">
        <div className="flex-1">
          <input
            type="number"
            value={product.originalPrice || ''}
            onChange={e => {
              const value = parseCurrencyAmount(e.target.value)
              onChange({ originalPrice: value, promoPrice: value })
            }}
            placeholder="Ream price"
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
          />
          {priceMessage && (
            <p className={cn(
              'mt-1 text-xs',
              priceStatus === 'success' ? 'text-green-600' : 'text-red-500'
            )}>
              {priceMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => refreshOdooPrice('manual')}
          disabled={priceLoading || !product.name.trim()}
          title="Reload price from Odoo"
          className="mt-0.5 rounded-lg border border-gold/30 bg-gold/10 p-2 text-gold-dark transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', priceLoading && 'animate-spin')} />
        </button>
        
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
