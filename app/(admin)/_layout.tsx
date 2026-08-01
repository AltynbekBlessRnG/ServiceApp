import { Stack } from 'expo-router';
import { RoleGuard } from '../../components/RoleGuard';
export default function AdminLayout() {
  return <RoleGuard requireAdmin><Stack screenOptions={{ headerShown: false }} /></RoleGuard>;
}
