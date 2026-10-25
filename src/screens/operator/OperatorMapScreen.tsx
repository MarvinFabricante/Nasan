import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import MapView, { Marker, Polyline } from '@/components/NasanMap';
import BusMarker from '@/components/BusMarker';
import Header from '@/components/Header';
import { useBuses } from '@/context/BusContext';
import { radius, shadows } from '@/constants/theme';
import { Bus, Coordinate, Region } from '@/types';

const ROUTE_COLORS: Record<string, string> = {
  '101': '#0B5CAB',
  '202': '#0B6E69',
  '303': '#D97706',
};

const DEFAULT_ROUTE_COLOR = '#0D2F35';

const isCoordinate = (value: any): value is Coordinate =>
  Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));

const getBusCoordinate = (bus?: Bus | null): Coordinate | null => {
  const coord = bus?.coordinates || bus?.location;
  return isCoordinate(coord) ? coord : null;
};

const getRouteCoordinates = (bus?: Bus | null): Coordinate[] => {
  if (!bus?.routePoints?.length) return [];
  return bus.routePoints.map((p: any) => p?.coordinates || p).filter(isCoordinate);
};

export default function OperatorMapScreen() {
  const router = useRouter();
  const {
    buses = [],
    selectedBusId,
    setSelectedBusId,
    simulateMovement,
    simulateAllMovement,
    toggleBusAvailability,
  } = useBuses();

  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 768;

  const mapRef = useRef<any>(null);
  const busListRef = useRef<FlatList<Bus>>(null);

  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'FULL'>('ALL');
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Active buses
  const visibleBuses = useMemo(() => {
    switch (filter) {
      case 'ACTIVE':
        return buses.filter((b) => b.isAvailable && b.availableSeats > 0);
      case 'FULL':
        return buses.filter((b) => b.isAvailable && b.availableSeats <= 0);
      case 'ALL':
      default:
        return buses;
    }
  }, [buses, filter]);

  // Selected bus
  const selectedBus = useMemo<Bus | null>(() => {
    if (selectedBusId) {
      const match = buses.find((b) => String(b.id) === String(selectedBusId));
      if (match) return match;
    }
    return visibleBuses[0] || buses[0] || null;
  }, [buses, selectedBusId, visibleBuses]);

  // Map initial region
  const initialRegion = useMemo<Region>(() => {
    const coords = buses.map(getBusCoordinate).filter((c): c is Coordinate => Boolean(c));
    if (coords.length > 0) {
      const avgLat = coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;
      return {
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    return {
      latitude: 14.2788,
      longitude: 120.948,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [buses]);

  // Center on a specific bus
  const handleSelectBus = useCallback(
    (bus: Bus) => {
      setSelectedBusId(bus.id);
      const coord = getBusCoordinate(bus);
      if (coord && mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion({
          latitude: coord.latitude,
          longitude: coord.longitude,
          latitudeDelta: 0.045,
          longitudeDelta: 0.045,
        });
      }
    },
    [setSelectedBusId],
  );

  // Recenter to show all buses
  const handleRecenterFleet = useCallback(() => {
    const coords = visibleBuses.map(getBusCoordinate).filter((c): c is Coordinate => Boolean(c));
    if (coords.length > 0 && mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 180, left: 60 },
        animated: true,
      });
    } else if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(initialRegion);
    }
  }, [visibleBuses, initialRegion]);

  const handleSimulateAll = () => {
    if (typeof simulateAllMovement === 'function') {
      simulateAllMovement();
    } else {
      buses.forEach((b) => simulateMovement(b.id));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <Header
        title="Live Fleet Tracker"
        subtitle={`${buses.filter((b) => b.isAvailable).length} Active Buses En Route`}
        showBack
        onBackPress={() => router.replace('/(operator)')}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recenter fleet on map"
            onPress={handleRecenterFleet}
            style={({ pressed }) => [styles.recenterButton, pressed && styles.pressed]}
          >
            <Ionicons name="scan" size={17} color="#0D2F35" />
            <Text style={styles.recenterText}>Recenter</Text>
          </Pressable>
        }
      />

      {/* Filter Chips Bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterChipRow}>
          <Pressable
            onPress={() => setFilter('ALL')}
            style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterChipText, filter === 'ALL' && styles.filterChipTextActive]}
            >
              All ({buses.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('ACTIVE')}
            style={[styles.filterChip, filter === 'ACTIVE' && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === 'ACTIVE' && styles.filterChipTextActive,
              ]}
            >
              In Service ({buses.filter((b) => b.isAvailable && b.availableSeats > 0).length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilter('FULL')}
            style={[styles.filterChip, filter === 'FULL' && styles.filterChipActive]}
          >
            <Text
              style={[styles.filterChipText, filter === 'FULL' && styles.filterChipTextActive]}
            >
              Full ({buses.filter((b) => b.isAvailable && b.availableSeats <= 0).length})
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle fleet drawer"
          onPress={() => setDrawerOpen((prev) => !prev)}
          style={styles.drawerToggleBtn}
        >
          <Ionicons
            name={drawerOpen ? 'chevron-down' : 'chevron-up'}
            size={18}
            color="#0D2F35"
          />
          <Text style={styles.drawerToggleText}>
            {drawerOpen ? 'Hide Fleet' : 'Show Fleet'}
          </Text>
        </Pressable>
      </View>

      {/* Main Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          initialRegion={initialRegion}
          style={StyleSheet.absoluteFill}
        >
          {/* Polylines for each bus route (unselected first, then selected) */}
          {[...visibleBuses]
            .sort((a, b) => {
              const aSelected = selectedBus && String(a.id) === String(selectedBus.id);
              const bSelected = selectedBus && String(b.id) === String(selectedBus.id);
              if (aSelected === bSelected) return 0;
              return aSelected ? 1 : -1;
            })
            .map((bus) => {
              const coords = getRouteCoordinates(bus);
              if (coords.length < 2) return null;
              const isSelected = selectedBus && String(bus.id) === String(selectedBus.id);
              const routeColor = ROUTE_COLORS[bus.id] || DEFAULT_ROUTE_COLOR;

              return (
                <Polyline
                  key={`route-${bus.id}`}
                  coordinates={coords}
                  strokeColor={isSelected ? routeColor : `${routeColor}66`}
                  strokeWidth={isSelected ? 5 : 3}
                />
              );
            })}

          {/* Markers for all visible buses */}
          {visibleBuses.map((bus) => {
            const isSelected = selectedBus && String(bus.id) === String(selectedBus.id);

            return (
              <BusMarker
                key={`bus-${bus.id}`}
                bus={bus}
                selected={Boolean(isSelected)}
                showCallout
                onPress={() => handleSelectBus(bus)}
              />
            );
          })}
        </MapView>

        {/* Floating Action Controls on Map */}
        <View style={styles.floatingControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Simulate one step for all active buses"
            onPress={handleSimulateAll}
            style={({ pressed }) => [styles.floatingSimulateBtn, pressed && styles.pressed]}
          >
            <Ionicons name="play-forward" size={18} color="#FFFFFF" />
            <Text style={styles.floatingSimulateText}>Simulate Fleet Step</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fit all buses on screen"
            onPress={handleRecenterFleet}
            style={({ pressed }) => [styles.floatingIconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="locate" size={20} color="#0D2F35" />
          </Pressable>
        </View>

        {/* Bottom Fleet Carousel / Drawer */}
        {drawerOpen && (
          <View style={styles.bottomDrawer}>
            <View style={styles.drawerHandleBar}>
              <View style={styles.drawerHandle} />
            </View>

            <View style={styles.drawerHeaderRow}>
              <Text style={styles.drawerTitle}>FLEET VEHICLES ({visibleBuses.length})</Text>
              <Text style={styles.drawerSubtitle}>Tap to inspect & center on map</Text>
            </View>

            <FlatList
              ref={busListRef}
              data={visibleBuses}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.drawerListContent}
              renderItem={({ item }) => {
                const isSelected = selectedBus && String(item.id) === String(selectedBus.id);
                const isFull = item.availableSeats <= 0;
                const isOffline = !item.isAvailable;
                const occupiedSeats = Math.max(0, item.totalSeats - item.availableSeats);

                return (
                  <Pressable
                    onPress={() => handleSelectBus(item)}
                    style={({ pressed }) => [
                      styles.fleetCard,
                      isSelected && styles.fleetCardSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.fleetCardHeader}>
                      <View style={styles.fleetCardIdentity}>
                        <View
                          style={[
                            styles.busBadgeMini,
                            {
                              backgroundColor: ROUTE_COLORS[item.id] || DEFAULT_ROUTE_COLOR,
                            },
                          ]}
                        >
                          <Ionicons name="bus" size={12} color="#FFFFFF" />
                          <Text style={styles.busBadgeMiniText}>{item.busNumber}</Text>
                        </View>
                        <Text
                          style={[
                            styles.statusPillMini,
                            isOffline
                              ? styles.statusPillOffline
                              : isFull
                                ? styles.statusPillFull
                                : styles.statusPillActive,
                          ]}
                        >
                          {isOffline ? 'OFFLINE' : isFull ? 'FULL' : 'ACTIVE'}
                        </Text>
                      </View>

                      <Text style={styles.fleetCardEta}>{item.eta || 'En route'}</Text>
                    </View>

                    <Text numberOfLines={1} style={styles.fleetCardRoute}>
                      {item.route}
                    </Text>

                    <View style={styles.fleetCardMetaRow}>
                      <View style={styles.fleetMetaItem}>
                        <Ionicons name="person-outline" size={12} color="#64748B" />
                        <Text style={styles.fleetMetaText}>{item.driverName}</Text>
                      </View>

                      <View style={styles.fleetMetaItem}>
                        <Ionicons name="people-outline" size={12} color="#0D2F35" />
                        <Text style={styles.fleetSeatsText}>
                          {item.availableSeats}/{item.totalSeats} open
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fleetCardActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Advance route for ${item.busNumber}`}
                        disabled={isOffline}
                        onPress={() => simulateMovement(item.id)}
                        style={({ pressed }) => [
                          styles.fleetStepBtn,
                          isOffline && styles.fleetBtnDisabled,
                          pressed && !isOffline && styles.pressed,
                        ]}
                      >
                        <Ionicons name="play" size={12} color="#0D2F35" />
                        <Text style={styles.fleetStepText}>Step</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Toggle service for ${item.busNumber}`}
                        onPress={() => toggleBusAvailability(item.id)}
                        style={({ pressed }) => [
                          styles.fleetToggleBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.fleetToggleText,
                            isOffline ? { color: '#0F766E' } : { color: '#DC2626' },
                          ]}
                        >
                          {isOffline ? 'Enable' : 'Disable'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  recenterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  recenterText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '800',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipActive: {
    backgroundColor: '#0D2F35',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  drawerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  drawerToggleText: {
    color: '#0D2F35',
    fontSize: 11,
    fontWeight: '700',
  },
  floatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 25,
  },
  floatingSimulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2F35',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    ...shadows.card,
  },
  floatingSimulateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  floatingIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  bottomDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 20,
    ...shadows.floating,
    zIndex: 30,
  },
  drawerHandleBar: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  drawerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  drawerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  drawerTitle: {
    color: '#0D2F35',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  drawerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  drawerListContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  fleetCard: {
    width: 230,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
  },
  fleetCardSelected: {
    borderColor: '#0D2F35',
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  fleetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fleetCardIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  busBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  busBadgeMiniText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  statusPillMini: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  statusPillFull: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  },
  statusPillOffline: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  fleetCardEta: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  fleetCardRoute: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  fleetCardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fleetMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fleetMetaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  fleetSeatsText: {
    color: '#0D2F35',
    fontSize: 11,
    fontWeight: '800',
  },
  fleetCardActions: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  fleetStepBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F1',
    borderRadius: 8,
    paddingVertical: 6,
    gap: 4,
  },
  fleetStepText: {
    color: '#0D2F35',
    fontSize: 11,
    fontWeight: '800',
  },
  fleetToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fleetBtnDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
