import { Text, Button, Icon, Input, useTheme } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { UserAvatar } from '../components/UserAvatar';
import { supabase } from '../lib/supabase';
import { uploadFileToSupabase } from '../lib/uploader';
import { useAuth } from '../providers/AuthProvider';

const SettingItem = ({ icon, title, onPress, color, theme }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.7}
    style={[styles.itemContainer, { backgroundColor: '#1A1625', borderColor: '#2D2638' }]}
  >
      <View style={[styles.iconBox, { backgroundColor: color ? color + '20' : '#2D2638' }]}>
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

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
      setCity(data.city || ''); // <--- ПОДГРУЖАЕМ ГОРОД
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setLoading(true);
      try {
        const fileName = `${user?.id}/avatar_${Date.now()}.jpg`;
        const publicUrl = await uploadFileToSupabase('avatars', result.assets[0].uri, fileName);
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user?.id);
        setProfile({ ...profile, avatar_url: publicUrl });
      } catch (e: any) {
        Alert.alert("Ошибка", e.message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSave() {
    setLoading(true);
    // <--- СОХРАНЯЕМ ГОРОД В БАЗУ
    const { error } = await supabase.from('profiles').update({ 
        full_name: fullName, 
        phone: phone,
        city: city 
    }).eq('id', user?.id);

    setLoading(false);
    if (error) Alert.alert("Ошибка", error.message);
    else Alert.alert("Успешно", "Данные профиля обновлены");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  const handleDeleteAccount = () => {
    Alert.alert("Удалить аккаунт?", "Это действие необратимо.", [
        { text: "Отмена", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: async () => {
            await supabase.rpc('delete_own_account');
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
        }}
    ]);
  };

  if (authLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#8A2BE2" /></View>;

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
            
            <Button title="Сохранить" loading={loading} onPress={handleSave} buttonStyle={{ backgroundColor: '#00FFCC' }} titleStyle={{ color: '#000', fontWeight: 'bold' }} />
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>ПРИЛОЖЕНИЕ</Text>
            <SettingItem icon="info" title="О приложении" onPress={() => router.push('/credits')} theme={theme} />
            {profile?.is_admin && <SettingItem icon="shield" title="Админ Панель" onPress={() => router.push('/(admin)/dashboard')} color="#8A2BE2" theme={theme} />}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0C15' },
  container: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { position: 'relative' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, backgroundColor: '#8A2BE2', borderWidth: 3, borderColor: '#0F0C15' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '800', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase', color: '#6B6675', letterSpacing: 1 },
  itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  itemText: { fontSize: 16, fontWeight: '600', flex: 1 },
});
