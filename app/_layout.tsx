import { createTheme, ThemeProvider } from '@rneui/themed';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../providers/AuthProvider';

export default function RootLayout() {
  const bgColor = '#0B0E11';

  const myColors = {
    primary: '#F0B90B',
    secondary: '#FCD535',
    background: bgColor,
    grey0: '#1E2329',
    grey1: '#2B3139',
    grey2: '#848E9C',
    grey3: '#5E6673',
    black: '#FFFFFF',
    white: bgColor,
    error: '#F6465D',
  };

  const theme = createTheme({
    mode: 'dark',
    lightColors: myColors,
    darkColors: myColors,
    components: {
      Button: {
        buttonStyle: { borderRadius: 8, height: 48 },
        titleStyle: { fontWeight: '700', fontSize: 15 }
      },
      Input: {
        inputContainerStyle: {
          borderBottomWidth: 0,
          backgroundColor: '#1E2329',
          borderRadius: 8,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: '#2B3139'
        },
        inputStyle: { color: '#FFFFFF', fontSize: 14 },
        placeholderTextColor: '#848E9C'
      },
      Text: {
        style: { color: '#FFFFFF' }
      }
    }
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <StatusBar barStyle="light-content" backgroundColor={bgColor} />
          <View style={{ flex: 1, backgroundColor: bgColor }}>
            <Stack screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: bgColor },
              animation: 'fade',
              gestureEnabled: false
            }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(client)" />
              <Stack.Screen name="(specialist)" />
              <Stack.Screen name="(venue)" />
              <Stack.Screen name="(admin)" />
            </Stack>
          </View>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
