// ============================================================
// Teste de isolamento RLS — rodar antes de cada deploy
//
// Loga como usuário de teste (cliente e equipe) e tenta acessar
// dados que as policies deveriam bloquear. Qualquer vazamento
// encerra com exit code 1 (dá pra plugar em CI).
//
// Uso (na pasta frontend):
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   TESTE_CLIENTE_EMAIL=... TESTE_CLIENTE_SENHA=... \
//   TESTE_EQUIPE_EMAIL=... TESTE_EQUIPE_SENHA=... \
//   node scripts/teste-isolamento.mjs
//
// Os usuários de teste devem existir no Supabase Auth:
//   - um com perfil 'cliente' SEM acesso a nenhum projeto
//   - um com perfil 'equipe'
// ============================================================
import { createClient } from '@supabase/supabase-js'

const URL  = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY

if (!URL || !ANON) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const falhas = []
let testes = 0

function ok(nome)         { testes++; console.log(`  ✓ ${nome}`) }
function falha(nome, det) { testes++; falhas.push(nome); console.error(`  ✗ ${nome}${det ? ' — ' + det : ''}`) }

// Espera que a leitura NÃO retorne linhas (bloqueada ou vazia por RLS)
async function esperaBloqueado(sb, tabela, nome) {
  const { data, error } = await sb.from(tabela).select('*').limit(5)
  if (error || !data || data.length === 0) ok(nome)
  else falha(nome, `retornou ${data.length} linha(s)`)
}

// Espera que a escrita falhe
async function esperaEscritaBloqueada(sb, tabela, valores, nome) {
  const { error } = await sb.from(tabela).insert(valores)
  if (error) ok(nome)
  else falha(nome, 'insert foi aceito')
}

async function testarCliente() {
  const email = process.env.TESTE_CLIENTE_EMAIL
  const senha = process.env.TESTE_CLIENTE_SENHA
  if (!email || !senha) { console.log('\n[cliente] TESTE_CLIENTE_EMAIL/SENHA não definidos — pulando.'); return }

  console.log(`\n[cliente] ${email}`)
  const sb = createClient(URL, ANON)
  const { data: { user }, error } = await sb.auth.signInWithPassword({ email, password: senha })
  if (error) { falha('login cliente', error.message); return }

  // Cliente sem acessos não deve ver nenhum dado de projeto
  await esperaBloqueado(sb, 'projetos',            'cliente sem acesso não vê projetos')
  await esperaBloqueado(sb, 'atualizacoes_semana', 'cliente sem acesso não vê atualizações')
  await esperaBloqueado(sb, 'frentes_servico',     'cliente sem acesso não vê frentes')
  await esperaBloqueado(sb, 'efetivo_semana',      'cliente sem acesso não vê efetivo')
  await esperaBloqueado(sb, 'anexos',              'cliente sem acesso não vê anexos')
  await esperaBloqueado(sb, 'uploads_xml',         'cliente não vê uploads_xml')
  await esperaBloqueado(sb, 'funcionarios',        'cliente não vê funcionários')

  // Só a própria linha em usuarios
  const { data: outros } = await sb.from('usuarios').select('id').neq('id', user.id).limit(1)
  if (!outros || outros.length === 0) ok('cliente não vê outros usuários')
  else falha('cliente não vê outros usuários', 'viu linha alheia')

  // Escalação de privilégio: mudar o próprio perfil deve falhar
  const { data: upd, error: updErr } = await sb
    .from('usuarios').update({ perfil: 'admin' }).eq('id', user.id).select()
  if (updErr || !upd || upd.length === 0) ok('cliente não escala próprio perfil para admin')
  else {
    falha('cliente não escala próprio perfil para admin', 'UPDATE aceito!')
    await sb.from('usuarios').update({ perfil: 'cliente' }).eq('id', user.id) // desfaz
  }

  // Escrita bloqueada
  await esperaEscritaBloqueada(sb, 'projetos', { nome: '__teste_isolamento__' }, 'cliente não cria projeto')
  await esperaEscritaBloqueada(sb, 'acessos_cliente', { usuario_id: user.id, projeto_id: '00000000-0000-0000-0000-000000000000' }, 'cliente não se auto-concede acesso')

  // Storage: listar bucket anexos deve vir vazio/bloqueado
  const { data: objs, error: stErr } = await sb.storage.from('anexos').list()
  if (stErr || !objs || objs.length === 0) ok('cliente não lista bucket anexos')
  else falha('cliente não lista bucket anexos', `viu ${objs.length} objeto(s)`)

  await sb.auth.signOut()
}

async function testarEquipe() {
  const email = process.env.TESTE_EQUIPE_EMAIL
  const senha = process.env.TESTE_EQUIPE_SENHA
  if (!email || !senha) { console.log('\n[equipe] TESTE_EQUIPE_EMAIL/SENHA não definidos — pulando.'); return }

  console.log(`\n[equipe] ${email}`)
  const sb = createClient(URL, ANON)
  const { data: { user }, error } = await sb.auth.signInWithPassword({ email, password: senha })
  if (error) { falha('login equipe', error.message); return }

  // Equipe não cria/edita/exclui projetos (só admin)
  await esperaEscritaBloqueada(sb, 'projetos', { nome: '__teste_isolamento__' }, 'equipe não cria projeto')
  await esperaEscritaBloqueada(sb, 'acessos_cliente', { usuario_id: user.id, projeto_id: '00000000-0000-0000-0000-000000000000' }, 'equipe não concede acesso de cliente')

  // Escalação de privilégio
  const { data: upd, error: updErr } = await sb
    .from('usuarios').update({ perfil: 'admin' }).eq('id', user.id).select()
  if (updErr || !upd || upd.length === 0) ok('equipe não escala próprio perfil para admin')
  else {
    falha('equipe não escala próprio perfil para admin', 'UPDATE aceito!')
    await sb.from('usuarios').update({ perfil: 'equipe' }).eq('id', user.id) // desfaz
  }

  await sb.auth.signOut()
}

console.log('=== Teste de isolamento RLS ===')
await testarCliente()
await testarEquipe()

console.log(`\n${testes} teste(s), ${falhas.length} falha(s).`)
if (falhas.length > 0) {
  console.error('VAZAMENTO DETECTADO — não faça deploy até corrigir:')
  falhas.forEach(f => console.error(` - ${f}`))
  process.exit(1)
}
console.log('Isolamento OK.')
