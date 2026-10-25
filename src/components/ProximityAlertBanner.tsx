import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadows } from '@/constants/theme';
import { NotificationItem } from '@/types';

export interface ProximityAlertBannerProps {
  notification: NotificationItem | null;
  onDismiss: (id?: string) => void;
  onFocusBus?: (busId: string | number) => void;
}

/**
 * High-visibility in-app notification banner for monitored bus proximity alerts.
 * Provides fallback when browser notifications are denied or unavailable.
 */
export default function ProximityAlertBanner({
  notification,
  onDismiss,
  onFocusBus,
}: ProximityAlertBannerProps) {
  if (!notification) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.banner}>
        <View style={styles.iconCircle}>
          <Ionicons color="#FFFFFF" name="notifications" size={20} />
        </View>

        <View style={styles.content}>
          <View style={styles.headingRow}>
            <Text numberOfLines={1} style={styles.title}>
              {notification.title || 'Bus Approaching!'}
            </Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>ALERT</Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.message}>
            {notification.message}
          </Text>

          <View style={styles.actionRow}>
            {onFocusBus ? (
              <Pressable
                accessibilityLabel="Focus this bus on the map"
                onPress={() => onFocusBus(notification.busId)}
                style={({ pressed }) => [
                  styles.focusBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons color="#FFFFFF" name="locate-outline" size={13} />
                <Text style={styles.focusBtnText}>Locate on map</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityLabel="Dismiss notification"
              onPress={() => onDismiss(notification.id)}
              style={({ pressed }) => [
                styles.dismissBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Close notification"
          hitSlop={10}
          onPress={() => onDismiss(notification.id)}
          style={styles.closeBtn}
        >
          <Ionicons color="#8C9CAE" name="close" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    left: 16,
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 9999,
  },
  banner: {
    alignItems: 'flex-start',
    backgroundColor: '#0E2949',
    borderColor: '#245995',
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    padding: 14,
    ...shadows.floating,
    shadowColor: '#07182C',
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: '#F5A623',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    width: 40,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.25)',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveDot: {
    backgroundColor: '#F5A623',
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  liveText: {
    color: '#F5A623',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  message: {
    color: '#C6D8EB',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  focusBtn: {
    alignItems: 'center',
    backgroundColor: '#0B5CAB',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  focusBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dismissBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dismissBtnText: {
    color: '#D8E7F6',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
  pressed: {
    opacity: 0.8,
  },
});
