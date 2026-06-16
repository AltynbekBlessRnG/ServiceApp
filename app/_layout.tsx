import { createTheme, ThemeProvider } from '@rneui/themed';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../providers/AuthProvider';

export default function RootLayout() {
  // 💜 ТОТ САМЫЙ КРАСИВЫЙ ФОН (Deep Void)
  const bgColor = '#0F0C15'; 

  const myColors = {
    primary: '#8A2BE2',   // Неоновый фиолетовый
    secondary: '#00FFCC', // Неоновая мята
    background: bgColor,
    grey0: '#1A1625',     // Карточки (с фиолетовым оттенком)
    grey1: '#2D2638',     // Границы (темно-фиолетовые)
    grey2: '#A09BAF',     // Текст (серо-фиолетовый)
    grey3: '#6B6675',
    black: '#FFFFFF',     // Текст заголовков
    white: bgColor,
    error: '#FF0055',     // Неоновый красный
  };

  const theme = createTheme({
    mode: 'dark',
    lightColors: myColors,
    darkColors: myColors,
    components: {
      Button: {
        buttonStyle: { borderRadius: 12, height: 56 }, // Убрал принудительный зеленый, пусть берет primary
        titleStyle: { fontWeight: '700', fontSize: 16 }
      },
      Input: {
        inputContainerStyle: { 
          borderBottomWidth: 0, 
          backgroundColor: '#1A1625', 
          borderRadius: 12, 
          paddingHorizontal: 15,
          borderWidth: 1,
          borderColor: '#2D2638'
        },
        inputStyle: { color: '#FFFFFF' },
        labelStyle: { color: '#00FFCC', marginBottom: 5, fontSize: 12, fontWeight: '700' }
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
          <StatusBar style="light" backgroundColor={bgColor} />
          <View style={{ flex: 1, backgroundColor: bgColor }}>
            <Stack screenOptions={{ 
                headerShown: false, 
                contentStyle: { backgroundColor: bgColor },
                animation: 'fade_from_bottom' ,
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