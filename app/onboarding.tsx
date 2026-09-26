import { Button, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingArt, OnboardingArtName } from '../components/OnboardingArt';

const { width } = Dimensions.get('window');

const SLIDES: { id: string; title: string; desc: string; art: OnboardingArtName; color: string }[] = [
  {
    id: '1',
    title: 'Находи мастеров',
    desc: 'Тысячи проверенных специалистов и заведений в твоем городе. Читай отзывы и выбирай лучших.',
    art: 'find',
    color: '#E0F2FE'
  },
  {
    id: '2',
    title: 'Онлайн запись',
    desc: 'Забудь про звонки. Выбирай удобное время в календаре и бронируй за секунду.',
    art: 'booking',
    color: '#F3E8FF'
  },
  {
    id: '3',
    title: 'Управляй временем',
    desc: 'История записей, уведомления и чат с мастером — всё в одном приложении.',
    art: 'time',
    color: '#DCFCE7'
  }
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip}>
              <Text style={{ color: theme.colors.grey2, fontWeight: '600' }}>Пропустить</Text>
          </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: 'center', padding: 20 }}>
            <View style={[styles.imageContainer, { backgroundColor: item.color }]}>
                <OnboardingArt name={item.art} size={width * 0.5} />
            </View>
            <View style={{ marginTop: 50, alignItems: 'center' }}>
                <Text h2 style={{ color: theme.colors.black, textAlign: 'center', fontWeight: '900' }}>
                    {item.title}
                </Text>
                <Text style={{ color: theme.colors.grey2, textAlign: 'center', marginTop: 15, fontSize: 16, lineHeight: 24, paddingHorizontal: 20 }}>
                    {item.desc}
                </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
          {/* Индикаторы (Точки) */}
          <View style={styles.dotsRow}>
              {SLIDES.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                        styles.dot, 
                        { 
                            backgroundColor: currentIndex === index ? theme.colors.primary : theme.colors.grey1,
                            width: currentIndex === index ? 20 : 10
                        }
                    ]} 
                  />
              ))}
          </View>

          <Button 
            title={currentIndex === SLIDES.length - 1 ? "Начать" : "Далее"} 
            onPress={handleNext}
            buttonStyle={{ backgroundColor: theme.colors.primary, borderRadius: 16, height: 55, width: '100%' }}
            containerStyle={{ width: '100%' }}
            titleStyle={{ fontWeight: '800' }}
          />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 10 },
  imageContainer: { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  footer: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 30 },
  dot: { height: 10, borderRadius: 5 }
});
