import React, { useMemo } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useBuses } from '@/context/BusContext';
import { Bus } from '@/types';

const COLORS = {
  navy: '#0A3156',
  blue: '#1264A3',
  sky: '#EAF5FF',
  canvas: '#F4F7FB',
  ink: '#102A43',
  muted: '#627D98',
  line: '#E3EBF3',
  white: '#FFFFFF',
  green: '#18A56B',
  greenSoft: '#E7F8F0',
  amber: '#EF9B24',
  amberSoft: '#FFF5E5',
  red: '#D94B5C',
  redSoft: '#FDEDEF',
};

const asNumber = (value: any, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBusAvailability = (bus?: Bus | null): boolean => {
  if (typeof bus?.isAvailable === 'boolean') return bus.isAvailable;
  if (typeof bus?.available === 'boolean') return bus.available;
  if (typeof bus?.isActive === 'boolean') return bus.isActive;

  const status = String(bus?.status ?? '').toLowerCase();
  return !['not available', 'unavailable', 'offline', 'out of service'].includes(status);
};

const getSeatTone = (availableSeats: number, totalSeats: number) => {
  if (availableSeats <= 0) return { color: COLORS.red, soft: COLORS.redSoft, label: 'Full' };
  if (availableSeats / totalSeats <= 0.2) {
    return { color: COLORS.amber, soft: COLORS.amberSoft, label: 'Limited seats' };
  }
  return { color: COLORS.green, soft: COLORS.greenSoft, label: 'Seats available' };
};

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  kind?: 'primary' | 'secondary';
}

