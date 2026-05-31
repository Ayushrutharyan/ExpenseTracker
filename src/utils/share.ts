export async function share(data: { title?: string; text?: string; url?: string }) {
  if ('share' in navigator) {
    await navigator.share(data)
  }
}
