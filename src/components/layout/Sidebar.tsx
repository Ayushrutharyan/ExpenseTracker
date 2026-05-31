import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, ArrowUpDown, PiggyBank, Settings, Tags,
  BarChart3, Repeat, Target, Sparkles, Grid3x3,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/widgets', icon: Grid3x3, label: 'Widgets' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
  { to: '/recurring', icon: Repeat, label: 'Recurring' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/tags', icon: Tags, label: 'Tags' },
  { to: '/rules', icon: Sparkles, label: 'Rules' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl border-r border-gray-200/60 dark:border-purple-500/10 fixed left-0 top-0 transition-colors">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-transparent">ExpenseTracker</h1>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.15)]'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200/60 dark:border-purple-500/10">
        Personal Expense Tracker
      </div>
    </aside>
  )
}
