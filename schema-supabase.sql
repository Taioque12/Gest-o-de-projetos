-- ========================================
-- MA CONEGLIAN · Schema do Banco Supabase
-- ========================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ========== TABELA: Usuários e Perfis ==========
create table if not exists usuarios (
  -- ATENÇÃO: Em produção, descomente a restrição "references auth.users(id)" 
  -- e remova o "default gen_random_uuid()" para garantir a integridade com o Supabase Auth.
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nome text not null,
  perfil text not null check (perfil in ('admin', 'equipe', 'cliente')),
  criado_em timestamp default now(),
  ativo boolean default true
);

-- ========== TRIGGER: Sincronizar Supabase Auth -> usuarios ==========
-- Copia automaticamente os novos usuários registrados na tela de login para esta tabela
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nome, perfil)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'nome', 'Usuário'), 
    coalesce(new.raw_user_meta_data->>'perfil', 'cliente')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========== TABELA: Projetos (OS) ==========
create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  os text unique not null,
  nome text not null,
  cliente text not null,
  escopo text,
  responsavel text,
  data_inicio date,
  data_fim date,
  prazo_meses numeric(5,1),
  valor_os numeric(15,2),
  equipes text[],  -- array de nomes de equipe
  acao_recomendada text,
  criado_em timestamp default now(),
  atualizado_em timestamp default now()
);

-- ========== TABELA: Atualizações Semanais (Avanço Físico) ==========
create table if not exists atualizacoes_semana (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  data_atualizacao date not null,
  avanco_previsto numeric(5,2),  -- % planejado para aquela semana
  avanco_realizado numeric(5,2), -- % executado para aquela semana
  semana_numero integer,          -- semana do projeto (1, 2, 3, ...)
  criado_em timestamp default now(),
  atualizado_por text,
  unique(projeto_id, data_atualizacao)
);

-- ========== TABELA: Frentes de Serviço ==========
create table if not exists frentes_servico (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  nome_frente text not null,
  avanco_previsto numeric(5,2),
  avanco_realizado numeric(5,2),
  criado_em timestamp default now()
);

-- ========== TABELA: Efetivo Semanal (Histograma de Mão de Obra) ==========
create table if not exists efetivo_semana (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  data_semana date not null,
  previstos integer default 0,    -- profissionais previstos para a semana
  mobilizados integer,            -- profissionais mobilizados (real); null = não lançado
  semana_numero integer,          -- nº da semana do projeto (1, 2, 3, ...)
  criado_em timestamp default now(),
  unique(projeto_id, data_semana)
);

-- ========== TABELA: Acessos do Cliente (Contratos) ==========
create table if not exists acessos_cliente (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  projeto_id uuid not null references projetos(id) on delete cascade,
  criado_em timestamp default now(),
  unique(usuario_id, projeto_id)
);

-- ========== TABELA: Uploads de XML (Rastreabilidade) ==========
create table if not exists uploads_xml (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete set null,
  nome_arquivo text,
  url_storage text,
  status text check (status in ('enviado', 'processando', 'sucesso', 'erro')),
  mensagem_erro text,
  criado_em timestamp default now(),
  processado_em timestamp,
  enviado_por text
);

-- ========== ÍNDICES ==========
create index idx_projetos_os on projetos(os);
create index idx_projetos_cliente on projetos(cliente);
create index idx_atualizacoes_projeto on atualizacoes_semana(projeto_id);
create index idx_atualizacoes_data on atualizacoes_semana(data_atualizacao);
create index idx_frentes_projeto on frentes_servico(projeto_id);
create index idx_efetivo_projeto on efetivo_semana(projeto_id);
create index idx_acessos_usuario on acessos_cliente(usuario_id);
create index idx_uploads_projeto on uploads_xml(projeto_id);

-- ========== RLS (Row Level Security) — Controle de Acesso ==========
alter table projetos enable row level security;
alter table atualizacoes_semana enable row level security;
alter table frentes_servico enable row level security;
alter table acessos_cliente enable row level security;

-- Policy: Admin vê tudo
create policy "admin_all_projetos" on projetos
  for select using (
    auth.jwt()->>'email' in (select email from usuarios where perfil = 'admin' and ativo = true)
  );

