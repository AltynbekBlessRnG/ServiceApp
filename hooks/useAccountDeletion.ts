import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { signOutSecurely } from '../lib/auth-actions';
import { supabase } from '../lib/supabase';

// Удаление аккаунта из любого экрана одним и тем же путём.
//
// Apple отклонила 1.0 по пункту 5.1.1(v): проверяющий не нашёл удаления, хотя
// оно было — в самом низу длинного экрана настроек, под формой профиля. Поэтому
// кнопка теперь стоит и на экране профиля каждой роли, а логика живёт здесь,
// чтобы три кнопки не разошлись.
//
// Apple также просит показать весь путь «от начала до подтверждения», а раньше
// после удаления приложение молча открывало экран входа. Теперь последний шаг —
// явное сообщение, что аккаунт удалён.
export function useAccountDeletion() {
  const [deleting, setDeleting] = useState(false);
  const inFlight = useRef(false);

  const performDeletion = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'DELETE' });
      if (error) throw error;
      await signOutSecurely();
      router.replace('/(auth)/login');
      Alert.alert(
        'Аккаунт удалён',
        'Ваш аккаунт и связанные с ним данные удалены без возможности восстановления.',
      );
    } catch (error) {
      Alert.alert(
        'Не удалось удалить аккаунт',
        error instanceof Error ? error.message : 'Проверьте интернет и попробуйте ещё раз.',
      );
    } finally {
      inFlight.current = false;
      setDeleting(false);
    }
  }, []);

  const confirmDeletion = useCallback(() => {
    Alert.alert(
      'Удалить аккаунт?',
      'Будут безвозвратно удалены ваш профиль, фото, портфолио, отзывы, брони и переписки. Отменить это действие нельзя.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить навсегда', style: 'destructive', onPress: () => void performDeletion() },
      ],
    );
  }, [performDeletion]);

  return { confirmDeletion, deleting };
}
