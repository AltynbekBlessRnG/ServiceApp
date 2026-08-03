import { Button, CheckBox, Icon, Input, Text, useTheme } from '@rneui/themed';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../lib/uploader';
import { useAuth } from '../../providers/AuthProvider';

const ALAKOL_ZONES = [
  { label: 'Акши', value: 'akshi' },
  { label: 'Коктума', value: 'koktuma' },
  { label: 'Ушарал', value: 'usharal' },
] as const;

export default function EditProfileScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [price, setPrice] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [subcategories, setSubcategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [worksInAlakol, setWorksInAlakol] = useState(false);
  const [alokolZone, setAlakolZone] = useState<'akshi' | 'koktuma' | 'usharal' | null>(null);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory]);

  const loadData = useCallback(async () => {
    try {
      const { data: catData } = await supabase.from('service_categories').select('id, name').eq('provider_type', 'specialist').order('sort_order');
      if (catData) setCategories(catData);
      if (!user) return;

      const { data: profile } = await supabase.from('specialist_profiles').select('*').eq('id', user.id).maybeSingle();
      if (profile) {
        setBio(profile.bio || '');
        setExperience(profile.experience_years?.toString() || '');
        setPrice(profile.price_start?.toString() || '');
        setWorksInAlakol(Boolean(profile.service_area));
        setAlakolZone(
          profile.service_area === 'akshi' || profile.service_area === 'koktuma' || profile.service_area === 'usharal'
            ? profile.service_area
            : null
        );
      }

      const { data: tags } = await supabase
        .from('provider_services')
        .select('service_id, services(category_id)')
        .eq('provider_id', user.id);
      if (tags?.length) {
        setSelectedTags(tags.map((tag) => tag.service_id));
        setSelectedCategory((tags[0].services as { category_id?: number } | null)?.category_id ?? null);
      }

      const { data: mainProfile } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
      if (mainProfile) {
        setAvatarUrl(mainProfile.avatar_url);
      }
    } catch {
      // load error
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void loadData();
  }, [authLoading, loadData, user]);

  async function fetchSubcategories(categoryId: number) {
    const { data } = await supabase.from('services').select('id, name').eq('category_id', categoryId).eq('is_active', true).order('sort_order');
    if (data) setSubcategories(data);
  }

  const toggleTag = (id: number) => {
    if (selectedTags.includes(id)) {
      setSelectedTags((prev) => prev.filter((tagId) => tagId !== id));
    } else {
      setSelectedTags((prev) => [...prev, id]);
    }
  };

  async function saveProfile() {
    if (!user) return;
    setLoading(true);
    try {
      const updates = {
        id: user.id,
        bio: bio.trim(),
        experience_years: parseInt(experience, 10) || 0,
        price_start: parseInt(price, 10) || 0,
        service_area: worksInAlakol ? alokolZone : null,
      };

      const { error } = await supabase.from('specialist_profiles').upsert(updates);
      if (error) throw error;

      await supabase.from('provider_services').delete().eq('provider_id', user.id);
      if (selectedTags.length > 0) {
        const tagRows = selectedTags.map((serviceId) => ({
          provider_id: user.id,
          service_id: serviceId,
          price_from: parseInt(price, 10) || 0,
        }));
        const { error: tagError } = await supabase.from('provider_services').insert(tagRows);
        if (tagError) throw tagError;
      }

      Alert.alert('Успех', 'Анкета мастера обновлена');
      router.back();
    } catch (error: any) {
      Alert.alert('Ошибка сохранения', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function pickAvatar() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const fileName = `${user.id}/avatar_${Date.now()}.jpg`;
        const publicUrl = await uploadFileToSupabase('avatars', result.assets[0].uri, fileName);
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        setAvatarUrl(publicUrl);
      } catch (error: any) {
        Alert.alert('Ошибка', error.message);
      } finally {
        setLoading(false);
      }
    }
  }

  if (authLoading || fetching) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" type="feather" color="#fff" />
          </TouchableOpacity>
          <Text h4 style={{ color: '#fff', fontWeight: '800' }}>Анкета мастера</Text>
          <View style={{ width: 40 }} />
        </View>

        <TouchableOpacity onPress={pickAvatar} style={styles.avatarSection}>
          <UserAvatar avatarUrl={avatarUrl} size={100} />
          <Text style={{ color: theme.colors.primary, marginTop: 10, fontWeight: '700' }}>Изменить фото</Text>
        </TouchableOpacity>

        <CheckBox
          title="Работаю на Алаколе в этом сезоне"
          checked={worksInAlakol}
          onPress={() => setWorksInAlakol((prev) => !prev)}
          containerStyle={styles.checkItem}
          textStyle={styles.checkText}
          checkedColor={theme.colors.secondary}
        />

        {worksInAlakol && (
          <>
            <Text style={styles.label}>ЗОНА АЛАКОЛЯ</Text>
            <View style={styles.zoneRow}>
              {ALAKOL_ZONES.map((item) => {
                const isActive = alokolZone === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setAlakolZone(item.value)}
                    style={[styles.chip, isActive ? { backgroundColor: theme.colors.secondary } : styles.inactiveChip]}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#000' : '#A09BAF' }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>ОСНОВНАЯ СФЕРА</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {categories.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => {
                    setSelectedCategory(category.id);
                    setSelectedTags([]);
                  }}
                  style={[styles.chip, isActive ? { backgroundColor: theme.colors.primary } : styles.inactiveChip]}
                >
                  <Text style={[styles.chipText, { color: isActive ? '#fff' : '#A09BAF' }]}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {subcategories.length > 0 && (
          <View style={{ marginBottom: 30 }}>
            <Text style={styles.label}>ВАШИ НАВЫКИ</Text>
            <View style={styles.tagsContainer}>
              {subcategories.map((subcategory) => {
                const isSelected = selectedTags.includes(subcategory.id);
                return (
                  <TouchableOpacity
                    key={subcategory.id}
                    onPress={() => toggleTag(subcategory.id)}
                    style={[
                      styles.tagChip,
                      isSelected ? { backgroundColor: 'rgba(240, 185, 11, 0.2)', borderColor: '#F0B90B' } : { borderColor: '#2B3139' },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#F0B90B' : '#A09BAF', fontWeight: '600', fontSize: 13 }}>{subcategory.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Input
          placeholder="Опишите ваш опыт, специализацию, формат работы..."
          multiline
          numberOfLines={5}
          value={bio}
          onChangeText={setBio}
          inputContainerStyle={[styles.textArea, { backgroundColor: '#1E2329', borderColor: '#2B3139' }]}
          inputStyle={{ textAlignVertical: 'top', color: '#fff', paddingTop: 10 }}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Input label="Опыт (лет)" placeholder="3" keyboardType="numeric" value={experience} onChangeText={setExperience} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Цена от (₸)" placeholder="5000" keyboardType="numeric" value={price} onChangeText={setPrice} />
          </View>
        </View>

        <Button title="Сохранить анкету" onPress={saveProfile} loading={loading} containerStyle={{ marginTop: 20, marginBottom: 50 }} buttonStyle={{ borderRadius: 16, height: 55, backgroundColor: theme.colors.primary }} titleStyle={{ fontWeight: '800' }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
  backBtn: { padding: 10, backgroundColor: '#1E2329', borderRadius: 12 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  label: { fontSize: 12, fontWeight: '800', marginLeft: 5, marginBottom: 12, textTransform: 'uppercase', color: '#6B6675', letterSpacing: 1 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, marginRight: 0 },
  inactiveChip: { backgroundColor: '#1E2329', borderWidth: 1, borderColor: '#2B3139' },
  chipText: { fontWeight: '700', fontSize: 13 },
  zoneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: '#1E2329' },
  textArea: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, height: 120 },
  row: { flexDirection: 'row' },
  checkItem: { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, margin: 0, marginBottom: 16 },
  checkText: { color: '#fff', fontWeight: '700' },
});
