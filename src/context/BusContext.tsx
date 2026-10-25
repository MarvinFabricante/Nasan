import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BUS_101_ID,
  createInitialBuses,
  passengerLocation,
} from '@/data/mockBuses';
import {
  calculateDistanceKm,
  checkProximity,
  estimateEtaFromDistance,
  formatDistance,
} from '@/data/geoUtils';
import {
  Bus,
  BusContextType,
  MonitorThreshold,
  NotificationItem,
} from '@/types';

const BusContext = createContext<BusContextType | undefined>(undefined);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const sameBus = (bus?: Bus | null, busId?: string | number | null): boolean => {
  if (!bus || busId === undefined || busId === null) return false;
  return (
    String(bus.id) === String(busId) ||
    String(bus.busNumber).replace(/\D/g, '') === String(busId).replace(/\D/g, '')
  );
};

const setAvailability = (bus: Bus, isAvailable: boolean): Bus => {
  if (!isAvailable) {
    return {
      ...bus,
      isAvailable: false,
      lastActiveStatus:
        bus.status === 'Not Available' ? bus.lastActiveStatus : bus.status,
      status: 'Not Available',
    };
  }

  return {
    ...bus,
    isAvailable: true,
    status:
      bus.availableSeats <= 0
        ? 'Full'
        : bus.lastActiveStatus && bus.lastActiveStatus !== 'Full'
          ? bus.lastActiveStatus
          : 'Arriving',
    lastActiveStatus: undefined,
  };
};

interface CooldownEntry {
  cycleKey: string;
  timestamp: number;
  distanceKm: number;
}

