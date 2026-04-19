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
}

export function DashboardActionTile({
  icon,
  title,
  subtitle,
  width,
  iconColor,
  iconBg,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.tile, width != null ? { width } : { flex: 1, minWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} style={styles.chevron} />
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
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    minHeight: 88,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 15,
  },
  chevron: { marginLeft: 2 },
})
