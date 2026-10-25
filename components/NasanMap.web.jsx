import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const MapWebContext = createContext({
  region: {
    latitude: 14.2788,
    longitude: 120.948,
    latitudeDelta: 0.075,
    longitudeDelta: 0.075,
  },
  project: () => ({ x: 50, y: 50 }),
});

const DEFAULT_REGION = {
  latitude: 14.2788,
  longitude: 120.948,
  latitudeDelta: 0.075,
  longitudeDelta: 0.075,
};

/**
 * Predefined geographic features and stops around General Trias & Cavite corridor
 * to provide realistic cartographic context for route visualization.
 */
const CAVITE_ARTERIALS = [
  // Governor's Drive (horizontal artery)
  [
    { latitude: 14.268, longitude: 120.92 },
    { latitude: 14.273, longitude: 120.955 },
    { latitude: 14.278, longitude: 120.978 },
  ],
  // Arnaldo Highway (diagonal artery)
  [
    { latitude: 14.292, longitude: 120.965 },
    { latitude: 14.2818, longitude: 120.9639 },
    { latitude: 14.2721, longitude: 120.9432 },
  ],
  // General Trias-Amadeo corridor
  [
    { latitude: 14.24, longitude: 120.91 },
    { latitude: 14.26, longitude: 120.93 },
    { latitude: 14.28, longitude: 120.95 },
    { latitude: 14.31, longitude: 120.94 },
  ],
];

const PREDEFINED_STOPS = [
  { name: 'Gen. Trias Terminal', latitude: 14.273, longitude: 120.955 },
  { name: 'Manggahan Jct.', latitude: 14.2853, longitude: 120.9476 },
  { name: 'Bucandala', latitude: 14.2785, longitude: 120.9575 },
  { name: 'Dasmariñas Center', latitude: 14.3086, longitude: 120.9343 },
  { name: 'Imus Hub', latitude: 14.2721, longitude: 120.9432 },
];

/**
 * Fully interactive, animated SVG/Canvas map component for React Native Web.
 * Maps coordinates to normalized viewport projection with pan, zoom, marker interaction,
 * and polyline drawing.
 */
const NasanMap = forwardRef(
  ({ style, initialRegion, region: controlledRegion, children }, ref) => {
    const [currentRegion, setCurrentRegion] = useState(
      initialRegion || controlledRegion || DEFAULT_REGION,
    );
    const animationFrameRef = useRef(null);

    useEffect(() => {
      if (controlledRegion) {
        setCurrentRegion(controlledRegion);
      }
    }, [controlledRegion]);

    // Pan state
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0, region: currentRegion });

    const animateToRegion = useCallback((targetRegion, duration = 400) => {
      if (!targetRegion) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const startRegion = { ...currentRegion };
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Ease-out cubic curve
        const ease = 1 - Math.pow(1 - progress, 3);

        const nextRegion = {
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
        fitToCoordinates: (coords, options) => {
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

    // Zoom handlers
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

    // Coordinate conversion
    const project = useCallback(
      (coord) => {
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

    // Mouse drag handlers on web
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        region: { ...currentRegion },
      };
    };

    const onMouseMove = (e) => {
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

    // Pre-calculate arterial roads paths
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
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={[styles.container, style]}
        >
          {/* Map Cartographic Background */}
          <View style={styles.mapCanvas}>
            {/* Grid Pattern */}
            <View style={styles.gridOverlay} />

            {/* Arterial Roads SVG Layer */}
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
              {/* Road Casing */}
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
              {/* Road Fill */}
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

            {/* Predefined Bus Stops */}
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

          {/* Children: Polylines & Markers rendered via Context */}
          {children}

          {/* Map Controls */}
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

          {/* Map Scale / Attribution Pill */}
          <View pointerEvents="none" style={styles.attributionPill}>
            <View style={styles.gpsDot} />
            <Text style={styles.attributionText}>Cavite Transit Map · Live</Text>
          </View>
        </View>
      </MapWebContext.Provider>
    );
  },
);

/**
 * Web Marker component that positions itself based on current map projection.
 */
export function Marker({
  coordinate,
  anchor = { x: 0.5, y: 0.5 },
  onPress,
  children,
  zIndex = 1,
  identifier,
}) {
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
            { translateX: -(anchor.x * 100) + '%' },
            { translateY: -(anchor.y * 100) + '%' },
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

/**
 * Web Polyline component that renders SVG path across projected coordinates.
 */
export function Polyline({
  coordinates = [],
  strokeColor = '#2C7BE5',
  strokeWidth = 4,
}) {
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
      {/* Route Glow Shadow */}
      <polyline
        points={pointsString}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 1.6}
        strokeOpacity="0.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Route Primary Path */}
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

export function Callout({ children }) {
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
    cursor: 'grab',
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
  },
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    opacity: 0.12,
    backgroundImage:
      'linear-gradient(to right, #B2C6D8 1px, transparent 1px), linear-gradient(to bottom, #B2C6D8 1px, transparent 1px)',
    backgroundSize: '36px 36px',
  },
  stopMarker: {
    alignItems: 'center',
    pointerEvents: 'none',
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
  },
  calloutWrapper: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: [{ translateX: '-50%' }, { translateY: -8 }],
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
