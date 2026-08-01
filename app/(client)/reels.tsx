import { useIsFocused } from '@react-navigation/native';
import { Icon, Text } from '@rneui/themed';
import { ResizeMode, Video } from 'expo-av';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient'; // <--- НУЖЕН ЭТОТ ИМПОРТ
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserAvatar } from '../../components/UserAvatar';
import { supabase } from '../../lib/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReelsScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  
  const [videos, setVideos] = useState<any[]>([]);
  const [currentId, setCurrentId] = useState<any>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Расчет высоты (Экран минус меню снизу)
  const BOTTOM_TAB_HEIGHT = 60 + (Platform.OS === 'ios' ? insets.bottom : 0); // Чуть подправил для Android
  const ITEM_HEIGHT = SCREEN_HEIGHT - BOTTOM_TAB_HEIGHT;

  const fetchReels = useCallback(async () => {
      // Берем видео, у которых стоит галочка "В ленте"
      const { data } = await supabase
        .from('portfolio_items')
        .select('*, profiles!owner_id(full_name, avatar_url)')
        .eq('file_type', 'video')
        .eq('in_feed', true) 
        .order('created_at', { ascending: false });
        
      if (data && data.length > 0) {
          setVideos(data);
          setCurrentId((value: string | null) => value ?? data[0].id);
      } else {
          setVideos([]);
      }
  }, []);

  useFocusEffect(useCallback(() => {
      void fetchReels();
  }, [fetchReels]));

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
        const item = viewableItems[0].item;
        setCurrentId(item.id);
    }
  }).current;

  const toggleLike = (item: any) => {
    setLikedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
    });
  };

  const handleShare = async (item: any) => {
    const name = item.profiles?.full_name || 'Мастер';
    await Share.share({ message: `Посмотри видео от ${name} в Taptym!` });
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPlaying = item.id === currentId && isFocused;
    const isLiked = likedIds.has(item.id);

    return (
        <View style={{ width: SCREEN_WIDTH, height: ITEM_HEIGHT, backgroundColor: 'black' }}>
            <Video 
                source={{ uri: item.file_url }} 
                style={StyleSheet.absoluteFill} 
                resizeMode={ResizeMode.COVER} // Заполняет весь экран без полос
                isLooping 
                shouldPlay={isPlaying} 
                isMuted={false}
                posterSource={{ uri: item.thumbnail_url }} // Показываем картинку, пока видео грузится
                usePoster
            />

            {/* ПЛАВНЫЙ ГРАДИЕНТ СНИЗУ (Вместо резкой линии) */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradientOverlay}
            />

            {/* КОНТЕНТ ПОВЕРХ ВИДЕО */}
            <View style={styles.overlayContent}>
                
                {/* ЛЕВАЯ ЧАСТЬ: ИНФО */}
                <View style={{ flex: 1, paddingRight: 20 }}>
                    <TouchableOpacity 
                        style={styles.userInfo}
                        onPress={() => router.push(`/specialist-details/${item.owner_id}`)}
                    >
                        <UserAvatar avatarUrl={item.profiles?.avatar_url} size={45} />
                        <Text style={styles.userName}>@{item.profiles?.full_name}</Text>
                    </TouchableOpacity>

                    {/* Описание (если есть, или дефолтное) */}
                    <Text style={styles.description} numberOfLines={3}>
                        Смотрите мои работы в профиле! 🔥
                    </Text>
                </View>

                {/* ПРАВАЯ ЧАСТЬ: КНОПКИ */}
                <View style={styles.actionsColumn}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item)}>
                        <Icon name="heart" type="font-awesome" color={isLiked ? "#FF4757" : "white"} size={30} style={styles.shadow} />
                        <Text style={[styles.actionText, isLiked && { color: '#FF4757' }]}>Like</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => router.push(`/chat/${item.owner_id}`)}
                    >
                        <Icon name="message-circle" type="feather" color="white" size={32} style={styles.shadow} />
                        <Text style={styles.actionText}>Чат</Text>
                    </TouchableOpacity>
                    
                     <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
                        <Icon name="share-2" type="feather" color="white" size={30} style={styles.shadow} />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <FlatList 
        data={videos} 
        renderItem={renderItem} 
        keyExtractor={item => item.id.toString()} 
        pagingEnabled 
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false} 
        onViewableItemsChanged={onViewableItemsChanged} 
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }} 
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
        })}
        ListEmptyComponent={
            <View style={styles.empty}>
                <Icon name="film" type="feather" size={60} color="#333" />
                <Text style={{color: '#666', marginTop: 20}}>Нет видео в ленте</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gradientOverlay: {
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    height: 250, // Высота затемнения
  },
  overlayContent: { 
    position: 'absolute', 
    bottom: 20, 
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingBottom: 10
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userName: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10, textShadowColor: 'black', textShadowRadius: 3 },
  description: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20, textShadowColor: 'black', textShadowRadius: 2 },
  
  actionsColumn: { alignItems: 'center', gap: 20, marginLeft: 10 },
  actionBtn: { alignItems: 'center' },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '600', textShadowColor: 'black', textShadowRadius: 2 },
  shadow: { textShadowColor: 'black', textShadowRadius: 5 },
  empty: { flex: 1, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }
});
