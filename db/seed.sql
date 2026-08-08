-- ============================================================================
-- FieldOps — Dataset de demonstração / fixtures de integração
-- ============================================================================
-- Uso: dados de demonstração (docs/criterios-de-avaliacao.md §19.8) e base
-- para os testes de integração descritos em test-plan.md. NUNCA aplicar em
-- ambiente de produção — a senha de demonstração abaixo é conhecida.
--
-- Requer db/schema.sql já aplicado. Reexecutável: começa truncando todas as
-- tabelas na mesma transação.
--
-- Convenção de identificadores fixos (para poder referenciar em testes sem
-- precisar consultar o banco antes):
--   1########-...  users                 5########-...  templates
--   2########-...  clients               51#######-...  template_versions
--   3########-...  inspection_sites      6########-...  inspections
--   4########-...  equipment             63,64,65,66#-  evidence/NC/review/audit
-- Seções e itens de template, snapshots e respostas não têm id fixo — são
-- localizados por título via subconsulta (mais legível que UUID solto e
-- reduz erro de copiar/colar em um arquivo deste tamanho).
--
-- Decisão de modelagem: o campo `conformity` de inspection_responses só é
-- preenchido para itens do tipo CONFORMITY (é o único tipo com semântica
-- de "conforme/não conforme" nos exemplos de docs/api-rest.md §12.11).
-- Para os demais tipos (BOOLEAN, TEXT_*, NUMBER, DATE, SINGLE_CHOICE) o
-- campo fica NULL — a resposta em si carrega o valor.
--
-- Cenário narrativo: reaproveita literalmente os exemplos já usados em
-- docs/modelo-de-dados.md §10.17 (Indústria ABC / Fábrica Sorocaba /
-- Gerador Diesel GD-001) e §10.5.2–10.5.3 (Indústria Alfa), e o texto de
-- reprovação de docs/api-rest.md §12.14, para manter os documentos e os
-- dados de teste contando a mesma história.
-- ============================================================================

BEGIN;

TRUNCATE TABLE
    audit_events, inspection_reviews, non_conformities, evidence,
    inspection_responses, inspection_item_snapshots, inspections,
    template_items, template_sections, inspection_template_versions,
    inspection_templates, equipment, inspection_sites, clients, users
RESTART IDENTITY CASCADE;

-- Identificadores reutilizados ao longo do script.
\set admin_id            '10000000-0000-0000-0000-000000000001'
\set supervisor_id       '10000000-0000-0000-0000-000000000002'
\set tech1_id             '10000000-0000-0000-0000-000000000003'
\set tech2_id             '10000000-0000-0000-0000-000000000004'
\set tech_inactive_id     '10000000-0000-0000-0000-000000000005'

\set client_abc_id        '20000000-0000-0000-0000-000000000001'
\set client_alfa_id       '20000000-0000-0000-0000-000000000002'
\set client_inactive_id   '20000000-0000-0000-0000-000000000003'

\set site_sorocaba_id     '30000000-0000-0000-0000-000000000001'
\set site_unidade_sorocaba_id '30000000-0000-0000-0000-000000000002'
\set site_inactive_id     '30000000-0000-0000-0000-000000000003'

\set equip_gerador_id     '40000000-0000-0000-0000-000000000001'
\set equip_empilhadeira_id '40000000-0000-0000-0000-000000000002'
\set equip_extintor_id    '40000000-0000-0000-0000-000000000003'
\set equip_compressor_id  '40000000-0000-0000-0000-000000000004'

\set tpl_geradores_id     '50000000-0000-0000-0000-000000000001'
\set tpl_extintores_id    '50000000-0000-0000-0000-000000000002'
\set ver_geradores_id     '51000000-0000-0000-0000-000000000001'
\set ver_extintores_id    '51000000-0000-0000-0000-000000000002'

\set insp_assigned_id     '60000000-0000-0000-0000-000000000001'
\set insp_submitted_id    '60000000-0000-0000-0000-000000000002'
\set insp_under_review_id '60000000-0000-0000-0000-000000000003'
\set insp_approved_id     '60000000-0000-0000-0000-000000000004'
\set insp_rejected_id     '60000000-0000-0000-0000-000000000005'
\set insp_canceled_id     '60000000-0000-0000-0000-000000000006'
\set insp_draft_id        '60000000-0000-0000-0000-000000000007'

