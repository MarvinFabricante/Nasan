import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from '@/components/NasanMap';
import { Ionicons } from '@expo/vector-icons';

import BusMarker from '@/components/BusMarker';
import Header from '@/components/Header';
import { useBuses } from '@/context/BusContext';
import {
  calculateDistanceKm,
  findNearestStop,
  formatDistance,
} from '@/data/geoUtils';
import { radius, shadows } from '@/constants/theme';
import { Bus, Coordinate, Region } from '@/types';

const FALLBACK_LOCATION: Coordinate = {
  latitude: 14.2785,
  longitude: 120.9043,
};

const isCoordinate = (value: any): value is Coordinate =>
  Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));

const getBusCoordinate = (bus?: Bus | null): Coordinate | null => {
  const coordinate = bus?.coordinates || bus?.location;
  return isCoordinate(coordinate) ? coordinate : null;
};

const getRoutePoints = (bus?: Bus | null): Coordinate[] =>
  (Array.isArray(bus?.routePoints) ? bus.routePoints : [])
    .map((point: any) => point?.coordinates || point)
    .filter(isCoordinate);

const mapRegionFor = (coordinate: Coordinate): Region => ({
  latitude: coordinate.latitude,
  longitude: coordinate.longitude,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
});

const getStatusStyle = (bus?: Bus | null) => {
  const status = String(bus?.status || '').toLowerCase();
  const unavailable =
    bus?.isAvailable === false ||
    status.includes('full') ||
    status.includes('unavailable');

  return unavailable
    ? { backgroundColor: '#FFF0F0', dot: '#DE3D3D', color: '#BD3030' }
    : { backgroundColor: '#E9F8EF', dot: '#21A768', color: '#168654' };
};

const getCurrentLocation = (bus?: Bus | null): string => {
  if (bus?.currentLocationLabel || bus?.currentLocation) {
    return bus.currentLocationLabel || bus.currentLocation || 'General Trias, Cavite';
  }

  const firstStop = Array.isArray(bus?.routeStops) ? bus.routeStops[0] : null;
  if (typeof firstStop === 'string') {
    return `Near ${firstStop}`;
  }
  if (firstStop?.name) {
    return `Near ${firstStop.name}`;
  }

  return 'General Trias, Cavite';
};

export interface BusDetailsScreenProps {
  navigation?: any;
  route?: {
    params?: {
      busId?: string;
    };
  };
}

