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
// Teste cross-tenant opcional (cliente A deve ter acesso apenas ao projeto A):
//   TESTE_CLIENTE_A_EMAIL=... TESTE_CLIENTE_A_SENHA=... \
//   TESTE_CLIENTE_A_PROJETO_ID=... TESTE_CLIENTE_B_PROJETO_ID=... \
//   TESTE_CLIENTE_B_ATUALIZACAO_ID=... TESTE_CLIENTE_B_FRENTE_ID=...
// A conta de equipe também é obrigatória nesse cenário: ela confirma que as
// fixtures do cliente B existem antes dos testes negativos do cliente A.
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
  if (error) falha(nome, `consulta inválida (${error.code || 'sem código'}): ${error.message}`)
  else if (!data || data.length === 0) ok(nome)
  else falha(nome, `retornou ${data.length} linha(s)`)
}

// Espera que a escrita falhe
async function esperaEscritaBloqueada(sb, tabela, valores, nome, codigoEsperado) {
  const { error } = await sb.from(tabela).insert(valores)
  if (!error) falha(nome, 'insert foi aceito')
  // Para inserts com FK sentinela, exigir 42501 evita confundir uma violação
  // de integridade (23503) com bloqueio real de autorização.
  else if (codigoEsperado && error.code !== codigoEsperado) {
    falha(nome, `insert falhou pelo motivo errado (${error.code || 'sem código'})`)
  } else ok(nome)
}

