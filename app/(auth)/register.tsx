import { CheckBox, Icon, Input, Text, useTheme } from '@rneui/themed';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { openLegalDocument } from '../../lib/legal';
import { getAuthErrorMessage, getRegistrationValidationError, normalizeEmail } from '../../lib/auth-validation';
import { getCaptchaSiteKey } from '../../lib/captcha';
import { showToast } from '../../components/AppToast';

const KZ_CITIES = [
  'Алматы',
  'Астана',
  'Шымкент',
  'Караганда',
  'Актобе',
  'Тараз',
  'Павлодар',
  'Усть-Каменогорск',
  'Семей',
  'Атырау',
  'Костанай',
  'Кызылорда',
  'Уральск',
  'Петропавловск',
  'Актау',
  'Темиртау',
  'Туркестан',
  'Кокшетау',
  'Талдыкорган',
  'Экибастуз',
  'Рудный',
].sort();

export default function RegisterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const captchaRef = useRef<ConfirmHcaptcha>(null);
  const captchaSubmittingRef = useRef(false);
  const captchaSiteKey = getCaptchaSiteKey();

  async function signUpWithEmail(captchaToken?: string) {
    const normalizedEmail = normalizeEmail(email);

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: Linking.createURL('auth/callback'),
        captchaToken,
        data: {
          full_name: fullName.trim(),
          city,
        },
      },
    });

    if (error) {
      console.warn('Supabase sign-up failed', {
        code: error.code,
        message: error.message,
        status: error.status,
      });
      showToast({ type: 'error', title: 'Регистрация не завершена', message: getAuthErrorMessage(error.message), duration: 5000 });
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace('/(auth)/role-select');
      return;
    }
    setLoading(false);
    router.replace({ pathname: '/verify-email', params: { email: normalizedEmail } });
  }

  function beginRegistration() {
    const validationError = getRegistrationValidationError({
      fullName,
      city,
      email,
      password,
      passwordConfirmation,
      acceptedLegal,
    });
    if (validationError) {
      showToast({ type: 'warning', ...validationError, duration: 4500 });
      return;
    }
    Keyboard.dismiss();
    if (captchaSiteKey) {
      captchaRef.current?.show();
      return;
    }
    void signUpWithEmail();
  }

  function revealLowerForm() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 180);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" type="feather" color={theme.colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.intro}>
            <Text h2 style={{ color: theme.colors.black, fontWeight: '900' }}>
              Создать аккаунт
            </Text>
            <Text style={{ color: theme.colors.grey2, marginTop: 5 }}>
              Заполните данные для регистрации
            </Text>
          </View>

          <Input
            placeholder="Ваше имя / название"
            label="ФИО / Название"
            onChangeText={setFullName}
            value={fullName}
            leftIcon={<Icon name="user" type="feather" size={18} color={theme.colors.grey3} />}
          />

          <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <View pointerEvents="none">
              <Input
                placeholder="Выберите город"
                label="Город"
                value={city}
                leftIcon={<Icon name="map-pin" type="feather" size={18} color={theme.colors.grey3} />}
                rightIcon={<Icon name="chevron-down" type="feather" color={theme.colors.grey3} />}
              />
            </View>
          </TouchableOpacity>

          <Input
            placeholder="email@address.com"
            label="Email"
            onChangeText={setEmail}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Icon name="mail" type="feather" size={18} color={theme.colors.grey3} />}
          />

          <Input
            placeholder="Пароль"
            label="Пароль"
            onChangeText={setPassword}
            value={password}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={revealLowerForm}
            leftIcon={<Icon name="lock" type="feather" size={18} color={theme.colors.grey3} />}
            rightIcon={
              <TouchableOpacity onPress={() => setPasswordVisible((value) => !value)} hitSlop={10}>
                <Icon name={passwordVisible ? 'eye-off' : 'eye'} type="feather" size={20} color={theme.colors.grey2} />
              </TouchableOpacity>
            }
          />

          <Input
            placeholder="Повторите пароль"
            label="Подтверждение пароля"
            onChangeText={setPasswordConfirmation}
            value={passwordConfirmation}
            secureTextEntry={!confirmationVisible}
            onFocus={revealLowerForm}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Icon name="shield" type="feather" size={18} color={theme.colors.grey3} />}
            rightIcon={
              <TouchableOpacity onPress={() => setConfirmationVisible((value) => !value)} hitSlop={10}>
                <Icon name={confirmationVisible ? 'eye-off' : 'eye'} type="feather" size={20} color={theme.colors.grey2} />
              </TouchableOpacity>
            }
          />

          <CheckBox
            checked={acceptedLegal}
            onPress={() => setAcceptedLegal((value) => !value)}
            title={
              <Text style={{ color: theme.colors.grey2, lineHeight: 20 }}>
                Я принимаю{' '}
                <Text style={{ color: theme.colors.primary }} onPress={() => void openLegalDocument('terms').catch((error) => showToast({ type: 'error', title: 'Документ недоступен', message: error.message }))}>условия использования</Text>
                {' '}и{' '}
                <Text style={{ color: theme.colors.primary }} onPress={() => void openLegalDocument('privacy').catch((error) => showToast({ type: 'error', title: 'Документ недоступен', message: error.message }))}>политику конфиденциальности</Text>
              </Text>
            }
            containerStyle={{ backgroundColor: 'transparent', borderWidth: 0, marginHorizontal: 0 }}
            checkedColor={theme.colors.primary}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !acceptedLegal || loading }}
            activeOpacity={0.82}
            disabled={!acceptedLegal || loading}
            onPress={beginRegistration}
            style={[styles.registerButton, !acceptedLegal || loading ? styles.registerButtonDisabled : styles.registerButtonActive]}
          >
            {loading ? (
              <ActivityIndicator color="#0B0E11" />
            ) : (
              <Text style={[styles.registerButtonText, !acceptedLegal && styles.registerButtonTextDisabled]}>
                Зарегистрироваться
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.linkContainer}>
            <Text style={{ color: theme.colors.grey2 }}>
              Уже есть аккаунт? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Войти</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text h4 style={{ color: theme.colors.black, fontWeight: 'bold' }}>
                Выберите город
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Icon name="x" type="feather" color={theme.colors.grey2} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={KZ_CITIES}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCity(item);
                    setModalVisible(false);
                  }}
                >
                  <View style={[styles.cityItem, { borderBottomColor: theme.colors.grey1 }]}>
                    <Text
                      style={{
                        color: item === city ? theme.colors.primary : theme.colors.black,
                        fontSize: 16,
                        fontWeight: item === city ? '700' : '400',
                      }}
                    >
                      {item}
                    </Text>
                    {city === item && <Icon name="check" type="feather" color={theme.colors.primary} size={20} />}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {captchaSiteKey ? (
        <ConfirmHcaptcha
          ref={captchaRef}
          siteKey={captchaSiteKey}
          size="invisible"
          baseUrl="https://hcaptcha.com"
          languageCode="ru"
          onMessage={(event) => {
            const result = event?.nativeEvent?.data;
            if (event.success && result) {
              if (captchaSubmittingRef.current) return;
              captchaSubmittingRef.current = true;
              captchaRef.current?.hide();
              void signUpWithEmail(result).finally(() => {
                event.markUsed?.();
                captchaSubmittingRef.current = false;
              });
            } else if (result === 'challenge-closed') {
              captchaRef.current?.hide();
            } else if (result && !['open', 'loading'].includes(result)) {
              showToast({ type: 'error', title: 'Не удалось проверить защиту', message: 'Попробуйте пройти проверку ещё раз.' });
            }
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { paddingHorizontal: 20, paddingTop: 50 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  content: { padding: 25, flex: 1, justifyContent: 'center', paddingBottom: 32 },
  intro: { marginBottom: 30 },
  linkContainer: { marginTop: 25, alignItems: 'center' },
  registerButton: { height: 56, marginTop: 10, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  registerButtonActive: { backgroundColor: '#F0B90B' },
  registerButtonDisabled: { backgroundColor: '#34302A' },
  registerButtonText: { color: '#0B0E11', fontSize: 16, fontWeight: '800' },
  registerButtonTextDisabled: { color: '#77716A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  closeBtn: { padding: 5, backgroundColor: '#f1f3f5', borderRadius: 12 },
  cityItem: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1 },
});
