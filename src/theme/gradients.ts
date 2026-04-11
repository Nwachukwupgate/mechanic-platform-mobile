import { colors } from './colors'

/** Presets for expo-linear-gradient */
export const gradients = {
  primaryButton: [colors.primary[500], colors.primary[700]] as const,
  heroWash: [colors.primary[50], colors.background] as const,
  heroRich: [colors.primary[100], colors.primary[50], colors.background] as const,
  accentHighlight: [colors.accent[400] + '33', colors.surface] as const,
  mapTintTop: ['rgba(8, 108, 64, 0.12)', 'rgba(248, 250, 252, 0.96)'] as const,
  onboardingOrb: [colors.primary[200], colors.primary[50]] as const,
} as const