-- ----------------------------------------------------------------------------
-- Usuários (docs/personas.md — Ana, Marina, Carlos)
-- Senha de todos: "FieldOps@2026" (bcrypt, custo 10). Somente para uso local
-- e de integração — nunca reaproveitar este hash em produção.
-- ----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role, status, phone) VALUES
(:'admin_id',        'Ana Administradora',  'admin@fieldops.local',      '$2b$10$yn.92E9qsR1R6S5fVCRym.R4H4kH/eeS6XU6GKk.J2KdFkWBmZlaK', 'ADMIN',       'ACTIVE', '+55 11 90000-0001'),
(:'supervisor_id',   'Marina Supervisora',  'supervisor@fieldops.local', '$2b$10$yn.92E9qsR1R6S5fVCRym.R4H4kH/eeS6XU6GKk.J2KdFkWBmZlaK', 'SUPERVISOR',  'ACTIVE', '+55 11 90000-0002'),
(:'tech1_id',        'Carlos Técnico',      'tecnico@fieldops.local',    '$2b$10$yn.92E9qsR1R6S5fVCRym.R4H4kH/eeS6XU6GKk.J2KdFkWBmZlaK', 'TECHNICIAN',  'ACTIVE', '+55 11 90000-0003'),
(:'tech2_id',        'Roberta Técnica',     'tecnico2@fieldops.local',   '$2b$10$yn.92E9qsR1R6S5fVCRym.R4H4kH/eeS6XU6GKk.J2KdFkWBmZlaK', 'TECHNICIAN',  'ACTIVE', '+55 11 90000-0004'),
(:'tech_inactive_id','Ex-Técnico Desligado','inativo@fieldops.local',    '$2b$10$yn.92E9qsR1R6S5fVCRym.R4H4kH/eeS6XU6GKk.J2KdFkWBmZlaK', 'TECHNICIAN',  'INACTIVE', NULL);

-- ----------------------------------------------------------------------------
-- Clientes, locais e equipamentos
-- ----------------------------------------------------------------------------
INSERT INTO clients (id, name, legal_name, status) VALUES
(:'client_abc_id',      'Indústria ABC',        'Indústria ABC Ltda.',        'ACTIVE'),
(:'client_alfa_id',     'Indústria Alfa',       'Indústria Alfa S.A.',        'ACTIVE'),
(:'client_inactive_id', 'Cliente Descontinuado','Cliente Descontinuado ME',   'INACTIVE');

INSERT INTO inspection_sites (id, client_id, name, city, state, status) VALUES
(:'site_sorocaba_id',         :'client_abc_id',      'Fábrica Sorocaba',   'Sorocaba', 'SP', 'ACTIVE'),
(:'site_unidade_sorocaba_id', :'client_alfa_id',     'Unidade Sorocaba',   'Sorocaba', 'SP', 'ACTIVE'),
(:'site_inactive_id',         :'client_inactive_id', 'Depósito Desativado','Itu',      'SP', 'INACTIVE');

INSERT INTO equipment (id, site_id, name, qr_code, status) VALUES
(:'equip_gerador_id',      :'site_sorocaba_id',         'Gerador Diesel GD-001', 'QR-GD-001',  'ACTIVE'),
(:'equip_empilhadeira_id', :'site_unidade_sorocaba_id', 'Empilhadeira 01',       'QR-EMP-01',  'ACTIVE'),
(:'equip_extintor_id',     :'site_unidade_sorocaba_id', 'Extintor 15',           'QR-EXT-15',  'ACTIVE'),
(:'equip_compressor_id',   :'site_unidade_sorocaba_id', 'Compressor 03',        'QR-COMP-03', 'DECOMMISSIONED');

-- ----------------------------------------------------------------------------
-- Modelos de inspeção — dois modelos publicados (docs/modelo-de-dados.md
-- §10.7.5 e §10.17). O modelo de extintores cobre, de propósito, os 7 tipos
-- de resposta obrigatórios do MVP (funcionalidades.md §8.5), para que os
-- testes de "um por tipo de item" (test-plan.md M4) tenham fixture real.
-- ----------------------------------------------------------------------------
INSERT INTO inspection_templates (id, title, description, category, status, current_version, created_by) VALUES
(:'tpl_geradores_id',  'Checklist de Inspeção de Geradores',  'Verificação periódica de geradores diesel estacionários.', 'Geradores',  'ACTIVE', 1, :'supervisor_id'),
(:'tpl_extintores_id', 'Checklist de Inspeção de Extintores', 'Verificação periódica de extintores de incêndio.',         'Extintores', 'ACTIVE', 1, :'supervisor_id');

