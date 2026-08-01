import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const isExpoGo = Constants.appOwnership === 'expo';
const PUSH_TOKEN_KEY = 'taptym.push-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Device.isDevice || Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Taptym',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F0B90B',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing.status === 'granted' ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token) return;
    const { error } = await supabase.rpc('register_device_token', {
      p_token: token,
      p_platform: Platform.OS,
    });
    if (error) console.warn('Push token registration failed:', error.message);
    else await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (error) {
    console.warn('Push registration failed:', error);
  }
}

export async function unregisterPushTokenAsync() {
  if (Platform.OS === 'web') return;
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (!token) return;
  await supabase.rpc('unregister_device_token', { p_token: token });
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}
