import React from 'react';
import { Tabs } from 'expo-router';
import { OpaqueColorValue, Text } from 'react-native';

function TabIcon({ children, color }: { children: string; color: string | OpaqueColorValue }) {
  return <Text style={{ color: color as string, fontSize: 18 }}>{children}</Text>;
}

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0B5CAB',
        tabBarInactiveTintColor: '#8291A2',
        tabBarStyle: {
          height: 66,
          paddingTop: 7,
          borderTopColor: '#E3ECF4',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color }) => <TabIcon color={color}>⌂</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabIcon color={color}>⌖</TabIcon>,
        }}
      />
    </Tabs>
  );
}
