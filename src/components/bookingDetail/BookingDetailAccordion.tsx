import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'
import { fonts } from '../../theme/fonts'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type IconVariant = 'green' | 'blue' | 'amber'

const VARIANT_STYLES: Record<
  IconVariant,
  { wrap: object; icon: string }
> = {
  green: { wrap: { backgroundColor: '#f0fdf4' }, icon: colors.primary[600] },
  blue: { wrap: { backgroundColor: '#eff6ff' }, icon: '#3b82f6' },
  amber: { wrap: { backgroundColor: '#fffbeb' }, icon: '#f59e0b' },
}

type Props = {
  title: string
  subtitle: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconVariant?: IconVariant
  expanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}

export function BookingDetailAccordion({
  title,
  subtitle,
  icon,
  iconVariant = 'green',
  expanded,
  onToggle,
  badge,
  children,
}: Props) {
  const v = VARIANT_STYLES[iconVariant]
  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
          onToggle()
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        <View style={[styles.iconWrap, v.wrap]}>
          <Ionicons name={icon} size={18} color={v.icon} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.subline}>{subtitle}</Text>
        </View>
        {badge ? (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <View style={[styles.toggle, expanded && styles.toggleOpen]}>
          <Ionicons
            name="chevron-down"
            size={14}
            color={expanded ? colors.primary[600] : colors.neutral[400]}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </View>
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.body}>
          <View style={styles.divider} />
          {children}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardExpanded: {
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, minWidth: 0 },
  heading: {
    fontSize: 15,
    fontFamily: fonts.headingBold,
    color: colors.brand.forest,
    marginBottom: 2,
  },
  subline: { fontSize: 11, color: colors.neutral[400], fontFamily: fonts.regular },
  countBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  countBadgeText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.neutral[600] },
  toggle: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOpen: {
    backgroundColor: colors.primary[50],
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginBottom: 16,
  },
})
