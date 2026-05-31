const SYNC_KEY_STORAGE = 'syncKey'

export function getSyncKey(): string {
  let key = localStorage.getItem(SYNC_KEY_STORAGE)
  if (!key) {
    key = generateKey()
    localStorage.setItem(SYNC_KEY_STORAGE, key)
  }
  return key
}

export function setSyncKey(key: string) {
  localStorage.setItem(SYNC_KEY_STORAGE, key)
}

function generateKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
