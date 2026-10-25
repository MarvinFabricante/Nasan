import { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';
import { Platform } from 'react-native';
import WebMap, {
  Marker as WebMarker,
  Polyline as WebPolyline,
  Callout as WebCallout,
  MapRef,
  NasanMapProps,
  MarkerProps,
  PolylineProps,
  CalloutProps,
} from './NasanMap.web';
import NativeMap, {
  Marker as NativeMarker,
  Polyline as NativePolyline,
  Callout as NativeCallout,
} from './NasanMap.native';

const MapView: ForwardRefExoticComponent<NasanMapProps & RefAttributes<any>> =
  (Platform.OS === 'web' ? WebMap : NativeMap) as any;

export const Marker: ComponentType<MarkerProps> =
  (Platform.OS === 'web' ? WebMarker : NativeMarker) as any;

export const Polyline: ComponentType<PolylineProps> =
  (Platform.OS === 'web' ? WebPolyline : NativePolyline) as any;

export const Callout: ComponentType<CalloutProps> =
  (Platform.OS === 'web' ? WebCallout : NativeCallout) as any;

export type { MapRef, NasanMapProps, MarkerProps, PolylineProps, CalloutProps };
export default MapView;
