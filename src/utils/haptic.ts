export function haptic(pattern: VibratePattern = 10) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}
