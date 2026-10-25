import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  getBusStatusMeta,
  radius,
  shadows,
  spacing,
} from '@/constants/theme';
import { Bus } from '@/types';

export interface BusCardProps {
  bus: Bus;
  onPress?: () => void;
  onMonitorPress?: (bus: Bus) => void;
  selected?: boolean;
  isMonitored?: boolean;
  distance?: string | null;
  nearestStop?: string | null;
  compact?: boolean;
  showDriver?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function BusCard({
  bus,
  onPress,
  onMonitorPress,
  selected = false,
  isMonitored = false,
  distance,
  nearestStop,
  compact = false,
  showDriver = false,
  style,
  testID,
}: BusCardProps) {
  if (!bus) return null;

  const availableSeats = Math.max(0, Number(bus.availableSeats) || 0);
  const totalSeats = Math.max(1, Number(bus.totalSeats) || 1);
  const status = getBusStatusMeta(bus);
  const availabilityRatio = Math.min(availableSeats / totalSeats, 1);

  return (
    <Pressable
      accessibilityHint={onPress ? 'Selects bus on map' : undefined}
      accessibilityLabel={`${bus.busNumber}, ${status.label}, ${availableSeats} of ${totalSeats} seats available${isMonitored ? ', Monitored' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.sky }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        compact && styles.cardCompact,
        pressed && onPress && styles.cardPressed,
        style,
      ]}
      testID={testID}
    >
      {selected ? <View style={styles.selectedRibbon} /> : null}

      <View style={styles.topRow}>
        <View style={styles.busIdentity}>
          <View
            style={[
              styles.busIcon,
              { backgroundColor: selected ? '#0B5CAB' : status.backgroundColor },
            ]}
          >
            <Ionicons
              color={selected ? '#FFFFFF' : status.color}
              name="bus-outline"
              size={22}
            />
          </View>
          <View style={styles.identityText}>
            <View style={styles.numberRow}>
              <Text numberOfLines={1} style={styles.busNumber}>
                {bus.busNumber}
              </Text>
              {isMonitored ? (
                <View style={styles.monitoredPill}>
                  <Ionicons color="#C67800" name="notifications" size={11} />
                  <Text style={styles.monitoredPillText}>Monitoring</Text>
                </View>
              ) : null}
              {selected ? (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>SELECTED</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.route}>
              {bus.route}
            </Text>
          </View>
        </View>

        {bus.eta ? (
          <View style={[styles.etaPill, selected && styles.etaPillSelected]}>
            <Ionicons
              color={selected ? '#0B5CAB' : colors.navy}
              name="time-outline"
              size={14}
            />
            <Text style={[styles.etaText, selected && styles.etaTextSelected]}>
              {bus.eta}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        {distance ? (
          <View style={styles.metaBadge}>
            <Ionicons color="#104A7F" name="navigate-outline" size={12} />
            <Text style={styles.metaBadgeText}>{distance}</Text>
          </View>
        ) : null}

        {nearestStop ? (
          <View style={styles.metaBadge}>
            <Ionicons color="#556982" name="location-outline" size={12} />
            <Text numberOfLines={1} style={styles.metaBadgeText}>
              {nearestStop}
            </Text>
          </View>
        ) : null}
      </View>

      {showDriver && bus.driverName ? (
        <Text style={styles.driverText}>Driver: {bus.driverName}</Text>
      ) : null}

      <View style={styles.statusAndActionRow}>
        <View
          style={[styles.statusPill, { backgroundColor: status.backgroundColor }]}
        >
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {onMonitorPress ? (
          <Pressable
            accessibilityLabel={isMonitored ? 'Stop monitoring' : 'Monitor bus'}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              onMonitorPress(bus);
            }}
            style={({ pressed }) => [
              styles.quickMonitorBtn,
              isMonitored && styles.quickMonitorBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={isMonitored ? '#C67800' : '#4E6178'}
              name={isMonitored ? 'notifications' : 'notifications-outline'}
              size={14}
            />
            <Text
              style={[
                styles.quickMonitorText,
                isMonitored && styles.quickMonitorTextActive,
              ]}
            >
              {isMonitored ? 'Stop' : 'Track'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!compact ? (
        <View style={styles.seatSection}>
          <View style={styles.seatHeading}>
            <Text style={styles.seatLabel}>Available seats</Text>
            <Text style={styles.seatValue}>
              {availableSeats}{' '}
              <Text style={styles.seatTotal}>/ {totalSeats}</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${availabilityRatio * 100}%`,
                  backgroundColor: status.color,
                },
              ]}
            />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export { BusCard };

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'relative',
    ...shadows.card,
  },
  cardSelected: {
    backgroundColor: '#FAFDFE',
    borderColor: '#0B5CAB',
    borderWidth: 2,
    shadowColor: '#0B5CAB',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    transform: [{ scale: 1.01 }],
  },
  selectedRibbon: {
    backgroundColor: '#0B5CAB',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 5,
  },
  cardCompact: {
    paddingVertical: spacing.md,
  },
  cardPressed: {
    opacity: 0.92,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: spacing.sm,
    minWidth: 0,
  },
  busIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  identityText: {
    flex: 1,
  },
  numberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  busNumber: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  monitoredPill: {
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    borderColor: '#F5A623',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  monitoredPillText: {
    color: '#C67800',
    fontSize: 9,
    fontWeight: '800',
  },
  selectedBadge: {
    backgroundColor: '#0B5CAB',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  route: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  etaPill: {
    alignItems: 'center',
    backgroundColor: colors.sky,
    borderRadius: radius.pill,
    flexDirection: 'row',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  etaPillSelected: {
    backgroundColor: '#DDEEFE',
  },
  etaText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  etaTextSelected: {
    color: '#0B5CAB',
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 58,
    marginTop: 6,
  },
  metaBadge: {
    alignItems: 'center',
    backgroundColor: '#F0F5FA',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metaBadgeText: {
    color: '#41556E',
    fontSize: 10,
    fontWeight: '700',
  },
  driverText: {
    color: colors.muted,
    fontSize: 12,
    marginLeft: 58,
    marginTop: spacing.sm,
  },
  statusAndActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 58,
    marginTop: spacing.sm,
  },
  statusPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    marginRight: 6,
    width: 7,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickMonitorBtn: {
    alignItems: 'center',
    backgroundColor: '#F2F5F8',
    borderColor: '#D8E2EC',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  quickMonitorBtnActive: {
    backgroundColor: '#FFF5E6',
    borderColor: '#F5A623',
  },
  quickMonitorText: {
    color: '#4E6178',
    fontSize: 11,
    fontWeight: '700',
  },
  quickMonitorTextActive: {
    color: '#C67800',
    fontWeight: '800',
  },
  seatSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  seatHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seatLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  seatValue: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '800',
  },
  seatTotal: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 7,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: radius.pill,
    height: '100%',
    minWidth: 0,
  },
  pressed: {
    opacity: 0.75,
  },
});
