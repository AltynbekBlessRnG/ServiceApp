import { Button, Input, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (password.length < 8 || password !== confirmation) {
      return Alert.alert('Ошибка', 'Пароли должны совпадать и содержать минимум 8 символов');
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return Alert.alert('Ошибка', error.message);
    Alert.alert('Готово', 'Пароль обновлён', [{ text: 'Продолжить', onPress: () => router.replace('/') }]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text h3 style={styles.title}>Новый пароль</Text>
        <Input placeholder="Новый пароль" secureTextEntry value={password} onChangeText={setPassword} />
        <Input placeholder="Повторите пароль" secureTextEntry value={confirmation} onChangeText={setConfirmation} />
        <Button title="Сохранить" loading={loading} disabled={loading} onPress={submit} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { padding: 20 },
  title: { color: '#FAFAFA', fontWeight: '900', textAlign: 'center', marginBottom: 24 },
});
