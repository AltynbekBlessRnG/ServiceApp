import { createTheme, ThemeProvider } from '@rneui/themed';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/AppToast';
import { queryClient } from '../lib/query-client';
import { AuthProvider } from '../providers/AuthProvider';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    delete event.user;
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});

function RootLayout() {
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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <ToastProvider />
          <AuthProvider>
            <StatusBar style="light" backgroundColor={bgColor} />
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
                <Stack.Screen name="privacy" />
                <Stack.Screen name="auth/callback" />
                <Stack.Screen name="reset-password" />
              </Stack>
            </View>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
