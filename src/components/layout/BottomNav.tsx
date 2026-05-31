import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, ArrowUpDown, Repeat, Settings,
  Grid3x3, PiggyBank, Tags, BarChart3, Target, Sparkles, MoreHorizontal,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
  { to: '/recurring', icon: Repeat, label: 'Recurring' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const MORE_ITEMS = [
  { to: '/widgets', icon: Grid3x3, label: 'Widgets' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/tags', icon: Tags, label: 'Tags' },
  { to: '/rules', icon: Sparkles, label: 'Rules' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/60 dark:border-purple-500/10 lg:hidden safe-area-bottom transition-colors">
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors
                ${isActive
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-500 dark:bg-purple-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  )}
                  <item.icon size={22} className={isActive ? 'drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]' : ''} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More options"
            className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-10 lg:hidden safe-area-bottom animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">More</h2>
              <button onClick={() => setMoreOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" aria-label="Close menu">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map(item => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setMoreOpen(false) }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={item.label}
                >
                  <item.icon size={22} className="text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
