import { Button, Icon, Input, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { showToast } from '../../components/AppToast';
import { supabase } from '../../lib/supabase';
import { EMAIL_OTP_LENGTH, getAuthErrorMessage } from '../../lib/auth-validation';
import { describeCaptchaRejection } from '../../lib/captcha';
import { useCaptcha } from '../../hooks/useCaptcha';

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const normalizedEmail = Array.isArray(email) ? email[0] : email;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const captcha = useCaptcha('resend');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resend = async (captchaToken?: string) => {
    if (!normalizedEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: { captchaToken },
    });
    setLoading(false);
    if (error) {
      showToast({
        type: 'error',
        title: 'Не удалось отправить код',
        message: describeCaptchaRejection(error.message) ?? getAuthErrorMessage(error.message),
        duration: 6000,
      });
      return;
    }
    setCooldown(60);
    showToast({ type: 'success', title: 'Новый код отправлен', message: 'Проверьте входящие и папку «Спам».' });
  };

  const beginResend = async () => {
    if (loading) return;
    setLoading(true);
    const result = await captcha.requestToken();
    setLoading(false);
    if (!result.ok) {
      if (result.reason !== 'cancelled') {
        showToast({ type: 'error', title: 'Не удалось проверить защиту', message: result.message });
      }
      return;
    }
    await resend(result.token);
  };

  const verify = async () => {
    if (!normalizedEmail || code.length !== EMAIL_OTP_LENGTH) {
      showToast({
        type: 'warning',
        title: 'Введите код',
        message: `Код подтверждения состоит из ${EMAIL_OTP_LENGTH} цифр.`,
      });
      return;
    }
    Keyboard.dismiss();
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: 'signup',
    });
    setVerifying(false);
    if (error) {
      showToast({ type: 'error', title: 'Код не принят', message: getAuthErrorMessage(error.message) });
      return;
    }
    router.replace('/(auth)/role-select');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Icon name="mail" type="feather" size={64} color="#F0B90B" />
      <Text h3 style={styles.title}>Подтвердите email</Text>
      <Text style={styles.description}>
        Введите {EMAIL_OTP_LENGTH}-значный код, отправленный на {normalizedEmail || 'вашу почту'}.
      </Text>
      <Input
        accessibilityLabel="Код подтверждения email"
        autoFocus
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={EMAIL_OTP_LENGTH}
        placeholder="000000"
        containerStyle={styles.codeContainer}
        inputContainerStyle={styles.codeInputContainer}
        inputStyle={styles.codeInput}
      />
      <Button
        title="Подтвердить email"
        loading={verifying}
        disabled={!normalizedEmail || code.length !== EMAIL_OTP_LENGTH || verifying}
        onPress={verify}
        buttonStyle={styles.verifyButton}
        titleStyle={styles.verifyButtonTitle}
        containerStyle={styles.verifyButtonContainer}
      />
      <Button
        title={cooldown > 0 ? `Отправить повторно через ${cooldown} сек.` : 'Отправить повторно'}
        type="outline"
        loading={loading}
        disabled={!normalizedEmail || loading || cooldown > 0}
        onPress={() => void beginResend()}
      />
      <Button title="Перейти ко входу" type="clear" onPress={() => router.replace('/(auth)/login')} containerStyle={{ marginTop: 12 }} />
      {captcha.element}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { color: '#FAFAFA', fontWeight: '900', marginTop: 20 },
  description: { color: '#848E9C', textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 20 },
  codeContainer: { width: 240, paddingHorizontal: 0 },
  codeInputContainer: { height: 64 },
  codeInput: { textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 10 },
  verifyButton: { backgroundColor: '#F0B90B', height: 54, borderRadius: 14 },
  verifyButtonTitle: { color: '#0B0E11', fontWeight: '800' },
  verifyButtonContainer: { width: 240, marginBottom: 16 },
});
