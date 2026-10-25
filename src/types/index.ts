export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Region extends Coordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface RouteStop {
  name: string;
  latitude: number;
  longitude: number;
  id?: string;
  coordinates?: Coordinate;
  coordinate?: Coordinate;
  location?: Coordinate;
}

export interface Bus {
  id: string;
  busNumber: string;
  driverName: string;
  route: string;
  origin: string;
  destination: string;
  totalSeats: number;
  availableSeats: number;
  status: string;
  isAvailable: boolean;
  eta: string;
  currentLocationLabel: string;
  currentLocation?: string;
  coordinates: Coordinate;
  routeIndex: number;
  routePoints: Coordinate[];
  routeCoordinates: Coordinate[];
  routeStops: RouteStop[];
  lastActiveStatus?: string;
  // Flexible aliases for compatibility
  busId?: string;
  number?: string;
  routeName?: string;
  seatsAvailable?: number;
  capacity?: number;
  available?: boolean;
  isActive?: boolean;
  stops?: (string | RouteStop)[];
  checkpoints?: (string | RouteStop)[];
  coordinate?: Coordinate;
  currentCoordinate?: Coordinate;
  location?: Coordinate;
  estimatedArrival?: string;
}

export interface NotificationItem {
  id: string;
  busId: string;
  busNumber: string;
  route: string;
  title: string;
  message: string;
  distanceKm: number;
  formattedDistance: string;
  eta: string;
  timestamp: number;
}

export type MonitorThreshold = '500m' | '1km' | '5min';

export interface ProximityCheckResult {
  isNear: boolean;
  distanceKm: number;
  etaMinutes: number | null;
}

export interface NearestStopResult {
  stop: RouteStop;
  distanceKm: number;
}

export interface BusStatusMeta {
  label: string;
  color: string;
  backgroundColor: string;
}

export interface BusContextType {
  buses: Bus[];
  bus101: Bus | undefined;
  passengerLocation: Region;
  selectedBusId: string | null;
  setSelectedBusId: (busId: string | null) => void;
  monitoredBusIds: string[];
  isBusMonitored: (busId: string | number | undefined | null) => boolean;
  startMonitoring: (busId: string | number) => void;
  stopMonitoring: (busId: string | number) => void;
  toggleMonitorBus: (busId: string | number) => void;
  monitorThreshold: MonitorThreshold;
  setMonitorThreshold: (threshold: MonitorThreshold) => void;
  activeNotification: NotificationItem | null;
  dismissNotification: (notificationId?: string) => void;
  notificationHistory: NotificationItem[];
  triggerProximityNotification: (bus: Bus, distanceKm: number) => void;
  requestNotificationPermission: () => Promise<void>;
  getBusById: (busId: string | number | undefined | null) => Bus | undefined;
  adjustSeats: (busId?: string, amount?: number) => void;
  addPassenger: (busId?: string) => void;
  removePassenger: (busId?: string) => void;
  updateBusAvailability: (busId?: string, isAvailable?: boolean) => void;
  setBusAvailability: (busId?: string, isAvailable?: boolean) => void;
  toggleBusAvailability: (busId?: string) => void;
  toggleAvailability: (busId?: string) => void;
  updateBusStatus: (busId?: string, status?: string) => void;
  simulateMovement: (busId?: string) => void;
  simulateAllMovement: () => void;
  resetBuses: () => void;
}
