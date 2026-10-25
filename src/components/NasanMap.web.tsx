import React, {
  createContext,
  forwardRef,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Coordinate, Region } from '@/types';

export interface MapRef {
  animateToRegion: (targetRegion: Region, duration?: number) => void;
  fitToCoordinates: (coords: Coordinate[], options?: any) => void;
}

interface MapWebContextType {
  region: Region;
  project: (coord?: Coordinate | null) => { x: number; y: number };
}

const DEFAULT_REGION: Region = {
  latitude: 14.2788,
  longitude: 120.948,
  latitudeDelta: 0.075,
  longitudeDelta: 0.075,
};

const MapWebContext = createContext<MapWebContextType>({
  region: DEFAULT_REGION,
  project: () => ({ x: 50, y: 50 }),
});

const CAVITE_ARTERIALS: Coordinate[][] = [
  [
    { latitude: 14.268, longitude: 120.92 },
    { latitude: 14.273, longitude: 120.955 },
    { latitude: 14.278, longitude: 120.978 },
  ],
  [
    { latitude: 14.292, longitude: 120.965 },
    { latitude: 14.2818, longitude: 120.9639 },
    { latitude: 14.2721, longitude: 120.9432 },
  ],
  [
    { latitude: 14.24, longitude: 120.91 },
    { latitude: 14.26, longitude: 120.93 },
    { latitude: 14.28, longitude: 120.95 },
    { latitude: 14.31, longitude: 120.94 },
  ],
];

const PREDEFINED_STOPS: { name: string; latitude: number; longitude: number }[] = [
  { name: 'Gen. Trias Terminal', latitude: 14.273, longitude: 120.955 },
  { name: 'Manggahan Jct.', latitude: 14.2853, longitude: 120.9476 },
  { name: 'Bucandala', latitude: 14.2785, longitude: 120.9575 },
  { name: 'Dasmariñas Center', latitude: 14.3086, longitude: 120.9343 },
  { name: 'Imus Hub', latitude: 14.2721, longitude: 120.9432 },
];

export interface NasanMapProps {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  region?: Region;
  children?: ReactNode;
  showsCompass?: boolean;
  showsScale?: boolean;
  showsUserLocation?: boolean;
  toolbarEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
}

