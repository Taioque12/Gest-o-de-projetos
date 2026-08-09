import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
const ignoredDirectories = new Set([
  '.agents',
  '.git',
  'dist',
  'node_modules',
])

function listSqlFiles(directory = projectRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : listSqlFiles(path)
    }

    return extname(entry.name).toLowerCase() === '.sql' ? [path] : []
  })
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\r\n]*/g, '')
}

function displayPath(path) {
  return relative(projectRoot, path).replaceAll('\\', '/')
}

const sqlSources = listSqlFiles().map((path) => ({
  path,
  name: displayPath(path),
  sql: stripSqlComments(readFileSync(path, 'utf8')),
}))

const protectedTables = [
  'atualizacoes_semana',
  'frentes_servico',
  'tarefas',
  'suprimentos',
  'fvs',
  'habilidades',
  'avaliacoes_habilidades',
]

function policyStatements(sql) {
  return sql.match(/create\s+policy\b[\s\S]*?;/gi) ?? []
}

function policiesForTable(sql, table) {
  const tablePattern = new RegExp(`\\bon\\s+(?:public\\s*\\.\\s*)?${table}\\b`, 'i')
  return policyStatements(sql).filter((statement) => tablePattern.test(statement))
}

describe('regressões de segurança SQL', () => {
  it('força novos cadastros para o perfil cliente', () => {
    const definitions = sqlSources.flatMap(({ name, sql }) => {
      const functions = sql.match(
        /create\s+or\s+replace\s+function\s+(?:public\s*\.\s*)?handle_new_user\s*\(\s*\)[\s\S]*?\$\$\s*;/gi,
      ) ?? []

      return functions.map((definition) => ({ name, definition }))
    })

    expect(definitions.length, 'handle_new_user() deve existir nas fontes SQL').toBeGreaterThan(0)

    for (const { name, definition } of definitions) {
      expect(
        definition,
        `${name}: handle_new_user() não pode confiar no perfil enviado no cadastro`,
      ).not.toMatch(/raw_user_meta_data\s*->>\s*'perfil'/i)
      expect(
        definition,
        `${name}: handle_new_user() deve atribuir explicitamente o perfil cliente`,
      ).toMatch(/['"]cliente['"]/i)
    }
  })

  it.each(protectedTables)('não cria policy irrestrita para %s', (table) => {
    const policies = sqlSources.flatMap(({ name, sql }) => (
      policiesForTable(sql, table).map((statement) => ({ name, statement }))
    ))

    expect(policies.length, `deve haver ao menos uma policy para ${table}`).toBeGreaterThan(0)

    for (const { name, statement } of policies) {
      expect(
        statement,
        `${name}: policy de ${table} não pode conter USING (true)`,
      ).not.toMatch(/\busing\s*\(\s*true\s*\)/i)
      expect(
        statement,
        `${name}: policy de ${table} não pode conter WITH CHECK (true)`,
      ).not.toMatch(/\bwith\s+check\s*\(\s*true\s*\)/i)
    }
  })

  it('não usa a claim JWT perfil como fonte de autorização', () => {
    const jwtProfilePattern = /auth\s*\.\s*jwt\s*\(\s*\)\s*->>?\s*['"]perfil['"]/i

    for (const { name, sql } of sqlSources) {
      expect(
        sql,
        `${name}: use get_my_perfil() em vez da claim JWT perfil`,
      ).not.toMatch(jwtProfilePattern)
    }
  })

  it('isola a leitura de embeddings por perfil e vínculo com projeto', () => {
    const pgvectorFiles = [
      'migracao-pgvector-agentdb.sql',
      'fix-policy.sql',
    ]

    for (const name of pgvectorFiles) {
      const source = sqlSources.find((item) => item.name === name)
      expect(source, `${name} deve existir`).toBeDefined()
      expect(source.sql, `${name} deve validar o perfil no banco`).toMatch(/\bget_my_perfil\s*\(/i)
      expect(source.sql, `${name} deve validar o vínculo do cliente`).toMatch(/\bacessos_cliente\b/i)
      expect(source.sql, `${name} deve vincular o acesso ao usuário autenticado`).toMatch(
        /usuario_id\s*=\s*auth\s*\.\s*uid\s*\(\s*\)/i,
      )
    }
  })

  it('protege perfil e ativo de forma fechada sem bloquear service_role', () => {
    const definitions = sqlSources.flatMap(({ name, sql }) => {
      const functions = sql.match(
        /create\s+or\s+replace\s+function\s+(?:public\s*\.\s*)?protege_(?:perfil|ativo)\s*\(\s*\)[\s\S]*?\$\$\s*;/gi,
      ) ?? []

      return functions.map((definition) => ({ name, definition }))
    })

    expect(definitions.length, 'as duas funções de proteção devem existir').toBeGreaterThanOrEqual(2)
    for (const { name, definition } of definitions) {
      expect(definition, `${name}: usuário sem perfil ativo deve ser bloqueado`).toMatch(
        /get_my_perfil\s*\(\s*\)\s+is\s+distinct\s+from\s+['"]admin['"]/i,
      )
      expect(definition, `${name}: service_role deve permanecer autorizado`).toMatch(
        /auth\s*\.\s*role\s*\(\s*\)\s+is\s+distinct\s+from\s+['"]service_role['"]/i,
      )
    }
  })

  it('inclui pgvector filtrável na migration implantável', () => {
    const name = 'supabase/migrations/20260809000000_security_rls_hardening.sql'
    const migration = sqlSources.find((item) => item.name === name)

    expect(migration, `${name} deve existir`).toBeDefined()
    expect(migration.sql).toMatch(/\bprojetos_embeddings\b/i)
    expect(migration.sql).toMatch(/\bmatch_projetos\s*\(/i)
    expect(migration.sql).toMatch(/\bfilter_projeto_id\s+uuid\s+default\s+null\b/i)
    expect(migration.sql).toMatch(/pe\.projeto_id\s*=\s*filter_projeto_id/i)
  })

  it('mantém uma fila persistente e indexada para o Scrum Agent', () => {
    const schema = sqlSources.find((item) => item.name === 'schema-supabase.sql')
    const migration = sqlSources.find((item) => (
      item.name === 'supabase/migrations/20260809000000_security_rls_hardening.sql'
    ))

    expect(schema, 'schema raiz deve existir').toBeDefined()
    expect(migration, 'migration implantável deve existir').toBeDefined()

    for (const source of [schema, migration]) {
      expect(source.sql).toMatch(/\bscrum_analisado_em\s+timestamptz\b/i)
      expect(source.sql).toMatch(
        /create\s+index(?:\s+if\s+not\s+exists)?\s+idx_projetos_scrum_fila[\s\S]*?scrum_analisado_em\s+asc\s+nulls\s+first[\s\S]*?\bid\b/i,
      )
    }
  })

  it('filtra o RAG do chat pelo projeto atual', () => {
    const chatSource = readFileSync(
      join(projectRoot, 'supabase/functions/chat-projeto/index.ts'),
      'utf8',
    )

    expect(chatSource).toMatch(/filter_projeto_id\s*:\s*projeto_id/)
  })
})
