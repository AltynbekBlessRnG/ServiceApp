import { Icon, Text } from '@rneui/themed';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// Заглушка на месте отсутствующего фото. Раньше в этих местах стояла ссылка на
// via.placeholder.com — домен перестал отвечать, и вместо картинки оставалось
// пустое место. Рисуем заглушку сами, чтобы экран не зависел от чужого сервера.

export function PhotoPlaceholder({
  style,
  label = 'Фото не добавлено',
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  return (
    <View style={[styles.container, style]}>
      <Icon name="image" type="feather" size={34} color="#F0B90B" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#1A1625', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { color: '#8E8AA0', fontSize: 13, fontWeight: '600' },
});
