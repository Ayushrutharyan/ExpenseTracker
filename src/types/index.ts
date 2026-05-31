export interface Account {
  id?: number
  name: string
  type: 'wallets' | 'savings' | 'cash' | 'credit' | 'investment'
  currency: string
  icon: string
  color: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id?: number
  accountId: number
  date: string
  amount: number
  description: string
  notes: string
  type: 'income' | 'expense' | 'transfer'
  tagIds: number[]
  transferId?: number
  isReconciled: boolean
  recurringId?: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id?: number
  name: string
  color: string
  icon: string
  parentId?: number
  createdAt: string
}

export interface Budget {
  id?: number
  tagId: number
  month: string
  amount: number
  createdAt: string
  updatedAt: string
}

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface RecurringTransaction {
  id?: number
  accountId: number
  amount: number
  description: string
  type: 'income' | 'expense'
  tagIds: number[]
  frequency: RecurringFrequency
  interval: number
  nextDate: string
  endDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SavingGoal {
  id?: number
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  color: string
  icon: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Rule {
  id?: number
  pattern: string
  tagIds: number[]
  accountId?: number
  description?: string
  isActive: boolean
  createdAt: string
}

export interface ExchangeRate {
  id?: number
  fromCurrency: string
  toCurrency: string
  rate: number
  date: string
}
