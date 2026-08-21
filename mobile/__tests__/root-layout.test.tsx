import { render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import RootLayout from '../app/_layout';

describe('Layout raiz', () => {
  it('monta a navegação depois que as fontes carregam', async () => {
    await render(<RootLayout />);

    expect(screen.getByTestId('stack')).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('não mantém a splash aberta quando a fonte falha ao carregar', async () => {
    (useFonts as unknown as jest.Mock).mockReturnValueOnce([false, new Error('sem rede')]);

    await render(<RootLayout />);

    expect(screen.getByTestId('stack')).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('não renderiza a navegação enquanto as fontes não resolvem', async () => {
    (useFonts as unknown as jest.Mock).mockReturnValueOnce([false, null]);

    await render(<RootLayout />);

    expect(screen.queryByTestId('stack')).toBeNull();
  });
});
