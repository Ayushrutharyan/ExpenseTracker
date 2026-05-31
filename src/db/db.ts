import Dexie, { type Table } from 'dexie'
import type {
  Account, Transaction, Tag, Budget, RecurringTransaction,
  SavingGoal, Rule, TransactionSplit, ExchangeRate,
} from '../types'

export class ExpenseDB extends Dexie {
  accounts!: Table<Account, number>
  transactions!: Table<Transaction, number>
  tags!: Table<Tag, number>
  budgets!: Table<Budget, number>
  recurringTransactions!: Table<RecurringTransaction, number>
  transactionSplits!: Table<TransactionSplit, number>
  savingGoals!: Table<SavingGoal, number>
  rules!: Table<Rule, number>
  exchangeRates!: Table<ExchangeRate, number>

  constructor() {
    super('ExpenseTracker')
    this.version(3).stores({
      accounts: '++id, name, type, isActive',
      transactions: '++id, accountId, date, type, [accountId+date], recurringId',
      tags: '++id, name, parentId',
      budgets: '++id, tagId, month',
      recurringTransactions: '++id, accountId, isActive, nextDate',
      transactionSplits: '++id, transactionId, tagId',
      savingGoals: '++id, isActive',
      rules: '++id, isActive',
      exchangeRates: '++id, [fromCurrency+toCurrency+date]',
    })
  }
}

export const db = new ExpenseDB()
