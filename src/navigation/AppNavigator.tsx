import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import SearchScreen from '../screens/SearchScreen';
import MapScreen from '../screens/MapScreen';
import NavigationScreen from '../screens/NavigationScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: undefined;
  MapDetail: undefined;
  Profile: undefined;
};

export type TabParamList = {
  Search: undefined;
  Navigation: undefined;
  Saved: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function ProfileAvatar({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.avatarWrap}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={14} color="#fff" />
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.overlay,
          borderTopWidth: 0,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          position: 'absolute',
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarActiveTintColor: Colors.bg,
        tabBarInactiveTintColor: 'rgba(81,100,82,0.6)',
        tabBarItemStyle: { borderRadius: 9999 },
        tabBarActiveBackgroundColor: Colors.primary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: 1.1,
        },
      }}
    >
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size - 4} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Navigation"
        component={NavigationScreen}
        options={{
          tabBarLabel: 'Safety',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size - 4} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarLabel: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size - 4} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="MapDetail" component={MapScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { marginRight: 12 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#c5a882',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bgInput,
  },
});