export default function BusDetailsScreen({ navigation, route }: BusDetailsScreenProps = {}) {
  const router = useRouter();
  const localParams = useLocalSearchParams<{ id?: string; busId?: string }>();

  const {
    buses = [],
    getBusById,
    passengerLocation,
    isBusMonitored,
    toggleMonitorBus,
    monitorThreshold,
    setMonitorThreshold,
  } = useBuses();

  const busId = localParams.id || localParams.busId || route?.params?.busId;
  const bus =
    (typeof getBusById === 'function' ? getBusById(busId) : null) ||
    buses.find((item) => String(item.id) === String(busId));

  const passengerCoordinate: Coordinate = isCoordinate(passengerLocation)
    ? passengerLocation
    : FALLBACK_LOCATION;
  const busCoordinate = getBusCoordinate(bus) || passengerCoordinate;
  const routePoints = getRoutePoints(bus);
  const mapRegion = useMemo(
    () => mapRegionFor(busCoordinate),
    [busCoordinate.latitude, busCoordinate.longitude],
  );

  const isMonitored = bus ? isBusMonitored(bus.id) : false;

  const distanceKm = useMemo(
    () => (bus ? calculateDistanceKm(busCoordinate, passengerCoordinate) : 0),
    [bus, busCoordinate, passengerCoordinate],
  );

  const nearest = useMemo(
    () =>
      bus?.routeStops
        ? findNearestStop(bus.routeStops, passengerCoordinate)
        : null,
    [bus, passengerCoordinate],
  );

  const goBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(passenger)');
  };

  const backToMap = () => {
    if (navigation?.navigate) {
      const routeNames = navigation?.getState?.()?.routeNames || [];
      if (routeNames.includes('PassengerMap')) {
        navigation.navigate('PassengerMap');
        return;
      }
      navigation.navigate('PassengerArea', { screen: 'PassengerMap' });
      return;
    }
    router.push('/(passenger)/map');
  };

  if (!bus) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          backgroundColor={styles.safeArea.backgroundColor}
          barStyle="dark-content"
        />
        <Header
          onBackPress={goBack}
          showBack
          subtitle="Live bus information"
          title="Bus Details"
        />
        <View style={styles.notFound}>
          <Text style={styles.notFoundIcon}>⌁</Text>
          <Text style={styles.notFoundTitle}>Bus not found</Text>
          <Text style={styles.notFoundText}>
            This bus may no longer be active on the route.
          </Text>
          <Pressable onPress={goBack} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const availableSeats = Math.max(0, Number(bus.availableSeats) || 0);
  const totalSeats = Math.max(0, Number(bus.totalSeats) || 0);
  const occupiedSeats = Math.max(0, totalSeats - availableSeats);
  const statusStyle = getStatusStyle(bus);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={styles.safeArea.backgroundColor}
        barStyle="dark-content"
      />
      <Header
        onBackPress={goBack}
        showBack
        subtitle="Live bus information"
        title="Bus Details"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Row */}
        <View style={styles.titleRow}>
          <View
            style={[
              styles.busEmblem,
              isMonitored && styles.busEmblemMonitored,
            ]}
          >
            <Ionicons color="#FFFFFF" name="bus" size={26} />
          </View>
          <View style={styles.titleCopy}>
            <View style={styles.numberRow}>
              <Text style={styles.busNumber}>{bus.busNumber || 'BUS'}</Text>
              {isMonitored ? (
                <View style={styles.monitoredTag}>
                  <Ionicons color="#C67800" name="notifications" size={11} />
                  <Text style={styles.monitoredTagText}>MONITORED</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={2} style={styles.route}>
              {bus.route || 'Route information'}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusStyle.backgroundColor },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusStyle.dot }]}
            />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {bus.status ||
                (bus.isAvailable === false ? 'Unavailable' : 'Available')}
            </Text>
          </View>
        </View>

        {/* Map Card */}
        <View style={styles.mapCard}>
          <MapView
            initialRegion={mapRegion}
            showsCompass={false}
            showsScale={false}
            style={styles.map}
            toolbarEnabled={false}
          >
            {routePoints.length > 1 ? (
              <Polyline
                coordinates={routePoints}
                lineCap="round"
                strokeColor="#0B5CAB"
                strokeWidth={4.5}
              />
            ) : null}
            <Marker
              anchor={{ x: 0.5, y: 0.5 }}
              coordinate={passengerCoordinate}
            >
              <View style={styles.passengerMarker} />
            </Marker>
            <BusMarker bus={bus} isMonitored={isMonitored} selected />
          </MapView>
          <View pointerEvents="none" style={styles.mapLabel}>
            <Text style={styles.mapLabelText}>Current bus location</Text>
          </View>
        </View>

        {/* Monitor Bus Tracking Section */}
        <View
          style={[
            styles.monitoringCard,
            isMonitored && styles.monitoringCardActive,
          ]}
        >
          <View style={styles.monitorHeaderRow}>
            <View style={styles.monitorHeaderLeft}>
              <View
                style={[
                  styles.monitorIconCircle,
                  isMonitored && styles.monitorIconCircleActive,
                ]}
              >
                <Ionicons
                  color={isMonitored ? '#C67800' : '#0B5CAB'}
                  name={isMonitored ? 'notifications' : 'notifications-outline'}
                  size={20}
                />
              </View>
              <View>
                <Text style={styles.monitorTitle}>
                  {isMonitored ? 'Bus is being tracked' : 'Track this bus'}
                </Text>
                <Text style={styles.monitorSubtitle}>
                  {isMonitored
                    ? `Alerting when within ${monitorThreshold}`
                    : 'Get notified when bus approaches your stop'}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel={
                isMonitored ? 'Stop Monitoring this bus' : 'Monitor Bus'
              }
              onPress={() => toggleMonitorBus(bus.id)}
              style={({ pressed }) => [
                styles.monitorActionBtn,
                isMonitored && styles.monitorActionBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.monitorActionBtnText,
                  isMonitored && styles.monitorActionBtnTextActive,
                ]}
              >
                {isMonitored ? 'Stop Monitoring' : 'Monitor Bus'}
              </Text>
            </Pressable>
          </View>

          {isMonitored ? (
            <View style={styles.thresholdConfigRow}>
              <Text style={styles.thresholdConfigLabel}>
                Proximity threshold:
              </Text>
              <View style={styles.thresholdButtons}>
                {(['500m', '1km', '5min'] as const).map((th) => (
                  <Pressable
                    key={th}
                    onPress={() => setMonitorThreshold(th)}
                    style={[
                      styles.thBtn,
                      monitorThreshold === th && styles.thBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.thBtnText,
                        monitorThreshold === th && styles.thBtnTextActive,
                      ]}
                    >
                      {th}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* Available Seats Card */}
        <View style={styles.availabilityCard}>
          <View>
            <Text style={styles.cardEyebrow}>AVAILABLE SEATS</Text>
            <View style={styles.seatNumberRow}>
              <Text style={styles.seatNumber}>{availableSeats}</Text>
              <Text style={styles.seatTotal}> / {totalSeats}</Text>
            </View>
            <Text style={styles.seatCaption}>seats available right now</Text>
          </View>
          <View style={styles.etaBlock}>
            <Text style={styles.etaIcon}>◷</Text>
            <Text style={styles.etaLabel}>ESTIMATED ARRIVAL</Text>
            <Text style={styles.etaValue}>{bus.eta || '--'}</Text>
          </View>
        </View>

        {/* Trip Information Details Card */}
        <Text style={styles.detailHeading}>Trip information</Text>
        <View style={styles.detailCard}>
          <DetailRow
            icon="●"
            label="Driver"
            value={bus.driverName || 'Assigned driver'}
          />
          <View style={styles.divider} />
          <DetailRow
            icon="⌖"
            label="Current location"
            value={getCurrentLocation(bus)}
          />
          <View style={styles.divider} />
          <DetailRow
            icon="◎"
            label="Distance to your stop"
            value={formatDistance(distanceKm)}
          />
          <View style={styles.divider} />
          {nearest?.stop?.name ? (
            <>
              <DetailRow
                icon="⚐"
                label="Nearest route stop"
                value={nearest.stop.name}
              />
              <View style={styles.divider} />
            </>
          ) : null}
          <DetailRow
            icon="◉"
            label="Occupied seats"
            value={`${occupiedSeats} passengers`}
          />
          <View style={styles.divider} />
          <DetailRow
            icon="✓"
            label="Bus status"
            value={bus.status || 'Available'}
          />
        </View>

        <Pressable
          accessibilityLabel="Back to bus map"
          accessibilityRole="button"
          onPress={backToMap}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>Back to Map</Text>
          <Text style={styles.buttonArrow}>→</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  content: {
    padding: 20,
    paddingBottom: 34,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 18,
  },
  busEmblem: {
    alignItems: 'center',
    backgroundColor: '#173F70',
    borderRadius: 17,
    height: 54,
    justifyContent: 'center',
    marginRight: 12,
    width: 54,
  },
  busEmblemMonitored: {
    backgroundColor: '#0B5CAB',
  },
  titleCopy: {
    flex: 1,
    marginRight: 8,
  },
  numberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  busNumber: {
    color: '#12263F',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  monitoredTag: {
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    borderColor: '#F5A623',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  monitoredTagText: {
    color: '#C67800',
    fontSize: 9,
    fontWeight: '900',
  },
  route: {
    color: '#68788E',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    maxWidth: 108,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  statusDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  mapCard: {
    borderColor: '#E2EAF4',
    borderRadius: 22,
    borderWidth: 1.5,
    height: 210,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  map: {
    height: '100%',
    width: '100%',
  },
  passengerMarker: {
    backgroundColor: '#0B5CAB',
    borderColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    width: 20,
  },
  mapLabel: {
    backgroundColor: 'rgba(18, 38, 63, 0.86)',
    borderRadius: 999,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    top: 12,
  },
  mapLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  monitoringCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E5F2',
    borderRadius: radius.md,
    borderWidth: 1.5,
    marginBottom: 18,
    padding: 16,
    ...shadows.card,
  },
  monitoringCardActive: {
    backgroundColor: '#FAFDFE',
    borderColor: '#F5A623',
    borderWidth: 1.5,
  },
  monitorHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monitorHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 10,
  },
  monitorIconCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3FE',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    marginRight: 10,
    width: 38,
  },
  monitorIconCircleActive: {
    backgroundColor: '#FFF4E5',
  },
  monitorTitle: {
    color: '#102D4B',
    fontSize: 14,
    fontWeight: '800',
  },
  monitorSubtitle: {
    color: '#65788E',
    fontSize: 11,
    marginTop: 2,
  },
  monitorActionBtn: {
    backgroundColor: '#0B5CAB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  monitorActionBtnActive: {
    backgroundColor: '#FFF4E5',
    borderColor: '#F5A623',
    borderWidth: 1,
  },
  monitorActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  monitorActionBtnTextActive: {
    color: '#C67800',
  },
  thresholdConfigRow: {
    borderTopColor: '#EAF1F8',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
  },
  thresholdConfigLabel: {
    color: '#61748C',
    fontSize: 11,
    fontWeight: '700',
  },
  thresholdButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  thBtn: {
    backgroundColor: '#F0F5FA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  thBtnActive: {
    backgroundColor: '#0B5CAB',
  },
  thBtnText: {
    color: '#4B6077',
    fontSize: 10,
    fontWeight: '700',
  },
  thBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  availabilityCard: {
    alignItems: 'center',
    backgroundColor: '#173F70',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: '#173F70',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  cardEyebrow: {
    color: '#BBD9FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  seatNumberRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 2,
  },
  seatNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  seatTotal: {
    color: '#BBD9FF',
    fontSize: 19,
    fontWeight: '700',
  },
  seatCaption: {
    color: '#C9E0FD',
    fontSize: 11,
    marginTop: -2,
  },
  etaBlock: {
    alignItems: 'flex-end',
    maxWidth: 102,
  },
  etaIcon: {
    color: '#90D8BC',
    fontSize: 22,
    lineHeight: 23,
  },
  etaLabel: {
    color: '#BBD9FF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 5,
    textAlign: 'right',
  },
  etaValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  detailHeading: {
    color: '#12263F',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 11,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EBF4',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 22,
    paddingHorizontal: 16,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 63,
  },
  detailIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3FE',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    marginRight: 12,
    width: 32,
  },
  detailIconText: {
    color: '#2C7BE5',
    fontSize: 14,
    fontWeight: '900',
  },
  detailCopy: {
    flex: 1,
  },
  detailLabel: {
    color: '#8492A6',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  detailValue: {
    color: '#1B314C',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: '#E9EEF5',
    height: 1,
    marginLeft: 44,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0B5CAB',
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 9,
  },
  notFound: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  notFoundIcon: {
    color: '#8492A6',
    fontSize: 48,
    marginBottom: 12,
  },
  notFoundTitle: {
    color: '#12263F',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  notFoundText: {
    color: '#65788E',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