INSERT INTO inspection_template_versions (id, template_id, version_number, title_snapshot, published_by, published_at) VALUES
(:'ver_geradores_id',  :'tpl_geradores_id',  1, 'Checklist de Inspeção de Geradores',  :'supervisor_id', now() - interval '30 days'),
(:'ver_extintores_id', :'tpl_extintores_id', 1, 'Checklist de Inspeção de Extintores', :'supervisor_id', now() - interval '30 days');

-- Geradores: seção única (mesma estrutura do exemplo em §10.17).
INSERT INTO template_sections (id, template_version_id, title, display_order) VALUES
(gen_random_uuid(), :'ver_geradores_id', 'Verificação Geral', 1);

INSERT INTO template_items (id, section_id, title, response_type, required, observation_required_on_failure, evidence_required_on_failure, display_order)
SELECT gen_random_uuid(), ts.id, item.title, item.response_type, TRUE, item.obs_req, item.ev_req, item.ord
FROM template_sections ts,
     (VALUES
        ('O nível de óleo está adequado?',      'CONFORMITY', FALSE, FALSE, 1),
        ('Existem vazamentos?',                  'CONFORMITY', FALSE, FALSE, 2),
        ('A bateria está em boas condições?',    'CONFORMITY', TRUE,  TRUE,  3),
        ('O gerador iniciou corretamente?',      'CONFORMITY', FALSE, FALSE, 4)
     ) AS item(title, response_type, obs_req, ev_req, ord)
WHERE ts.template_version_id = :'ver_geradores_id';

-- Extintores: duas seções, cobrindo os 7 tipos de resposta do MVP.
INSERT INTO template_sections (id, template_version_id, title, display_order) VALUES
(gen_random_uuid(), :'ver_extintores_id', 'Identificação',      1),
(gen_random_uuid(), :'ver_extintores_id', 'Condições Físicas',  2);

INSERT INTO template_items (id, section_id, title, response_type, required, evidence_required_on_failure, options_json, display_order)
SELECT gen_random_uuid(), ts.id, item.title, item.response_type, item.required, item.ev_req, item.options, item.ord
FROM template_sections ts,
     (VALUES
        ('Número do patrimônio', 'TEXT_SHORT',    FALSE, FALSE, NULL::jsonb, 1),
        ('Localização',          'TEXT_SHORT',    TRUE,  FALSE, NULL::jsonb, 2),
        ('Tipo do extintor',     'SINGLE_CHOICE', TRUE,  FALSE, '{"choices": ["PQS", "CO2", "Água", "Espuma"]}'::jsonb, 3),
        ('Data de validade',     'DATE',          TRUE,  FALSE, NULL::jsonb, 4)
     ) AS item(title, response_type, required, ev_req, options, ord)
WHERE ts.template_version_id = :'ver_extintores_id' AND ts.title = 'Identificação';

INSERT INTO template_items (id, section_id, title, response_type, required, evidence_required_on_failure, display_order)
SELECT gen_random_uuid(), ts.id, item.title, item.response_type, item.required, item.ev_req, item.ord
FROM template_sections ts,
     (VALUES
        ('O lacre está intacto?',                'CONFORMITY', TRUE,  FALSE, 1),
        ('O manômetro está na faixa verde?',     'CONFORMITY', TRUE,  TRUE,  2),
        ('Existe corrosão?',                      'BOOLEAN',    TRUE,  FALSE, 3),
        ('Peso aproximado (kg)',                  'NUMBER',     FALSE, FALSE, 4),
        ('Observações gerais',                    'TEXT_LONG',  FALSE, FALSE, 5)
     ) AS item(title, response_type, required, ev_req, ord)
WHERE ts.template_version_id = :'ver_extintores_id' AND ts.title = 'Condições Físicas';

-- ----------------------------------------------------------------------------
-- Inspeções — uma para cada estado relevante da máquina de estados
-- (docs/fluxo-geral.md §7.4/§7.6), para servir de fixture a todos os
-- *ControllerIT.java listados em test-plan.md.
-- ----------------------------------------------------------------------------
INSERT INTO inspections (id, template_version_id, client_id, site_id, equipment_id, technician_id, supervisor_id, created_by, title, priority, status, scheduled_for, started_at_device, started_at_server, completed_at_device, submitted_at_server, approved_at, canceled_at, canceled_by, canceled_reason) VALUES

