import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/**
 * Substituto do `expo-router` nos testes.
 *
 * O `renderRouter` oficial instala fake timers e não reinicia o store entre
 * casos, o que torna o segundo teste de cada arquivo instável. Aqui as telas
 * são montadas diretamente e a navegação vira asserção sobre estas funções.
 */

export const routerMock = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
  canGoBack: jest.fn(() => false),
  setParams: jest.fn(),
};

export function resetRouterMock() {
  Object.values(routerMock).forEach((fn) => fn.mockClear());
  routerMock.canGoBack.mockReturnValue(false);
}

export const router = routerMock;

export function useRouter() {
  return routerMock;
}

export function useLocalSearchParams() {
  return {};
}

export function useSegments() {
  return [];
}

export function usePathname() {
  return '/';
}

export function useFocusEffect() {}

/** Vira um marcador inspecionável: `redirect-to` guarda o destino. */
export function Redirect({ href }: { href: string }) {
  return (
    <View testID="redirect">
      <Text testID="redirect-to">{String(href)}</Text>
    </View>
  );
}

export function Stack({ children }: { children?: ReactNode }) {
  return <View testID="stack">{children}</View>;
}

Stack.Screen = function StackScreen() {
  return null;
};

export function Link({ href, children }: { href: string; children?: ReactNode }) {
  return <Text accessibilityRole="link">{children ?? href}</Text>;
}
