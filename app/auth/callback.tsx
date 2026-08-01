import { Text } from '@rneui/themed';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';

function readTokens(url: string) {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const values = new URLSearchParams(fragment || query);
  return {
    code: values.get('code'),
    accessToken: values.get('access_token'),
    refreshToken: values.get('refresh_token'),
    type: values.get('type'),
  };
}

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [message, setMessage] = useState('Подтверждаем ссылку…');

  useEffect(() => {
    if (!url) return;
    let active = true;
    void (async () => {
      try {
        const tokens = readTokens(url);
        if (tokens.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(tokens.code);
          if (error) throw error;
        } else if (tokens.accessToken && tokens.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });
          if (error) throw error;
        } else {
          throw new Error('Ссылка недействительна или устарела');
        }
        if (active) router.replace(tokens.type === 'recovery' ? '/reset-password' : '/');
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Не удалось обработать ссылку');
      }
    })();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#F0B90B" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E11', alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { color: '#FAFAFA', textAlign: 'center', marginTop: 18 },
});
