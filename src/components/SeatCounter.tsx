import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '@/constants/theme';

export interface SeatCounterProps {
  availableSeats?: number;
  totalSeats?: number;
  label?: string;
  size?: 'large' | 'compact';
  style?: StyleProp<ViewStyle>;
  showControls?: boolean;
  onAddPassenger?: () => void;
  onRemovePassenger?: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  addDisabled?: boolean;
  removeDisabled?: boolean;
}

/**
 * Large availability display shared by the driver dashboard and bus details.
 * Controls are optional so it can also be used as a read-only passenger view.
 */
export default function SeatCounter({
  availableSeats = 0,
  totalSeats = 40,
  label = 'Available seats',
  size = 'large',
  style,
  showControls = false,
  onAddPassenger,
  onRemovePassenger,
  onAdd,
  onRemove,
  addDisabled,
  removeDisabled,
}: SeatCounterProps) {
  const available = Math.max(0, Number(availableSeats) || 0);
  const total = Math.max(1, Number(totalSeats) || 1);
  const occupied = Math.max(0, total - available);
  const ratio = Math.min(available / total, 1);
  const isCompact = size === 'compact';
  const addAction = onAddPassenger || onAdd;
  const removeAction = onRemovePassenger || onRemove;
  const shouldShowControls = showControls || Boolean(addAction || removeAction);
  const canAddPassenger = Boolean(addAction) && !addDisabled && available > 0;
  const canRemovePassenger = Boolean(removeAction) && !removeDisabled && available < total;

  return (
    <View
      accessibilityLabel={`${available} of ${total} available seats`}
      style={[styles.card, isCompact && styles.cardCompact, style]}
    >
      <View style={styles.labelRow}>
        <View style={styles.labelIcon}>
          <Ionicons color={colors.blue} name="people-outline" size={isCompact ? 17 : 20} />
        </View>
        <Text style={[styles.label, isCompact && styles.labelCompact]}>{label}</Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.availableValue, isCompact && styles.availableValueCompact]}>
          {available}
        </Text>
        <Text style={[styles.totalValue, isCompact && styles.totalValueCompact]}> / {total}</Text>
      </View>

      <Text style={styles.occupancyText}>
        {occupied} occupied {occupied === 1 ? 'seat' : 'seats'}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
      </View>

      {shouldShowControls ? (
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Add passenger"
            disabled={!canAddPassenger}
            onPress={addAction}
            style={({ pressed }) => [
              styles.controlButton,
              styles.addPassengerButton,
              !canAddPassenger && styles.controlButtonDisabled,
              pressed && canAddPassenger && styles.controlButtonPressed,
            ]}
          >
            <Ionicons color={colors.white} name="person-add-outline" size={17} />
            <Text style={styles.addPassengerText}>Add Passenger</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Remove passenger"
            disabled={!canRemovePassenger}
            onPress={removeAction}
            style={({ pressed }) => [
              styles.controlButton,
              styles.removePassengerButton,
              !canRemovePassenger && styles.controlButtonDisabled,
              pressed && canRemovePassenger && styles.controlButtonPressed,
            ]}
          >
            <Ionicons color={colors.navy} name="person-remove-outline" size={17} />
            <Text style={styles.removePassengerText}>Remove Passenger</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export { SeatCounter };

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.card,
  },
  cardCompact: {
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  labelIcon: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 32,
  },
  label: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 13,
  },
  valueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  availableValue: {
    color: colors.navy,
    fontSize: 50,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  availableValueCompact: {
    fontSize: 34,
  },
  totalValue: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: '700',
  },
  totalValueCompact: {
    fontSize: 18,
  },
  occupancyText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 1,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 9,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    marginHorizontal: -3,
    marginTop: spacing.xl,
  },
  controlButton: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 3,
    minHeight: 45,
    paddingHorizontal: spacing.sm,
  },
  addPassengerButton: {
    backgroundColor: colors.navy,
  },
  removePassengerButton: {
    backgroundColor: colors.sky,
  },
  controlButtonDisabled: {
    opacity: 0.42,
  },
  controlButtonPressed: {
    opacity: 0.84,
  },
  addPassengerText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  removePassengerText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
});
