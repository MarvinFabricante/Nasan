import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/constants/theme';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  location?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: ReactNode | string;
  onRightPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A compact top row for each screen. It intentionally does not add a SafeArea
 * wrapper so screens can decide their own scrolling/background behavior.
 */
export default function Header({
  title = 'NASAN',
  subtitle,
  location,
  showBack = false,
  onBackPress,
  rightAction,
  onRightPress,
  rightIcon = 'notifications-outline',
  style,
  contentStyle,
}: HeaderProps) {
  const supportingText = subtitle || location;
  const hasCustomRightAction = rightAction !== undefined && rightAction !== null;

  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.content, contentStyle]}>
        <View style={styles.leading}>
          {showBack ? (
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={10}
              onPress={onBackPress}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
            >
              <Ionicons color={colors.navy} name="chevron-back" size={25} />
            </Pressable>
          ) : (
            <View style={styles.logoMark}>
              <Ionicons color={colors.white} name="bus" size={17} />
            </View>
          )}

          <View style={styles.titleBlock}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {supportingText ? (
              <View style={styles.subtitleRow}>
                {location && !subtitle ? (
                  <Ionicons color={colors.muted} name="location-outline" size={12} />
                ) : null}
                <Text numberOfLines={1} style={styles.subtitle}>
                  {supportingText}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {hasCustomRightAction ? (
          <Pressable
            accessibilityRole={onRightPress ? 'button' : undefined}
            disabled={!onRightPress}
            onPress={onRightPress}
            style={({ pressed }) => [pressed && onRightPress && styles.iconPressed]}
          >
            {typeof rightAction === 'string' ? (
              <View style={styles.actionTextPill}>
                <Text style={styles.actionText}>{rightAction}</Text>
              </View>
            ) : (
              rightAction
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onRightPress}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
          >
            <Ionicons color={colors.navy} name={rightIcon} size={23} />
            <View style={styles.notificationDot} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export { Header };

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  leading: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: spacing.md,
    minWidth: 0,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 36,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 38,
  },
  iconPressed: {
    backgroundColor: colors.sky,
    opacity: 0.82,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },
  subtitle: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    marginLeft: 2,
  },
  notificationDot: {
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 5,
    borderWidth: 1.5,
    height: 8,
    position: 'absolute',
    right: 5,
    top: 5,
    width: 8,
  },
  actionTextPill: {
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
  },
});
