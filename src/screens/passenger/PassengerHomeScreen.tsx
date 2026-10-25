import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  zoomLevel = 0.075,
  verticalOffsetRatio = 0,
): Region => ({
  latitude: coordinate.latitude - zoomLevel * verticalOffsetRatio,
  longitude: coordinate.longitude,
  latitudeDelta: zoomLevel,
  longitudeDelta: zoomLevel,
});

export interface PassengerHomeScreenProps {
  navigation?: any;
}

/**
 * Passenger Home Screen with dedicated Full-Screen Map view.
 * When clicking "See Map":
 * - Renders a true full-screen root layout with 100% width and height.
 * - Displays ALL arriving buses in a synchronized bottom drawer.
 * - Clicking any bus centers and highlights it on the full map.
 * - Clicking "Exit Full Screen" collapses smoothly back to the standard home dashboard.
 */
export default function PassengerHomeScreen({ navigation }: PassengerHomeScreenProps = {}) {
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
    monitorThreshold,
    setMonitorThreshold,
  } = useBuses();

  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWideScreen = windowWidth >= 768;

  // Full-screen map state
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const homeMapRef = useRef<any>(null);
  const fullScreenMapRef = useRef<any>(null);
  const homeBusListRef = useRef<FlatList<Bus>>(null);
  const fullScreenBusListRef = useRef<FlatList<Bus>>(null);

  const passengerCoordinate: Coordinate = isCoordinate(passengerLocation)
    ? passengerLocation
    : FALLBACK_LOCATION;

  // Selected bus
  const selectedBus = useMemo<Bus | null>(() => {
    if (selectedBusId) {
      const match = buses.find((b) => String(b.id) === String(selectedBusId));
      if (match) return match;
    }
    return null;
  }, [buses, selectedBusId]);

  const selectedRoute = useMemo(
    () => (selectedBus ? getRoutePoints(selectedBus) : []),
    [selectedBus],
  );

  const initialRegion = useMemo(
    () => mapRegionFor(passengerCoordinate, 0.08),
    [passengerCoordinate.latitude, passengerCoordinate.longitude],
  );

  /**
   * Focuses and highlights a bus on the active map.
   * In mobile full-screen mode, shifts the center south (offsetRatio 0.28) so the bus
   * marker is positioned in the upper visible area of the map, clearly ABOVE the popup card.
   */
  const handleSelectBus = useCallback(
    (bus: Bus) => {
      if (!bus) return;
      setSelectedBusId(bus.id);

      const coord = getBusCoordinate(bus);
      if (coord) {
        const activeMap = isFullScreenMap
          ? fullScreenMapRef.current
          : homeMapRef.current;
        if (activeMap) {
          const offsetRatio = isFullScreenMap && !isWideScreen ? 0.28 : 0;
          activeMap.animateToRegion(mapRegionFor(coord, 0.038, offsetRatio), 400);
        }
      }
    },
    [isFullScreenMap, isWideScreen, setSelectedBusId],
  );

  // Automatically adjust view when full screen opens with an already-selected bus
  useEffect(() => {
    if (isFullScreenMap && selectedBus) {
      const coord = getBusCoordinate(selectedBus);
      if (coord && fullScreenMapRef.current) {
        const offsetRatio = !isWideScreen ? 0.28 : 0;
        const timer = setTimeout(() => {
          fullScreenMapRef.current?.animateToRegion(
            mapRegionFor(coord, 0.038, offsetRatio),
            350,
          );
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [isFullScreenMap, isWideScreen, selectedBus]);

  /**
   * When a map marker is clicked:
   * 1. Updates selection
   * 2. Pans to bus
   * 3. Automatically scrolls the list to bring the bus into view
   */
  const handleMarkerPress = useCallback(
    (bus: Bus) => {
      handleSelectBus(bus);

      const busIndex = buses.findIndex(
        (b) => String(b.id) === String(bus?.id),
      );
      const activeList = isFullScreenMap
        ? fullScreenBusListRef.current
        : homeBusListRef.current;

      if (busIndex >= 0 && activeList) {
        try {
          activeList.scrollToIndex({
            index: busIndex,
            animated: true,
            viewPosition: 0.25,
          });
        } catch (e) {
          // ignore layout measurement timing
        }
      }
    },
    [buses, handleSelectBus, isFullScreenMap],
  );

  const handleDeselectBus = useCallback(() => {
    setSelectedBusId(null);
  }, [setSelectedBusId]);

  const centerOnPassenger = useCallback(() => {
    const activeMap = isFullScreenMap
      ? fullScreenMapRef.current
      : homeMapRef.current;
    if (activeMap) {
      const offsetRatio = isFullScreenMap && !isWideScreen ? 0.18 : 0;
      activeMap.animateToRegion(
        mapRegionFor(passengerCoordinate, 0.06, offsetRatio),
        350,
      );
    }
  }, [isFullScreenMap, isWideScreen, passengerCoordinate]);

  const openBusDetails = useCallback(
    (bus: Bus) => {
      if (!bus?.id) return;
      if (navigation?.navigate) {
        navigation.navigate('BusDetails', { busId: bus.id });
      } else {
        router.push(`/bus/${bus.id}`);
      }
    },
    [navigation, router],
  );

  const locateOnMapFromNotification = useCallback(
    (busId: string | number) => {
      const targetBus = buses.find((b) => String(b.id) === String(busId));
      if (targetBus) {
        handleSelectBus(targetBus);
        dismissNotification();
      }
    },
    [buses, dismissNotification, handleSelectBus],
  );

  // Selected bus distance and nearest stop
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

  // Render individual arriving bus card for home list
  const renderHomeBusItem = useCallback(
    ({ item: bus }: { item: Bus }) => {
      const coord = getBusCoordinate(bus);
      const distKm = coord
        ? calculateDistanceKm(coord, passengerCoordinate)
        : null;
      const formattedDist =
        distKm !== null ? `${formatDistance(distKm)} away` : null;
      const nearest = bus.routeStops
        ? findNearestStop(bus.routeStops, passengerCoordinate)
        : null;
      const nearestStopText = nearest?.stop?.name
        ? `Near ${nearest.stop.name}`
        : bus.currentLocationLabel;

      const isSelected = String(bus.id) === String(selectedBusId);
      const isMonitored = isBusMonitored(bus.id);

      return (
        <BusCard
          bus={bus}
          distance={formattedDist}
          isMonitored={isMonitored}
          nearestStop={nearestStopText}
          onMonitorPress={() => toggleMonitorBus(bus.id)}
          onPress={() => handleSelectBus(bus)}
          selected={isSelected}
        />
      );
    },
    [
      handleSelectBus,
      isBusMonitored,
      passengerCoordinate,
      selectedBusId,
      toggleMonitorBus,
    ],
  );

  // Render horizontal bus card inside full-screen map drawer
  const renderDrawerBusItem = useCallback(
    ({ item: bus }: { item: Bus }) => {
      const coord = getBusCoordinate(bus);
      const distKm = coord
        ? calculateDistanceKm(coord, passengerCoordinate)
        : null;
      const formattedDist =
        distKm !== null ? `${formatDistance(distKm)} away` : null;
      const isSelected = String(bus.id) === String(selectedBusId);
      const isMonitored = isBusMonitored(bus.id);

      return (
        <View
          style={
            isWideScreen || isDrawerExpanded
              ? styles.fullScreenCardItemVertical
              : styles.fullScreenCardItemHorizontal
          }
        >
          <BusCard
            bus={bus}
            compact={!isDrawerExpanded && !isWideScreen}
            distance={formattedDist}
            isMonitored={isMonitored}
            onMonitorPress={() => toggleMonitorBus(bus.id)}
            onPress={() => handleSelectBus(bus)}
            selected={isSelected}
          />
        </View>
      );
    },
    [
      handleSelectBus,
      isBusMonitored,
      isDrawerExpanded,
      isWideScreen,
      passengerCoordinate,
      selectedBusId,
      toggleMonitorBus,
    ],
  );

  // ============================================================
  // FULL SCREEN MAP MODE (Direct root render to prevent white screen)
  // ============================================================
  if (isFullScreenMap) {
    return (
      <View style={[styles.fullScreenRoot, { width: windowWidth, height: windowHeight }]}>
        <StatusBar
          backgroundColor="#0B2E59"
          barStyle="light-content"
          translucent={false}
        />

        {/* Full-Screen Map Canvas */}
        <View style={[styles.fullScreenMapArea, { width: windowWidth, height: windowHeight }]}>
          <MapView
            ref={fullScreenMapRef}
            initialRegion={initialRegion}
            showsCompass={false}
            showsScale={false}
            showsUserLocation={false}
            style={[styles.fullScreenMap, { width: windowWidth, height: windowHeight }]}
            toolbarEnabled={false}
          >
            {/* Selected Route Polyline */}
            {selectedRoute.length > 1 ? (
              <Polyline
                coordinates={selectedRoute}
                lineCap="round"
                strokeColor="#0B5CAB"
                strokeWidth={5}
              />
            ) : null}

            {/* Passenger Location Marker */}
            <Marker
              anchor={{ x: 0.5, y: 0.5 }}
              coordinate={passengerCoordinate}
              identifier="passenger_user_location"
            >
              <View style={styles.passengerMarkerOuter}>
                <View style={styles.passengerMarkerInner} />
              </View>
            </Marker>

            {/* All Bus Markers */}
            {buses.map((bus) => {
              const coordinate = getBusCoordinate(bus);
              if (!coordinate) return null;

              const isSelected = String(bus.id) === String(selectedBus?.id);
              const isMonitored = isBusMonitored(bus.id);

              return (
                <BusMarker
                  key={String(bus.id)}
                  bus={bus}
                  isMonitored={isMonitored}
                  onPress={() => handleMarkerPress(bus)}
                  selected={isSelected}
                  showCallout={false}
                  userCoordinate={passengerCoordinate}
                />
              );
            })}
          </MapView>

          {/* "You are here" Badge */}
          <View
            pointerEvents="none"
            style={[
              styles.locationBadge,
              { top: Math.max(12, insets.top + 6) + 48 },
            ]}
          >
            <View style={styles.locationBadgeDot} />
            <Text style={styles.locationBadgeText}>You are here</Text>
          </View>

          {/* Center on you button */}
          <Pressable
            accessibilityLabel="Center on your location"
            accessibilityRole="button"
            onPress={centerOnPassenger}
            style={({ pressed }) => [
              styles.fullScreenLocateBtn,
              { top: Math.max(12, insets.top + 6) + 48 },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#0B5CAB" name="locate" size={20} />
          </Pressable>

          {/* Selected Bus Floating Popup over Full Map */}
          {selectedBus ? (
            <View
              style={[
                styles.fullScreenPopupOverlay,
                isWideScreen && styles.wideFullScreenPopupOverlay,
                isDrawerExpanded && !isWideScreen && { bottom: 428 },
              ]}
            >
              <BusMapPopup
                bus={selectedBus}
                distance={selectedBusMeta?.distance}
                isMonitored={isBusMonitored(selectedBus.id)}
                nearestStop={selectedBusMeta?.nearestStop}
                onClose={handleDeselectBus}
                onToggleMonitor={toggleMonitorBus}
                onViewDetails={openBusDetails}
              />
            </View>
          ) : null}
        </View>

        {/* Floating Top Control Bar */}
        <View
          style={[
            styles.fullScreenTopBar,
            { top: Math.max(10, insets.top + 6) },
          ]}
        >
          <Pressable
            accessibilityLabel="Exit full screen map"
            accessibilityRole="button"
            onPress={() => setIsFullScreenMap(false)}
            style={({ pressed }) => [
              styles.exitFullScreenBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#FFFFFF" name="arrow-back" size={18} />
            <Text style={styles.exitFullScreenBtnText}>Exit Full Screen</Text>
          </Pressable>

          <View style={styles.fullScreenStatusBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.fullScreenStatusText}>Full Map View</Text>
          </View>

          {/* Threshold Selector */}
          <View style={styles.fullScreenThresholdGroup}>
            <Text style={styles.fullScreenThresholdLabel}>Alert:</Text>
            {(['500m', '1km', '5min'] as const).map((th) => (
              <Pressable
                key={th}
                accessibilityLabel={`Set alert threshold to ${th}`}
                onPress={() => setMonitorThreshold(th)}
                style={[
                  styles.thresholdBtn,
                  monitorThreshold === th && styles.thresholdBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.thresholdBtnText,
                    monitorThreshold === th && styles.thresholdBtnTextActive,
                  ]}
                >
                  {th}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Synchronized Bottom Drawer Containing ALL THE LIST OF THE BUSES */}
        <View
          style={[
            styles.fullScreenDrawer,
            isWideScreen && styles.wideFullScreenDrawer,
            isDrawerExpanded && !isWideScreen && styles.fullScreenDrawerExpanded,
            { paddingBottom: Math.max(12, insets.bottom + 8) },
          ]}
        >
          {/* Drawer Header */}
          <View style={styles.drawerHeaderRow}>
            <View style={styles.drawerHeaderLeft}>
              <Ionicons color="#0B5CAB" name="bus" size={17} />
              <Text style={styles.drawerTitle}>
                All Arriving Buses ({buses.length})
              </Text>
              <Text style={styles.drawerSubtitle}>
                {selectedBus
                  ? `Selected: ${selectedBus.busNumber}`
                  : 'Tap a bus to focus'}
              </Text>
            </View>

            {!isWideScreen ? (
              <Pressable
                accessibilityLabel={
                  isDrawerExpanded ? 'Collapse bus list' : 'Expand bus list'
                }
                hitSlop={8}
                onPress={() => setIsDrawerExpanded((prev) => !prev)}
                style={styles.drawerToggleBtn}
              >
                <Ionicons
                  color="#41556E"
                  name={isDrawerExpanded ? 'chevron-down' : 'chevron-up'}
                  size={20}
                />
                <Text style={styles.drawerToggleText}>
                  {isDrawerExpanded ? 'Cards' : 'View all'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* FlatList of All Buses */}
          <FlatList
            ref={fullScreenBusListRef}
            contentContainerStyle={styles.drawerListContent}
            data={buses}
            horizontal={!isWideScreen && !isDrawerExpanded}
            keyExtractor={(item) => `fullscreen-${item.id}`}
            onScrollToIndexFailed={(info) => {
              fullScreenBusListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            renderItem={renderDrawerBusItem}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={isWideScreen || isDrawerExpanded}
          />
        </View>
      </View>
    );
  }

  // ============================================================
  // STANDARD HOME DASHBOARD
  // ============================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={styles.safeArea.backgroundColor}
        barStyle="dark-content"
      />
      <Header subtitle="General Trias, Cavite" title="NASAN" />

      {/* Proximity Alert Banner */}
      {activeNotification ? (
        <ProximityAlertBanner
          notification={activeNotification}
          onDismiss={dismissNotification}
          onFocusBus={locateOnMapFromNotification}
        />
      ) : null}

      <View style={[styles.mainLayout, isWideScreen && styles.wideLayout]}>
        {/* MAP SECTION */}
        <View
          style={[
            styles.mapSection,
            isWideScreen && styles.wideMapSection,
          ]}
        >
          {/* Header Row above Map */}
          <View style={styles.welcomeRow}>
            <View style={styles.headingBlock}>
              <Text style={styles.eyebrow}>YOUR RIDE, AT A GLANCE</Text>
              <Text style={styles.heading}>Buses near you</Text>
            </View>

            <View style={styles.headerRightControls}>
              {/* Proximity Threshold Group */}
              <View style={styles.thresholdGroup}>
                <Text style={styles.thresholdLabel}>Alert:</Text>
                {(['500m', '1km', '5min'] as const).map((th) => (
                  <Pressable
                    key={th}
                    accessibilityLabel={`Set alert threshold to ${th}`}
                    onPress={() => setMonitorThreshold(th)}
                    style={[
                      styles.thresholdBtn,
                      monitorThreshold === th && styles.thresholdBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdBtnText,
                        monitorThreshold === th && styles.thresholdBtnTextActive,
                      ]}
                    >
                      {th}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
          </View>

          {/* Compact Map Card */}
          <View
            style={[
              styles.mapCard,
              isWideScreen ? styles.wideMapCard : styles.mobileHomeMapCard,
            ]}
          >
            <MapView
              ref={homeMapRef}
              initialRegion={initialRegion}
              showsCompass={false}
              showsScale={false}
              showsUserLocation={false}
              style={styles.map}
              toolbarEnabled={false}
            >
              {/* Selected Route Polyline */}
              {selectedRoute.length > 1 ? (
                <Polyline
                  coordinates={selectedRoute}
                  lineCap="round"
                  strokeColor="#0B5CAB"
                  strokeWidth={4.5}
                />
              ) : null}

              {/* Passenger Stop Marker */}
              <Marker
                anchor={{ x: 0.5, y: 0.5 }}
                coordinate={passengerCoordinate}
                identifier="passenger_user_location"
              >
                <View style={styles.passengerMarkerOuter}>
                  <View style={styles.passengerMarkerInner} />
                </View>
              </Marker>

              {/* Bus Markers */}
              {buses.map((bus) => {
                const coordinate = getBusCoordinate(bus);
                if (!coordinate) return null;

                const isSelected = String(bus.id) === String(selectedBus?.id);
                const isMonitored = isBusMonitored(bus.id);

                return (
                  <BusMarker
                    key={String(bus.id)}
                    bus={bus}
                    isMonitored={isMonitored}
                    onPress={() => handleMarkerPress(bus)}
                    selected={isSelected}
                    showCallout={false}
                    userCoordinate={passengerCoordinate}
                  />
                );
              })}
            </MapView>

            {/* "You are here" Badge */}
            <View pointerEvents="none" style={styles.locationBadge}>
              <View style={styles.locationBadgeDot} />
              <Text style={styles.locationBadgeText}>You are here</Text>
            </View>

            {/* "See Map" Full Screen Button */}
            <Pressable
              accessibilityLabel="Open full screen map with all buses"
              accessibilityRole="button"
              onPress={() => setIsFullScreenMap(true)}
              style={({ pressed }) => [
                styles.seeMapFullBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color="#FFFFFF" name="expand-outline" size={15} />
              <Text style={styles.seeMapFullBtnText}>See Map</Text>
            </Pressable>

            {/* Selected Bus Floating Popup over Map */}
            {selectedBus ? (
              <View style={styles.popupOverlay}>
                <BusMapPopup
                  bus={selectedBus}
                  distance={selectedBusMeta?.distance}
                  isMonitored={isBusMonitored(selectedBus.id)}
                  nearestStop={selectedBusMeta?.nearestStop}
                  onClose={handleDeselectBus}
                  onToggleMonitor={toggleMonitorBus}
                  onViewDetails={openBusDetails}
                />
              </View>
            ) : null}
          </View>
        </View>

        {/* ARRIVING BUSES SECTION */}
        <View
          style={[
            styles.listSection,
            isWideScreen && styles.wideListSection,
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Arriving buses</Text>
              <Text style={styles.sectionSubtitle}>
                {buses.length
                  ? `${buses.length} buses on nearby routes · Tap to focus`
                  : 'No buses available'}
              </Text>
            </View>

            <Pressable
              accessibilityLabel="See full screen map"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setIsFullScreenMap(true)}
              style={styles.seeMapToggle}
            >
              <Text style={styles.seeMapText}>See map →</Text>
            </Pressable>
          </View>

          {/* Independently Scrollable Arriving Buses List */}
          <FlatList
            ref={homeBusListRef}
            contentContainerStyle={styles.listContent}
            data={buses}
            keyExtractor={(item) => String(item.id)}
            onScrollToIndexFailed={(info) => {
              homeBusListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            renderItem={renderHomeBusItem}
            showsVerticalScrollIndicator={true}
            style={styles.busFlatList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No buses nearby yet</Text>
                <Text style={styles.emptyStateText}>
                  Check the map again in a moment.
                </Text>
              </View>
            }
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
  mainLayout: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  wideLayout: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  mapSection: {
    flexShrink: 0,
    marginBottom: 12,
  },
  wideMapSection: {
    flex: 1.25,
    marginBottom: 0,
  },
  welcomeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    rowGap: 8,
  },
  headingBlock: {
    minWidth: 150,
  },
  eyebrow: {
    color: '#6C7A90',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  heading: {
    color: '#12263F',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  headerRightControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  thresholdGroup: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2EAF2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  thresholdLabel: {
    color: '#76889F',
    fontSize: 9,
    fontWeight: '800',
    marginRight: 2,
  },
  thresholdBtn: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  thresholdBtnActive: {
    backgroundColor: '#0B5CAB',
  },
  thresholdBtnText: {
    color: '#52667E',
    fontSize: 9,
    fontWeight: '800',
  },
  thresholdBtnTextActive: {
    color: '#FFFFFF',
  },
  livePill: {
    alignItems: 'center',
    backgroundColor: '#E8F8EF',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: {
    backgroundColor: '#21A768',
    borderRadius: 3.5,
    height: 7,
    width: 7,
  },
  liveText: {
    color: '#168654',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  mapCard: {
    borderColor: '#E2EAF4',
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  mobileHomeMapCard: {
    height: 235,
    width: '100%',
  },
  wideMapCard: {
    height: '84%',
    minHeight: 460,
    width: '100%',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  passengerMarkerOuter: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 92, 171, 0.22)',
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
  locationBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 45, 75, 0.9)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    position: 'absolute',
    top: 10,
    zIndex: 25,
  },
  locationBadgeDot: {
    backgroundColor: '#2CD9C5',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  locationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  seeMapFullBtn: {
    alignItems: 'center',
    backgroundColor: '#0B5CAB',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    position: 'absolute',
    right: 10,
    top: 10,
    ...shadows.floating,
    zIndex: 25,
  },
  seeMapFullBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  popupOverlay: {
    bottom: 8,
    left: 8,
    position: 'absolute',
    right: 8,
    zIndex: 40,
  },
  listSection: {
    flex: 1,
    minHeight: 240,
  },
  wideListSection: {
    flex: 0.95,
    minHeight: 460,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#12263F',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: '#75849A',
    fontSize: 11,
    marginTop: 1,
  },
  seeMapToggle: {
    paddingVertical: 3,
  },
  seeMapText: {
    color: '#0B5CAB',
    fontSize: 13,
    fontWeight: '800',
  },
  busFlatList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EBF4',
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 24,
  },
  emptyStateTitle: {
    color: '#233A56',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyStateText: {
    color: '#75849A',
    fontSize: 12,
    marginTop: 4,
  },

  /* ============================================================ */
  /* FULL SCREEN MAP STYLES (Root Layout - No Collapsed Heights)  */
  /* ============================================================ */
  fullScreenRoot: {
    backgroundColor: '#E7EFF6',
    flex: 1,
    height: '100%',
    position: 'relative',
    width: '100%',
  },
  fullScreenMapArea: {
    backgroundColor: '#E7EFF6',
    flex: 1,
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 1,
  },
  fullScreenMap: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  fullScreenTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
    zIndex: 100,
  },
  exitFullScreenBtn: {
    alignItems: 'center',
    backgroundColor: '#0B2E59',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    ...shadows.floating,
  },
  exitFullScreenBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fullScreenStatusBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...shadows.card,
  },
  fullScreenStatusText: {
    color: '#102A45',
    fontSize: 11,
    fontWeight: '800',
  },
  fullScreenThresholdGroup: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2EAF2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 3,
    ...shadows.card,
  },
  fullScreenThresholdLabel: {
    color: '#76889F',
    fontSize: 9,
    fontWeight: '800',
    marginRight: 2,
  },
  fullScreenLocateBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D4E2F0',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    width: 44,
    ...shadows.floating,
    zIndex: 25,
  },
  fullScreenPopupOverlay: {
    bottom: 235,
    left: 12,
    position: 'absolute',
    right: 12,
    zIndex: 150,
  },
  wideFullScreenPopupOverlay: {
    bottom: 24,
    left: 24,
    width: 360,
  },
  fullScreenDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#D8E4F0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    bottom: 0,
    left: 0,
    maxHeight: 230,
    paddingHorizontal: 14,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    ...shadows.floating,
    zIndex: 200,
  },
  fullScreenDrawerExpanded: {
    maxHeight: 420,
  },
  wideFullScreenDrawer: {
    borderLeftColor: '#D8E4F0',
    borderLeftWidth: 1.5,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    bottom: 0,
    left: 'auto',
    maxHeight: '100%',
    padding: 18,
    right: 0,
    top: 0,
    width: 380,
  },
  drawerHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  drawerHeaderLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  drawerTitle: {
    color: '#102D4B',
    fontSize: 15,
    fontWeight: '800',
  },
  drawerSubtitle: {
    color: '#6F8299',
    fontSize: 11,
    marginLeft: 6,
  },
  drawerToggleBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  drawerToggleText: {
    color: '#0B5CAB',
    fontSize: 11,
    fontWeight: '800',
  },
  drawerListContent: {
    paddingBottom: 8,
  },
  fullScreenCardItemHorizontal: {
    marginRight: 10,
    width: 285,
  },
  fullScreenCardItemVertical: {
    marginBottom: 8,
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
});
