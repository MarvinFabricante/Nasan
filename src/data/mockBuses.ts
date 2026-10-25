import { Bus, Coordinate, Region } from '@/types';

/**
 * Local-only route data for the NASAN prototype. These are intentionally
 * fixed coordinates around General Trias, Cavite; no GPS or network request
 * is made by the app.
 */
export const BUS_101_ID = '101';

export const passengerLocation: Region = {
  latitude: 14.2788,
  longitude: 120.948,
  latitudeDelta: 0.075,
  longitudeDelta: 0.075,
};

export const mapInitialRegion: Region = passengerLocation;

const bus101Route: Coordinate[] = [
  { latitude: 14.273, longitude: 120.955 },
  { latitude: 14.2787, longitude: 120.9514 },
  { latitude: 14.2853, longitude: 120.9476 },
  { latitude: 14.2929, longitude: 120.9432 },
  { latitude: 14.3007, longitude: 120.9388 },
  { latitude: 14.3086, longitude: 120.9343 },
];

const bus202Route: Coordinate[] = [
  { latitude: 14.284, longitude: 120.97 },
  { latitude: 14.2818, longitude: 120.9639 },
  { latitude: 14.2785, longitude: 120.9575 },
  { latitude: 14.2753, longitude: 120.9505 },
  { latitude: 14.2721, longitude: 120.9432 },
];

const bus303Route: Coordinate[] = [
  { latitude: 14.2566, longitude: 120.9288 },
  { latitude: 14.251, longitude: 120.9234 },
  { latitude: 14.2454, longitude: 120.9177 },
  { latitude: 14.2396, longitude: 120.9124 },
  { latitude: 14.234, longitude: 120.9072 },
];

export const mockBuses: Bus[] = [
  {
    id: BUS_101_ID,
    busNumber: 'BUS 101',
    driverName: 'Juan Dela Cruz',
    route: 'General Trias → Dasmariñas',
    origin: 'General Trias',
    destination: 'Dasmariñas',
    totalSeats: 40,
    availableSeats: 18,
    status: 'Arriving',
    isAvailable: true,
    eta: '5 min',
    currentLocationLabel: 'Governor’s Drive, General Trias',
    currentLocation: 'Governor’s Drive, General Trias',
    coordinates: bus101Route[0],
    routeIndex: 0,
    routePoints: bus101Route,
    routeCoordinates: bus101Route,
    routeStops: [
      { name: 'General Trias Terminal', ...bus101Route[0] },
      { name: 'Manggahan', ...bus101Route[2] },
      { name: 'Dasmariñas City Center', ...bus101Route[5] },
    ],
  },
  {
    id: '202',
    busNumber: 'BUS 202',
    driverName: 'Pedro Santos',
    route: 'General Trias → Imus',
    origin: 'General Trias',
    destination: 'Imus',
    totalSeats: 40,
    availableSeats: 7,
    status: 'Arriving',
    isAvailable: true,
    eta: '10 min',
    currentLocationLabel: 'Arnaldo Highway, General Trias',
    currentLocation: 'Arnaldo Highway, General Trias',
    coordinates: bus202Route[0],
    routeIndex: 0,
    routePoints: bus202Route,
    routeCoordinates: bus202Route,
    routeStops: [
      { name: 'General Trias Terminal', ...bus202Route[0] },
      { name: 'Bucandala', ...bus202Route[2] },
      { name: 'Imus Transport Hub', ...bus202Route[4] },
    ],
  },
  {
    id: '303',
    busNumber: 'BUS 303',
    driverName: 'Maria Reyes',
    route: 'General Trias → Silang',
    origin: 'General Trias',
    destination: 'Silang',
    totalSeats: 40,
    availableSeats: 0,
    status: 'Full',
    isAvailable: true,
    eta: '18 min',
    currentLocationLabel: 'Pasong Camachile, General Trias',
    currentLocation: 'Pasong Camachile, General Trias',
    coordinates: bus303Route[0],
    routeIndex: 0,
    routePoints: bus303Route,
    routeCoordinates: bus303Route,
    routeStops: [
      { name: 'Pasong Camachile', ...bus303Route[0] },
      { name: 'Bulihan', ...bus303Route[2] },
      { name: 'Silang Town Proper', ...bus303Route[4] },
    ],
  },
];

export const createInitialBuses = (): Bus[] =>
  mockBuses.map((bus) => ({
    ...bus,
    coordinates: { ...bus.coordinates },
    routePoints: bus.routePoints.map((point) => ({ ...point })),
    routeCoordinates: bus.routeCoordinates.map((point) => ({ ...point })),
    routeStops: bus.routeStops.map((stop) => ({ ...stop })),
  }));

export default mockBuses;
