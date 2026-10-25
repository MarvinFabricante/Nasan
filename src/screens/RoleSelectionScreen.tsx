import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

interface RoleCard {
  key: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  tone: 'light' | 'dark' | 'operator';
  route: '/(passenger)' | '/(driver)' | '/(operator)';
}

const roleCards: RoleCard[] = [
  {
    key: 'PassengerArea',
    icon: '🧭',
    eyebrow: 'PASSENGER',
    title: 'Find your ride',
    description: 'Check approaching buses, live seat availability, and estimated arrival times.',
    action: 'Continue as Passenger',
    tone: 'light',
    route: '/(passenger)',
  },
  {
    key: 'DriverArea',
    icon: '🚌',
    eyebrow: 'DRIVER',
    title: 'Manage your bus',
    description: 'Update available seats, bus availability, and simulate the route location.',
    action: 'Continue as Driver',
    tone: 'dark',
    route: '/(driver)',
  },
  {
    key: 'OperatorArea',
    icon: '🏢',
    eyebrow: 'OPERATOR',
    title: 'Fleet Management',
    description: 'Live tracking of all buses on the map, fleet occupancy rates, and route operations.',
    action: 'Continue as Operator',
    tone: 'operator',
    route: '/(operator)',
  },
];

export interface RoleSelectionScreenProps {
  navigation?: {
    navigate: (route: string) => void;
  };
}

export default function RoleSelectionScreen({ navigation }: RoleSelectionScreenProps = {}) {
  const router = useRouter();

  const handleSelectRole = (card: RoleCard) => {
    if (navigation?.navigate) {
      navigation.navigate(card.key);
    } else {
      router.push(card.route);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.backgroundOrbOne} />
      <View style={styles.backgroundOrbTwo} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoBus}>🚌</Text>
          </View>
          <Text style={styles.brand}>NASAN</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.kicker}>SMARTER BUS JOURNEYS</Text>
          <Text style={styles.title}>Know your bus.{"\n"}Know your seat.</Text>
          <Text style={styles.subtitle}>
            Choose how you would like to explore the local transport experience.
          </Text>
        </View>

        <View style={styles.roleList}>
          {roleCards.map((role) => {
            const isDark = role.tone === 'dark';
            const isOperator = role.tone === 'operator';

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={role.action}
                key={role.key}
                onPress={() => handleSelectRole(role)}
                style={({ pressed }) => [
                  styles.roleCard,
                  isDark && styles.driverCard,
                  isOperator && styles.operatorCard,
                  role.tone === 'light' && styles.passengerCard,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.roleIcon,
                    isDark && styles.driverIcon,
                    isOperator && styles.operatorIcon,
                  ]}
                >
                  <Text style={styles.roleEmoji}>{role.icon}</Text>
                </View>
                <View style={styles.roleCopy}>
                  <Text
                    style={[
                      styles.roleEyebrow,
                      isDark && styles.driverText,
                      isOperator && styles.operatorEyebrow,
                    ]}
                  >
                    {role.eyebrow}
                  </Text>
                  <Text
                    style={[
                      styles.roleTitle,
                      (isDark || isOperator) && styles.whiteText,
                    ]}
                  >
                    {role.title}
                  </Text>
                  <Text
                    style={[
                      styles.roleDescription,
                      isDark && styles.driverDescription,
                      isOperator && styles.operatorDescription,
                    ]}
                  >
                    {role.description}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.chevron,
                    isDark && styles.driverText,
                    isOperator && styles.operatorChevron,
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.footer}>Static campus prototype · Local simulated data</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7FC',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  backgroundOrbOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#D8EEFF',
    top: -175,
    right: -92,
  },
  backgroundOrbTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#E4F7EC',
    bottom: -125,
    left: -74,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#0B5CAB',
    shadowColor: '#0B5CAB',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  logoBus: { fontSize: 21 },
  brand: {
    color: '#102D4B',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  hero: {
    marginTop: 28,
  },
  kicker: {
    color: '#0B6E69',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  title: {
    color: '#102D4B',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: 10,
  },
  subtitle: {
    color: '#5D7186',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 320,
  },
  roleList: {
    gap: 12,
    marginTop: 24,
  },
  roleCard: {
    alignItems: 'center',
    borderRadius: 22,
    flexDirection: 'row',
    minHeight: 125,
    padding: 16,
    shadowColor: '#173A5E',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  passengerCard: {
    backgroundColor: '#FFFFFF',
  },
  driverCard: {
    backgroundColor: '#102D4B',
  },
  operatorCard: {
    backgroundColor: '#0D2F35',
  },
  roleIcon: {
    alignItems: 'center',
    backgroundColor: '#E8F4FF',
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    marginRight: 14,
    width: 54,
  },
  driverIcon: {
    backgroundColor: '#1E4C78',
  },
  operatorIcon: {
    backgroundColor: '#174E56',
  },
  roleEmoji: { fontSize: 26 },
  roleCopy: { flex: 1 },
  roleEyebrow: {
    color: '#0B6E69',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  operatorEyebrow: {
    color: '#2DD4BF',
  },
  roleTitle: {
    color: '#102D4B',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },
  whiteText: {
    color: '#FFFFFF',
  },
  roleDescription: {
    color: '#66788B',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  driverText: { color: '#FFFFFF' },
  driverDescription: { color: '#C2D7E8' },
  operatorDescription: { color: '#BDE0DC' },
  chevron: {
    color: '#0B5CAB',
    fontSize: 32,
    fontWeight: '300',
    marginLeft: 8,
  },
  operatorChevron: {
    color: '#2DD4BF',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  footer: {
    color: '#8291A2',
    fontSize: 11,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
});
