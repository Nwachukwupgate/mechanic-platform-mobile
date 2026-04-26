import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'
import { fonts } from '../theme/fonts'

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string
  /**
   * Fixed pixel width (legacy). Omit to let the tile use `flex: 1` so a row of N tiles
   * each gets 1/N of the available width (after gap/padding).
   */
  width?: number
  iconColor: string
  iconBg: string
  onPress: () => void
  /** Dark forest tile — primary CTA on home grid */
  variant?: 'default' | 'featured'
  /** Row: icon | text | chevron (default). Column: icon above text (dashboard grid). */
  layout?: 'row' | 'column'
  showChevron?: boolean
}

export function DashboardActionTile({
  icon,
  title,
  subtitle,
  width,
  iconColor,
  iconBg,
  onPress,
  variant = 'default',
  layout = 'row',
  showChevron = true,
}: Props) {
  const featured = variant === 'featured'
  const column = layout === 'column'
  const titleColor = featured ? '#f8fafc' : colors.text
  const subColor = featured ? 'rgba(248,250,252,0.78)' : colors.textSecondary
  const chevronColor = featured ? 'rgba(248,250,252,0.45)' : colors.neutral[400]

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        featured && styles.tileFeatured,
        column && styles.tileColumn,
        width != null ? { width } : { flex: 1, minWidth: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={[styles.textCol, column && styles.textColColumn]}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {!column && showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={chevronColor} style={styles.chevron} />
      ) : null}
    </TouchableOpacity>
  )
}

/** Fixed half-row width: (screenWidth - horizontalPadding*2 - gap) / columns — only if you pass `width` to tiles. */
export function useDashboardTileWidth(
  horizontalPadding: number,
  gap: number,
  screenWidth: number,
  columns = 2,
) {
  return Math.max(120, Math.floor((screenWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns))
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    minHeight: 92,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  tileFeatured: {
    backgroundColor: colors.brand.forest,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    shadowColor: colors.brand.forest,
    shadowOpacity: 0.25,
  },
  tileColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 108,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  textColColumn: {
    flex: 0,
    width: '100%',
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  chevron: { marginLeft: 2 },
})
