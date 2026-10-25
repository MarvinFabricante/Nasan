import React from 'react';
import { Tabs } from 'expo-router';
import { OpaqueColorValue, Text } from 'react-native';

function TabIcon({ children, color }: { children: string; color: string | OpaqueColorValue }) {
  return <Text style={{ color: color as string, fontSize: 18 }}>{children}</Text>;
}

export default function OperatorLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0D2F35',
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
          title: 'Fleet Dashboard',
          tabBarIcon: ({ color }) => <TabIcon color={color}>▦</TabIcon>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Fleet Map',
          tabBarIcon: ({ color }) => <TabIcon color={color}>⌖</TabIcon>,
        }}
      />
    </Tabs>
  );
}
