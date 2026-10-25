import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Header from '@/components/Header';
import { useBuses } from '@/context/BusContext';
import { colors, radius, shadows, spacing } from '@/constants/theme';
import { Bus } from '@/types';

type FleetFilter = 'ALL' | 'ACTIVE' | 'FULL' | 'UNAVAILABLE';

export default function OperatorDashboardScreen() {
  const router = useRouter();
  const {
    buses = [],
    selectedBusId,
    setSelectedBusId,
    adjustSeats,
    toggleBusAvailability,
    simulateMovement,
    simulateAllMovement,
    resetBuses,
  } = useBuses();

  const [activeFilter, setActiveFilter] = useState<FleetFilter>('ALL');

  const metrics = useMemo(() => {
    const totalBuses = buses.length;
    const activeBuses = buses.filter((b) => b.isAvailable).length;
    const fullBuses = buses.filter((b) => b.isAvailable && b.availableSeats <= 0).length;
    const totalCapacity = buses.reduce((acc, b) => acc + (b.totalSeats || 40), 0);
    const totalAvailable = buses.reduce((acc, b) => acc + (b.availableSeats || 0), 0);
    const totalOccupied = Math.max(0, totalCapacity - totalAvailable);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    return {
      totalBuses,
      activeBuses,
      fullBuses,
      totalCapacity,
      totalAvailable,
      totalOccupied,
      occupancyRate,
    };
  }, [buses]);


  const filteredBuses = useMemo(() => {
    switch (activeFilter) {
      case 'ACTIVE':
        return buses.filter((b) => b.isAvailable && b.availableSeats > 0);
      case 'FULL':
        return buses.filter((b) => b.isAvailable && b.availableSeats <= 0);
      case 'UNAVAILABLE':
        return buses.filter((b) => !b.isAvailable);
      case 'ALL':
      default:
        return buses;
    }
  }, [buses, activeFilter]);

  const handleTrackOnMap = (busId: string) => {
    setSelectedBusId(busId);
    router.push('/(operator)/map');
  };

  const handleSimulateAll = () => {
    if (typeof simulateAllMovement === 'function') {
      simulateAllMovement();
    } else {
      buses.forEach((b) => simulateMovement(b.id));
    }
  };

  const handleResetFleet = () => {
    Alert.alert(
      'Reset Fleet',
      'Are you sure you want to restore all buses to their default depot locations and initial seat capacities?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetBuses() },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Header
        title="Fleet Operations"
        subtitle="Live Fleet Management & Dispatch"
        showBack
        onBackPress={() => router.replace('/')}
        rightAction={
          <View style={styles.syncBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.syncText}>LIVE FLEET</Text>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.kpiContainer}>
          <Text style={styles.sectionHeaderTitle}>FLEET PERFORMANCE SUMMARY</Text>

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="bus" size={20} color="#2E7D32" />
              </View>
              <Text style={styles.kpiValue}>
                {metrics.activeBuses}
                <Text style={styles.kpiSubValue}>/{metrics.totalBuses}</Text>
              </Text>
              <Text style={styles.kpiLabel}>Active Units</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="pie-chart" size={20} color="#0284C7" />
              </View>
              <Text style={styles.kpiValue}>{metrics.occupancyRate}%</Text>
              <Text style={styles.kpiLabel}>Occupancy Rate</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <Text style={styles.kpiValue}>{metrics.totalAvailable}</Text>
              <Text style={styles.kpiLabel}>Open Seats</Text>
            </View>

            <View style={styles.kpiCard}>
              <View
                style={[
                  styles.kpiIconWrap,
                  { backgroundColor: metrics.fullBuses > 0 ? '#FEE2E2' : '#F1F5F9' },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={metrics.fullBuses > 0 ? '#DC2626' : '#64748B'}
                />
              </View>
              <Text
                style={[
                  styles.kpiValue,
                  metrics.fullBuses > 0 && { color: '#DC2626' },
                ]}
              >
                {metrics.fullBuses}
              </Text>
              <Text style={styles.kpiLabel}>Full Buses</Text>
            </View>
          </View>
        </View>


        <View style={styles.controlsBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Simulate all buses moving along route"
            onPress={handleSimulateAll}
            style={({ pressed }) => [
              styles.controlButton,
              styles.primaryControlButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="play-forward" size={18} color="#FFFFFF" />
            <Text style={styles.primaryControlText}>Simulate Fleet Step</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Track entire fleet on live map"
            onPress={() => router.push('/(operator)/map')}
            style={({ pressed }) => [
              styles.controlButton,
              styles.mapControlButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="map" size={18} color="#0D2F35" />
            <Text style={styles.mapControlText}>Live Fleet Map</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset fleet to depot defaults"
            onPress={handleResetFleet}
            style={({ pressed }) => [
              styles.controlButton,
              styles.resetControlButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh" size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setActiveFilter('ALL')}
              style={[
                styles.filterPill,
                activeFilter === 'ALL' && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'ALL' && styles.filterPillTextActive,
                ]}
              >
                All Buses ({metrics.totalBuses})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('ACTIVE')}
              style={[
                styles.filterPill,
                activeFilter === 'ACTIVE' && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'ACTIVE' && styles.filterPillTextActive,
                ]}
              >
                In Service ({metrics.activeBuses - metrics.fullBuses})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('FULL')}
              style={[
                styles.filterPill,
                activeFilter === 'FULL' && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'FULL' && styles.filterPillTextActive,
                ]}
              >
                Full ({metrics.fullBuses})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveFilter('UNAVAILABLE')}
              style={[
                styles.filterPill,
                activeFilter === 'UNAVAILABLE' && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === 'UNAVAILABLE' && styles.filterPillTextActive,
                ]}
              >
                Offline ({metrics.totalBuses - metrics.activeBuses})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Fleet Bus Cards */}
        <View style={styles.busListContainer}>
          <Text style={styles.sectionHeaderTitle}>MANAGED VEHICLES ({filteredBuses.length})</Text>

          {filteredBuses.map((bus) => {
            const isFull = bus.availableSeats <= 0;
            const isOffline = !bus.isAvailable;
            const occupiedSeats = Math.max(0, bus.totalSeats - bus.availableSeats);
            const loadPercent = Math.min(100, Math.round((occupiedSeats / bus.totalSeats) * 100));

            return (
              <View key={bus.id} style={styles.busCard}>
                {/* Header row */}
                <View style={styles.busCardHeader}>
                  <View style={styles.busIdentity}>
                    <View style={styles.busNumberTag}>
                      <Ionicons name="bus" size={14} color="#0D2F35" />
                      <Text style={styles.busNumberText}>{bus.busNumber}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isOffline
                          ? styles.statusBadgeOffline
                          : isFull
                            ? styles.statusBadgeFull
                            : styles.statusBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOffline
                            ? styles.statusTextOffline
                            : isFull
                              ? styles.statusTextFull
                              : styles.statusTextActive,
                        ]}
                      >
                        {isOffline ? 'OFFLINE' : isFull ? 'FULL' : 'EN ROUTE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.availabilityToggleWrap}>
                    <Text style={styles.toggleLabel}>Service</Text>
                    <Switch
                      value={bus.isAvailable}
                      onValueChange={() => toggleBusAvailability(bus.id)}
                      trackColor={{ false: '#CBD5E1', true: '#2DD4BF' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                {/* Route & Driver info */}
                <View style={styles.busDetailSection}>
                  <View style={styles.detailItem}>
                    <Ionicons name="navigate-outline" size={15} color="#64748B" />
                    <Text numberOfLines={1} style={styles.routeText}>
                      {bus.route}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="person-outline" size={14} color="#64748B" />
                      <Text style={styles.driverText}>{bus.driverName}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={14} color="#16A34A" />
                      <Text style={styles.etaText}>{bus.eta || 'On schedule'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color="#0B5CAB" />
                    <Text numberOfLines={1} style={styles.locationText}>
                      {bus.currentLocationLabel || bus.origin}
                    </Text>
                  </View>
                </View>

                {/* Capacity Gauge */}
                <View style={styles.capacitySection}>
                  <View style={styles.capacityHeader}>
                    <Text style={styles.capacityLabel}>Passenger Load</Text>
                    <Text style={styles.capacityFraction}>
                      {occupiedSeats}/{bus.totalSeats} passengers ({loadPercent}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${loadPercent}%`,
                          backgroundColor:
                            loadPercent >= 95
                              ? '#DC2626'
                              : loadPercent >= 75
                                ? '#F59E0B'
                                : '#10B981',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Action Row */}
                <View style={styles.busActionRow}>
                  <View style={styles.seatAdjustGroup}>
                    <Pressable
                      accessibilityLabel="Add Passenger"
                      disabled={isOffline || bus.availableSeats <= 0}
                      onPress={() => adjustSeats(bus.id, -1)}
                      style={({ pressed }) => [
                        styles.seatAdjustBtn,
                        (isOffline || bus.availableSeats <= 0) && styles.seatBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="add" size={16} color="#0D2F35" />
                    </Pressable>
                    <Text style={styles.seatCountLabel}>{bus.availableSeats} open</Text>
                    <Pressable
                      accessibilityLabel="Remove Passenger"
                      disabled={isOffline || bus.availableSeats >= bus.totalSeats}
                      onPress={() => adjustSeats(bus.id, 1)}
                      style={({ pressed }) => [
                        styles.seatAdjustBtn,
                        (isOffline || bus.availableSeats >= bus.totalSeats) &&
                        styles.seatBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="remove" size={16} color="#0D2F35" />
                    </Pressable>
                  </View>

                  <View style={styles.busActionButtons}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Simulate step for ${bus.busNumber}`}
                      disabled={isOffline}
                      onPress={() => simulateMovement(bus.id)}
                      style={({ pressed }) => [
                        styles.actionBtnSecondary,
                        isOffline && styles.actionBtnDisabled,
                        pressed && !isOffline && styles.pressed,
                      ]}
                    >
                      <Ionicons name="play" size={14} color="#0D2F35" />
                      <Text style={styles.actionBtnSecondaryText}>Step</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Track ${bus.busNumber} on map`}
                      onPress={() => handleTrackOnMap(bus.id)}
                      style={({ pressed }) => [
                        styles.actionBtnPrimary,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Ionicons name="navigate" size={14} color="#FFFFFF" />
                      <Text style={styles.actionBtnPrimaryText}>Track Map</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
  },
  syncText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeaderTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  kpiContainer: {
    marginBottom: 18,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    ...shadows.card,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    color: '#0D2F35',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  kpiSubValue: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  kpiLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  controlsBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    ...shadows.card,
  },
  primaryControlButton: {
    flex: 1,
    backgroundColor: '#0D2F35',
  },
  primaryControlText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  mapControlButton: {
    flex: 1,
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#99D5C9',
  },
  mapControlText: {
    color: '#0D2F35',
    fontSize: 13,
    fontWeight: '800',
  },
  resetControlButton: {
    width: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterSection: {
    marginBottom: 18,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: '#0D2F35',
    borderColor: '#0D2F35',
  },
  filterPillText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  busListContainer: {
    gap: 14,
  },
  busCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...shadows.card,
  },
  busCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  busIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  busNumberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  busNumberText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeFull: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeOffline: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextActive: { color: '#15803D' },
  statusTextFull: { color: '#B91C1C' },
  statusTextOffline: { color: '#64748B' },
  availabilityToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  busDetailSection: {
    paddingVertical: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  driverText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  etaText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '800',
  },
  locationText: {
    color: '#0B5CAB',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  capacitySection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  capacityFraction: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  busActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  seatAdjustGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
  },
  seatAdjustBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  seatBtnDisabled: {
    opacity: 0.4,
  },
  seatCountLabel: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 4,
  },
  busActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99D5C9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  actionBtnSecondaryText: {
    color: '#0D2F35',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D2F35',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
