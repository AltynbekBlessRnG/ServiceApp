export type AppRole = 'client' | 'specialist' | 'venue' | null | undefined;
export type HomeRoute = '/(client)/home' | '/(specialist)/home' | '/(venue)/home' | '/(auth)/role-select';

export function resolveHomeRoute(role: AppRole): HomeRoute {
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
