import React, { useCallback, useMemo, useRef } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from '@/components/NasanMap';
import { Ionicons } from '@expo/vector-icons';

import BusCard from '@/components/BusCard';
import BusMarker from '@/components/BusMarker';
import BusMapPopup from '@/components/BusMapPopup';
import Header from '@/components/Header';
import ProximityAlertBanner from '@/components/ProximityAlertBanner';
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

const mapRegionFor = (
  coordinate: Coordinate,
  zoom = 0.05,
  verticalOffsetRatio = 0,
): Region => ({
  latitude: coordinate.latitude - zoom * verticalOffsetRatio,
  longitude: coordinate.longitude,
  latitudeDelta: zoom,
  longitudeDelta: zoom,
});

export interface PassengerMapScreenProps {
  navigation?: any;
}

export default function PassengerMapScreen({ navigation }: PassengerMapScreenProps = {}) {
  const router = useRouter();
  const {
    buses = [],
    passengerLocation,
    selectedBusId,
    setSelectedBusId,
    isBusMonitored,
    toggleMonitorBus,
    activeNotification,
    dismissNotification,
  } = useBuses();

  const { width: windowWidth } = useWindowDimensions();
  const isWideScreen = windowWidth >= 768;

  const mapRef = useRef<any>(null);
  const busListRef = useRef<FlatList<Bus>>(null);

  const passengerCoordinate: Coordinate = isCoordinate(passengerLocation)
    ? passengerLocation
    : FALLBACK_LOCATION;

  const initialRegion = useMemo(
    () => mapRegionFor(passengerCoordinate, 0.08),
    [passengerCoordinate.latitude, passengerCoordinate.longitude],
  );

  const selectedBus = useMemo<Bus | null>(
    () =>
      buses.find((bus) => String(bus.id) === String(selectedBusId)) ||
      buses[0] ||
      null,
    [buses, selectedBusId],
  );

  const selectedRoute = useMemo(
    () => (selectedBus ? getRoutePoints(selectedBus) : []),
    [selectedBus],
  );

  const openBusDetails = useCallback(
    (bus: Bus) => {
      if (bus?.id) {
        if (navigation?.navigate) {
          navigation.navigate('BusDetails', { busId: bus.id });
        } else {
          router.push(`/bus/${bus.id}`);
        }
      }
    },
    [navigation, router],
  );

  const centerOnPassenger = useCallback(() => {
    mapRef.current?.animateToRegion(mapRegionFor(passengerCoordinate, 0.06), 350);
  }, [passengerCoordinate]);

  const selectBus = useCallback(
    (bus: Bus) => {
      const coordinate = getBusCoordinate(bus);
      setSelectedBusId(bus.id);
      if (coordinate) {
        const offsetRatio = !isWideScreen ? 0.22 : 0;
        mapRef.current?.animateToRegion(
          mapRegionFor(coordinate, 0.035, offsetRatio),
          350,
        );
      }

      // Auto scroll list
      const idx = buses.findIndex((b) => String(b.id) === String(bus.id));
      if (idx >= 0 && busListRef.current) {
        try {
          busListRef.current.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.3,
          });
        } catch (e) {
          // ignore
        }
      }
    },
    [buses, isWideScreen, setSelectedBusId],
  );

  const selectedBusMeta = useMemo(() => {
    if (!selectedBus) return null;
    const coord = getBusCoordinate(selectedBus);
    const dist = coord
      ? formatDistance(calculateDistanceKm(coord, passengerCoordinate))
      : null;
    const nearest = selectedBus.routeStops
      ? findNearestStop(selectedBus.routeStops, passengerCoordinate)
      : null;
    return {
      distance: dist ? `${dist} away` : null,
      nearestStop: nearest?.stop?.name
        ? `Near ${nearest.stop.name}`
        : selectedBus.currentLocationLabel,
    };
  }, [passengerCoordinate, selectedBus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={styles.safeArea.backgroundColor}
        barStyle="dark-content"
      />
      <Header subtitle="Buses around General Trias" title="Live Map" />

      {activeNotification ? (
        <ProximityAlertBanner
          notification={activeNotification}
          onDismiss={dismissNotification}
          onFocusBus={(id) => {
            const b = buses.find((item) => String(item.id) === String(id));
            if (b) selectBus(b);
            dismissNotification();
          }}
        />
      ) : null}

      <View style={[styles.container, isWideScreen && styles.wideContainer]}>
        {/* Map Area */}
        <View style={styles.mapArea}>
          <MapView
            ref={mapRef}
            initialRegion={initialRegion}
            showsCompass={false}
            showsScale={false}
            style={styles.map}
            toolbarEnabled={false}
          >
            {selectedRoute.length > 1 ? (
              <Polyline
                coordinates={selectedRoute}
                lineCap="round"
                strokeColor="#0B5CAB"
                strokeWidth={4.5}
              />
            ) : null}

            <Marker
              anchor={{ x: 0.5, y: 0.5 }}
              coordinate={passengerCoordinate}
              identifier="passenger_pin"
            >
              <View style={styles.passengerMarkerOuter}>
                <View style={styles.passengerMarkerInner} />
              </View>
            </Marker>

            {buses.map((bus) => {
              if (!getBusCoordinate(bus)) return null;

              const isSelected = String(bus.id) === String(selectedBus?.id);
              const isMonitored = isBusMonitored(bus.id);

              return (
                <BusMarker
                  key={String(bus.id)}
                  bus={bus}
                  isMonitored={isMonitored}
                  onPress={() => selectBus(bus)}
                  selected={isSelected}
                  showCallout={false}
                  userCoordinate={passengerCoordinate}
                />
              );
            })}
          </MapView>

          {/* Legend */}
          <View pointerEvents="none" style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={styles.youLegendDot} />
              <Text style={styles.legendText}>You</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={styles.busLegendDot} />
              <Text style={styles.legendText}>Bus</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <Ionicons color="#C67800" name="notifications" size={11} />
              <Text style={styles.legendText}>Tracked</Text>
            </View>
          </View>

          {/* Center on user button */}
          <Pressable
            accessibilityLabel="Center map on your location"
            accessibilityRole="button"
            onPress={centerOnPassenger}
            style={({ pressed }) => [
              styles.locationControl,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#0B5CAB" name="locate" size={20} />
          </Pressable>

          {/* Floating Selected Bus Popup */}
          {selectedBus ? (
            <View style={styles.mapPopupContainer}>
              <BusMapPopup
                bus={selectedBus}
                distance={selectedBusMeta?.distance}
                isMonitored={isBusMonitored(selectedBus.id)}
                nearestStop={selectedBusMeta?.nearestStop}
                onClose={() => setSelectedBusId(null)}
                onToggleMonitor={toggleMonitorBus}
                onViewDetails={openBusDetails}
              />
            </View>
          ) : null}
        </View>

        {/* Synchronized Arriving Buses Drawer / Side Panel */}
        <View style={[styles.bottomPanel, isWideScreen && styles.wideSidePanel]}>
          <View style={styles.panelHeading}>
            <View>
              <Text style={styles.panelTitle}>Arriving buses</Text>
              <Text style={styles.panelSubtitle}>
                Tap a bus to highlight on map
              </Text>
            </View>
            <Text style={styles.panelCounter}>
              {buses.length} on routes
            </Text>
          </View>

          <FlatList
            ref={busListRef}
            contentContainerStyle={styles.listContent}
            data={buses}
            horizontal={!isWideScreen}
            keyExtractor={(item) => String(item.id)}
            onScrollToIndexFailed={(info) => {
              busListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            renderItem={({ item: bus }) => {
              const coord = getBusCoordinate(bus);
              const dist = coord
                ? formatDistance(calculateDistanceKm(coord, passengerCoordinate))
                : null;
              const isSelected = String(bus.id) === String(selectedBus?.id);
              const isMonitored = isBusMonitored(bus.id);

              return (
                <View
                  style={
                    isWideScreen
                      ? styles.wideCardWrapper
                      : styles.horizontalCardWrapper
                  }
                >
                  <BusCard
                    bus={bus}
                    compact={!isWideScreen}
                    distance={dist ? `${dist} away` : null}
                    isMonitored={isMonitored}
                    onMonitorPress={() => toggleMonitorBus(bus.id)}
                    onPress={() => selectBus(bus)}
                    selected={isSelected}
                  />
                </View>
              );
            }}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={isWideScreen}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8FC',
  },
  container: {
    flex: 1,
  },
  wideContainer: {
    flexDirection: 'row',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  passengerMarkerOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 92, 171, 0.23)',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  passengerMarkerInner: {
    backgroundColor: '#0B5CAB',
    borderColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 3,
    height: 22,
    width: 22,
  },
  legend: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    position: 'absolute',
    ...shadows.card,
    zIndex: 20,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  youLegendDot: {
    backgroundColor: '#0B5CAB',
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  busLegendDot: {
    backgroundColor: '#168A58',
    borderColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    width: 12,
  },
  legendText: {
    color: '#425773',
    fontSize: 11,
    fontWeight: '800',
  },
  legendDivider: {
    backgroundColor: '#DCE5EF',
    height: 14,
    marginHorizontal: 10,
    width: 1,
  },
  locationControl: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D4E2F0',
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 60,
    width: 42,
    ...shadows.floating,
    zIndex: 25,
  },
  mapPopupContainer: {
    bottom: 12,
    left: 12,
    position: 'absolute',
    right: 12,
    zIndex: 35,
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2EAF2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: 230,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    ...shadows.floating,
  },
  wideSidePanel: {
    borderLeftColor: '#E2EAF2',
    borderLeftWidth: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    flex: 0.8,
    maxHeight: '100%',
    padding: 18,
  },
  panelHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    color: '#18324F',
    fontSize: 16,
    fontWeight: '800',
  },
  panelSubtitle: {
    color: '#74849A',
    fontSize: 11,
    marginTop: 2,
  },
  panelCounter: {
    color: '#168654',
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    paddingVertical: 4,
  },
  horizontalCardWrapper: {
    marginRight: 10,
    width: 290,
  },
  wideCardWrapper: {
    marginBottom: 8,
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
});
