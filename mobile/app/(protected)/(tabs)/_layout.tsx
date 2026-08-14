import { Tabs } from 'expo-router';

import { colors, fonts, fontSizes, Icon, spacing, touchTarget } from '@/design-system';

/**
 * Abas do aplicativo de campo: Início (FE-M02) e Perfil (FE-M05).
 *
 * As rotas ficam nomeadas (`/inicio`, `/perfil`) em vez de usar o índice do
 * grupo porque `(public)/index.tsx` já ocupa `/` como tela de abertura; dois
 * arquivos apontando para a mesma rota é conflito no expo-router.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: touchTarget + spacing['2xl'],
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: fontSizes.xxs,
        },
      }}>
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Início',
          // `color` é `ColorValue`; aqui sempre chega como string do tema.
          tabBarIcon: ({ color }) => <Icon name="clipboard" size={22} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspeções',
          tabBarIcon: ({ color }) => <Icon name="checklist" size={22} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Icon name="user" size={22} color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
