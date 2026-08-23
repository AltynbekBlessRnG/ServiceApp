import { Button, Input, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { getAuthErrorMessage, normalizeEmail } from '../../lib/auth-validation';
import { describeCaptchaRejection } from '../../lib/captcha';
import { useCaptcha } from '../../hooks/useCaptcha';
import { showToast } from '../../components/AppToast';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const captcha = useCaptcha('login', 'normal');

  async function signInWithEmail(captchaToken?: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
      options: { captchaToken },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Ошибка входа', describeCaptchaRejection(error.message) ?? getAuthErrorMessage(error.message));
      return;
    }
    router.replace('/');
  }

  async function beginSignIn() {
    if (loading) return;
    setLoading(true);
    const result = await captcha.requestToken();
    if (!result.ok) {
      setLoading(false);
      if (result.reason !== 'cancelled') {
        showToast({ type: 'error', title: 'Не удалось проверить защиту', message: result.message });
      }
      return;
    }
    await signInWithEmail(result.token);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View>
          <Text h2 style={[styles.title, { color: theme.colors.black }]}>
            Вход
          </Text>
          <Input
            testID="email-input"
            accessibilityLabel="Email"
            placeholder="email@address.com"
            label="Email"
            onChangeText={setEmail}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            inputStyle={{ color: theme.colors.black }}
          />
          <Input
            testID="password-input"
            accessibilityLabel="Пароль"
            placeholder="Пароль"
            label="Пароль"
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            autoCapitalize="none"
            inputStyle={{ color: theme.colors.black }}
          />
          <Button title="Войти" loading={loading} disabled={loading} onPress={() => void beginSignIn()} buttonStyle={styles.button} />
          <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Забыли пароль?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Нет аккаунта? Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {captcha.element}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 32 },
  title: { marginBottom: 30, textAlign: 'center' },
  button: { backgroundColor: '#F0B90B', borderRadius: 10, marginTop: 10, paddingVertical: 12 },
  linkContainer: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#F0B90B' },
});
