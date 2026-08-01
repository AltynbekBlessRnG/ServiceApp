import { Icon, Text } from '@rneui/themed';
import { router } from 'expo-router';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

type SafetyActionsProps = {
  targetId: string;
  targetType?: 'profile' | 'message' | 'review' | 'portfolio';
};

export function SafetyActions({ targetId, targetType = 'profile' }: SafetyActionsProps) {
  const { user } = useAuth();

  if (!user || user.id === targetId) return null;

  const report = () => {
    Alert.alert(
      'Пожаловаться',
      'Жалоба попадёт в очередь модерации. Отправить её?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отправить',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('reports').insert({
              reporter_id: user.id,
              target_type: targetType,
              target_id: targetId,
              reason: 'Пользователь отправил жалобу из мобильного приложения',
            });
            Alert.alert(error ? 'Не удалось отправить' : 'Жалоба отправлена', error?.message);
          },
        },
      ],
    );
  };

  const block = () => {
    Alert.alert(
      'Заблокировать пользователя?',
      'Вы больше не увидите его в каталоге и не сможете переписываться.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Заблокировать',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('blocks').upsert({
              blocker_id: user.id,
              blocked_id: targetId,
            });
            if (error) Alert.alert('Не удалось заблокировать', error.message);
            else router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={report} style={styles.action}>
        <Icon name="flag" type="feather" size={16} color="#848E9C" />
        <Text style={styles.label}>Пожаловаться</Text>
      </TouchableOpacity>
      {targetType === 'profile' && (
        <TouchableOpacity onPress={block} style={styles.action}>
          <Icon name="slash" type="feather" size={16} color="#F6465D" />
          <Text style={[styles.label, styles.danger]}>Заблокировать</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 8,
  },
  label: { color: '#848E9C', fontSize: 13, fontWeight: '600' },
  danger: { color: '#F6465D' },
});
