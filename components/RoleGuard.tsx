import { Button, Text } from '@rneui/themed';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { AppRole } from '../lib/auth-routing';
import { signOutSecurely } from '../lib/auth-actions';
import { useAuth } from '../providers/AuthProvider';

export function RoleGuard({
  role: requiredRole,
  requireAdmin = false,
  children,
}: {
  role?: Exclude<AppRole, null>;
  requireAdmin?: boolean;
  children: React.ReactNode;
}) {
  const { user, role, isAdmin, isBanned, isLoading } = useAuth();

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color="#F0B90B" /></View>;
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (isBanned) {
    return (
      <View style={styles.center}>
        <Text h4 style={styles.title}>Аккаунт заблокирован</Text>
        <Text style={styles.message}>Обратитесь в поддержку, если считаете это ошибкой.</Text>
        <Button title="Выйти" type="outline" onPress={() => void signOutSecurely()} />
      </View>
    );
  }
  if (requireAdmin && !isAdmin) return <Redirect href="/" />;
  if (requiredRole && role !== requiredRole) return <Redirect href="/" />;
  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0B0E11', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#F6465D', textAlign: 'center' },
  message: { color: '#848E9C', textAlign: 'center', marginVertical: 16 },
});
