import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Calendar, 
  Eye,
  ArrowDownUp,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { DiscountBadge } from '@/components/DiscountBadge'
import {
  Package,
  fetchPackages,
  calculatePackageTotals,
  getPackageProducts,
  getPackageStatus,
} from '@/lib/packages'

type SortKey = 'discountPercent' | 'discountAmount' | 'totalAmount' | 'productLines'
type SortDirection = 'desc' | 'asc'

const SORT_LABELS: Record<SortKey, string> = {
  discountPercent: 'Discount %',
  discountAmount: 'Discount Amount',
  totalAmount: 'Total Amount',
  productLines: 'Product Lines',
}

export function ExplorePage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('discountPercent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    fetchPackages().then(setPackages)
  }, [])

  const visiblePackages = useMemo(() => {
    const query = searchQuery.toLowerCase()
    const filtered = searchQuery.trim() ? packages.filter(pkg => {
      // Search in package name and description
      if (pkg.name.toLowerCase().includes(query)) return true
      if (pkg.description.toLowerCase().includes(query)) return true
      
      // Search in product names
      const products = getPackageProducts(pkg)
      return products.some(p => p.toLowerCase().includes(query))
    }) : packages

    return [...filtered].sort((a, b) => {
      const aTotals = calculatePackageTotals(a)
      const bTotals = calculatePackageTotals(b)
      const values: Record<SortKey, [number, number]> = {
        discountPercent: [aTotals.discountPercent, bTotals.discountPercent],
        discountAmount: [aTotals.discountAmount, bTotals.discountAmount],
        totalAmount: [aTotals.originalTotal, bTotals.originalTotal],
        productLines: [a.productLines.length, b.productLines.length],
      }
      const [aValue, bValue] = values[sortKey]
      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue
    })
  }, [packages, searchQuery, sortDirection, sortKey])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 flex-shrink-0">
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

      {/* Search & Sort */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
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
        <div className="flex items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
          <ArrowDownUp className="h-4 w-4 text-gold-dark" />
          <label className="sr-only" htmlFor="package-sort">Sort packages</label>
          <select
            id="package-sort"
            value={sortKey}
            onChange={event => setSortKey(event.target.value as SortKey)}
            className="min-w-[168px] rounded-lg border bg-background px-3 py-2 text-sm font-medium text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/40"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
              <option key={key} value={key}>{SORT_LABELS[key]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="rounded-lg bg-gold/10 px-3 py-2 text-sm font-semibold text-gold-dark transition-colors hover:bg-gold/20"
          >
            {sortDirection === 'desc' ? 'High' : 'Low'}
          </button>
        </div>
      </div>

      {/* Package Grid */}
      {visiblePackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePackages.map(pkg => {
            const totals = calculatePackageTotals(pkg)
            const status = getPackageStatus(pkg)
            const isActive = status === 'active'
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
                      status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : 'Inactive'}
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
                        <Link
                          to={`/package/${pkg.id}`}
                          aria-label={`View all products in ${pkg.name || 'this package'}`}
                          className="px-2 py-0.5 bg-gold/20 text-gold-dark text-xs rounded-full transition-colors hover:bg-gold/30 focus:outline-none focus:ring-2 focus:ring-gold/50"
                        >
                          +{products.length - 4} more
                        </Link>
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
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <DiscountBadge
                      amount={totals.discountAmount}
                      percent={totals.discountPercent}
                      motion="both"
                      compact
                      className="min-w-0"
                    />
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
          <div className="w-20 h-20 mx-auto mb-4">
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
