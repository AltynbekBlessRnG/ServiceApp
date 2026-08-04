import { Button, Input, Text, useTheme } from '@rneui/themed';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
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
import { getCaptchaSiteKey } from '../../lib/captcha';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef<ConfirmHcaptcha>(null);
  const captchaSiteKey = getCaptchaSiteKey();

  async function signInWithEmail(captchaToken?: string) {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
      options: { captchaToken },
    });

    if (error) {
      Alert.alert('Ошибка входа', getAuthErrorMessage(error.message));
    } else {
      router.replace('/');
    }

    setLoading(false);
  }

  function beginSignIn() {
    if (captchaSiteKey) {
      captchaRef.current?.show();
      return;
    }
    void signInWithEmail();
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
          <Button title="Войти" loading={loading} disabled={loading} onPress={beginSignIn} buttonStyle={styles.button} />
          <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Забыли пароль?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Нет аккаунта? Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {captchaSiteKey ? (
        <ConfirmHcaptcha
          ref={captchaRef}
          siteKey={captchaSiteKey}
          size="normal"
          baseUrl="https://hcaptcha.com"
          languageCode="ru"
          onMessage={(event) => {
            const result = event?.nativeEvent?.data;
            if (event.success && result) {
              captchaRef.current?.hide();
              void signInWithEmail(result).finally(() => event.markUsed?.());
            } else if (result === 'challenge-closed') {
              captchaRef.current?.hide();
            }
          }}
        />
      ) : null}
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
