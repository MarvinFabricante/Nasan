import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBusStatusMeta, radius, shadows } from '@/constants/theme';
import { Bus } from '@/types';

export interface BusMapPopupProps {
  bus: Bus | null;
  isMonitored?: boolean;
  distance?: string | null;
  nearestStop?: string | null;
  onClose?: () => void;
  onToggleMonitor?: (busId: string | number) => void;
  onViewDetails?: (bus: Bus) => void;
}

/**
 * Interactive popup / info panel displayed directly over the map
 * when a bus marker is clicked or selected from the arriving-buses list.
 */
export default function BusMapPopup({
  bus,
  isMonitored = false,
  distance,
  nearestStop,
  onClose,
  onToggleMonitor,
  onViewDetails,
}: BusMapPopupProps) {
  if (!bus) return null;

  const status = getBusStatusMeta(bus);
  const availableSeats = Math.max(0, Number(bus.availableSeats) || 0);
  const totalSeats = Math.max(1, Number(bus.totalSeats) || 1);

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.busIdentity}>
          <View
            style={[
              styles.emblem,
              { backgroundColor: isMonitored ? '#0B5CAB' : '#143865' },
            ]}
          >
            <Ionicons color="#FFFFFF" name="bus" size={16} />
          </View>
          <View style={styles.identityText}>
            <View style={styles.numberRow}>
              <Text numberOfLines={1} style={styles.busNumber}>
                {bus.busNumber}
              </Text>
              {isMonitored ? (
                <View style={styles.monitoredPill}>
                  <Ionicons color="#C67800" name="notifications" size={9} />
                  <Text style={styles.monitoredPillText}>TRACKED</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.route}>
              {bus.route}
            </Text>
          </View>
        </View>

        {/* Close Button */}
        {onClose ? (
          <Pressable
            accessibilityLabel="Close bus details"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <Ionicons color="#73869E" name="close" size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* Meta Pills: Status, ETA, Distance */}
      <View style={styles.metaRow}>
        <View
          style={[styles.statusPill, { backgroundColor: status.backgroundColor }]}
        >
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        {bus.eta ? (
          <View style={styles.etaPill}>
            <Ionicons color="#104A7F" name="time-outline" size={12} />
            <Text style={styles.etaText}>ETA {bus.eta}</Text>
          </View>
        ) : null}

        {distance ? (
          <View style={styles.distancePill}>
            <Ionicons color="#4C627D" name="navigate-outline" size={11} />
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        ) : null}
      </View>

      {/* Nearest Stop Info */}
      {nearestStop ? (
        <View style={styles.stopRow}>
          <Ionicons color="#6C8098" name="location" size={12} />
          <Text numberOfLines={1} style={styles.stopText}>
            {nearestStop}
          </Text>
        </View>
      ) : null}

      {/* Seat Capacity Bar */}
      <View style={styles.seatSection}>
        <View style={styles.seatLabelRow}>
          <Text style={styles.seatLabel}>Open Seats</Text>
          <Text style={styles.seatValue}>
            {availableSeats} / {totalSeats}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(1, availableSeats / totalSeats) * 100}%`,
                backgroundColor: status.color,
              },
            ]}
          />
        </View>
      </View>

      {/* Action Buttons: Monitor / Stop Monitoring & Full Details */}
      <View style={styles.actionsRow}>
        {onToggleMonitor ? (
          <Pressable
            accessibilityLabel={
              isMonitored ? 'Stop monitoring this bus' : 'Monitor this bus'
            }
            onPress={() => onToggleMonitor(bus.id)}
            style={({ pressed }) => [
              styles.monitorButton,
              isMonitored && styles.monitorButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={isMonitored ? '#9A5B00' : '#0B5CAB'}
              name={isMonitored ? 'notifications' : 'notifications-outline'}
              size={14}
            />
            <Text
              style={[
                styles.monitorButtonText,
                isMonitored && styles.monitorButtonTextActive,
              ]}
            >
              {isMonitored ? 'Stop Monitoring' : 'Monitor Bus'}
            </Text>
          </Pressable>
        ) : null}

        {onViewDetails ? (
          <Pressable
            accessibilityLabel="View full bus details"
            onPress={() => onViewDetails(bus)}
            style={({ pressed }) => [
              styles.detailsButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
            <Ionicons color="#FFFFFF" name="arrow-forward" size={13} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4E2F0',
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: 10,
    ...shadows.floating,
    shadowColor: '#0E2744',
    shadowOpacity: 0.18,
    shadowRadius: 12,
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
    marginRight: 6,
  },
  emblem: {
    alignItems: 'center',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  identityText: {
    flex: 1,
  },
  numberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  busNumber: {
    color: '#0D294A',
    fontSize: 14,
    fontWeight: '800',
  },
  monitoredPill: {
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    borderColor: '#F5A623',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  monitoredPillText: {
    color: '#C67800',
    fontSize: 8,
    fontWeight: '900',
  },
  route: {
    color: '#61748C',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  statusDot: {
    borderRadius: 2.5,
    height: 5,
    width: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  etaPill: {
    alignItems: 'center',
    backgroundColor: '#EAF3FD',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  etaText: {
    color: '#0B5CAB',
    fontSize: 10,
    fontWeight: '800',
  },
  distancePill: {
    alignItems: 'center',
    backgroundColor: '#F3F6F9',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  distanceText: {
    color: '#4C627D',
    fontSize: 10,
    fontWeight: '700',
  },
  stopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 5,
  },
  stopText: {
    color: '#556980',
    fontSize: 10,
    fontWeight: '600',
  },
  seatSection: {
    marginTop: 6,
  },
  seatLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  seatLabel: {
    color: '#6A7D94',
    fontSize: 9,
    fontWeight: '700',
  },
  seatValue: {
    color: '#0D294A',
    fontSize: 10,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: '#E5ECF2',
    borderRadius: 3,
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 3,
    height: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  monitorButton: {
    alignItems: 'center',
    backgroundColor: '#EBF4FE',
    borderColor: '#B8D8F8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    height: 32,
    justifyContent: 'center',
  },
  monitorButtonActive: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F5A623',
  },
  monitorButtonText: {
    color: '#0B5CAB',
    fontSize: 11,
    fontWeight: '800',
  },
  monitorButtonTextActive: {
    color: '#C67800',
    fontWeight: '800',
  },
  detailsButton: {
    alignItems: 'center',
    backgroundColor: '#0B5CAB',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 3,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});