-- Policy: Equipe vê todos os projetos
create policy "equipe_all_projetos" on projetos
  for select using (
    auth.jwt()->>'email' in (select email from usuarios where perfil = 'equipe' and ativo = true)
  );

-- Policy: Cliente vê apenas os projetos aos quais tem acesso
create policy "cliente_own_projetos" on projetos
  for select using (
    id in (
      select projeto_id from acessos_cliente
      where usuario_id = (select id from usuarios where email = auth.jwt()->>'email')
    )
  );

-- Políticas similares para atualizações_semana e frentes_servico
create policy "all_atualizacoes" on atualizacoes_semana
  for select using (true);

create policy "all_frentes" on frentes_servico
  for select using (true);

-- ========== DADOS INICIAIS (Ficticios) ==========
insert into usuarios (email, nome, perfil) values
  ('gestor@maconeglia.com', 'Gestor MA CONEGLIAN', 'admin'),
  ('carlos@maconeglia.com', 'Eng. Carlos Menezes', 'equipe'),
  ('patricia@maconeglia.com', 'Eng. Patrícia Lopes', 'equipe'),
  ('rafael@maconeglia.com', 'Téc. Rafael Souza', 'equipe'),
  ('contato@petroquimica.com', 'Petroquímica Norte', 'cliente'),
  ('contato@logistica-sul.com', 'Logística Sul', 'cliente');

insert into projetos (os, nome, cliente, escopo, responsavel, data_inicio, data_fim, prazo_meses, valor_os, equipes, acao_recomendada) values
  ('2024-0142', 'Subestação 13,8kV / 480V — Ampliação', 'Petroquímica Norte S.A.', 'Instalações elétricas / MT', 'Eng. Carlos Menezes', '2026-01-26', '2026-09-28', 8.0, 2850000, '{"Equipe A · Montagem Eletromecânica","Equipe D · Comissionamento"}', 'Manter ritmo. Antecipar mobilização Equipe D para comissionamento.'),
  ('2024-0156', 'Infraestrutura Elétrica & Eletrocalhas — Galpão 3', 'Logística Sul Ltda', 'Infraestrutura / BT', 'Eng. Patrícia Lopes', '2026-03-16', '2026-07-31', 4.5, 1120000, '{"Equipe B · Infraestrutura/Eletrocalhas"}', 'Reforçar Equipe B com turno adicional.'),
  ('2024-0163', 'SPDA e Aterramento — Tancagem', 'Terminal Portuário Atlântico', 'SPDA / Aterramento', 'Téc. Rafael Souza', '2026-05-25', '2026-07-24', 2.0, 480000, '{"Equipe E · SPDA/Aterramento","Equipe A · Montagem (compartilhada)"}', 'AÇÃO IMEDIATA — liberar material retido, realocar Equipe A.'),
  ('2024-0171', 'SDAI — Detecção e Alarme de Incêndio', 'Aliment. BomSabor', 'SDAI', 'Eng. Patrícia Lopes', '2026-05-04', '2026-08-03', 3.0, 760000, '{"Equipe C · Instrumentação & Automação (parcial)"}', 'Dentro da tolerância. Concluir testes de loop.'),
  ('2024-0178', 'Automação & Comissionamento — Linha de Envase', 'Bebidas Premium S.A.', 'Automação / Comissionamento', 'Eng. Carlos Menezes', '2026-04-13', '2026-10-12', 6.0, 1640000, '{"Equipe C · Instrumentação & Automação (compartilhada)"}', 'Plano de recuperação. Definir prioridade entre OS 0171 e 0178.'),
  ('2024-0185', 'Iluminação Industrial LED — Retrofit', 'Metalúrgica Aço Forte', 'Iluminação', 'Téc. Rafael Souza', '2026-05-15', '2026-06-29', 1.5, 320000, '{"Equipe B · Infraestrutura (compartilhada)"}', 'Manter. Programar medições finais e as built.');

-- Acesso dos clientes aos seus respectivos projetos
insert into acessos_cliente (usuario_id, projeto_id)
select u.id, p.id from usuarios u, projetos p
where u.email = 'contato@petroquimica.com' and p.os = '2024-0142'
union all
select u.id, p.id from usuarios u, projetos p
where u.email = 'contato@logistica-sul.com' and p.os = '2024-0156';
