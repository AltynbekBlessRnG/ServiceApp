import { Icon, Text } from '@rneui/themed';
import { StyleSheet, View } from 'react-native';

type VerificationStatus = 'pending' | 'approved' | 'rejected' | null;

export function ProviderVerificationBanner({ status }: { status: VerificationStatus }) {
  if (status === 'approved') return null;

  const rejected = status === 'rejected';
  return (
    <View style={[styles.container, rejected ? styles.rejected : styles.pending]}>
      <Icon
        name={rejected ? 'alert-circle' : 'clock'}
        type="feather"
        size={20}
        color={rejected ? '#F6465D' : '#F0B90B'}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>{rejected ? 'Профиль не прошёл проверку' : 'Профиль ожидает проверки'}</Text>
        <Text style={styles.message}>
          {rejected
            ? 'Исправьте данные профиля. После изменений администрация сможет проверить его повторно.'
            : 'Заполните профиль и услуги. До одобрения анкета скрыта из каталога и не принимает заказы.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pending: { backgroundColor: '#F0B90B12', borderColor: '#F0B90B55' },
  rejected: { backgroundColor: '#F6465D12', borderColor: '#F6465D55' },
  copy: { flex: 1 },
  title: { color: '#FAFAFA', fontSize: 14, fontWeight: '800' },
  message: { color: '#A09BAF', fontSize: 12, lineHeight: 17, marginTop: 4 },
});
