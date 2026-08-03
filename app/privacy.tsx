import { Icon, Text, useTheme } from '@rneui/themed';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" type="feather" color="#FAFAFA" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Политика конфиденциальности</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.date}>Последнее обновление: 3 августа 2026 г.</Text>

        <Text style={styles.heading}>1. Сбор информации</Text>
        <Text style={styles.text}>
          При регистрации в Taptym мы собираем: имя, номер телефона, электронную почту.{"\n\n"}
          При использовании приложения мы можем собирать: геолокацию (с вашего разрешения), данные о бронированиях, сообщения в чатах, отзывы и рейтинги.
        </Text>

        <Text style={styles.heading}>2. Использование информации</Text>
        <Text style={styles.text}>
          Собранная информация используется для:{"\n"}
          - Предоставления услуг по поиску специалистов и заведений{"\n"}
          - Обработки бронирований{"\n"}
          - Обеспечения связи между пользователями{"\n"}
          - Улучшения качества сервиса
        </Text>

        <Text style={styles.heading}>3. Хранение данных</Text>
        <Text style={styles.text}>
          Для работы Taptym используются Supabase, облачная инфраструктура Amazon Web Services и Expo для push-уведомлений. Текущий регион Supabase находится в Сеуле, поэтому обработка может включать трансграничную передачу данных.
        </Text>

        <Text style={styles.heading}>4. Геолокация</Text>
        <Text style={styles.text}>
          Приложение использует геолокацию для отображения специалистов и заведений в вашем регионе. Геоданные обрабатываются анонимно и не привязываются к личности пользователя.
        </Text>

        <Text style={styles.heading}>5. Безопасность</Text>
        <Text style={styles.text}>
          Мы принимаем разумные меры для защиты вашей информации от несанкционированного доступа, изменения, раскрытия или уничтожения.
        </Text>

        <Text style={styles.heading}>6. Ваши права</Text>
        <Text style={styles.text}>
          Вы имеете право:{"\n"}
          - Запросить доступ к вашим персональным данным{"\n"}
          - Запросить исправление или удаление ваших данных{"\n"}
          - Отозвать согласие на обработку данных{"\n"}
          - Подать жалобу в уполномоченный орган по защите данных
        </Text>

        <Text style={styles.heading}>7. Контакты</Text>
        <Text style={styles.text}>
          По вопросам конфиденциальности обращайтесь:{"\n"}
          Email: taptym@internet.ru{"\n"}
          Телефон: +7 702 058 7132{"\n"}
          Оператор: Шалгимбаев Ернар Донесбайулы{"\n"}
          Разработчик: Altynbek Temirkhan
        </Text>

        <Text style={styles.heading}>8. Изменения</Text>
        <Text style={styles.text}>
          Мы оставляем за собой право обновлять данную политику. Об изменениях будет объявлено в приложении.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1E2329',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#FAFAFA', fontSize: 16, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 100 },
  date: { color: '#848E9C', fontSize: 13, marginBottom: 20 },
  heading: { color: '#F0B90B', fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  text: { color: '#FAFAFA', fontSize: 14, lineHeight: 22, fontWeight: '500' },
});
