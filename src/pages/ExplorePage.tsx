import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Calendar, 
  Percent,
  Eye,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Package,
  fetchPackages,
  calculatePackageTotals,
  getPackageProducts,
} from '@/lib/packages'

export function ExplorePage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPackages().then(setPackages)
  }, [])

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages
    
    const query = searchQuery.toLowerCase()
    return packages.filter(pkg => {
      // Search in package name and description
      if (pkg.name.toLowerCase().includes(query)) return true
      if (pkg.description.toLowerCase().includes(query)) return true
      
      // Search in product names
      const products = getPackageProducts(pkg)
      return products.some(p => p.toLowerCase().includes(query))
    })
  }, [packages, searchQuery])

  const isPackageActive = (pkg: Package): boolean => {
    const today = new Date().toISOString().split('T')[0]
    return pkg.validFrom <= today && pkg.validTo >= today
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-border">
            <img
              src="/brand/modern-science-mark.png"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gold-dark">Modern Science Co.,Ltd.</p>
            <h1 className="text-2xl font-bold text-navy">Explore Packages</h1>
            <p className="text-muted-foreground text-sm">
              Browse promotional packages ({packages.length}/20 available)
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by package name or product..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border bg-card shadow-sm focus:ring-2 focus:ring-gold/50 focus:border-gold outline-none transition-all"
        />
      </div>

      {/* Package Grid */}
      {filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map(pkg => {
            const totals = calculatePackageTotals(pkg)
            const isActive = isPackageActive(pkg)
            const products = getPackageProducts(pkg)
            
            return (
              <div
                key={pkg.id}
                className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className={cn(
                  'relative overflow-hidden p-4',
                  isActive ? 'bg-navy' : 'bg-muted'
                )}>
                  <img
                    src="/brand/modern-science-mark.png"
                    alt=""
                    className={cn(
                      'pointer-events-none absolute -right-4 -top-7 h-28 w-28 object-contain opacity-10',
                      !isActive && 'opacity-5'
                    )}
                  />
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        'font-semibold text-lg truncate',
                        isActive ? 'text-white' : 'text-muted-foreground'
                      )}>
                        {pkg.name || 'Untitled Package'}
                      </h3>
                      <p className={cn(
                        'text-sm mt-0.5',
                        isActive ? 'text-white/70' : 'text-muted-foreground/70'
                      )}>
                        {pkg.productLines.length} product line(s)
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      isActive
                        ? 'bg-gold text-navy'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    )}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-4">
                  {/* Products Preview */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Products:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {products.slice(0, 4).map((product, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted text-xs rounded-full truncate max-w-[120px]"
                        >
                          {product}
                        </span>
                      ))}
                      {products.length > 4 && (
                        <span className="px-2 py-0.5 bg-gold/20 text-gold-dark text-xs rounded-full">
                          +{products.length - 4} more
                        </span>
                      )}
                      {products.length === 0 && (
                        <span className="text-xs text-muted-foreground">No products</span>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="font-medium text-muted-foreground">
                        {formatCurrency(totals.originalTotal)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Package Price</p>
                      <p className="font-bold text-lg text-gold">
                        {formatCurrency(totals.promoTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Discount & Validity */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <Percent className="w-4 h-4" />
                      <span className="font-medium">
                        Discount {formatCurrency(totals.discountAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">
                        {pkg.validFrom.split('-').slice(1).join('/')} - {pkg.validTo.split('-').slice(1).join('/')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      to={`/package/${pkg.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto bg-white rounded-xl flex items-center justify-center mb-4 p-2 shadow-sm ring-1 ring-border">
            <img
              src="/brand/modern-science-mark.png"
              alt=""
              className="h-full w-full object-contain opacity-80"
            />
          </div>
          {searchQuery ? (
            <>
              <h3 className="text-lg font-semibold text-navy mb-2">No packages found</h3>
              <p className="text-muted-foreground mb-4">
                No packages match your search "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-gold hover:text-gold-dark font-medium"
              >
                Clear search
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-navy mb-2">No packages available</h3>
              <p className="text-muted-foreground">
                Published promotional packages will appear here.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
