import { Button, CheckBox, Icon, Input, Text, useTheme } from '@rneui/themed';
import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { getAuthErrorMessage, normalizeEmail, validateRegistrationPassword } from '../../lib/auth-validation';
import { getCaptchaSiteKey } from '../../lib/captcha';

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
  const captchaRef = useRef<ConfirmHcaptcha>(null);
  const captchaSiteKey = getCaptchaSiteKey();

  async function signUpWithEmail(captchaToken?: string) {
    if (!fullName.trim()) {
      return Alert.alert('Ошибка', 'Введите ваше имя');
    }

    if (!city) {
      return Alert.alert('Ошибка', 'Пожалуйста, выберите ваш город');
    }
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return Alert.alert('Ошибка', 'Введите корректный email');
    }
    const passwordError = validateRegistrationPassword(password);
    if (passwordError) {
      return Alert.alert('Ненадёжный пароль', passwordError);
    }
    if (password !== passwordConfirmation) {
      return Alert.alert('Ошибка', 'Пароли не совпадают');
    }
    if (!acceptedLegal) {
      return Alert.alert('Нужно согласие', 'Примите условия использования и политику конфиденциальности');
    }

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
      Alert.alert('Ошибка', getAuthErrorMessage(error.message));
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
    if (captchaSiteKey) {
      captchaRef.current?.show();
      return;
    }
    void signUpWithEmail();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
            placeholder="Иван Иванов"
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
            secureTextEntry
            leftIcon={<Icon name="lock" type="feather" size={18} color={theme.colors.grey3} />}
          />

          <Input
            placeholder="Повторите пароль"
            label="Подтверждение пароля"
            onChangeText={setPasswordConfirmation}
            value={passwordConfirmation}
            secureTextEntry
            autoCapitalize="none"
            leftIcon={<Icon name="shield" type="feather" size={18} color={theme.colors.grey3} />}
          />

          <CheckBox
            checked={acceptedLegal}
            onPress={() => setAcceptedLegal((value) => !value)}
            title={
              <Text style={{ color: theme.colors.grey2, lineHeight: 20 }}>
                Я принимаю{' '}
                <Text style={{ color: theme.colors.primary }} onPress={() => void openLegalDocument('terms').catch((error) => Alert.alert('Документ недоступен', error.message))}>условия использования</Text>
                {' '}и{' '}
                <Text style={{ color: theme.colors.primary }} onPress={() => void openLegalDocument('privacy').catch((error) => Alert.alert('Документ недоступен', error.message))}>политику конфиденциальности</Text>
              </Text>
            }
            containerStyle={{ backgroundColor: 'transparent', borderWidth: 0, marginHorizontal: 0 }}
            checkedColor={theme.colors.primary}
          />

          <Button
            title="Зарегистрироваться"
            loading={loading}
            disabled={!acceptedLegal || loading}
            onPress={beginRegistration}
            buttonStyle={{ backgroundColor: theme.colors.primary, borderRadius: 16, height: 55, marginTop: 10 }}
            titleStyle={{ fontWeight: '800' }}
          />

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
          size="normal"
          baseUrl="https://hcaptcha.com"
          languageCode="ru"
          onMessage={(event) => {
            const result = event?.nativeEvent?.data;
            if (event.success && result) {
              captchaRef.current?.hide();
              void signUpWithEmail(result).finally(() => event.markUsed?.());
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
  scrollContent: { flexGrow: 1 },
  header: { paddingHorizontal: 20, paddingTop: 50 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  content: { padding: 25, flex: 1, justifyContent: 'center', paddingBottom: 32 },
  intro: { marginBottom: 30 },
  linkContainer: { marginTop: 25, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  closeBtn: { padding: 5, backgroundColor: '#f1f3f5', borderRadius: 12 },
  cityItem: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1 },
});
