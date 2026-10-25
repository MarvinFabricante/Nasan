import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BUS_101_ID,
  createInitialBuses,
  passengerLocation,
} from '../data/mockBuses';
import {
  calculateDistanceKm,
  checkProximity,
  estimateEtaFromDistance,
  formatDistance,
  parseEtaMinutes,
} from '../data/geoUtils';

const BusContext = createContext(undefined);

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const sameBus = (bus, busId) =>
  String(bus?.id) === String(busId) ||
  String(bus?.busNumber).replace(/\D/g, '') === String(busId).replace(/\D/g, '');

const setAvailability = (bus, isAvailable) => {
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

/**
 * Shared in-memory state for the NASAN demonstration.
 * Manages live mock buses, monitored bus tracking, proximity alert triggers,
 * deduplication cooldowns, and cross-screen selection synchronization.
 */
export function BusProvider({ children }) {
  const [buses, setBuses] = useState(createInitialBuses);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [monitoredBusIds, setMonitoredBusIds] = useState([]);
  const [monitorThreshold, setMonitorThreshold] = useState('1km'); // '500m' | '1km' | '5min'
  const [activeNotification, setActiveNotification] = useState(null);
  const [notificationHistory, setNotificationHistory] = useState([]);

  // Cooldown tracker prevents spamming alerts for the same arrival event
  const cooldownRef = useRef(new Map());

  const getBusById = useCallback(
    (busId) => buses.find((bus) => sameBus(bus, busId)),
    [buses],
  );

  const isBusMonitored = useCallback(
    (busId) => {
      if (!busId) return false;
      return monitoredBusIds.some((id) => String(id) === String(busId));
    },
    [monitoredBusIds],
  );

  /**
   * Dispatches both a web browser notification (if permitted) and an in-app banner.
   */
  const triggerProximityNotification = useCallback(
    (bus, distanceKm) => {
      const formattedDist = formatDistance(distanceKm);
      const title = `🚌 ${bus.busNumber} Approaching!`;
      const message = `${bus.busNumber} (${bus.route}) is ${formattedDist} away (${bus.eta || 'approaching stop'}).`;

      const notificationItem = {
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

      // In-app alert banner
      setActiveNotification(notificationItem);
      setNotificationHistory((prev) => [notificationItem, ...prev.slice(0, 19)]);

      // Browser notification fallback / integration
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body: message,
              icon: '/favicon.ico',
            });
          } catch (e) {
            // Browser notification failed or blocked by policy
          }
        }
      }
    },
    [],
  );

  /**
   * Evaluates proximity for monitored buses against passengerLocation.
   * Enforces deduplication cooldown so the same arrival event does not fire repeatedly.
   */
  const evaluateProximityAlerts = useCallback(
    (currentBuses, monitoredIds, threshold) => {
      if (!monitoredIds.length) return;

      const now = Date.now();
      const COOLDOWN_MS = 60 * 1000; // 60 seconds minimum between duplicate notifications

      currentBuses.forEach((bus) => {
        const busIdStr = String(bus.id);
        if (!monitoredIds.some((id) => String(id) === busIdStr)) return;

        const proximity = checkProximity(bus, passengerLocation, threshold);

        if (proximity.isNear) {
          const cycleKey = `${busIdStr}-route${bus.routeIndex ?? 0}`;
          const lastAlert = cooldownRef.current.get(busIdStr);

          // Check if already notified for this route cycle or within cooldown window
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

  /**
   * Request browser notification permission explicitly upon user interaction
   */
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
    (busId) => {
      const busIdStr = String(busId);
      setMonitoredBusIds((prev) =>
        prev.includes(busIdStr) ? prev : [...prev, busIdStr],
      );

      // Prompt browser permission on explicit user action
      requestNotificationPermission();

      // Check immediate proximity on start
      const targetBus = buses.find((b) => sameBus(b, busId));
      if (targetBus) {
        evaluateProximityAlerts(buses, [busIdStr], monitorThreshold);
      }
    },
    [buses, evaluateProximityAlerts, monitorThreshold, requestNotificationPermission],
  );

  const stopMonitoring = useCallback((busId) => {
    const busIdStr = String(busId);
    setMonitoredBusIds((prev) => prev.filter((id) => id !== busIdStr));
    cooldownRef.current.delete(busIdStr);
  }, []);

  const toggleMonitorBus = useCallback(
    (busId) => {
      const busIdStr = String(busId);
      if (monitoredBusIds.includes(busIdStr)) {
        stopMonitoring(busIdStr);
      } else {
        startMonitoring(busIdStr);
      }
    },
    [monitoredBusIds, startMonitoring, stopMonitoring],
  );

  const dismissNotification = useCallback((notificationId) => {
    setActiveNotification((current) =>
      current && (!notificationId || current.id === notificationId)
        ? null
        : current,
    );
  }, []);

  /**
   * Applies a signed change to the number of open seats.
   */
  const adjustSeats = useCallback((busId = BUS_101_ID, amount = 0) => {
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
    (busId = BUS_101_ID) => adjustSeats(busId, -1),
    [adjustSeats],
  );

  const removePassenger = useCallback(
    (busId = BUS_101_ID) => adjustSeats(busId, 1),
    [adjustSeats],
  );

  const updateBusAvailability = useCallback(
    (busId = BUS_101_ID, isAvailable = true) => {
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

  const toggleBusAvailability = useCallback((busId = BUS_101_ID) => {
    setBuses((currentBuses) =>
      currentBuses.map((bus) =>
        sameBus(bus, busId) ? setAvailability(bus, !bus.isAvailable) : bus,
      ),
    );
  }, []);

  const updateBusStatus = useCallback((busId = BUS_101_ID, status) => {
    if (!status) return;

    setBuses((currentBuses) =>
      currentBuses.map((bus) =>
        sameBus(bus, busId) ? { ...bus, status } : bus,
      ),
    );
  }, []);

  /**
   * Steps a bus to the next fixed route coordinate.
   * Recalculates distance and ETA to passengerLocation, and triggers
   * proximity checks for any monitored buses.
   */
  const simulateMovement = useCallback(
    (busId = BUS_101_ID) => {
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

        // Evaluate proximity for any monitored buses after movement
        setTimeout(() => {
          evaluateProximityAlerts(updated, monitoredBusIds, monitorThreshold);
        }, 50);

        return updated;
      });
    },
    [evaluateProximityAlerts, monitorThreshold, monitoredBusIds],
  );

  const resetBuses = useCallback(() => {
    setBuses(createInitialBuses());
    setSelectedBusId(null);
    setMonitoredBusIds([]);
    setActiveNotification(null);
    cooldownRef.current.clear();
  }, []);

  const value = useMemo(
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
      resetBuses,
    ],
  );

  return <BusContext.Provider value={value}>{children}</BusContext.Provider>;
}

export function useBuses() {
  const context = useContext(BusContext);

  if (!context) {
    throw new Error('useBuses must be used inside a BusProvider.');
  }

  return context;
}

export default BusContext;
