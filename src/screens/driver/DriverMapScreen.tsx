import React, { useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from '@/components/NasanMap';
import { Ionicons } from '@expo/vector-icons';

import { useBuses } from '@/context/BusContext';
import { Bus, Coordinate, RouteStop } from '@/types';

const COLORS = {
  navy: '#0A3156',
  blue: '#1264A3',
  canvas: '#F4F7FB',
  white: '#FFFFFF',
  ink: '#102A43',
  muted: '#627D98',
  line: '#E3EBF3',
  green: '#18A56B',
  greenSoft: '#E7F8F0',
  red: '#D94B5C',
  sky: '#EAF5FF',
};

// Fallback points keep the static demo functional when a mock bus only includes
// its current coordinate. They are located around General Trias / Dasmariñas.
const FALLBACK_ROUTE: Coordinate[] = [
  { latitude: 14.273, longitude: 120.955 },
  { latitude: 14.282, longitude: 120.949 },
  { latitude: 14.292, longitude: 120.943 },
  { latitude: 14.304, longitude: 120.939 },
  { latitude: 14.316, longitude: 120.936 },
];

const FALLBACK_STOPS = [
  'General Trias Terminal',
  "Governor's Drive",
  'Dasmariñas Crossing',
  'Dasmariñas Terminal',
];

const toNumber = (value: any): number | null => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getCoordinate = (candidate: any): Coordinate | null => {
  if (!candidate) return null;

  if (Array.isArray(candidate) && candidate.length >= 2 && !Array.isArray(candidate[0])) {
    const latitude = toNumber(candidate[0]);
    const longitude = toNumber(candidate[1]);
    return latitude === null || longitude === null ? null : { latitude, longitude };
  }

  if (typeof candidate !== 'object' || Array.isArray(candidate)) return null;

  const latitude = toNumber(candidate.latitude ?? candidate.lat ?? candidate.y);
  const longitude = toNumber(candidate.longitude ?? candidate.lng ?? candidate.lon ?? candidate.x);

  return latitude === null || longitude === null ? null : { latitude, longitude };
};

const getCurrentCoordinate = (bus?: Bus | null): Coordinate => {
  const choices = [
    bus?.coordinates,
    bus?.coordinate,
    bus?.currentLocation,
    bus?.location,
    bus?.currentCoordinate,
  ];

  return choices.map(getCoordinate).find((c): c is Coordinate => Boolean(c)) ?? FALLBACK_ROUTE[0];
};

const getRouteCoordinates = (bus?: Bus | null, currentCoordinate: Coordinate = FALLBACK_ROUTE[0]): Coordinate[] => {
  const anyBus = bus as any;
  const candidates = [
    anyBus?.routePoints,
    anyBus?.routeCoordinates,
    anyBus?.routePath,
    anyBus?.path,
    anyBus?.coordinatesHistory,
    anyBus?.locations,
    Array.isArray(anyBus?.coordinates) ? anyBus.coordinates : null,
  ];

  const route = candidates
    .find((candidate) => Array.isArray(candidate) && candidate.length > 1)
    ?.map(getCoordinate)
    .filter((c: any): c is Coordinate => Boolean(c));

  if (!route || route.length < 2) return FALLBACK_ROUTE;

  const includesCurrent = route.some(
    (point: Coordinate) =>
      Math.abs(point.latitude - currentCoordinate.latitude) < 0.0001 &&
      Math.abs(point.longitude - currentCoordinate.longitude) < 0.0001,
  );

  return includesCurrent ? route : [currentCoordinate, ...route];
};

interface ProcessedStop {
  id: string;
  name: string;
  coordinate: Coordinate;
}

const getStops = (bus?: Bus | null, route: Coordinate[] = FALLBACK_ROUTE): ProcessedStop[] => {
  const rawStops = (bus as any)?.stops ?? bus?.routeStops ?? (bus as any)?.checkpoints;
  const source = Array.isArray(rawStops) && rawStops.length ? rawStops : FALLBACK_STOPS;

  return source.map((stop: any, index: number) => {
    const isString = typeof stop === 'string';
    const stopCoordinate = getCoordinate(stop?.coordinates ?? stop?.coordinate ?? stop?.location ?? stop);
    return {
      id: String(stop?.id ?? stop?.name ?? stop?.label ?? stop ?? index),
      name: isString ? stop : stop?.name ?? stop?.label ?? stop?.stopName ?? `Route stop ${index + 1}`,
      coordinate: stopCoordinate ?? route[Math.min(index, route.length - 1)],
    };
  });
};

const getBusAvailability = (bus?: Bus | null): boolean => {
  const anyBus = bus as any;
  if (typeof anyBus?.isAvailable === 'boolean') return anyBus.isAvailable;
  if (typeof anyBus?.available === 'boolean') return anyBus.available;
  const status = String(anyBus?.availability ?? anyBus?.status ?? '').toLowerCase();
  return !['not available', 'unavailable', 'offline', 'out of service'].includes(status);
};

interface StopRowProps {
  stop: ProcessedStop;
  index: number;
  last: boolean;
  active: boolean;
}

function StopRow({ stop, index, last, active }: StopRowProps) {
  return (
    <View style={styles.stopRow}>
      <View style={styles.stopRail}>
        <View style={[styles.stopDot, active && styles.stopDotActive]}>
          {active && <Ionicons name="bus" size={11} color={COLORS.white} />}
        </View>
        {!last && <View style={styles.stopLine} />}
      </View>
      <View style={styles.stopContent}>
        <Text style={[styles.stopName, active && styles.stopNameActive]} numberOfLines={1}>
          {stop.name}
        </Text>
        <Text style={styles.stopCaption}>
          {active ? 'Current bus location' : index === 0 ? 'Route origin' : last ? 'Destination' : 'Route checkpoint'}
        </Text>
      </View>
      {last && <Ionicons name="flag" size={18} color={COLORS.green} />}
    </View>
  );
}

export interface DriverMapScreenProps {
  navigation?: any;
}

export default function DriverMapScreen({ navigation }: DriverMapScreenProps = {}) {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const busState = useBuses() || {};
  const { buses = [], bus101, simulateMovement } = busState;

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

  const busId = bus?.id ?? bus?.busId ?? '101';
  const busNumber = bus?.busNumber ?? bus?.number ?? 'BUS 101';
  const routeName = bus?.route ?? bus?.routeName ?? 'General Trias → Dasmariñas';
  const currentCoordinate = getCurrentCoordinate(bus);
  const route = getRouteCoordinates(bus, currentCoordinate);
  const stops = getStops(bus, route);
  const destination = route[route.length - 1];
  const isAvailable = getBusAvailability(bus);
  const eta = bus?.eta ?? bus?.estimatedArrival ?? '5 min';

  const nearestStopIndex = useMemo(() => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    stops.forEach((stop, index) => {
      const distance =
        (stop.coordinate.latitude - currentCoordinate.latitude) ** 2 +
        (stop.coordinate.longitude - currentCoordinate.longitude) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }, [currentCoordinate.latitude, currentCoordinate.longitude, stops]);

  const currentStop = stops[nearestStopIndex] ?? stops[0];
  const nextStop = stops[Math.min(nearestStopIndex + 1, stops.length - 1)] ?? currentStop;
  const currentLocationLabel = bus?.currentLocationLabel ?? currentStop?.name;
  const mapRegion = {
    latitude: currentCoordinate.latitude,
    longitude: currentCoordinate.longitude,
    latitudeDelta: 0.052,
    longitudeDelta: 0.052,
  };

  useEffect(() => {
    // simulateMovement updates the shared mock state; this simply follows it on map.
    mapRef.current?.animateToRegion(mapRegion, 500);
  }, [currentCoordinate.latitude, currentCoordinate.longitude]);

  const goBackToDashboard = () => {
    if (navigation?.navigate) {
      navigation.navigate('DriverDashboard');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(driver)');
    }
  };

  const handleSimulateMovement = () => {
    if (typeof simulateMovement !== 'function') {
      Alert.alert('Simulation unavailable', 'The local movement simulator is still loading.');
      return;
    }

    simulateMovement(busId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.canvas} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to driver dashboard"
            onPress={goBackToDashboard}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={21} color={COLORS.navy} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Route tracker</Text>
            <Text style={styles.headerSubtitle}>{busNumber} · Driver view</Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: isAvailable ? COLORS.greenSoft : '#FDEDEF' }]}>
            <View style={[styles.liveDot, { backgroundColor: isAvailable ? COLORS.green : COLORS.red }]} />
            <Text style={[styles.liveText, { color: isAvailable ? '#147B52' : '#B3374A' }]}>LIVE</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeCardIcon}>
            <Ionicons name="navigate" size={20} color={COLORS.blue} />
          </View>
          <View style={styles.routeCardCopy}>
            <Text style={styles.routeEyebrow}>ACTIVE ROUTE</Text>
            <Text style={styles.routeName} numberOfLines={2}>{routeName}</Text>
          </View>
          <View style={styles.etaBox}>
            <Ionicons name="time-outline" size={14} color={COLORS.blue} />
            <Text style={styles.etaText}>{eta}</Text>
          </View>
        </View>

        <View style={styles.mapShell}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            showsCompass={false}
            showsScale={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Polyline coordinates={route} strokeColor={COLORS.blue} strokeWidth={5} />
            {stops.slice(0, -1).map((stop, index) => (
              <Marker
                key={`stop-${stop.id}-${index}`}
                coordinate={stop.coordinate}
                title={stop.name}
                description={index === nearestStopIndex ? 'Current location' : 'Route checkpoint'}
                pinColor={index === nearestStopIndex ? COLORS.blue : '#8FA2B5'}
              />
            ))}
            <Marker
              coordinate={destination}
              title="Destination"
              description={stops[stops.length - 1]?.name ?? 'Route destination'}
              pinColor={COLORS.green}
            />
            <Marker
              coordinate={currentCoordinate}
              title={busNumber}
              description={`Current location · ${isAvailable ? 'Available' : 'Not available'}`}
              pinColor={COLORS.navy}
            />
          </MapView>

          <View style={styles.simulationBadge} pointerEvents="none">
            <Ionicons name="radio" size={13} color={COLORS.white} />
            <Text style={styles.simulationBadgeText}>SIMULATION MODE</Text>
          </View>
          <View style={styles.locationOverlay} pointerEvents="none">
            <View style={styles.locationOverlayIcon}>
              <Ionicons name="bus" size={16} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.locationOverlayTitle}>Current position</Text>
              <Text style={styles.locationOverlaySubtitle} numberOfLines={1}>{currentLocationLabel}</Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Simulate bus movement"
          onPress={handleSimulateMovement}
          style={({ pressed }) => [styles.simulateButton, pressed && styles.pressed]}
        >
          <View style={styles.simulateIcon}>
            <Ionicons name="play" size={17} color={COLORS.blue} />
          </View>
          <View style={styles.simulateCopy}>
            <Text style={styles.simulateTitle}>Simulate movement</Text>
            <Text style={styles.simulateSubtitle}>Move {busNumber} to the next route point</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={COLORS.blue} />
        </Pressable>

        <View style={styles.nextStopCard}>
          <View style={styles.nextStopIcon}>
            <Ionicons name="flag-outline" size={21} color={COLORS.green} />
          </View>
          <View style={styles.nextStopCopy}>
            <Text style={styles.routeEyebrow}>NEXT STOP</Text>
            <Text style={styles.nextStopName}>{nextStop?.name}</Text>
          </View>
          <Text style={styles.nextStopCaption}>{nearestStopIndex >= stops.length - 1 ? 'Arrived' : 'On route'}</Text>
        </View>

        <View style={styles.stopsCard}>
          <View style={styles.stopsHeading}>
            <View>
              <Text style={styles.stopsTitle}>Route checkpoints</Text>
              <Text style={styles.stopsSubtitle}>{stops.length} stops on this trip</Text>
            </View>
            <Ionicons name="trail-sign-outline" size={23} color={COLORS.blue} />
          </View>
          <View style={styles.stopsList}>
            {stops.map((stop, index) => (
              <StopRow
                key={`${stop.id}-${index}`}
                stop={stop}
                index={index}
                active={index === nearestStopIndex}
                last={index === stops.length - 1}
              />
            ))}
          </View>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.muted} />
          <Text style={styles.noteText}>Location changes are simulated with predefined route coordinates.</Text>
        </View>
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
  header: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  routeCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 15,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  routeCardIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sky,
    marginRight: 11,
  },
  routeCardCopy: {
    flex: 1,
    paddingRight: 6,
  },
  routeEyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.05,
  },
  routeName: {
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    marginTop: 3,
  },
  etaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.sky,
  },
  etaText: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  mapShell: {
    height: 335,
    overflow: 'hidden',
    borderRadius: 23,
    backgroundColor: '#DCEAF4',
    borderWidth: 1,
    borderColor: COLORS.line,
    marginBottom: 15,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  simulationBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(10,49,86,0.93)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  simulationBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginLeft: 5,
  },
  locationOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#173B59',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  locationOverlayIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.navy,
    marginRight: 9,
  },
  locationOverlayTitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  locationOverlaySubtitle: {
    maxWidth: 230,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  simulateButton: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 13,
    borderRadius: 19,
    backgroundColor: COLORS.blue,
    shadowColor: '#1264A3',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.15,
    shadowRadius: 9,
    elevation: 4,
  },
  simulateIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginRight: 12,
  },
  simulateCopy: {
    flex: 1,
  },
  simulateTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  simulateSubtitle: {
    color: '#D9EDFC',
    fontSize: 11,
    marginTop: 3,
  },
  nextStopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
    borderRadius: 19,
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: '#CBEEDC',
  },
  nextStopIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.white,
    marginRight: 11,
  },
  nextStopCopy: {
    flex: 1,
  },
  nextStopName: {
    color: '#176548',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },
  nextStopCaption: {
    color: '#22845E',
    fontSize: 11,
    fontWeight: '800',
  },
  stopsCard: {
    borderRadius: 21,
    backgroundColor: COLORS.white,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  stopsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  stopsTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  stopsSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  stopsList: {
    paddingTop: 17,
  },
  stopRow: {
    minHeight: 50,
    flexDirection: 'row',
  },
  stopRail: {
    width: 25,
    alignItems: 'center',
  },
  stopDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginTop: 2,
    borderWidth: 3,
    borderColor: '#B5C3D0',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotActive: {
    width: 23,
    height: 23,
    borderRadius: 12,
    marginTop: -3,
    borderWidth: 0,
    backgroundColor: COLORS.blue,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  stopLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    backgroundColor: '#D9E2EC',
  },
  stopContent: {
    flex: 1,
    paddingLeft: 7,
    paddingBottom: 12,
  },
  stopName: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  stopNameActive: {
    color: COLORS.blue,
    fontWeight: '800',
  },
  stopCaption: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 7,
    paddingTop: 17,
  },
  noteText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 6,
  },
  pressed: {
    opacity: 0.78,
  },
});
