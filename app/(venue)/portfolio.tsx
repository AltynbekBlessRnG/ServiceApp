import { Icon, Text, useTheme } from '@rneui/themed';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../lib/uploader';
import { useAuth } from '../../providers/AuthProvider';

const { width } = Dimensions.get('window');
const COLUMN_SIZE = (width - 40) / 3;

export default function VenuePortfolioScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchPortfolio = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('owner_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchPortfolio(); }, [fetchPortfolio]);

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
    });
    if (!result.canceled) uploadFile(result.assets[0]);
  }

  async function uploadFile(asset: any) {
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${user?.id}/${timestamp}.${ext}`;
      const publicUrl = await uploadFileToSupabase('portfolio', asset.uri, fileName);

      const { error } = await supabase.from('portfolio_items').insert({
          owner_id: user?.id,
          file_url: publicUrl,
          thumbnail_url: publicUrl,
          file_type: 'image',
          in_feed: false,
          is_pinned: false,
      });
      if (error) throw error;
      fetchPortfolio();
    } catch (e: any) {
        Alert.alert('Ошибка', e.message);
    } finally {
        setUploading(false);
    }
  }

  async function togglePin(item: any) {
      const newValue = !item.is_pinned;
      const updatedItem = { ...item, is_pinned: newValue };
      setSelectedItem(updatedItem);
      const tempItems = items.map(i => i.id === item.id ? updatedItem : i);
      tempItems.sort((a, b) => (Number(b.is_pinned) - Number(a.is_pinned)) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setItems(tempItems);
      await supabase.from('portfolio_items').update({ is_pinned: newValue }).eq('id', item.id);
  }

  async function makeHero(item: any) {
      const newItems = items.map(i => ({ ...i, is_hero: i.id === item.id }));
      setItems(newItems);
      setSelectedItem({ ...item, is_hero: true });
      await supabase.from('portfolio_items').update({ is_hero: false }).eq('owner_id', user?.id);
      await supabase.from('portfolio_items').update({ is_hero: true }).eq('id', item.id);
      Alert.alert("Обложка обновлена", "Это фото будет показано в карточке заведения.");
  }

  async function deleteItem(id: string) {
    Alert.alert("Удалить?", "Фото исчезнет навсегда.", [
        { text: "Отмена", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: async () => {
            await supabase.from('portfolio_items').delete().eq('id', id);
            setItems(prev => prev.filter(item => item.id !== id));
            setSelectedItem(null);
        }}
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader
        title="Галерея"
        rightComponent={
          <TouchableOpacity onPress={pickMedia} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#F0B90B" /> : <Icon name="plus-square" type="feather" color="#F0B90B" size={26} />}
          </TouchableOpacity>
        }
      />

      {loading ? <ActivityIndicator size="large" color="#F0B90B" style={{marginTop: 50}} /> : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({item}) => (
                <TouchableOpacity
                    style={[
                        styles.gridItem,
                        item.is_hero && { borderColor: '#FFA502', borderWidth: 2 },
                        item.is_pinned && { borderColor: '#F0B90B', borderWidth: 1 }
                    ]}
                    onPress={() => setSelectedItem(item)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={{ uri: item.thumbnail_url || item.file_url }}
                        style={styles.media}
                        contentFit="cover"
                    />
                    <View style={styles.badgesContainer}>
                        {item.is_pinned && <Icon name="paperclip" type="feather" color="#F0B90B" size={10} style={styles.miniIcon} />}
                        {item.is_hero && <Icon name="star" type="font-awesome" color="#FFA502" size={10} style={styles.miniIcon} />}
                    </View>
                </TouchableOpacity>
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Icon name="image" type="feather" size={50} color="#2D2638" />
                    <Text style={{color: '#6B6675', marginTop: 15, textAlign: 'center'}}>
                        Добавьте фото интерьера,{'\n'}меню и территории
                    </Text>
                </View>
            }
          />
      )}

      <Modal visible={!!selectedItem} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: '#1E2329' }]}>
                  <View style={styles.modalImageContainer}>
                      {selectedItem && (
                          <Image
                            source={{ uri: selectedItem.thumbnail_url || selectedItem.file_url }}
                            style={styles.modalImg}
                            contentFit="contain"
                          />
                      )}
                  </View>

                  <View style={styles.modalControls}>
                      <Text style={{ color: '#6B6675', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }}>НАСТРОЙКИ ФОТО</Text>

                      <TouchableOpacity style={styles.actionRow} onPress={() => makeHero(selectedItem)}>
                          <Icon name="star" type="feather" color={selectedItem?.is_hero ? "#FFA502" : "#fff"} size={22} />
                          <View style={{marginLeft: 15, flex: 1}}>
                              <Text style={{ color: selectedItem?.is_hero ? "#FFA502" : "#fff", fontWeight: 'bold', fontSize: 16 }}>
                                  {selectedItem?.is_hero ? "Главное фото" : "Сделать главным"}
                              </Text>
                              <Text style={{ color: '#6B6675', fontSize: 12 }}>Показывается в карточке заведения</Text>
                          </View>
                          {selectedItem?.is_hero && <Icon name="check" type="feather" color="#FFA502" size={18} />}
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionRow} onPress={() => togglePin(selectedItem)}>
                          <Icon name="paperclip" type="feather" color={selectedItem?.is_pinned ? "#F0B90B" : "#fff"} size={22} />
                          <View style={{marginLeft: 15, flex: 1}}>
                              <Text style={{ color: selectedItem?.is_pinned ? "#F0B90B" : "#fff", fontWeight: 'bold', fontSize: 16 }}>
                                  {selectedItem?.is_pinned ? "Открепить" : "Закрепить в начале"}
                              </Text>
                              <Text style={{ color: '#6B6675', fontSize: 12 }}>Будет первым в галерее</Text>
                          </View>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', marginTop: 20, gap: 10 }}>
                          <TouchableOpacity style={[styles.btn, { backgroundColor: 'rgba(255, 71, 87, 0.1)', flex: 1 }]} onPress={() => deleteItem(selectedItem?.id)}>
                              <Icon name="trash-2" type="feather" color="#FF4757" size={18} style={{marginRight: 5}} />
                              <Text style={{ color: '#FF4757', fontWeight: 'bold' }}>Удалить</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.btn, { backgroundColor: '#2B3139', flex: 1 }]} onPress={() => setSelectedItem(null)}>
                              <Text style={{ color: '#fff', fontWeight: '600' }}>Закрыть</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gridContainer: { paddingHorizontal: 20, paddingBottom: 50 },
  gridItem: { width: COLUMN_SIZE, height: COLUMN_SIZE * 1.3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#2B3139', marginBottom: 10 },
  media: { width: '100%', height: '100%' },
  badgesContainer: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', gap: 4 },
  miniIcon: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 3, borderRadius: 6 },
  empty: { alignItems: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, overflow: 'hidden' },
  modalImageContainer: { height: 250, width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  modalImg: { width: '100%', height: '100%' },
  modalControls: { padding: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12 },
});
