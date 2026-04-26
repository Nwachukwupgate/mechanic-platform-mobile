import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

/**
 * Solid forest stack header (matches booking mock). Use on screens where the
 * hero or flow is booking centric so chrome stays consistent.
 *
 * Applied in `UserStack` / `MechanicStack` to: booking detail, receipt, job history.
 */
export const forestHeaderScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.brand.forest },
  headerTintColor: '#ffffff',
  headerTitleStyle: {
    fontFamily: fonts.headingBold,
    color: '#ffffff',
    fontSize: 17,
  },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  statusBarStyle: 'light',
  navigationBarColor: colors.brand.forest,
}
