import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ToastProvider } from '../../hooks/useToast'

export function AppShell() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-950 dark:via-slate-900 dark:to-purple-950 lg:pl-64 pb-16 lg:pb-0 transition-colors">
        <Sidebar />
        <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  )
}
