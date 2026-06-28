// Vibración ligera en acciones clave (solo en la app nativa; en web no hace nada).

export async function haptic(style: 'light' | 'medium' | 'heavy' | 'success' = 'medium') {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success })
      return
    }
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const
    await Haptics.impact({ style: map[style] })
  } catch {
    // plugin no disponible o sin permiso: se ignora
  }
}
