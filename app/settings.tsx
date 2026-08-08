import { Text, Button, Icon, Input, useTheme } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../lib/supabase';
import { uploadFileToSupabase } from '../lib/uploader';
import { openLegalDocument } from '../lib/legal';
import { signOutSecurely } from '../lib/auth-actions';
import { removePublicStorageFiles } from '../lib/storage-cleanup';
import { useAuth } from '../providers/AuthProvider';

const SettingItem = ({ icon, title, onPress, color, theme }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.7}
    style={[styles.itemContainer, { backgroundColor: '#1E2329', borderColor: '#2B3139' }]}
  >
      <View style={[styles.iconBox, { backgroundColor: color ? color + '20' : '#2B3139' }]}>
          <Icon name={icon} type="feather" size={18} color={color || '#fff'} />
      </View>
      <Text style={[styles.itemText, { color: color || '#fff' }]}>{title}</Text>
      <Icon name="chevron-right" type="feather" color="#6B6675" size={20} />
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Данные формы
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(''); // <--- ДОБАВИЛИ ГОРОД

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const [{ data }, { data: privateRows }, { data: isAdmin }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.rpc('get_my_private_profile'),
      supabase.rpc('is_admin'),
    ]);
    if (data) {
      const phoneValue = privateRows?.[0]?.phone || '';
      setProfile({ ...data, phone: phoneValue, is_admin: Boolean(isAdmin) });
      setFullName(data.full_name || '');
      setPhone(phoneValue);
      setCity(data.city || ''); // <--- ПОДГРУЖАЕМ ГОРОД
    }
  }, [user]);

  useEffect(() => {
    if (user) void fetchProfile();
  }, [fetchProfile, user]);

  async function pickImage() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setLoading(true);
      try {
        const previousAvatarUrl = profile?.avatar_url as string | null | undefined;
        const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
        const publicUrl = await uploadFileToSupabase('avatars', result.assets[0].uri, fileName);
        const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        if (error) {
          await removePublicStorageFiles('avatars', [publicUrl]).catch(() => undefined);
          throw error;
        }
        setProfile({ ...profile, avatar_url: publicUrl });
        await removePublicStorageFiles('avatars', [previousAvatarUrl]).catch((cleanupError) => {
          console.warn('Old avatar cleanup failed:', cleanupError);
        });
      } catch (e: any) {
        Alert.alert("Ошибка", e.message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    // <--- СОХРАНЯЕМ ГОРОД В БАЗУ
    const [{ error }, { error: privateError }] = await Promise.all([
      supabase.from('profiles').update({ full_name: fullName, city }).eq('id', user.id),
      supabase.rpc('update_my_private_profile', { p_phone: phone }),
    ]);

    setLoading(false);
    if (error || privateError) Alert.alert("Ошибка", error?.message || privateError?.message);
    else Alert.alert("Успешно", "Данные профиля обновлены");
  }

  async function handleSignOut() {
    await signOutSecurely();
    router.replace('/(auth)/login');
  }

  const handleDeleteAccount = () => {
    Alert.alert("Удалить аккаунт?", "Это действие необратимо.", [
        { text: "Отмена", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('delete-account', { method: 'DELETE' });
              if (error) throw error;
              await signOutSecurely();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Не удалось удалить аккаунт', error instanceof Error ? error.message : 'Попробуйте позже');
            }
        }}
    ]);
  };

  if (authLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#F0B90B" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0} style={{flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top}}>
      <AppHeader title="Настройки" />
      
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        
        <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                <UserAvatar avatarUrl={profile?.avatar_url} size={110} />
                <View style={styles.editBadge}><Icon name="camera" type="feather" size={14} color="#fff" /></View>
            </TouchableOpacity>
            <Text h4 style={{ marginTop: 16, color: '#fff', fontWeight: '800' }}>{fullName || 'Без имени'}</Text>
            <Text style={{ color: '#A09BAF' }}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>ЛИЧНЫЕ ДАННЫЕ</Text>
            
            <Input 
                value={fullName} onChangeText={setFullName} placeholder="Ваше имя" 
                leftIcon={<Icon name="user" type="feather" size={18} color="#A09BAF" />} 
            />
            
            {/* ПОЛЕ ДЛЯ ГОРОДА */}
            <Input 
                value={city} onChangeText={setCity} placeholder="Ваш город (Астана, Алматы...)" 
                leftIcon={<Icon name="map-pin" type="feather" size={18} color="#A09BAF" />} 
            />

            <Input 
                value={phone} onChangeText={setPhone} placeholder="Телефон" keyboardType="phone-pad" 
                leftIcon={<Icon name="phone" type="feather" size={18} color="#A09BAF" />} 
            />
            
            <Button title="Сохранить" loading={loading} onPress={handleSave} buttonStyle={{ backgroundColor: '#F0B90B' }} titleStyle={{ color: '#000', fontWeight: 'bold' }} />
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>ПРИЛОЖЕНИЕ</Text>
            <SettingItem icon="info" title="О приложении" onPress={() => router.push('/credits')} theme={theme} />
            <SettingItem icon="file-text" title="Политика конфиденциальности" onPress={() => void openLegalDocument('privacy').catch((error) => Alert.alert('Документ недоступен', error.message))} theme={theme} />
            <SettingItem icon="book-open" title="Условия использования" onPress={() => void openLegalDocument('terms').catch((error) => Alert.alert('Документ недоступен', error.message))} theme={theme} />
            <SettingItem icon="life-buoy" title="Поддержка" onPress={() => void openLegalDocument('support').catch((error) => Alert.alert('Поддержка недоступна', error.message))} theme={theme} />
            {profile?.is_admin && <SettingItem icon="shield" title="Админ Панель" onPress={() => router.push('/(admin)/dashboard')} color="#F0B90B" theme={theme} />}
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
            <Text style={[styles.sectionTitle, { color: '#FF4757' }]}>ЗОНА ОПАСНОСТИ</Text>
            <SettingItem icon="log-out" title="Выйти" onPress={handleSignOut} theme={theme} />
            <SettingItem icon="trash-2" title="Удалить аккаунт" onPress={handleDeleteAccount} color="#FF4757" theme={theme} />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0E11' },
  container: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { position: 'relative' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, backgroundColor: '#F0B90B', borderWidth: 3, borderColor: '#0B0E11' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase', color: '#6B6675', letterSpacing: 1 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemText: { fontSize: 16, fontWeight: '600', flex: 1 },
});
