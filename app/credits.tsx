import { Icon, Text, useTheme } from '@rneui/themed';
import React from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';

export default function CreditsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const openLink = (url: string) => {
    Linking.openURL(url).catch((error) => console.error("Couldn't load page", error));
  };

  const FeatureItem = ({ icon, title, desc, color }: any) => (
    <View style={[styles.featureItem, { backgroundColor: theme.colors.grey0 }]}>
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} type="feather" color={color} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: theme.colors.black }]}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <AppHeader title="О приложении" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <View style={[styles.logoBox, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}>
            <Icon name="sparkles" type="feather" color="#fff" size={40} />
          </View>

          <Text h3 style={{ color: theme.colors.black, marginTop: 20, fontWeight: '900', letterSpacing: 1 }}>
            Taptym
          </Text>

          <Text style={styles.version}>Версия 1.0.0 (Alpha)</Text>
          <Text style={styles.slogan}>Сервис поиска и записи к специалистам</Text>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.colors.grey2 }]}>ВОЗМОЖНОСТИ</Text>

        <FeatureItem
          icon="cpu"
          title="AI-поиск"
          desc="Помогает найти услугу по свободному запросу, а при недоступности ИИ работает обычный поиск."
          color="#8A2BE2"
        />
        <FeatureItem
          icon="calendar"
          title="Онлайн-запись"
          desc="Клиент видит доступное время и оставляет заявку без звонков и переписки вне приложения."
          color="#00FFCC"
        />
        <FeatureItem
          icon="message-circle"
          title="Чаты"
          desc="Личные и категорийные чаты для связи между клиентами и специалистами."
          color="#FFD700"
        />

        <Text style={[styles.sectionHeader, { color: theme.colors.grey2, marginTop: 20 }]}>СТЕК</Text>
        <View style={styles.techContainer}>
          {['React Native', 'Expo', 'Supabase', 'TypeScript', 'Gemini AI'].map((tech, index) => (
            <View key={index} style={[styles.chip, { backgroundColor: theme.colors.grey1, borderColor: theme.colors.grey3 }]}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{tech}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={[styles.devCard, { borderColor: theme.colors.primary }]}>
          <Text style={styles.devLabel}>FOUNDER</Text>
          <Text h4 style={{ color: theme.colors.black, fontWeight: '900', marginBottom: 5 }}>
            Шалгимбаев Ернар Донесбайулы
          </Text>
          <Text style={{ color: theme.colors.primary, fontWeight: '700', marginBottom: 15 }}>
            Основатель
          </Text>
          <Text style={{ color: theme.colors.grey2, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
            Идея и создание Taptym
          </Text>
        </View>

        <View style={[styles.devCard, { borderColor: theme.colors.secondary, marginTop: 15 }]}>
          <Text style={styles.devLabel}>CREATED BY</Text>
          <Text h4 style={{ color: theme.colors.black, fontWeight: '900', marginBottom: 5 }}>
            Altynbek Temirkhan
          </Text>
          <Text style={{ color: theme.colors.secondary, fontWeight: '700', marginBottom: 15 }}>
            Full Stack Engineer
          </Text>
          <Text style={{ color: theme.colors.grey2, textAlign: 'center', lineHeight: 20, fontSize: 13 }}>
            Разработка и дизайн
          </Text>

          <View style={styles.socialRow}>
            <TouchableOpacity onPress={() => openLink('https://github.com')} style={styles.socialBtn}>
              <Icon name="github" type="feather" color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openLink('https://linkedin.com')} style={styles.socialBtn}>
              <Icon name="linkedin" type="feather" color="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerText}>© 2026 Taptym</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 25 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    transform: [{ rotate: '-5deg' }],
  },
  version: { color: 'gray', marginTop: 5, fontWeight: '600', fontSize: 12 },
  slogan: { color: '#00FFCC', marginTop: 10, fontWeight: '600', fontSize: 14, letterSpacing: 0.5 },
  sectionHeader: { fontSize: 12, fontWeight: '800', marginBottom: 15, letterSpacing: 1 },
  featureItem: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  featureTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  featureDesc: { color: 'gray', fontSize: 13, lineHeight: 18 },
  techContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  divider: { height: 1, backgroundColor: '#2D2638', marginVertical: 40 },
  devCard: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(138, 43, 226, 0.05)',
  },
  devLabel: { fontSize: 10, fontWeight: '900', color: 'gray', marginBottom: 10, letterSpacing: 2 },
  socialRow: { flexDirection: 'row', marginTop: 20, gap: 15 },
  socialBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1625',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2638',
  },
  footerText: { textAlign: 'center', color: '#333', marginTop: 30, fontSize: 12 },
});
