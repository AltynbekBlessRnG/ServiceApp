import { Icon, useTheme } from '@rneui/themed';
import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoleGuard } from '../../components/RoleGuard';

export default function SpecialistLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <RoleGuard role="specialist">
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: { 
            backgroundColor: theme.colors.background,
            borderTopColor: '#2C2C2C',
            borderTopWidth: 1,
            height: 60 + insets.bottom, 
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 10,
            elevation: 0,
        },
        tabBarActiveTintColor: theme.colors.primary, 
        tabBarInactiveTintColor: '#6B6675', 
        tabBarShowLabel: false, 
      }}
    >
      {/* 1. ЗАКАЗЫ */}
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ color }) => <Icon name="list" type="feather" color={color} size={24} /> }} />

      {/* 2. РАСПИСАНИЕ */}
      <Tabs.Screen name="schedule" options={{ tabBarIcon: ({ color }) => <Icon name="calendar" type="feather" color={color} size={24} /> }} />

      {/* 3. ЧАТЫ */}
      <Tabs.Screen name="messages" options={{ tabBarIcon: ({ color }) => <Icon name="message-circle" type="feather" color={color} size={24} /> }} />

      {/* 4. ПОРТФОЛИО */}
      <Tabs.Screen name="portfolio" options={{ tabBarIcon: ({ color }) => <Icon name="image" type="feather" color={color} size={24} /> }} />

      {/* 5. ПРОФИЛЬ */}
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color }) => <Icon name="user" type="feather" color={color} size={24} /> }} />

      {/* Скрытые страницы */}
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
    </Tabs>
    </RoleGuard>
  );
}