async function esperaUpdateSemLinhas(sb, tabela, projetoId, registroId, nome) {
  // Atribuir projeto_id ao próprio valor é semanticamente neutro caso uma
  // policy defeituosa permita a operação; o .select() denuncia a linha afetada.
  const { data, error } = await sb
    .from(tabela)
    .update({ projeto_id: projetoId })
    .eq('id', registroId)
    .eq('projeto_id', projetoId)
    .select('id')

  if (error) falha(nome, `update inválido (${error.code || 'sem código'}): ${error.message}`)
  else if (!data || data.length === 0) ok(nome)
  else falha(nome, `UPDATE cross-tenant afetou ${data.length} linha(s)`)
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

  // Cliente não pode criar o próprio vínculo de acesso.
  await esperaEscritaBloqueada(
    sb,
    'acessos_cliente',
    { usuario_id: user.id, projeto_id: '00000000-0000-0000-0000-000000000000' },
    'cliente não se auto-concede acesso',
    '42501',
  )

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

  // Equipe pode criar e editar projetos. Confirma a escrita com uma atualização
  // neutra em um registro visível, sem criar dados ou alterar valor de negócio.
  const { data: projeto, error: projetoError } = await sb
    .from('projetos')
    .select('id,nome')
    .limit(1)
    .maybeSingle()

  if (projetoError || !projeto) {
    falha('equipe encontra projeto para validar edição', projetoError?.message || 'nenhuma fixture disponível')
  } else {
    const { data: editado, error: editarError } = await sb
      .from('projetos')
      .update({ nome: projeto.nome })
      .eq('id', projeto.id)
      .select('id')

    if (!editarError && editado?.length === 1) ok('equipe edita projeto com operação neutra')
    else falha('equipe edita projeto com operação neutra', editarError?.message || `afetou ${editado?.length ?? 0} linha(s)`)
  }

  // Equipe não administra vínculos de clientes.
  await esperaEscritaBloqueada(
    sb,
    'acessos_cliente',
    { usuario_id: user.id, projeto_id: '00000000-0000-0000-0000-000000000000' },
    'equipe não concede acesso de cliente',
    '42501',
  )

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

async function testarCrossTenant() {
  const nomesCrossTenant = [
    'TESTE_CLIENTE_A_EMAIL',
    'TESTE_CLIENTE_A_SENHA',
    'TESTE_CLIENTE_A_PROJETO_ID',
    'TESTE_CLIENTE_B_PROJETO_ID',
    'TESTE_CLIENTE_B_ATUALIZACAO_ID',
    'TESTE_CLIENTE_B_FRENTE_ID',
  ]
  const configuracaoSolicitada = nomesCrossTenant.some(nome => process.env[nome])

  if (!configuracaoSolicitada) {
    console.log('\n[cross-tenant] variáveis de cliente A/B não definidas — pulando.')
    return
  }

  const nomesObrigatorios = [
    ...nomesCrossTenant,
    'TESTE_EQUIPE_EMAIL',
    'TESTE_EQUIPE_SENHA',
  ]
  const ausentes = nomesObrigatorios.filter(nome => !process.env[nome])
  if (ausentes.length > 0) {
    falha('configuração cross-tenant completa', `faltam: ${ausentes.join(', ')}`)
    return
  }

  const email = process.env.TESTE_CLIENTE_A_EMAIL
  const senha = process.env.TESTE_CLIENTE_A_SENHA
  const projetoA = process.env.TESTE_CLIENTE_A_PROJETO_ID
  const projetoB = process.env.TESTE_CLIENTE_B_PROJETO_ID
  const atualizacaoB = process.env.TESTE_CLIENTE_B_ATUALIZACAO_ID
  const frenteB = process.env.TESTE_CLIENTE_B_FRENTE_ID

  if (projetoA === projetoB) {
    falha('configuração cross-tenant usa projetos distintos', 'projeto A e projeto B são iguais')
    return
  }

  console.log(`\n[cross-tenant] validando fixtures do projeto B`)
  const sbEquipe = createClient(URL, ANON)
  const { error: equipeLoginError } = await sbEquipe.auth.signInWithPassword({
    email: process.env.TESTE_EQUIPE_EMAIL,
    password: process.env.TESTE_EQUIPE_SENHA,
  })
  if (equipeLoginError) {
    falha('login equipe para validar fixtures cross-tenant', equipeLoginError.message)
    return
  }

  let fixturesValidas = true
  for (const { tabela, rotulo, id } of [
    { tabela: 'atualizacoes_semana', rotulo: 'atualização', id: atualizacaoB },
    { tabela: 'frentes_servico', rotulo: 'frente', id: frenteB },
  ]) {
    const { data, error } = await sbEquipe
      .from(tabela)
      .select('id')
      .eq('id', id)
      .eq('projeto_id', projetoB)
      .maybeSingle()

    if (!error && data) ok(`fixture de ${rotulo} do projeto B existe`)
    else {
      fixturesValidas = false
      falha(`fixture de ${rotulo} do projeto B existe`, error?.message || 'ID não pertence ao projeto B')
    }
  }
  await sbEquipe.auth.signOut()
  if (!fixturesValidas) return

  console.log(`\n[cross-tenant] ${email}`)
  const sb = createClient(URL, ANON)
  const { error: loginError } = await sb.auth.signInWithPassword({ email, password: senha })
  if (loginError) { falha('login cliente A', loginError.message); return }

  const { data: permitido, error: permitidoError } = await sb
    .from('projetos').select('id').eq('id', projetoA)
  if (!permitidoError && permitido?.length === 1) ok('cliente A vê o próprio projeto')
  else falha('cliente A vê o próprio projeto', permitidoError?.message || `retornou ${permitido?.length ?? 0} linha(s)`)

  const { data: proibido, error: proibidoError } = await sb
    .from('projetos').select('id').eq('id', projetoB)
  if (proibidoError) falha('cliente A não vê projeto do cliente B', proibidoError.message)
  else if (!proibido || proibido.length === 0) ok('cliente A não vê projeto do cliente B')
  else falha('cliente A não vê projeto do cliente B', `retornou ${proibido.length} linha(s)`)

  for (const [tabela, rotulo, registroId] of [
    ['atualizacoes_semana', 'atualizações', atualizacaoB],
    ['frentes_servico', 'frentes', frenteB],
  ]) {
    const { data, error } = await sb
      .from(tabela)
      .select('id')
      .eq('id', registroId)
      .eq('projeto_id', projetoB)
    if (error) falha(`cliente A não vê ${rotulo} do cliente B`, error.message)
    else if (!data || data.length === 0) ok(`cliente A não vê ${rotulo} do cliente B`)
    else falha(`cliente A não vê ${rotulo} do cliente B`, `retornou ${data.length} linha(s)`)

    await esperaUpdateSemLinhas(
      sb,
      tabela,
      projetoB,
      registroId,
      `cliente A não atualiza ${rotulo} do cliente B`,
    )
  }

  await sb.auth.signOut()
}

console.log('=== Teste de isolamento RLS ===')
await testarCliente()
await testarEquipe()
await testarCrossTenant()

console.log(`\n${testes} teste(s), ${falhas.length} falha(s).`)
if (falhas.length > 0) {
  console.error('VAZAMENTO DETECTADO — não faça deploy até corrigir:')
  falhas.forEach(f => console.error(` - ${f}`))
  process.exit(1)
}
console.log('Isolamento OK.')
