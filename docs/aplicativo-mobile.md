# 13 - Aplicativo Mobile

# 13. Aplicativo Mobile

## 13.1 Objetivo

Oferecer ao técnico uma ferramenta confiável para receber e executar inspeções em campo, com interface simples, recursos nativos e funcionamento offline.

## 13.2 Usuário principal

- Técnico de campo.

Usuários secundários poderão utilizar o aplicativo para testes ou execução excepcional, mas a experiência será projetada para o técnico.

## 13.3 Mapa de navegação sugerido

```
app/
├── _layout.tsx
├── (public)/
│   └── login.tsx
└── (protected)/
    ├── _layout.tsx
    ├── (tabs)/
    │   ├── index.tsx                 # Início
    │   ├── inspections.tsx           # Lista
    │   ├── sync.tsx                  # Sincronização
    │   └── profile.tsx               # Perfil
    ├── inspections/
    │   ├── [inspectionId]/index.tsx  # Detalhes
    │   ├── [inspectionId]/start.tsx
    │   ├── [inspectionId]/checklist.tsx
    │   ├── [inspectionId]/summary.tsx
    │   └── [inspectionId]/non-conformities.tsx
    ├── scanner.tsx
    ├── evidence/
    │   ├── capture.tsx
    │   └── preview.tsx
    └── sync/
        └── details.tsx
```

## 13.4 Catálogo de telas

### Login

- e-mail;
- senha;
- ação entrar;
- carregamento;
- erro de credenciais;
- indicação de indisponibilidade de rede;
- informação sobre acesso offline, quando disponível.

### Início

- saudação e usuário;
- inspeções do dia;
- inspeções atrasadas;
- inspeções em andamento;
- pendências de sincronização;
- ação rápida para sincronizar;
- ação rápida para QR Code.

### Lista de inspeções

- pesquisa local;
- filtros por estado, data e prioridade;
- cartões com cliente, local, equipamento, prazo e estado;
- indicador offline;
- indicador de sincronização;
- atualização manual.

### Detalhes da inspeção

- título;
- cliente;
- local;
- equipamento;
- prioridade;
- data prevista;
- instruções;
- progresso;
- estado;
- mapa ou coordenadas, quando disponíveis;
- ação iniciar, continuar, corrigir ou consultar.

### Checklist

- seções expansíveis ou navegação por etapas;
- itens ordenados;
- componente conforme tipo de resposta;
- indicação de obrigatoriedade;
- observação;
- evidências;
- não conformidade;
- salvamento local;
- progresso;
- navegação para pendências.

### Captura e evidências

- solicitação de permissão;
- câmera;
- seleção de galeria, quando permitida;
- prévia;
- refazer;
- descrição;
- vínculo visível com item;
- estado de upload.

### Scanner

- leitura de QR Code;
- indicador de processamento;
- equipamento encontrado;
- divergência com equipamento previsto;
- opção manual quando autorizada.

### Resumo e conclusão

- total de itens;
- itens respondidos;
- itens obrigatórios pendentes;
- não conformidades;
- evidências;
- localização;
- confirmação de conclusão;
- aviso de que o envio poderá permanecer pendente.

### Sincronização

- última sincronização;
- quantidade pendente;
- operações com erro;
- ação tentar novamente;
- status por evidência;
- mensagens compreensíveis;
- detalhes técnicos limitados para suporte.

### Perfil

- nome;
- e-mail;
- perfil;
- versão do aplicativo;
- identificador do dispositivo quando necessário;
- ação sincronizar;
- ação sair.

## 13.5 Componentes dinâmicos do checklist

O aplicativo deverá possuir um mapeamento explícito entre tipo e componente:

```
TEXT_SHORT       → Input de texto
TEXT_LONG        → Área de texto
NUMBER           → Input numérico
BOOLEAN          → Seletor Sim/Não
CONFORMITY       → Conforme/Não conforme/Não aplicável
SINGLE_CHOICE    → Seleção única
DATE             → Seletor de data
```

Tipos desconhecidos não deverão quebrar a tela. O aplicativo deverá indicar incompatibilidade e impedir conclusão quando o item obrigatório não puder ser respondido.

## 13.6 Estratégia de estado e dados (Tecnologias)

Sugestão de responsabilidades:

- **TanStack Query:** estado de dados remotos, invalidação e consultas online.
- **SQLite:** fonte de dados operacional das inspeções disponíveis offline.
- **Zustand ou Context:** estado pequeno de interface e sessão, evitando duplicar dados de servidor.
- **React Hook Form:** formulários e composição dos tipos de resposta.
- **Zod ou mecanismo equivalente:** validação de dados e contratos no cliente.
- **Secure Store:** dados sensíveis da sessão.

> O banco local não deve ser tratado apenas como cache descartável enquanto existirem alterações pendentes.
> 

## 13.7 Recursos nativos obrigatórios

### Câmera

- solicitar permissão;
- capturar imagem;
- apresentar prévia;
- refazer;
- associar ao item;
- manter arquivo pendente.

### QR Code

- ler código;
- localizar equipamento;
- validar divergência;
- oferecer alternativa conforme regra.

### Localização

- solicitar permissão;
- capturar posição pontual;
- registrar precisão e horário;
- tratar indisponibilidade;
- não coletar continuamente no MVP.

### Conectividade

- detectar ausência de rede;
- não bloquear o preenchimento;
- acionar sincronização de forma controlada;
- exibir estado atual.

## 13.8 Experiência offline

O técnico deverá distinguir claramente:

- **salvo no dispositivo**;
- **aguardando envio**;
- **enviado com sucesso**;
- **falha no envio**;
- **conflito**.

A interface não deverá usar apenas mensagens temporárias para essa informação. O estado deverá permanecer visível na lista, no detalhe ou na tela de sincronização.

## 13.9 Requisitos de usabilidade

- Botões principais com tamanho adequado para toque.
- Contraste suficiente.
- Texto de erro próximo ao campo ou ação relacionada.
- Evitar formulários excessivamente densos.
- Preservar o contexto ao alternar entre checklist e câmera.
- Permitir retomar a posição no checklist.
- Confirmar ações irreversíveis.
- Exibir progresso.
- Não depender exclusivamente de cor para comunicar estado.
- Utilizar linguagem de negócio, não mensagens técnicas da API.

## 13.10 Requisitos de desempenho

- Listas deverão ser virtualizadas quando necessário.
- Imagens deverão ter tamanho e qualidade controlados.
- O aplicativo não deverá carregar todas as fotografias em resolução integral simultaneamente.
- Consultas locais deverão possuir índices adequados.
- Renderizações do checklist deverão evitar atualização de todos os itens a cada digitação.
- Sincronização deverá ser executada em lotes controlados.

## 13.11 Testes mobile prioritários

- proteção de rota;
- validação de login;
- renderização de cada tipo de item;
- validação de obrigatoriedade;
- cálculo de progresso;
- persistência local de resposta;
- criação de operação na outbox;
- comportamento offline;
- redução de operações duplicadas;
- tratamento de permissão negada;
- conclusão bloqueada por pendências;
- apresentação de erro de sincronização.

## 13.12 Escopo mínimo do mobile

O aplicativo mobile será considerado completo no MVP quando o técnico conseguir:

1. autenticar-se;
2. sincronizar suas inspeções;
3. abrir uma inspeção offline;
4. identificar o equipamento;
5. iniciar;
6. responder itens dinâmicos;
7. registrar observação;
8. capturar uma foto;
9. registrar localização;
10. registrar não conformidade;
11. concluir;
12. sincronizar;
13. acompanhar o resultado do envio;
14. receber uma solicitação de correção.