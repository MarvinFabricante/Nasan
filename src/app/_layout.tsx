import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BusProvider } from '@/context/BusContext';

/**
 * Root Layout for NASAN Expo Router TypeScript application.
 * BusProvider holds in-memory mock bus state across all screens.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BusProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F3F7FC' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(passenger)" options={{ headerShown: false }} />
          <Stack.Screen name="(driver)" options={{ headerShown: false }} />
          <Stack.Screen name="(operator)" options={{ headerShown: false }} />
          <Stack.Screen name="bus/[id]" options={{ headerShown: false }} />
        </Stack>
      </BusProvider>
    </SafeAreaProvider>
  );
}