-- 1) ASSIGNED — ponto de partida do roteiro AC-RELEASE (§17.19): técnico
--    ainda vai baixar, iniciar e responder esta inspeção.
(:'insp_assigned_id', :'ver_geradores_id', :'client_abc_id', :'site_sorocaba_id', :'equip_gerador_id', :'tech1_id', :'supervisor_id', :'supervisor_id',
 'Inspeção trimestral do gerador', 'MEDIUM', 'ASSIGNED', now() + interval '1 day',
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

-- 2) SUBMITTED — todos os itens obrigatórios respondidos, conforme, pronta
--    para o supervisor abrir a revisão (UC-16 / AC-REVIEW "iniciar revisão").
(:'insp_submitted_id', :'ver_geradores_id', :'client_abc_id', :'site_sorocaba_id', :'equip_gerador_id', :'tech1_id', :'supervisor_id', :'supervisor_id',
 'Inspeção mensal do gerador', 'MEDIUM', 'SUBMITTED', now() - interval '1 day',
 now() - interval '1 day 3 hours', now() - interval '1 day 2 hours 55 minutes',
 now() - interval '1 day 2 hours', now() - interval '1 day 1 hour 55 minutes',
 NULL, NULL, NULL, NULL),

-- 3) UNDER_REVIEW — revisão já iniciada pelo supervisor, decisão pendente.
(:'insp_under_review_id', :'ver_extintores_id', :'client_alfa_id', :'site_unidade_sorocaba_id', :'equip_extintor_id', :'tech1_id', :'supervisor_id', :'supervisor_id',
 'Inspeção semestral do extintor', 'LOW', 'UNDER_REVIEW', now() - interval '2 days',
 now() - interval '2 days 4 hours', now() - interval '2 days 3 hours 55 minutes',
 now() - interval '2 days 2 hours', now() - interval '2 days 1 hour 55 minutes',
 NULL, NULL, NULL, NULL),

-- 4) APPROVED — narrativa completa de docs/modelo-de-dados.md §10.17:
--    bateria não conforme, 2 evidências, não conformidade aberta, aprovada
--    mesmo assim pelo supervisor.
(:'insp_approved_id', :'ver_geradores_id', :'client_abc_id', :'site_sorocaba_id', :'equip_gerador_id', :'tech1_id', :'supervisor_id', :'supervisor_id',
 'Inspeção #2026-00045', 'HIGH', 'APPROVED', now() - interval '10 days',
 now() - interval '10 days 3 hours', now() - interval '10 days 2 hours 55 minutes',
 now() - interval '10 days 2 hours', now() - interval '10 days 1 hour 55 minutes',
 now() - interval '9 days', NULL, NULL, NULL),

-- 5) IN_PROGRESS após reprovação — cobre o fluxo de correção
--    (docs/fluxo-geral.md §7.8) e reusa o texto de motivo de
--    docs/api-rest.md §12.14.
(:'insp_rejected_id', :'ver_extintores_id', :'client_alfa_id', :'site_unidade_sorocaba_id', :'equip_extintor_id', :'tech1_id', :'supervisor_id', :'supervisor_id',
 'Inspeção anual do extintor', 'MEDIUM', 'IN_PROGRESS', now() - interval '5 days',
 now() - interval '5 days 4 hours', now() - interval '5 days 3 hours 55 minutes',
 now() - interval '5 days 2 hours', now() - interval '4 days',
 NULL, NULL, NULL, NULL),

-- 6) CANCELED — RN-029/RN-030.
(:'insp_canceled_id', :'ver_extintores_id', :'client_alfa_id', :'site_unidade_sorocaba_id', :'equip_extintor_id', :'tech1_id', :'supervisor_id', :'supervisor_id',
 'Inspeção extraordinária do extintor', 'LOW', 'CANCELED', now() + interval '2 days',
 NULL, NULL, NULL, NULL, NULL,
 now() - interval '1 day', :'supervisor_id', 'Equipamento removido temporariamente para manutenção externa.'),

