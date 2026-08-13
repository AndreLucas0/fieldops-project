import type { IconName } from '@/design-system';

export type Highlight = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
};

/**
 * O que o técnico faz no aplicativo, segundo docs/aplicativo-mobile.md §13.12.
 * Modelos de inspeção são criados na web pelo supervisor — por isso a
 * apresentação fala em receber e executar, não em criar.
 */
export const HIGHLIGHTS: readonly Highlight[] = [
  {
    id: 'assigned',
    icon: 'clipboard',
    title: 'Inspeções atribuídas',
    description: 'Receba no celular as inspeções do seu dia.',
  },
  {
    id: 'checklist',
    icon: 'checklist',
    title: 'Checklist em campo',
    description: 'Conforme, não conforme ou N/A em um toque.',
  },
  {
    id: 'evidence',
    icon: 'camera',
    title: 'Evidência em foto',
    description: 'Anexe fotos direto da câmera do celular.',
  },
  {
    id: 'offline',
    icon: 'offline',
    title: 'Funciona sem rede',
    description: 'Preencha offline e sincronize ao voltar o sinal.',
  },
];