const NasanMap = forwardRef<MapRef, NasanMapProps>(
  ({ style, initialRegion, region: controlledRegion, children }, ref) => {
    const [currentRegion, setCurrentRegion] = useState<Region>(
      initialRegion || controlledRegion || DEFAULT_REGION,
    );
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
      if (controlledRegion) {
        setCurrentRegion(controlledRegion);
      }
    }, [controlledRegion]);

    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, region: currentRegion });

    const animateToRegion = useCallback((targetRegion: Region, duration = 400) => {
      if (!targetRegion) return;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const startRegion = { ...currentRegion };
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);

        const nextRegion: Region = {
          latitude:
            startRegion.latitude +
            (targetRegion.latitude - startRegion.latitude) * ease,
          longitude:
            startRegion.longitude +
            (targetRegion.longitude - startRegion.longitude) * ease,
          latitudeDelta:
            startRegion.latitudeDelta +
            ((targetRegion.latitudeDelta || startRegion.latitudeDelta) -
              startRegion.latitudeDelta) *
              ease,
          longitudeDelta:
            startRegion.longitudeDelta +
            ((targetRegion.longitudeDelta || startRegion.longitudeDelta) -
              startRegion.longitudeDelta) *
              ease,
        };

        setCurrentRegion(nextRegion);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        }
      };

      animationFrameRef.current = requestAnimationFrame(step);
    }, [currentRegion]);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion,
        fitToCoordinates: (coords: Coordinate[]) => {
          if (!coords || !coords.length) return;
          let minLat = coords[0].latitude;
          let maxLat = coords[0].latitude;
          let minLng = coords[0].longitude;
          let maxLng = coords[0].longitude;

          coords.forEach((c) => {
            if (c.latitude < minLat) minLat = c.latitude;
            if (c.latitude > maxLat) maxLat = c.latitude;
            if (c.longitude < minLng) minLng = c.longitude;
            if (c.longitude > maxLng) maxLng = c.longitude;
          });

          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          const latDelta = Math.max(0.02, (maxLat - minLat) * 1.4);
          const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.4);

          animateToRegion({
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          });
        },
      }),
      [animateToRegion],
    );

    const zoomIn = () => {
      animateToRegion({
        ...currentRegion,
        latitudeDelta: Math.max(0.008, currentRegion.latitudeDelta * 0.7),
        longitudeDelta: Math.max(0.008, currentRegion.longitudeDelta * 0.7),
      }, 250);
    };

    const zoomOut = () => {
      animateToRegion({
        ...currentRegion,
        latitudeDelta: Math.min(0.25, currentRegion.latitudeDelta * 1.4),
        longitudeDelta: Math.min(0.25, currentRegion.longitudeDelta * 1.4),
      }, 250);
    };

    const resetView = () => {
      animateToRegion(initialRegion || DEFAULT_REGION, 350);
    };

    const project = useCallback(
      (coord?: Coordinate | null) => {
        if (!coord || typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
          return { x: 50, y: 50 };
        }

        const minLat = currentRegion.latitude - currentRegion.latitudeDelta / 2;
        const maxLat = currentRegion.latitude + currentRegion.latitudeDelta / 2;
        const minLng = currentRegion.longitude - currentRegion.longitudeDelta / 2;
        const maxLng = currentRegion.longitude + currentRegion.longitudeDelta / 2;

        const x = ((coord.longitude - minLng) / (maxLng - minLng)) * 100;
        const y = ((maxLat - coord.latitude) / (maxLat - minLat)) * 100;

        return { x, y };
      },
      [currentRegion],
    );

    const contextValue = useMemo(
      () => ({
        region: currentRegion,
        project,
      }),
      [currentRegion, project],
    );

    const onMouseDown = (e: any) => {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        region: { ...currentRegion },
      };
    };

    const onMouseMove = (e: any) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const dLat = (dy / 300) * dragStartRef.current.region.latitudeDelta;
      const dLng = -(dx / 400) * dragStartRef.current.region.longitudeDelta;

      setCurrentRegion({
        ...dragStartRef.current.region,
        latitude: dragStartRef.current.region.latitude + dLat,
        longitude: dragStartRef.current.region.longitude + dLng,
      });
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const arterialPaths = useMemo(() => {
      return CAVITE_ARTERIALS.map((artery, idx) => {
        const points = artery.map((pt) => {
          const p = project(pt);
          return `${p.x},${p.y}`;
        });
        return { id: idx, points: points.join(' ') };
      });
    }, [project]);

    return (
      <MapWebContext.Provider value={contextValue}>
        <View
          accessibilityLabel="Interactive Bus Map"
          {...({
            onMouseDown,
            onMouseMove,
            onMouseUp,
            onMouseLeave: onMouseUp,
          } as any)}
          style={[styles.container, style]}
        >
          <View style={styles.mapCanvas}>
            <View style={styles.gridOverlay} />

            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {arterialPaths.map((art) => (
                <polyline
                  key={`casing-${art.id}`}
                  points={art.points}
                  fill="none"
                  stroke="#CAD8E5"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {arterialPaths.map((art) => (
                <polyline
                  key={`fill-${art.id}`}
                  points={art.points}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            {PREDEFINED_STOPS.map((stop, index) => {
              const pos = project(stop);
              if (pos.x < -10 || pos.x > 110 || pos.y < -10 || pos.y > 110) {
                return null;
              }
              return (
                <View
                  key={`stop-${index}`}
                  style={[
                    styles.stopMarker,
                    { left: `${pos.x}%`, top: `${pos.y}%` },
                  ]}
                >
                  <View style={styles.stopDot} />
                  <Text numberOfLines={1} style={styles.stopLabel}>
                    {stop.name}
                  </Text>
                </View>
              );
            })}
          </View>

          {children}

          <View style={styles.controlsContainer}>
            <Pressable
              accessibilityLabel="Zoom In"
              onPress={zoomIn}
              style={({ pressed }) => [
                styles.controlButton,
                pressed && styles.controlButtonPressed,
              ]}
            >
              <Text style={styles.controlIcon}>+</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Zoom Out"
              onPress={zoomOut}
              style={({ pressed }) => [
                styles.controlButton,
                pressed && styles.controlButtonPressed,
              ]}
            >
              <Text style={styles.controlIcon}>−</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Reset View"
              onPress={resetView}
              style={({ pressed }) => [
                styles.controlButton,
                pressed && styles.controlButtonPressed,
              ]}
            >
              <Text style={styles.controlIconSmall}>⌖</Text>
            </Pressable>
          </View>

          <View pointerEvents="none" style={styles.attributionPill}>
            <View style={styles.gpsDot} />
            <Text style={styles.attributionText}>Cavite Transit Map · Live</Text>
          </View>
        </View>
      </MapWebContext.Provider>
    );
  },
);

export interface MarkerProps {
  coordinate: Coordinate;
  anchor?: { x: number; y: number };
  onPress?: () => void;
  children?: ReactNode;
  zIndex?: number;
  identifier?: string;
  title?: string;
  description?: string;
  pinColor?: string;
}

export function Marker({
  coordinate,
  anchor = { x: 0.5, y: 0.5 },
  onPress,
  children,
  zIndex = 1,
  identifier,
}: MarkerProps) {
  const { project } = useContext(MapWebContext);
  const pos = project(coordinate);

  if (pos.x < -15 || pos.x > 115 || pos.y < -15 || pos.y > 115) {
    return null;
  }

  return (
    <View
      style={[
        styles.markerContainer,
        {
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          zIndex: zIndex * 10,
          transform: [
            { translateX: -(anchor.x * 100) + '%' } as any,
            { translateY: -(anchor.y * 100) + '%' } as any,
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Marker ${identifier || ''}`}
        onPress={onPress}
        style={styles.markerPressable}
      >
        {children}
      </Pressable>
    </View>
  );
}

export interface PolylineProps {
  coordinates?: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
  lineCap?: string;
}

export function Polyline({
  coordinates = [],
  strokeColor = '#2C7BE5',
  strokeWidth = 4,
}: PolylineProps) {
  const { project } = useContext(MapWebContext);

  const pointsString = useMemo(() => {
    if (!coordinates || coordinates.length < 2) return '';
    return coordinates
      .map((c) => {
        const p = project(c);
        return `${p.x},${p.y}`;
      })
      .join(' ');
  }, [coordinates, project]);

  if (!pointsString) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        points={pointsString}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.6}
        strokeOpacity="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={pointsString}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface CalloutProps {
  children?: ReactNode;
  tooltip?: boolean;
}

export function Callout({ children }: CalloutProps) {
  return (
    <View style={styles.calloutWrapper}>
      {children}
    </View>
  );
}

export default NasanMap;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E7EFF6',
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
  } as ViewStyle,
  mapCanvas: {
    ...StyleSheet.absoluteFill,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    opacity: 0.12,
  },
  stopMarker: {
    alignItems: 'center',
    position: 'absolute',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 4,
  },
  stopDot: {
    backgroundColor: '#567292',
    borderColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    width: 10,
  },
  stopLabel: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 4,
    color: '#3C526D',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  markerContainer: {
    position: 'absolute',
  },
  markerPressable: {
    cursor: 'pointer',
  } as ViewStyle,
  calloutWrapper: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: '-50%' } as any, { translateY: -8 }],
    zIndex: 99,
  },
  controlsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#D4E1EE',
    borderRadius: 14,
    borderWidth: 1,
    bottom: 14,
    position: 'absolute',
    right: 14,
    shadowColor: '#12263F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 30,
  },
  controlButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  controlButtonPressed: {
    backgroundColor: '#EBF3FC',
  },
  controlIcon: {
    color: '#153E6B',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  controlIconSmall: {
    color: '#153E6B',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 16,
  },
  attributionPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#E2EAF2',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 14,
    flexDirection: 'row',
    gap: 6,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    zIndex: 20,
  },
  gpsDot: {
    backgroundColor: '#16A360',
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  attributionText: {
    color: '#4B627E',
    fontSize: 10,
    fontWeight: '700',
  },
});