-- 7) DRAFT — ainda não confirmada como ASSIGNED; técnico Roberta (tech2)
--    para permitir testar que um técnico não vê inspeções de outro
--    (RN-004, AC-MOBILE-LIST). Reaproveita o modelo de extintores como
--    checklist genérico de demonstração para a empilhadeira.
(:'insp_draft_id', :'ver_extintores_id', :'client_alfa_id', :'site_unidade_sorocaba_id', :'equip_empilhadeira_id', :'tech2_id', :'supervisor_id', :'supervisor_id',
 'Inspeção de rotina da empilhadeira', 'MEDIUM', 'DRAFT', now() + interval '3 days',
 NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- ----------------------------------------------------------------------------
-- Snapshots — copiados da versão publicada correspondente a cada inspeção
-- (docs/modelo-de-dados.md §10.8.2/§10.8.3).
-- ----------------------------------------------------------------------------
INSERT INTO inspection_item_snapshots (id, inspection_id, source_template_item_id, section_title, section_description, section_order, item_code, item_title, item_description, response_type, required, options_json, item_order)
SELECT gen_random_uuid(), insp.id, ti.id, ts.title, ts.description, ts.display_order, ti.code, ti.title, ti.description, ti.response_type, ti.required, ti.options_json, ti.display_order
FROM inspections insp
JOIN template_sections ts ON ts.template_version_id = insp.template_version_id
JOIN template_items ti ON ti.section_id = ts.id
WHERE insp.id IN (:'insp_assigned_id', :'insp_submitted_id', :'insp_under_review_id', :'insp_approved_id', :'insp_rejected_id', :'insp_canceled_id', :'insp_draft_id');

-- ----------------------------------------------------------------------------
-- Respostas
-- ----------------------------------------------------------------------------

-- Inspeção 2 (SUBMITTED) — tudo conforme, sem não conformidade.
INSERT INTO inspection_responses (id, inspection_id, inspection_item_id, value_boolean, conformity, answered_by, answered_at_device, server_received_at)
SELECT gen_random_uuid(), s.inspection_id, s.id, v.value, v.conformity, :'tech1_id', now() - interval '1 day 2 hours 30 minutes', now() - interval '1 day 2 hours 20 minutes'
FROM inspection_item_snapshots s
JOIN (VALUES
    ('O nível de óleo está adequado?',   TRUE,  'CONFORMING'),
    ('Existem vazamentos?',              FALSE, 'CONFORMING'),
    ('A bateria está em boas condições?',TRUE,  'CONFORMING'),
    ('O gerador iniciou corretamente?',  TRUE,  'CONFORMING')
) AS v(item_title, value, conformity) ON v.item_title = s.item_title
WHERE s.inspection_id = :'insp_submitted_id';

-- Inspeção 3 (UNDER_REVIEW) — só os itens obrigatórios foram respondidos
-- (RN-037 permite concluir sem os opcionais).
INSERT INTO inspection_responses (id, inspection_id, inspection_item_id, value_text, value_date, value_json, value_boolean, conformity, answered_by, answered_at_device, server_received_at)
SELECT gen_random_uuid(), s.inspection_id, s.id, v.value_text, v.value_date, v.value_json, v.value_boolean, v.conformity, :'tech1_id', now() - interval '2 days 1 hour', now() - interval '2 days 50 minutes'
FROM inspection_item_snapshots s
JOIN (VALUES
    ('Localização',                       'Corredor B, próximo à saída de emergência', NULL::date, NULL::jsonb, NULL::boolean, NULL),
    ('Tipo do extintor',                  NULL, NULL, '{"selected": "PQS"}'::jsonb, NULL, NULL),
    ('Data de validade',                  NULL, (CURRENT_DATE + interval '6 months')::date, NULL, NULL, NULL),
    ('O lacre está intacto?',             NULL, NULL, NULL, TRUE, 'CONFORMING'),
    ('O manômetro está na faixa verde?',  NULL, NULL, NULL, TRUE, 'CONFORMING'),
    ('Existe corrosão?',                  NULL, NULL, NULL, FALSE, NULL)
) AS v(item_title, value_text, value_date, value_json, value_boolean, conformity) ON v.item_title = s.item_title
WHERE s.inspection_id = :'insp_under_review_id';

-- Inspeção 4 (APPROVED) — narrativa de §10.17: item "bateria" não conforme.
INSERT INTO inspection_responses (id, inspection_id, inspection_item_id, value_boolean, conformity, observation, answered_by, answered_at_device, server_received_at)
SELECT gen_random_uuid(), s.inspection_id, s.id, v.value, v.conformity, v.observation, :'tech1_id', now() - interval '10 days 2 hours 30 minutes', now() - interval '10 days 2 hours 20 minutes'
FROM inspection_item_snapshots s
JOIN (VALUES
    ('O nível de óleo está adequado?',    TRUE,  'CONFORMING',     NULL),
    ('Existem vazamentos?',               FALSE, 'CONFORMING',     'Não existem vazamentos'),
    ('A bateria está em boas condições?', FALSE, 'NON_CONFORMING', 'Foram identificados sinais de corrosão nos terminais.'),
    ('O gerador iniciou corretamente?',   TRUE,  'CONFORMING',     NULL)
) AS v(item_title, value, conformity, observation) ON v.item_title = s.item_title
WHERE s.inspection_id = :'insp_approved_id';

-- Inspeção 5 (IN_PROGRESS pós-reprovação) — manômetro não conforme, motivo
-- da reprovação foi a qualidade da fotografia anexada a este item.
INSERT INTO inspection_responses (id, inspection_id, inspection_item_id, value_text, value_date, value_json, value_boolean, conformity, answered_by, answered_at_device, server_received_at)
SELECT gen_random_uuid(), s.inspection_id, s.id, v.value_text, v.value_date, v.value_json, v.value_boolean, v.conformity, :'tech1_id', now() - interval '5 days 1 hour', now() - interval '5 days 50 minutes'
FROM inspection_item_snapshots s
JOIN (VALUES
    ('Localização',                       'Corredor A, próximo ao almoxarifado', NULL::date, NULL::jsonb, NULL::boolean, NULL),
    ('Tipo do extintor',                  NULL, NULL, '{"selected": "CO2"}'::jsonb, NULL, NULL),
    ('Data de validade',                  NULL, (CURRENT_DATE + interval '2 months')::date, NULL, NULL, NULL),
    ('O lacre está intacto?',             NULL, NULL, NULL, TRUE, 'CONFORMING'),
    ('O manômetro está na faixa verde?',  NULL, NULL, NULL, FALSE, 'NON_CONFORMING'),
    ('Existe corrosão?',                  NULL, NULL, NULL, FALSE, NULL)
) AS v(item_title, value_text, value_date, value_json, value_boolean, conformity) ON v.item_title = s.item_title
WHERE s.inspection_id = :'insp_rejected_id';

-- ----------------------------------------------------------------------------
-- Evidências
-- ----------------------------------------------------------------------------
INSERT INTO evidence (id, inspection_id, response_id, type, storage_key, mime_type, size_bytes, description, captured_at_device, server_received_at, uploaded_at, created_by, created_at)
SELECT gen_random_uuid(), :'insp_approved_id', r.id, 'PHOTO', v.storage_key, 'image/jpeg', v.size_bytes, v.description,
       now() - interval '10 days 2 hours 15 minutes', now() - interval '10 days 2 hours 10 minutes', now() - interval '10 days 2 hours 10 minutes',
       :'tech1_id', now() - interval '10 days 2 hours 15 minutes'
FROM inspection_responses r
JOIN inspection_item_snapshots s ON s.id = r.inspection_item_id
JOIN (VALUES
    ('evidence/2026/generator/bateria-geral.jpg',     245678, 'Foto geral da bateria'),
    ('evidence/2026/generator/bateria-terminais.jpg', 198234, 'Foto aproximada dos terminais')
) AS v(storage_key, size_bytes, description) ON TRUE
WHERE s.inspection_id = :'insp_approved_id' AND s.item_title = 'A bateria está em boas condições?';

INSERT INTO evidence (id, inspection_id, response_id, type, storage_key, mime_type, size_bytes, description, captured_at_device, server_received_at, uploaded_at, created_by, created_at)
SELECT gen_random_uuid(), :'insp_rejected_id', r.id, 'PHOTO', 'evidence/2026/extintor/manometro.jpg', 'image/jpeg', 87654, 'Foto do manômetro (reprovada por falta de nitidez)',
       now() - interval '5 days 50 minutes', now() - interval '5 days 45 minutes', now() - interval '5 days 45 minutes',
       :'tech1_id', now() - interval '5 days 50 minutes'
FROM inspection_responses r
JOIN inspection_item_snapshots s ON s.id = r.inspection_item_id
WHERE s.inspection_id = :'insp_rejected_id' AND s.item_title = 'O manômetro está na faixa verde?';

-- ----------------------------------------------------------------------------
-- Não conformidade (inspeção 4 — mesma narrativa de §10.17)
-- ----------------------------------------------------------------------------
INSERT INTO non_conformities (id, inspection_id, inspection_item_id, response_id, title, description, severity, status, created_by, created_at_device, server_received_at)
SELECT gen_random_uuid(), :'insp_approved_id', s.id, r.id,
       'Corrosão nos terminais da bateria',
       'Foram identificados sinais de corrosão nos terminais.',
       'HIGH', 'OPEN', :'tech1_id', now() - interval '10 days 2 hours 10 minutes', now() - interval '10 days 2 hours 5 minutes'
FROM inspection_responses r
JOIN inspection_item_snapshots s ON s.id = r.inspection_item_id
WHERE s.inspection_id = :'insp_approved_id' AND s.item_title = 'A bateria está em boas condições?';

-- ----------------------------------------------------------------------------
-- Revisões
-- ----------------------------------------------------------------------------
INSERT INTO inspection_reviews (id, inspection_id, reviewer_id, decision, reason, comments, reviewed_at, review_cycle) VALUES
(gen_random_uuid(), :'insp_approved_id', :'supervisor_id', 'APPROVED', NULL, 'Inspeção aprovada com não conformidade aberta.', now() - interval '9 days', 1),
(gen_random_uuid(), :'insp_rejected_id', :'supervisor_id', 'REJECTED', 'A fotografia do item 4 não permite identificar o número de série.', NULL, now() - interval '4 days', 1);

-- ----------------------------------------------------------------------------
-- Auditoria — trilha completa na inspeção aprovada (espelha §10.17), trilha
-- mínima (criação + transição chave) nas demais.
-- ----------------------------------------------------------------------------
INSERT INTO audit_events (id, inspection_id, actor_id, action, entity_type, entity_id, occurred_at) VALUES
(gen_random_uuid(), :'insp_assigned_id', :'supervisor_id', 'INSPECTION_CREATED',  'INSPECTION', :'insp_assigned_id', now() - interval '2 days'),
(gen_random_uuid(), :'insp_assigned_id', :'supervisor_id', 'INSPECTION_ASSIGNED', 'INSPECTION', :'insp_assigned_id', now() - interval '2 days'),

(gen_random_uuid(), :'insp_submitted_id', :'supervisor_id', 'INSPECTION_CREATED',   'INSPECTION', :'insp_submitted_id', now() - interval '2 days'),
(gen_random_uuid(), :'insp_submitted_id', :'supervisor_id', 'INSPECTION_ASSIGNED',  'INSPECTION', :'insp_submitted_id', now() - interval '2 days'),
(gen_random_uuid(), :'insp_submitted_id', :'tech1_id',      'INSPECTION_STARTED',   'INSPECTION', :'insp_submitted_id', now() - interval '1 day 3 hours'),
(gen_random_uuid(), :'insp_submitted_id', :'tech1_id',      'INSPECTION_SUBMITTED', 'INSPECTION', :'insp_submitted_id', now() - interval '1 day 1 hour 55 minutes'),

(gen_random_uuid(), :'insp_under_review_id', :'supervisor_id', 'INSPECTION_CREATED',   'INSPECTION', :'insp_under_review_id', now() - interval '3 days'),
(gen_random_uuid(), :'insp_under_review_id', :'tech1_id',      'INSPECTION_SUBMITTED', 'INSPECTION', :'insp_under_review_id', now() - interval '2 days 1 hour 55 minutes'),
(gen_random_uuid(), :'insp_under_review_id', :'supervisor_id', 'REVIEW_STARTED',       'INSPECTION', :'insp_under_review_id', now() - interval '1 day 12 hours'),

(gen_random_uuid(), :'insp_approved_id', :'supervisor_id', 'INSPECTION_CREATED',      'INSPECTION', :'insp_approved_id', now() - interval '11 days'),
(gen_random_uuid(), :'insp_approved_id', :'supervisor_id', 'INSPECTION_ASSIGNED',     'INSPECTION', :'insp_approved_id', now() - interval '11 days'),
(gen_random_uuid(), :'insp_approved_id', :'tech1_id',      'INSPECTION_STARTED',      'INSPECTION', :'insp_approved_id', now() - interval '10 days 3 hours'),
(gen_random_uuid(), :'insp_approved_id', :'tech1_id',      'EVIDENCE_ADDED',          'EVIDENCE',   :'insp_approved_id', now() - interval '10 days 2 hours 15 minutes'),
(gen_random_uuid(), :'insp_approved_id', :'tech1_id',      'NON_CONFORMITY_CREATED',  'NON_CONFORMITY', :'insp_approved_id', now() - interval '10 days 2 hours 5 minutes'),
(gen_random_uuid(), :'insp_approved_id', :'tech1_id',      'INSPECTION_COMPLETED',    'INSPECTION', :'insp_approved_id', now() - interval '10 days 2 hours'),
(gen_random_uuid(), :'insp_approved_id', :'tech1_id',      'INSPECTION_SUBMITTED',    'INSPECTION', :'insp_approved_id', now() - interval '10 days 1 hour 55 minutes'),
(gen_random_uuid(), :'insp_approved_id', :'supervisor_id', 'REVIEW_STARTED',          'INSPECTION', :'insp_approved_id', now() - interval '9 days 1 hour'),
(gen_random_uuid(), :'insp_approved_id', :'supervisor_id', 'INSPECTION_APPROVED',     'INSPECTION', :'insp_approved_id', now() - interval '9 days'),

(gen_random_uuid(), :'insp_rejected_id', :'supervisor_id', 'INSPECTION_CREATED',   'INSPECTION', :'insp_rejected_id', now() - interval '6 days'),
(gen_random_uuid(), :'insp_rejected_id', :'tech1_id',      'INSPECTION_SUBMITTED','INSPECTION', :'insp_rejected_id', now() - interval '5 days'),
(gen_random_uuid(), :'insp_rejected_id', :'supervisor_id', 'REVIEW_STARTED',       'INSPECTION', :'insp_rejected_id', now() - interval '4 days 1 hour'),
(gen_random_uuid(), :'insp_rejected_id', :'supervisor_id', 'INSPECTION_REJECTED',  'INSPECTION', :'insp_rejected_id', now() - interval '4 days'),

(gen_random_uuid(), :'insp_canceled_id', :'supervisor_id', 'INSPECTION_CREATED',  'INSPECTION', :'insp_canceled_id', now() - interval '3 days'),
(gen_random_uuid(), :'insp_canceled_id', :'supervisor_id', 'INSPECTION_ASSIGNED', 'INSPECTION', :'insp_canceled_id', now() - interval '3 days'),
(gen_random_uuid(), :'insp_canceled_id', :'supervisor_id', 'INSPECTION_CANCELED', 'INSPECTION', :'insp_canceled_id', now() - interval '1 day'),

(gen_random_uuid(), :'insp_draft_id', :'supervisor_id', 'INSPECTION_CREATED', 'INSPECTION', :'insp_draft_id', now() - interval '1 hour');

COMMIT;

-- ----------------------------------------------------------------------------
-- Conferência rápida pós-seed (apenas informativo — não falha o script).
-- ----------------------------------------------------------------------------
SELECT 'users' AS tabela, count(*) FROM users
UNION ALL SELECT 'clients', count(*) FROM clients
UNION ALL SELECT 'inspection_sites', count(*) FROM inspection_sites
UNION ALL SELECT 'equipment', count(*) FROM equipment
UNION ALL SELECT 'inspection_templates', count(*) FROM inspection_templates
UNION ALL SELECT 'inspection_template_versions', count(*) FROM inspection_template_versions
UNION ALL SELECT 'template_sections', count(*) FROM template_sections
UNION ALL SELECT 'template_items', count(*) FROM template_items
UNION ALL SELECT 'inspections', count(*) FROM inspections
UNION ALL SELECT 'inspection_item_snapshots', count(*) FROM inspection_item_snapshots
UNION ALL SELECT 'inspection_responses', count(*) FROM inspection_responses
UNION ALL SELECT 'evidence', count(*) FROM evidence
UNION ALL SELECT 'non_conformities', count(*) FROM non_conformities
UNION ALL SELECT 'inspection_reviews', count(*) FROM inspection_reviews
UNION ALL SELECT 'audit_events', count(*) FROM audit_events;
