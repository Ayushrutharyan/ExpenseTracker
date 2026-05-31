import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import { PageSkeleton } from './components/ui/PageSkeleton'

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })))
const AccountDetail = lazy(() => import('./pages/AccountDetail').then(m => ({ default: m.AccountDetail })))
const TransactionForm = lazy(() => import('./pages/TransactionForm').then(m => ({ default: m.TransactionForm })))
const TransactionList = lazy(() => import('./pages/TransactionList').then(m => ({ default: m.TransactionList })))
const Transfers = lazy(() => import('./pages/Transfers').then(m => ({ default: m.Transfers })))
const TagsPage = lazy(() => import('./pages/Tags').then(m => ({ default: m.TagsPage })))
const Budgets = lazy(() => import('./pages/Budgets').then(m => ({ default: m.Budgets })))
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })))
const RecurringPage = lazy(() => import('./pages/Recurring').then(m => ({ default: m.RecurringPage })))
const GoalsPage = lazy(() => import('./pages/Goals').then(m => ({ default: m.GoalsPage })))
const RulesPage = lazy(() => import('./pages/Rules').then(m => ({ default: m.RulesPage })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Widgets = lazy(() => import('./pages/Widgets').then(m => ({ default: m.Widgets })))

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.2, ease: 'easeOut' as const },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes location={location}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              <Route path="/transactions" element={<TransactionList />} />
              <Route path="/transactions/new" element={<TransactionForm />} />
              <Route path="/transactions/:id/edit" element={<TransactionForm />} />
              <Route path="/transfers/new" element={<Transfers />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/widgets" element={<Widgets />} />
            </Route>
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  useEffect(() => {
    localStorage.setItem('defaultCurrency', 'INR')
  }, [])

  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
