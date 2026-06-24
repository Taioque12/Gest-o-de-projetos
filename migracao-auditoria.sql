-- ================================================
-- Migração: Auditoria de lançamentos
-- Adiciona usuario_id, lancado_por e origem em
-- atualizacoes_semana e efetivo_semana
-- ================================================

-- atualizacoes_semana
alter table atualizacoes_semana
  add column if not exists usuario_id uuid,
  add column if not exists lancado_por text,
  add column if not exists origem text default 'manual'
    check (origem in ('manual', 'xml'));

-- Migra atualizado_por existente → lancado_por (se houver dados)
update atualizacoes_semana
  set lancado_por = atualizado_por
  where atualizado_por is not null and lancado_por is null;

-- efetivo_semana
alter table efetivo_semana
  add column if not exists usuario_id uuid,
  add column if not exists lancado_por text,
  add column if not exists origem text default 'manual'
    check (origem in ('manual', 'xml'));

-- Índices para queries de auditoria
create index if not exists idx_atualizacoes_usuario on atualizacoes_semana(usuario_id);
create index if not exists idx_efetivo_usuario on efetivo_semana(usuario_id);
