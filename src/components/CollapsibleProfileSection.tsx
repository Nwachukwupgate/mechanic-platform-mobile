import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'

type Props = {
  title: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  expanded: boolean
  onToggle: () => void
  onLayout?: (y: number) => void
  badge?: string
  children: React.ReactNode
}

export function CollapsibleProfileSection({
  title,
  icon,
  expanded,
  onToggle,
  onLayout,
  badge,
  children,
}: Props) {
  return (
    <View
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        onLayout?.(e.nativeEvent.layout.y)
      }}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${expanded ? 'expanded' : 'collapsed'}`}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={20} color={colors.primary[600]} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.neutral[500]}
        />
      </TouchableOpacity>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.neutral[100],
    borderRadius: 14,
    backgroundColor: colors.surface,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  badge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.neutral[600] },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
})