function IconButton({ icon, label, onPress, disabled, kind = 'primary' }: IconButtonProps) {
  const secondary = kind === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary ? styles.actionButtonSecondary : styles.actionButtonPrimary,
        disabled && styles.actionButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          secondary ? styles.actionIconSecondary : styles.actionIconPrimary,
          disabled && styles.actionIconDisabled,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={secondary ? COLORS.blue : COLORS.white}
        />
      </View>
      <Text
        style={[
          styles.actionText,
          secondary ? styles.actionTextSecondary : styles.actionTextPrimary,
          disabled && styles.actionTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export interface DriverDashboardScreenProps {
  navigation?: any;
}

export default function DriverDashboardScreen({ navigation }: DriverDashboardScreenProps = {}) {
  const router = useRouter();
  const busState = useBuses() || {};
  const {
    buses = [],
    bus101,
    adjustSeats,
    toggleBusAvailability,
    toggleAvailability,
    updateBusAvailability,
    setBusAvailability,
  } = busState;

  // Bus 101 is the assigned driver bus in this prototype. The fallback keeps the
  // screen useful even if a differently-shaped mock-data object is supplied.
  const bus = useMemo<Bus | undefined>(() => {
    return (
      bus101 ||
      buses.find(
        (item) =>
          String(item?.id) === '101' ||
          String(item?.busNumber ?? item?.number ?? '').replace(/\s/g, '') === 'BUS101',
      ) ||
      buses[0]
    );
  }, [buses, bus101]);

  const availableSeats = Math.max(0, asNumber(bus?.availableSeats ?? bus?.seatsAvailable));
  const totalSeats = Math.max(1, asNumber(bus?.totalSeats ?? bus?.capacity, 40));
  const seatedPassengers = Math.max(0, totalSeats - availableSeats);
  const percentage = Math.min(100, Math.round((availableSeats / totalSeats) * 100));
  const isAvailable = getBusAvailability(bus);
  const seatTone = getSeatTone(availableSeats, totalSeats);
  const busId = bus?.id ?? bus?.busId ?? '101';
  const busNumber = bus?.busNumber ?? bus?.number ?? 'BUS 101';
  const route = bus?.route ?? bus?.routeName ?? 'General Trias → Dasmariñas';
  const driverName = bus?.driverName ?? 'Driver';

  const handleSeatChange = (delta: number) => {
    if (!bus || typeof adjustSeats !== 'function') {
      Alert.alert('Seat controls unavailable', 'The local bus data is still loading.');
      return;
    }

    adjustSeats(busId, delta);
  };

  const handleAvailabilityChange = (nextValue: boolean) => {
    if (!bus) return;

    if (typeof toggleBusAvailability === 'function') {
      toggleBusAvailability(busId);
      return;
    }

    if (typeof toggleAvailability === 'function') {
      toggleAvailability(busId);
      return;
    }

    if (typeof updateBusAvailability === 'function') {
      updateBusAvailability(busId, nextValue);
      return;
    }

    if (typeof setBusAvailability === 'function') {
      setBusAvailability(busId, nextValue);
    }
  };

  const openRouteMap = () => {
    if (navigation?.navigate) {
      navigation.navigate('DriverMap');
    } else {
      router.push('/(driver)/map');
    }
  };

  const switchRole = () => {
    if (navigation?.navigate) {
      navigation.navigate('RoleSelection');
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.canvas} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons name="bus" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.brand}>NASAN</Text>
            </View>
            <Text style={styles.greeting}>Welcome, {driverName}</Text>
            <Text style={styles.subtitle}>Here’s your bus at a glance.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch role"
            onPress={switchRole}
            style={({ pressed }) => [styles.roleButton, pressed && styles.pressed]}
          >
            <Ionicons name="swap-horizontal" size={20} color={COLORS.navy} />
          </Pressable>
        </View>

        <View style={styles.busCard}>
          <View style={styles.busCardAccent} />
          <View style={styles.busCardHeader}>
            <View>
              <Text style={styles.assignedLabel}>ASSIGNED BUS</Text>
              <Text style={styles.busNumber}>{busNumber}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: isAvailable ? COLORS.greenSoft : COLORS.redSoft }]}>
              <View style={[styles.statusDot, { backgroundColor: isAvailable ? COLORS.green : COLORS.red }]} />
              <Text style={[styles.statusPillText, { color: isAvailable ? '#147B52' : '#B3374A' }]}>
                {isAvailable ? 'Available' : 'Not available'}
              </Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.routeIcon}>
              <Ionicons name="navigate" size={17} color={COLORS.blue} />
            </View>
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeLabel}>TODAY’S ROUTE</Text>
              <Text numberOfLines={2} style={styles.routeText}>{route}</Text>
            </View>
          </View>
        </View>

        <View style={styles.seatCard}>
          <View style={styles.seatHeader}>
            <View>
              <Text style={styles.cardEyebrow}>SEAT AVAILABILITY</Text>
              <Text style={styles.cardTitle}>Keep your count updated</Text>
            </View>
            <View style={[styles.seatStatus, { backgroundColor: seatTone.soft }]}>
              <View style={[styles.statusDot, { backgroundColor: seatTone.color }]} />
              <Text style={[styles.seatStatusText, { color: seatTone.color }]}>{seatTone.label}</Text>
            </View>
          </View>

          <View style={styles.seatNumberRow}>
            <Text style={[styles.seatNumber, { color: seatTone.color }]}>{availableSeats}</Text>
            <View style={styles.seatDenominatorWrap}>
              <Text style={styles.seatDenominator}>/ {totalSeats}</Text>
              <Text style={styles.availableLabel}>available seats</Text>
            </View>
            <View style={styles.passengerCount}>
              <Ionicons name="people-outline" size={17} color={COLORS.muted} />
              <Text style={styles.passengerCountText}>{seatedPassengers} onboard</Text>
            </View>
          </View>

          <View style={styles.progressTrack} accessibilityLabel={`${percentage} percent seats available`}>
            <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: seatTone.color }]} />
          </View>
          <Text style={styles.progressCaption}>{percentage}% of seats are currently open</Text>

          <View style={styles.actionsRow}>
            <IconButton
              icon="add"
              label="Add Passenger"
              onPress={() => handleSeatChange(-1)}
              disabled={!bus || availableSeats <= 0}
            />
            <View style={styles.actionSpacer} />
            <IconButton
              icon="remove"
              label="Remove Passenger"
              kind="secondary"
              onPress={() => handleSeatChange(1)}
              disabled={!bus || availableSeats >= totalSeats}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusCardIcon}>
            <Ionicons name={isAvailable ? 'checkmark-circle' : 'pause-circle'} size={24} color={isAvailable ? COLORS.green : COLORS.red} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.cardEyebrow}>BUS STATUS</Text>
            <Text style={styles.statusTitle}>{isAvailable ? 'Bus available for pickup' : 'Bus not available'}</Text>
            <Text style={styles.statusDescription}>
              {isAvailable
                ? 'Passengers can see and select this bus.'
                : 'Passengers will see this bus as unavailable.'}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Toggle bus availability"
            value={isAvailable}
            onValueChange={handleAvailabilityChange}
            trackColor={{ false: '#F0B7C0', true: '#91D9BD' }}
            thumbColor={COLORS.white}
            ios_backgroundColor="#F0B7C0"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open driver route map"
          onPress={openRouteMap}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <View style={styles.mapLinkIcon}>
            <Ionicons name="map-outline" size={22} color={COLORS.blue} />
          </View>
          <View style={styles.mapLinkText}>
            <Text style={styles.mapLinkTitle}>View route & live location</Text>
            <Text style={styles.mapLinkSubtitle}>Follow your route and simulate movement.</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={COLORS.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={switchRole}
          style={({ pressed }) => [styles.switchRoleLink, pressed && styles.pressed]}
        >
          <Ionicons name="person-outline" size={17} color={COLORS.blue} />
          <Text style={styles.switchRoleText}>Switch to passenger view</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandMark: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.navy,
    marginRight: 8,
  },
  brand: {
    color: COLORS.navy,
    fontSize: 14,
    letterSpacing: 1.8,
    fontWeight: '800',
  },
  greeting: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 3,
  },
  roleButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: '#183B56',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  busCard: {
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: COLORS.navy,
    padding: 21,
    marginBottom: 16,
    shadowColor: '#0A3156',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  busCardAccent: {
    position: 'absolute',
    width: 180,
    height: 180,
    right: -75,
    top: -82,
    borderRadius: 90,
    backgroundColor: '#125387',
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assignedLabel: {
    color: '#B4D2EA',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 4,
  },
  busNumber: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
  },
  routeIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#E8F4FC',
    marginRight: 11,
  },
  routeTextWrap: {
    flex: 1,
  },
  routeLabel: {
    color: '#B4D2EA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
  },
  routeText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  seatCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  seatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardEyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  seatStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 122,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },
  seatStatusText: {
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },
  seatNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 18,
  },
  seatNumber: {
    fontSize: 54,
    lineHeight: 59,
    letterSpacing: -2,
    fontWeight: '800',
  },
  seatDenominatorWrap: {
    marginBottom: 9,
    marginLeft: 5,
  },
  seatDenominator: {
    color: COLORS.ink,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
  },
  availableLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 1,
  },
  passengerCount: {
    marginLeft: 'auto',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerCountText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  progressTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EDF2F7',
    overflow: 'hidden',
    marginTop: 11,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressCaption: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 7,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  actionSpacer: {
    width: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.blue,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.sky,
    borderWidth: 1,
    borderColor: '#D6EAF9',
  },
  actionButtonDisabled: {
    backgroundColor: '#EEF2F6',
    borderColor: '#EEF2F6',
  },
  actionIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionIconSecondary: {
    backgroundColor: COLORS.white,
  },
  actionIconDisabled: {
    backgroundColor: '#E2E8F0',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionTextPrimary: {
    color: COLORS.white,
  },
  actionTextSecondary: {
    color: COLORS.blue,
  },
  actionTextDisabled: {
    color: '#9AA8B7',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  statusCardIcon: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.canvas,
    marginRight: 12,
  },
  statusCopy: {
    flex: 1,
    paddingRight: 8,
  },
  statusTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  statusDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF5FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D5EAFB',
  },
  mapLinkIcon: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.white,
    marginRight: 12,
  },
  mapLinkText: {
    flex: 1,
  },
  mapLinkTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  mapLinkSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  switchRoleLink: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  switchRoleText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },
  pressed: {
    opacity: 0.76,
  },
});
