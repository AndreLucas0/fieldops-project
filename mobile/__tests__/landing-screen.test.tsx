import { fireEvent, screen, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => require('@/test-utils/expo-router-mock'));

import LandingScreen from '../app/(public)/index';
import { HIGHLIGHTS } from '@/features/onboarding/highlights';
import { resetRouterMock, routerMock } from '@/test-utils/expo-router-mock';
import { renderWithSession, seedStoredSession } from '@/test-utils/render';

beforeEach(() => {
  resetRouterMock();
});

describe('Tela de apresentação', () => {
  it('apresenta a marca, a chamada e os destaques do aplicativo', async () => {
    await renderWithSession(<LandingScreen />);

    await waitFor(() => expect(screen.getByTestId('landing-screen')).toBeOnTheScreen());

    expect(screen.getByText('FieldOps')).toBeOnTheScreen();
    expect(screen.getByText(/Inspeções industriais/)).toBeOnTheScreen();
    expect(screen.getByText('sem papel.')).toBeOnTheScreen();

    for (const highlight of HIGHLIGHTS) {
      expect(screen.getByTestId(`highlight-${highlight.id}`)).toBeOnTheScreen();
      expect(screen.getByText(highlight.title)).toBeOnTheScreen();
      expect(screen.getByText(highlight.description)).toBeOnTheScreen();
    }
  });

  it('informa que a conta é criada pelo administrador, sem oferecer cadastro', async () => {
    await renderWithSession(<LandingScreen />);

    await waitFor(() => expect(screen.getByTestId('landing-screen')).toBeOnTheScreen());

    expect(screen.getByText(/conta é criada pelo administrador/i)).toBeOnTheScreen();
    expect(screen.queryByText(/criar conta/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });

  it('leva para o login ao tocar em Entrar', async () => {
    await renderWithSession(<LandingScreen />);

    await waitFor(() => expect(screen.getByTestId('landing-signin')).toBeOnTheScreen());
    await fireEvent.press(screen.getByTestId('landing-signin'));

    expect(routerMock.push).toHaveBeenCalledWith('/login');
  });

  it('não mostra a apresentação para quem já tem sessão válida', async () => {
    await seedStoredSession();

    await renderWithSession(<LandingScreen />);

    await waitFor(() => expect(screen.getByTestId('redirect-to')).toHaveTextContent('/inicio'));
    expect(screen.queryByTestId('landing-screen')).toBeNull();
  });
});
