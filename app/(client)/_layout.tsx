import { Icon, useTheme } from '@rneui/themed';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClientLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
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
        tabBarActiveTintColor: theme.colors.primary, // Зеленый
        tabBarInactiveTintColor: '#6B6675', 
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ color }) => <Icon name="home" type="feather" color={color} size={24} /> }} />
      
      <Tabs.Screen name="reels" options={{ tabBarIcon: ({ color }) => <Icon name="play-circle" type="feather" color={color} size={26} /> }} />
      
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ color }) => <Icon name="calendar" type="feather" color={color} size={24} /> }} />
      
      <Tabs.Screen name="messages" options={{ tabBarIcon: ({ color }) => <Icon name="message-circle" type="feather" color={color} size={24} /> }} />
      
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color }) => <Icon name="user" type="feather" color={color} size={24} /> }} />

      {/* Скрытые экраны */}
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="category-results" options={{ href: null }} />
      <Tabs.Screen name="ai-search" options={{ href: null }} />
      <Tabs.Screen name="add-review" options={{ href: null }} />
      <Tabs.Screen name="alakol" options={{ href: null }} />
    </Tabs>
  );
}
