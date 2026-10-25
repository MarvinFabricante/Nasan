import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Callout, Marker } from './NasanMap';
import { Ionicons } from '@expo/vector-icons';
import { colors, getBusStatusMeta, radius, shadows } from '@/constants/theme';
import { calculateDistanceKm, formatDistance } from '@/data/geoUtils';
import { Bus, Coordinate } from '@/types';

export interface BusMarkerProps {
  bus: Bus;
  onPress?: () => void;
  selected?: boolean;
  isMonitored?: boolean;
  showCallout?: boolean;
  userCoordinate?: Coordinate | null;
}

export default function BusMarker({
  bus,
  onPress,
  selected = false,
  isMonitored = false,
  showCallout = true,
  userCoordinate,
}: BusMarkerProps) {
  const coordinates = bus?.coordinates || bus?.location;
  if (!bus || !coordinates?.latitude || !coordinates?.longitude) return null;

  const status = getBusStatusMeta(bus);
  const availableSeats = Math.max(0, Number(bus.availableSeats) || 0);
  const totalSeats = Math.max(1, Number(bus.totalSeats) || 1);

  const distance = userCoordinate
    ? formatDistance(calculateDistanceKm(coordinates, userCoordinate))
    : null;

  const shortBusNum = String(bus.busNumber || bus.id || '').replace(/BUS\s*/i, '');

  return (
    <Marker
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={coordinates}
      identifier={String(bus.id || bus.busNumber)}
      onPress={onPress}
      zIndex={selected ? 20 : isMonitored ? 15 : 5}
    >
      <View style={styles.markerWrapper}>
        {selected ? <View style={styles.selectedHalo} /> : null}

        {isMonitored && !selected ? <View style={styles.monitoredHalo} /> : null}

        <View
          accessibilityLabel={`${bus.busNumber}, ${status.label}${isMonitored ? ', Monitored' : ''}`}
          style={[
            styles.marker,
            selected && styles.markerSelected,
            isMonitored && styles.markerMonitored,
            { backgroundColor: status.color },
          ]}
        >
          <Ionicons color={colors.white} name="bus" size={selected ? 20 : 17} />

          {isMonitored ? (
            <View style={styles.monitoredBadge}>
              <Ionicons color="#FFFFFF" name="notifications" size={9} />
            </View>
          ) : null}
        </View>

        <View style={[styles.idBadge, selected && styles.idBadgeSelected]}>
          <Text style={[styles.idBadgeText, selected && styles.idBadgeTextSelected]}>
            {shortBusNum || bus.busNumber}
          </Text>
        </View>
      </View>

      {showCallout ? (
        <Callout tooltip>
          <View style={styles.callout}>
            <View style={styles.calloutTopRow}>
              <View style={styles.calloutTitleGroup}>
                <Text style={styles.calloutBusNumber}>{bus.busNumber}</Text>
                {isMonitored ? (
                  <View style={styles.calloutMonitoredPill}>
                    <Text style={styles.calloutMonitoredText}>TRACKING</Text>
                  </View>
                ) : null}
              </View>
              {bus.eta ? <Text style={styles.calloutEta}>{bus.eta}</Text> : null}
            </View>

            <Text numberOfLines={1} style={styles.calloutRoute}>
              {bus.route}
            </Text>

            {distance ? (
              <Text style={styles.calloutDistance}>
                ⌖ {distance} from your stop
              </Text>
            ) : null}

            <View style={styles.calloutStatusRow}>
              <View
                style={[
                  styles.calloutStatusDot,
                  { backgroundColor: status.color },
                ]}
              />
              <Text style={[styles.calloutStatus, { color: status.color }]}>
                {status.label}
              </Text>
              <Text style={styles.calloutSeats}>
                {availableSeats}/{totalSeats} seats
              </Text>
            </View>
          </View>
        </Callout>
      ) : null}
    </Marker>
  );
}

export { BusMarker };

const styles = StyleSheet.create({
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedHalo: {
    backgroundColor: 'rgba(11, 92, 171, 0.28)',
    borderColor: '#2C7BE5',
    borderRadius: 36,
    borderWidth: 2,
    height: 64,
    position: 'absolute',
    width: 64,
  },
  monitoredHalo: {
    backgroundColor: 'rgba(245, 166, 35, 0.22)',
    borderColor: '#F5A623',
    borderRadius: 30,
    borderWidth: 2,
    height: 54,
    position: 'absolute',
    width: 54,
  },
  marker: {
    alignItems: 'center',
    borderColor: colors.white,
    borderRadius: 22,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
    ...shadows.floating,
  },
  markerSelected: {
    borderColor: '#0B2E59',
    borderWidth: 3.5,
    transform: [{ scale: 1.2 }],
    shadowColor: '#0B2E59',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  markerMonitored: {
    borderColor: '#FFFFFF',
  },
  monitoredBadge: {
    alignItems: 'center',
    backgroundColor: '#F5A623',
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: -4,
    top: -4,
    width: 16,
    zIndex: 10,
  },
  idBadge: {
    backgroundColor: 'rgba(16, 45, 75, 0.88)',
    borderRadius: 6,
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  idBadgeSelected: {
    backgroundColor: '#0B5CAB',
  },
  idBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  idBadgeTextSelected: {
    fontWeight: '900',
  },
  callout: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 220,
    padding: 12,
    ...shadows.floating,
  },
  calloutTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calloutTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  calloutBusNumber: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  calloutMonitoredPill: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F5A623',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  calloutMonitoredText: {
    color: '#C67800',
    fontSize: 8,
    fontWeight: '900',
  },
  calloutEta: {
    color: '#168A58',
    fontSize: 13,
    fontWeight: '800',
  },
  calloutRoute: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },
  calloutDistance: {
    color: '#0B5CAB',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  calloutStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  calloutStatusDot: {
    borderRadius: 4,
    height: 7,
    marginRight: 5,
    width: 7,
  },
  calloutStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  calloutSeats: {
    color: colors.muted,
    fontSize: 11,
    marginLeft: 'auto',
  },
});
