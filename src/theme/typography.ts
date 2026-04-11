import { fonts } from './fonts'

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 28, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: -0.4 },
  titleSmall: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.2 },
  section: { fontFamily: fonts.semiBold, fontSize: 18 },
  body: { fontFamily: fonts.regular, fontSize: 16 },
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 16 },
  caption: { fontFamily: fonts.regular, fontSize: 14 },
  captionStrong: { fontFamily: fonts.semiBold, fontSize: 14 },
  label: { fontFamily: fonts.semiBold, fontSize: 12, letterSpacing: 0.4 },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
}
