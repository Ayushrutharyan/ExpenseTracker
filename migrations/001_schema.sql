-- D1 Schema for Expense Tracker
-- Run: wrangler d1 execute expense-tracker-db --file=migrations/001_schema.sql

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'wallets',
  currency TEXT NOT NULL DEFAULT 'INR',
  icon TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  transfer_id INTEGER,
  is_reconciled INTEGER NOT NULL DEFAULT 0,
  recurring_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT '',
  parent_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  frequency TEXT NOT NULL,
  interval INTEGER NOT NULL DEFAULT 1,
  next_date TEXT NOT NULL,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transaction_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  transaction_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  amount REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS saving_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  deadline TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  pattern TEXT NOT NULL,
  tag_ids TEXT NOT NULL DEFAULT '[]',
  account_id INTEGER,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_key TEXT NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  date TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_sync ON accounts(sync_key);
CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(sync_key);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_tags_sync ON tags(sync_key);
CREATE INDEX IF NOT EXISTS idx_budgets_sync ON budgets(sync_key);
CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
CREATE INDEX IF NOT EXISTS idx_recurring_sync ON recurring_transactions(sync_key);
CREATE INDEX IF NOT EXISTS idx_splits_transaction ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_goals_sync ON saving_goals(sync_key);
CREATE INDEX IF NOT EXISTS idx_rules_sync ON rules(sync_key);
CREATE INDEX IF NOT EXISTS idx_rates_sync ON exchange_rates(sync_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rates_unique ON exchange_rates(sync_key, from_currency, to_currency, date);
