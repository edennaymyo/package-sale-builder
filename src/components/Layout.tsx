import { Outlet, Link, useLocation } from 'react-router-dom'
import { Package, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Layout() {
  const location = useLocation()
  const isExplore = location.pathname.startsWith('/explore') || location.pathname.startsWith('/package')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/explore" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-navy" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-tight">Modern Science Co.,Ltd.</h1>
                <p className="text-xs text-gold">Package Promotion Builder</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Link
                to="/explore"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  isExplore
                    ? 'bg-gold text-navy'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                )}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Explore</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-navy-dark text-white/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Modern Science Co.,Ltd. All rights reserved.</p>
          <p className="text-gold/80 mt-1">Premium Paper Wholesale Solutions</p>
        </div>
      </footer>
    </div>
  )
}
