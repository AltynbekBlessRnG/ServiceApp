export type AppRole = 'client' | 'specialist' | 'venue' | 'admin' | null | undefined;

export function resolveHomeRoute(role: AppRole): string {
  switch (role) {
    case 'client':
      return '/(client)/home';
    case 'specialist':
      return '/(specialist)/home';
    case 'venue':
      return '/(venue)/home';
    default:
      return '/(auth)/role-select';
  }
}
