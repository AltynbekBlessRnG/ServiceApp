import { Button, Icon, Text, useTheme } from '@rneui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { UserAvatar } from '../../components/UserAvatar';
import { useHaptics } from '../../hooks/useHaptics'; // <---
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function AddReviewScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics(); // <---
  const { bookingId, targetId, name, avatar } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitReview() {
    if (!user?.id) return Alert.alert('Ошибка', 'Вы должны войти в аккаунт');
    if (!comment.trim()) {
        haptics.error(); // <--- Ошибка
        return Alert.alert('Ошибка', 'Пожалуйста, напишите отзыв');
    }

    setLoading(true);
    const { error } = await supabase.from('reviews').insert({ 
        client_id: user.id, 
        booking_id: bookingId,
        target_id: targetId, 
        rating, 
        comment: comment.trim() 
    });

    setLoading(false);
    if (error) {
        haptics.error();
        Alert.alert('Ошибка сервера', error.message);
    } else { 
        haptics.success(); // <--- Успех
        Alert.alert('Спасибо!', 'Ваш отзыв опубликован'); 
        router.back(); 
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {/* ... Header и Info без изменений ... */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                <Icon name="x" type="feather" color={theme.colors.black} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: theme.colors.black}]}>Оставить отзыв</Text>
            <View style={{width: 40}} />
        </View>

        <View style={styles.targetInfo}>
            <UserAvatar avatarUrl={avatar as string} size={100} />
            <Text h4 style={{color: theme.colors.black, fontWeight: '800', marginTop: 15, textAlign: 'center'}}>
                {name}
            </Text>
            <Text style={{ color: theme.colors.grey2 }}>Как прошел ваш визит?</Text>
        </View>

        <View style={[styles.ratingBox, { backgroundColor: theme.colors.grey0 }]}>
            <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity 
                        key={s} 
                        onPress={() => { 
                            haptics.selection(); // <--- ЩЕЛЧОК при выборе звезды
                            setRating(s); 
                        }} 
                        activeOpacity={0.7}
                    >
                        <Icon 
                            name="star" 
                            type="font-awesome" 
                            size={42} 
                            color={s <= rating ? "#FFD700" : theme.colors.grey1} 
                            style={{marginHorizontal: 8}} 
                        />
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={{ textAlign: 'center', marginTop: 10, fontWeight: '600', color: theme.colors.primary }}>
                {rating === 5 ? 'Великолепно!' : rating === 4 ? 'Хорошо' : rating === 3 ? 'Нормально' : 'Плохо'}
            </Text>
        </View>

        {/* ... Input и Button без изменений ... */}
        <Text style={[styles.label, { color: theme.colors.grey2 }]}>КОММЕНТАРИЙ</Text>
        <TextInput 
            style={[styles.input, { color: theme.colors.black, backgroundColor: theme.colors.grey0, borderColor: theme.colors.grey1 }]} 
            placeholder="Что вам понравилось больше всего?" 
            placeholderTextColor={theme.colors.grey3}
            multiline
            value={comment}
            onChangeText={setComment}
        />

        <Button 
            title="Опубликовать отзыв" 
            onPress={submitReview} 
            loading={loading} 
            buttonStyle={{ backgroundColor: theme.colors.primary, borderRadius: 16, height: 56 }} 
            titleStyle={{ fontWeight: '800' }} 
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  closeBtn: { padding: 5 },
  targetInfo: { alignItems: 'center', marginBottom: 30 },
  ratingBox: { padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 30 },
  starsRow: { flexDirection: 'row', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase' },
  input: { height: 120, borderRadius: 20, padding: 20, textAlignVertical: 'top', fontSize: 16, borderWidth: 1, marginBottom: 30 }
});
