import { Icon, Switch, Text, useTheme } from '@rneui/themed';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
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

export default function MyPortfolioScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'feed'>('all');

  const fetchPortfolio = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('owner_id', user.id)
        // СОРТИРОВКА: Сначала закрепленные, потом новые
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
    
    if (data) setItems(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchPortfolio(); }, [fetchPortfolio]);

  async function pickMedia() {
    const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.All, // Фото и Видео
        allowsEditing: true, 
        quality: 0.5, 
        videoMaxDuration: 60, 
    });
    if (!result.canceled) uploadFile(result.assets[0]);
  }

  async function uploadFile(asset: any) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const isVideo = asset.type === 'video' || ['mp4', 'mov'].includes(ext);
      const fileType = isVideo ? 'video' : 'image';
      const timestamp = Date.now();
      
      const fileName = `${user.id}/${timestamp}.${ext}`;
      
      // 1. Грузим основной файл
      const publicUrl = await uploadFileToSupabase('portfolio', asset.uri, fileName);
      let thumbUrl = publicUrl; 

      // 2. Если видео — делаем превью (thumbnail)
      if (isVideo) {
          try {
              const { uri } = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 1000 });
              const thumbName = `${user.id}/${timestamp}_thumb.jpg`;
              thumbUrl = await uploadFileToSupabase('portfolio', uri, thumbName);
          } catch { /* thumbnail failed */ }
      }
      
      // 3. Пишем в базу
      const { error } = await supabase.from('portfolio_items').insert({
          owner_id: user.id,
          file_url: publicUrl, 
          thumbnail_url: thumbUrl,
          file_type: fileType,
          in_feed: false, // По дефолту не в ленте
          is_pinned: false
      });
      
      if (error) throw error;
      fetchPortfolio();
    } catch (e: any) { 
        Alert.alert('Ошибка', e.message); 
    } finally { 
        setUploading(false); 
    }
  }

  // --- ЛОГИКА УПРАВЛЕНИЯ ---

  // 1. Сделать обложкой (Только одна может быть true)
  async function makeHero(item: any) {
      if (!user) return;
      // Оптимистичное обновление: убираем у всех, ставим этому
      const newItems = items.map(i => ({ ...i, is_hero: i.id === item.id }));
      setItems(newItems);
      setSelectedItem({ ...item, is_hero: true });

      // В базе: сначала сбрасываем всем is_hero
      await supabase.from('portfolio_items').update({ is_hero: false }).eq('owner_id', user.id);
      // Ставим этому
      await supabase.from('portfolio_items').update({ is_hero: true }).eq('id', item.id);
      
      Alert.alert("Обложка обновлена", "Теперь клиенты увидят это фото в шапке профиля.");
  }

  // 2. Закрепить/Открепить
  async function togglePin(item: any) {
      const newValue = !item.is_pinned;
      // Локально обновляем и пересортировываем
      const updatedItem = { ...item, is_pinned: newValue };
      setSelectedItem(updatedItem);
      
      // Чтобы список перестроился сразу, нам нужно обновить элемент и снова отсортировать
      const tempItems = items.map(i => i.id === item.id ? updatedItem : i);
      tempItems.sort((a, b) => (Number(b.is_pinned) - Number(a.is_pinned)) || (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setItems(tempItems);

      await supabase.from('portfolio_items').update({ is_pinned: newValue }).eq('id', item.id);
  }

  // 3. В ленту/Из ленты
  async function toggleInFeed(item: any) {
      const newValue = !item.in_feed;
      const updatedItem = { ...item, in_feed: newValue };
      setSelectedItem(updatedItem);
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      await supabase.from('portfolio_items').update({ in_feed: newValue }).eq('id', item.id);
  }

  async function deleteItem(id: string) {
    Alert.alert("Удалить?", "Файл исчезнет навсегда.", [
        { text: "Отмена", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: async () => {
            await supabase.from('portfolio_items').delete().eq('id', id);
            setItems(prev => prev.filter(item => item.id !== id));
            setSelectedItem(null);
        }}
    ]);
  }

  const displayedItems = filter === 'all' ? items : items.filter(i => i.in_feed);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader 
        title="Портфолио" 
        rightComponent={
          <TouchableOpacity onPress={pickMedia} disabled={uploading}>
            {uploading ? <ActivityIndicator color="#F0B90B" /> : <Icon name="plus-square" type="feather" color="#F0B90B" size={26} />}
          </TouchableOpacity>
        } 
      />

      {/* ТАБЫ: Все / В ленте */}
      <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tab, filter === 'all' && styles.activeTab]} onPress={() => setFilter('all')}>
              <Text style={[styles.tabText, filter === 'all' && styles.activeTabText]}>Все ({items.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, filter === 'feed' && styles.activeTab]} onPress={() => setFilter('feed')}>
              <Icon name="play-circle" type="feather" size={14} color={filter === 'feed' ? '#000' : '#A09BAF'} style={{marginRight: 6}} />
              <Text style={[styles.tabText, filter === 'feed' && styles.activeTabText]}>В ленте ({items.filter(i => i.in_feed).length})</Text>
          </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#F0B90B" style={{marginTop: 50}} /> : (
          <FlatList 
            data={displayedItems} 
            keyExtractor={item => item.id} 
            numColumns={3} 
            contentContainerStyle={styles.gridContainer}
            columnWrapperStyle={{ gap: 10 }}
            renderItem={({item}) => (
                <TouchableOpacity 
                    style={[
                        styles.gridItem, 
                        item.is_hero && { borderColor: '#FFA502', borderWidth: 2 }, // Золотая рамка для обложки
                        item.is_pinned && { borderColor: '#F0B90B', borderWidth: 1 } // Золотая для закрепленных
                    ]} 
                    onPress={() => setSelectedItem(item)}
                    activeOpacity={0.8}
                >
                    <Image 
                        source={{ uri: item.thumbnail_url || item.file_url }} 
                        style={styles.media} 
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    
                    {/* ЗНАЧКИ СТАТУСА */}
                    <View style={styles.badgesContainer}>
                        {item.file_type === 'video' && <Icon name="play" type="feather" color="#fff" size={10} style={styles.miniIcon} />}
                        {item.in_feed && <Icon name="zap" type="feather" color="#00D2D3" size={10} style={styles.miniIcon} />}
                        {item.is_pinned && <Icon name="paperclip" type="feather" color="#F0B90B" size={10} style={styles.miniIcon} />}
                        {item.is_hero && <Icon name="star" type="font-awesome" color="#FFA502" size={10} style={styles.miniIcon} />}
                    </View>
                </TouchableOpacity>
            )} 
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Icon name="image" type="feather" size={50} color="#2B3139" />
                    <Text style={{color: '#6B6675', marginTop: 15}}>Здесь пока пусто</Text>
                </View>
            }
          />
      )}

      {/* МОДАЛКА УПРАВЛЕНИЯ */}
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
                      <Text style={{ color: '#6B6675', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }}>НАСТРОЙКИ ФАЙЛА</Text>

                      {/* 1. Сделать обложкой */}
                      <TouchableOpacity style={styles.actionRow} onPress={() => makeHero(selectedItem)}>
                          <Icon name="star" type="feather" color={selectedItem?.is_hero ? "#FFA502" : "#fff"} size={22} />
                          <View style={{marginLeft: 15, flex: 1}}>
                              <Text style={{ color: selectedItem?.is_hero ? "#FFA502" : "#fff", fontWeight: 'bold', fontSize: 16 }}>
                                  {selectedItem?.is_hero ? "Это текущая обложка" : "Сделать обложкой профиля"}
                              </Text>
                              <Text style={{ color: '#6B6675', fontSize: 12 }}>Будет отображаться в шапке профиля</Text>
                          </View>
                          {selectedItem?.is_hero && <Icon name="check" type="feather" color="#FFA502" size={18} />}
                      </TouchableOpacity>

                      {/* 2. Закрепить */}
                      <TouchableOpacity style={styles.actionRow} onPress={() => togglePin(selectedItem)}>
                          <Icon name="paperclip" type="feather" color={selectedItem?.is_pinned ? "#F0B90B" : "#fff"} size={22} />
                          <View style={{marginLeft: 15, flex: 1}}>
                              <Text style={{ color: selectedItem?.is_pinned ? "#F0B90B" : "#fff", fontWeight: 'bold', fontSize: 16 }}>
                                  {selectedItem?.is_pinned ? "Открепить" : "Закрепить в начале"}
                              </Text>
                              <Text style={{ color: '#6B6675', fontSize: 12 }}>Файл будет первым в списке</Text>
                          </View>
                          <Switch 
                            value={selectedItem?.is_pinned} 
                            onValueChange={() => togglePin(selectedItem)}
                            trackColor={{ false: '#2B3139', true: '#F0B90B' }}
                            thumbColor="#fff"
                          />
                      </TouchableOpacity>

                      {/* 3. Опубликовать в Reels */}
                      <View style={styles.actionRow}>
                          <Icon name="play-circle" type="feather" color={selectedItem?.in_feed ? "#00D2D3" : "#fff"} size={22} />
                          <View style={{marginLeft: 15, flex: 1}}>
                              <Text style={{ color: selectedItem?.in_feed ? "#00D2D3" : "#fff", fontWeight: 'bold', fontSize: 16 }}>
                                  Опубликовать в Ленту
                              </Text>
                              <Text style={{ color: '#6B6675', fontSize: 12 }}>Видно в общем поиске видео</Text>
                          </View>
                          <Switch 
                            value={selectedItem?.in_feed} 
                            onValueChange={() => toggleInFeed(selectedItem)}
                            trackColor={{ false: '#2B3139', true: '#00D2D3' }}
                            thumbColor="#fff"
                          />
                      </View>

                      {/* Удалить / Закрыть */}
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
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#1E2329', borderWidth: 1, borderColor: '#2B3139' },
  activeTab: { backgroundColor: '#F0B90B', borderColor: '#F0B90B' },
  tabText: { color: '#A09BAF', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#000' },
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
