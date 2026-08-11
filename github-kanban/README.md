# backlog-sync

Sincroniza um `backlog.yaml` versionado no repo com **GitHub Issues + Projects v2**.
Idempotente: rodar duas vezes não duplica nada.

## Como funciona

```
backlog.yaml ──► sync_backlog.py ──► GitHub Issues + Projects v2
   (fonte              (GraphQL)         (destino)
   de verdade)
```

Cada épico/US/task vira uma **issue** com o ID no título (`[US-01] ...`) e é
adicionada ao **Project v2**, com os campos customizados preenchidos.

## Setup (uma vez)

### 1. Crie o Project v2
No GitHub: `New Project` → template vazio. Anote o número (URL: `/projects/N`).

### 2. Crie os campos customizados
No próprio Project, botão `+` no header da tabela:

| Campo | Tipo | Opções |
|---|---|---|
| Status | Single select | `Todo`, `In Progress`, `Done` (já vem) |
| Type | Single select | `Epic`, `User Story`, `Task` |
| Priority | Single select | `Low`, `Medium`, `High`, `Critical` |
| Story Points | Number | — |
| Iteration | Iteration | configure o range de sprints |
| Epic | Text | — (guarda o ID do épico, ex.: `EP-01`) |

Os **nomes** têm que bater com o que está em `fields:` no YAML.

### 3. Crie um PAT (Personal Access Token)
`Settings → Developer settings → Personal access tokens → Fine-grained tokens`

Escopos necessários:
- **Repository**: `Issues: Read/Write`, `Metadata: Read`
- **Account**: `Projects: Read/Write`

```bash
export GITHUB_TOKEN=github_pat_xxxxx
```

### 4. Instale deps

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Uso

```bash
# Ver o que ele FARIA sem tocar em nada:
python sync_backlog.py --file backlog.yaml --dry-run

# Sincronizar de verdade:
python sync_backlog.py --file backlog.yaml
```

## Fluxo de trabalho recomendado

1. Escreva/edite `backlog.yaml` na branch de trabalho.
2. Abra PR. O time revisa o **backlog em si** antes dele virar issue.
3. Merge → CI roda `python sync_backlog.py` automaticamente.
4. Ajustes finos (movimentar cards, comentar) direto no GitHub — vira "backlog vivo".
5. Se precisar recriar campos ou renomear em massa, edite o YAML e sincronize.

### GitHub Action de exemplo

```yaml
# .github/workflows/sync-backlog.yml
name: Sync backlog
on:
  push:
    branches: [main]
    paths: ['backlog.yaml']
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r requirements.txt
      - run: python sync_backlog.py --file backlog.yaml
        env:
          GITHUB_TOKEN: ${{ secrets.BACKLOG_PAT }}   # seu PAT, NÃO o GITHUB_TOKEN padrão
                                                     # (o padrão não tem escopo de Projects)
```

## Convenções de ID

| Prefixo | Significa    | Exemplo     |
|---------|--------------|-------------|
| `EP-XX` | Épico        | `EP-01`     |
| `US-XX` | User Story   | `US-07`     |
| `TS-XX-YY` | Task de US | `TS-07-03`  |

**Nunca reuse um ID.** Ele é a chave que liga YAML ↔ issue existente. Se você
apagar `US-05` e criar outro `US-05` diferente, o script vai sobrescrever a
issue antiga.

## Bootstrap do backlog a partir do PRD

Fluxo que funciona bem:

1. Escreva o PRD em `docs/prd.md`.
2. No Claude Code, rode um comando customizado (`.claude/commands/gerar-backlog.md`)
   apontando pro PRD.
3. O Claude gera `backlog.yaml` seguindo o schema deste projeto.
4. Você revisa manualmente.
5. Commit + push → Action sincroniza.

## Limitações conhecidas

- **Não apaga nada.** Item removido do YAML gera aviso mas a issue fica. Proposital.
- **Campo `Epic` é texto**, não link nativo. Projects v2 tem sub-issues agora,
  mas a API ainda é instável. Text field é o pragmático.
- **Comentários e labels** não são gerenciados pelo script — mexa direto no GitHub.
- **Ordem no board** também não. O script só cria/atualiza; a ordenação é do time.