export function BusProvider({ children }: { children: ReactNode }) {
  const [buses, setBuses] = useState<Bus[]>(createInitialBuses);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [monitoredBusIds, setMonitoredBusIds] = useState<string[]>([]);
  const [monitorThreshold, setMonitorThreshold] = useState<MonitorThreshold>('1km');
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<NotificationItem[]>([]);

  const cooldownRef = useRef<Map<string, CooldownEntry>>(new Map());

  const getBusById = useCallback(
    (busId?: string | number | null): Bus | undefined =>
      buses.find((bus) => sameBus(bus, busId)),
    [buses],
  );

  const isBusMonitored = useCallback(
    (busId?: string | number | null): boolean => {
      if (!busId) return false;
      return monitoredBusIds.some((id) => String(id) === String(busId));
    },
    [monitoredBusIds],
  );

  const triggerProximityNotification = useCallback(
    (bus: Bus, distanceKm: number) => {
      const formattedDist = formatDistance(distanceKm);
      const title = `🚌 ${bus.busNumber} Approaching!`;
      const message = `${bus.busNumber} (${bus.route}) is ${formattedDist} away (${bus.eta || 'approaching stop'}).`;

      const notificationItem: NotificationItem = {
        id: `${bus.id}-${Date.now()}`,
        busId: bus.id,
        busNumber: bus.busNumber,
        route: bus.route,
        title,
        message,
        distanceKm,
        formattedDistance: formattedDist,
        eta: bus.eta || '--',
        timestamp: Date.now(),
      };

      setActiveNotification(notificationItem);
      setNotificationHistory((prev) => [notificationItem, ...prev.slice(0, 19)]);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body: message,
              icon: '/favicon.ico',
            });
          } catch (e) {
            // Browser notification failed or policy blocked
          }
        }
      }
    },
    [],
  );

  const evaluateProximityAlerts = useCallback(
    (currentBuses: Bus[], monitoredIds: string[], threshold: MonitorThreshold) => {
      if (!monitoredIds.length) return;

      const now = Date.now();
      const COOLDOWN_MS = 60 * 1000;

      currentBuses.forEach((bus) => {
        const busIdStr = String(bus.id);
        if (!monitoredIds.some((id) => String(id) === busIdStr)) return;

        const proximity = checkProximity(bus, passengerLocation, threshold);

        if (proximity.isNear) {
          const cycleKey = `${busIdStr}-route${bus.routeIndex ?? 0}`;
          const lastAlert = cooldownRef.current.get(busIdStr);

          const alreadyNotifiedThisCycle =
            lastAlert && lastAlert.cycleKey === cycleKey;
          const withinCooldown =
            lastAlert && now - lastAlert.timestamp < COOLDOWN_MS;

          if (!alreadyNotifiedThisCycle && !withinCooldown) {
            cooldownRef.current.set(busIdStr, {
              cycleKey,
              timestamp: now,
              distanceKm: proximity.distanceKm,
            });
            triggerProximityNotification(bus, proximity.distanceKm);
          }
        }
      });
    },
    [triggerProximityNotification],
  );

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  const startMonitoring = useCallback(
    (busId: string | number) => {
      const busIdStr = String(busId);
      setMonitoredBusIds((prev) =>
        prev.includes(busIdStr) ? prev : [...prev, busIdStr],
      );

      requestNotificationPermission();

      const targetBus = buses.find((b) => sameBus(b, busId));
      if (targetBus) {
        evaluateProximityAlerts(buses, [busIdStr], monitorThreshold);
      }
    },
    [buses, evaluateProximityAlerts, monitorThreshold, requestNotificationPermission],
  );

  const stopMonitoring = useCallback((busId: string | number) => {
    const busIdStr = String(busId);
    setMonitoredBusIds((prev) => prev.filter((id) => id !== busIdStr));
    cooldownRef.current.delete(busIdStr);
  }, []);

  const toggleMonitorBus = useCallback(
    (busId: string | number) => {
      const busIdStr = String(busId);
      if (monitoredBusIds.includes(busIdStr)) {
        stopMonitoring(busIdStr);
      } else {
        startMonitoring(busIdStr);
      }
    },
    [monitoredBusIds, startMonitoring, stopMonitoring],
  );

  const dismissNotification = useCallback((notificationId?: string) => {
    setActiveNotification((current) =>
      current && (!notificationId || current.id === notificationId)
        ? null
        : current,
    );
  }, []);

  const adjustSeats = useCallback((busId: string = BUS_101_ID, amount: number = 0) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return;

    setBuses((currentBuses) =>
      currentBuses.map((bus) => {
        if (!sameBus(bus, busId)) return bus;

        const availableSeats = clamp(
          bus.availableSeats + numericAmount,
          0,
          bus.totalSeats,
        );

        return {
          ...bus,
          availableSeats,
          status:
            bus.isAvailable === false
              ? 'Not Available'
              : availableSeats <= 0
                ? 'Full'
                : bus.status === 'Full'
                  ? 'Arriving'
                  : bus.status,
        };
      }),
    );
  }, []);

  const addPassenger = useCallback(
    (busId: string = BUS_101_ID) => adjustSeats(busId, -1),
    [adjustSeats],
  );

  const removePassenger = useCallback(
    (busId: string = BUS_101_ID) => adjustSeats(busId, 1),
    [adjustSeats],
  );

  const updateBusAvailability = useCallback(
    (busId: string = BUS_101_ID, isAvailable: boolean = true) => {
      setBuses((currentBuses) =>
        currentBuses.map((bus) =>
          sameBus(bus, busId)
            ? setAvailability(bus, Boolean(isAvailable))
            : bus,
        ),
      );
    },
    [],
  );

  const toggleBusAvailability = useCallback((busId: string = BUS_101_ID) => {
    setBuses((currentBuses) =>
      currentBuses.map((bus) =>
        sameBus(bus, busId) ? setAvailability(bus, !bus.isAvailable) : bus,
      ),
    );
  }, []);

  const updateBusStatus = useCallback((busId: string = BUS_101_ID, status?: string) => {
    if (!status) return;

    setBuses((currentBuses) =>
      currentBuses.map((bus) =>
        sameBus(bus, busId) ? { ...bus, status } : bus,
      ),
    );
  }, []);

  const simulateMovement = useCallback(
    (busId: string = BUS_101_ID) => {
      setBuses((currentBuses) => {
        const updated = currentBuses.map((bus) => {
          if (!sameBus(bus, busId) || !bus.routePoints?.length) return bus;

          const nextRouteIndex = (bus.routeIndex + 1) % bus.routePoints.length;
          const nextCoordinates = bus.routePoints[nextRouteIndex];
          const nextStop = bus.routeStops?.find(
            (stop) =>
              stop.latitude === nextCoordinates.latitude &&
              stop.longitude === nextCoordinates.longitude,
          );

          const distanceKm = calculateDistanceKm(
            nextCoordinates,
            passengerLocation,
          );
          const computedEta = estimateEtaFromDistance(distanceKm);

          return {
            ...bus,
            routeIndex: nextRouteIndex,
            coordinates: { ...nextCoordinates },
            eta: computedEta,
            currentLocationLabel: nextStop?.name || 'On route to destination',
            currentLocation: nextStop?.name || 'On route to destination',
          };
        });

        setTimeout(() => {
          evaluateProximityAlerts(updated, monitoredBusIds, monitorThreshold);
        }, 50);

        return updated;
      });
    },
    [evaluateProximityAlerts, monitorThreshold, monitoredBusIds],
  );

  const simulateAllMovement = useCallback(() => {
    setBuses((currentBuses) => {
      const updated = currentBuses.map((bus) => {
        if (!bus.isAvailable || !bus.routePoints?.length) return bus;

        const nextRouteIndex = (bus.routeIndex + 1) % bus.routePoints.length;
        const nextCoordinates = bus.routePoints[nextRouteIndex];
        const nextStop = bus.routeStops?.find(
          (stop) =>
            stop.latitude === nextCoordinates.latitude &&
            stop.longitude === nextCoordinates.longitude,
        );

        const distanceKm = calculateDistanceKm(
          nextCoordinates,
          passengerLocation,
        );
        const computedEta = estimateEtaFromDistance(distanceKm);

        return {
          ...bus,
          routeIndex: nextRouteIndex,
          coordinates: { ...nextCoordinates },
          eta: computedEta,
          currentLocationLabel: nextStop?.name || 'On route to destination',
          currentLocation: nextStop?.name || 'On route to destination',
        };
      });

      setTimeout(() => {
        evaluateProximityAlerts(updated, monitoredBusIds, monitorThreshold);
      }, 50);

      return updated;
    });
  }, [evaluateProximityAlerts, monitorThreshold, monitoredBusIds]);

  const resetBuses = useCallback(() => {
    setBuses(createInitialBuses());
    setSelectedBusId(null);
    setMonitoredBusIds([]);
    setActiveNotification(null);
    cooldownRef.current.clear();
  }, []);

  const value = useMemo<BusContextType>(
    () => ({
      buses,
      bus101: buses.find((bus) => sameBus(bus, BUS_101_ID)),
      passengerLocation,
      selectedBusId,
      setSelectedBusId,
      monitoredBusIds,
      isBusMonitored,
      startMonitoring,
      stopMonitoring,
      toggleMonitorBus,
      monitorThreshold,
      setMonitorThreshold,
      activeNotification,
      dismissNotification,
      notificationHistory,
      triggerProximityNotification,
      requestNotificationPermission,
      getBusById,
      adjustSeats,
      addPassenger,
      removePassenger,
      updateBusAvailability,
      setBusAvailability: updateBusAvailability,
      toggleBusAvailability,
      toggleAvailability: toggleBusAvailability,
      updateBusStatus,
      simulateMovement,
      simulateAllMovement,
      resetBuses,
    }),
    [
      buses,
      selectedBusId,
      monitoredBusIds,
      isBusMonitored,
      startMonitoring,
      stopMonitoring,
      toggleMonitorBus,
      monitorThreshold,
      activeNotification,
      dismissNotification,
      notificationHistory,
      triggerProximityNotification,
      requestNotificationPermission,
      getBusById,
      adjustSeats,
      addPassenger,
      removePassenger,
      updateBusAvailability,
      toggleBusAvailability,
      updateBusStatus,
      simulateMovement,
      simulateAllMovement,
      resetBuses,
    ],
  );

  return <BusContext.Provider value={value}>{children}</BusContext.Provider>;
}

export function useBuses(): BusContextType {
  const context = useContext(BusContext);

  if (!context) {
    throw new Error('useBuses must be used inside a BusProvider.');
  }

  return context;
}

export default BusContext;
