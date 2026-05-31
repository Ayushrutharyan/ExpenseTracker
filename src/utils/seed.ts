import { api } from '../utils/api'

const ACCOUNTS = [
  { name: 'Axis', type: 'savings' as const, color: '#e11d48', currency: 'INR' },
  { name: 'HDFC', type: 'savings' as const, color: '#2563eb', currency: 'INR' },
  { name: 'Kotak', type: 'savings' as const, color: '#d97706', currency: 'INR' },
  { name: 'Regalia', type: 'credit' as const, color: '#7c3aed', currency: 'INR' },
  { name: 'Swiggy', type: 'credit' as const, color: '#fc7303', currency: 'INR' },
  { name: 'Kiwi', type: 'credit' as const, color: '#059669', currency: 'INR' },
  { name: 'SwiggyWallet', type: 'wallets' as const, color: '#e11d48', currency: 'INR' },
  { name: 'Blinkit', type: 'wallets' as const, color: '#0891b2', currency: 'INR' },
  { name: 'Flipkart', type: 'wallets' as const, color: '#fbbf24', currency: 'INR' },
  { name: 'Amazon', type: 'wallets' as const, color: '#2563eb', currency: 'INR' },
]

const TAGS = [
  { name: 'Grocery', color: '#059669', parentId: undefined },
  { name: 'Bills', color: '#d97706', parentId: undefined },
  { name: 'House', color: '#7c3aed', parentId: undefined },
]

export async function seedDemoData() {
  const count = await api.count('accounts')
  if (count > 0) return

  for (const acc of ACCOUNTS) {
    await api.create('accounts', { ...acc, icon: '', isActive: true })
  }

  for (const tag of TAGS) {
    await api.create('tags', { ...tag, icon: '' })
  }
}
