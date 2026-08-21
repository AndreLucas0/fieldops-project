import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { Button } from './Button';
import { Feedback } from './Feedback';
import { Field } from './Field';
import { touchTarget } from '../tokens';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderUI(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
    ),
  });
}

describe('Button', () => {
  it('dispara a ação ao ser tocado', async () => {
    const onPress = jest.fn();
    await renderUI(<Button testID="botao" label="Entrar" onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('botao'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('não dispara quando desabilitado', async () => {
    const onPress = jest.fn();
    await renderUI(<Button testID="botao" label="Entrar" disabled onPress={onPress} />);

    await fireEvent.press(screen.getByTestId('botao'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('botao')).toBeDisabled();
  });

  it('mostra indicador e bloqueia novos toques enquanto carrega', async () => {
    const onPress = jest.fn();
    await renderUI(<Button testID="botao" label="Entrando…" loading onPress={onPress} />);

    expect(screen.getByTestId('botao-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('botao')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('botao'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('respeita a altura mínima de toque exigida em campo (docs §13.9)', async () => {
    await renderUI(<Button testID="botao" label="Entrar" />);

    expect(screen.getByTestId('botao')).toHaveStyle({ minHeight: touchTarget });
  });
});

describe('Field', () => {
  it('associa rótulo e erro ao campo', async () => {
    await renderUI(
      <Field testID="campo" label="E-mail" error="Informe um e-mail válido." value="" />,
    );

    expect(screen.getByLabelText('E-mail')).toBeOnTheScreen();
    expect(screen.getByTestId('campo-error')).toHaveTextContent('Informe um e-mail válido.');
    expect(screen.getByTestId('campo').props.accessibilityHint).toBe('Informe um e-mail válido.');
  });

  it('não mostra área de erro quando o campo está válido', async () => {
    await renderUI(<Field testID="campo" label="E-mail" value="" />);

    expect(screen.queryByTestId('campo-error')).toBeNull();
    expect(screen.queryByTestId('campo-toggle')).toBeNull();
  });

  it('alterna a exibição da senha', async () => {
    await renderUI(<Field testID="campo" label="Senha" secure value="segredo" />);

    expect(screen.getByTestId('campo').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByLabelText('Exibir senha'));
    expect(screen.getByTestId('campo').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByLabelText('Ocultar senha'));
    expect(screen.getByTestId('campo').props.secureTextEntry).toBe(true);
  });
});

describe('Feedback', () => {
  it.each([
    ['error', 'ERRO'],
    ['warning', 'ATENÇÃO'],
    ['success', 'OK'],
    ['info', 'INFO'],
  ] as const)('comunica o tom %s também por texto, não apenas por cor', async (tone, label) => {
    await renderUI(<Feedback testID="aviso" tone={tone} message="Mensagem de teste." />);

    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.getByText('Mensagem de teste.')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBe(screen.getByTestId('aviso'));
  });
});
