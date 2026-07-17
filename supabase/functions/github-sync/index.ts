import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado.')

    // Verifica se o usuário tem permissão (admin ou equipe)
    const perfil = user.user_metadata?.perfil || (await supabaseClient.from('usuarios').select('perfil').eq('id', user.id).single()).data?.perfil;
    if (perfil !== 'admin' && perfil !== 'equipe') {
      throw new Error('Permissão negada. Apenas admins ou equipe podem sincronizar com o GitHub.')
    }

    const ghToken = Deno.env.get('GITHUB_TOKEN')
    if (!ghToken) throw new Error('GITHUB_TOKEN não configurado nos secrets do Supabase.')

    const repo = Deno.env.get('GITHUB_REPO') || 'Taioque12/Gest-o-de-projetos'
    
    const { action, projeto_id } = await req.json()

    const ghHeaders = {
      'Authorization': `Bearer ${ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    }

    // ─── ACTION: sync_single ─── Sincroniza um único projeto como Issue
    if (action === 'sync_single') {
      if (!projeto_id) throw new Error('projeto_id é obrigatório para sync_single.')

      const { data: p, error: pErr } = await supabaseClient
        .from('projetos')
        .select('*')
        .eq('id', projeto_id)
        .single()
      if (pErr || !p) throw new Error('Projeto não encontrado.')

      const statusEmoji = p.status === 'Concluído' ? '✅' : p.status === 'Cancelado' ? '❌' : '🔄'
      const labels = ['gestao-projetos']
      if (p.real > p.prev) labels.push('estouro-orcamento')
      if (p.data_fim && p.data_fim < new Date().toISOString().slice(0, 10)) labels.push('atrasado')

      const body = `## ${statusEmoji} ${p.nome}

| Campo | Valor |
|---|---|
| **OS** | ${p.os} |
| **Cliente** | ${p.cliente || 'N/A'} |
| **Escopo** | ${p.escopo || 'N/A'} |
| **Responsável** | ${p.responsavel || 'N/A'} |
| **Início** | ${p.data_inicio || 'N/A'} |
| **Término** | ${p.data_fim || 'N/A'} |
| **Valor** | R$ ${p.valor_os ? Number(p.valor_os).toLocaleString('pt-BR') : 'N/A'} |
| **Previsto** | ${p.prev ?? 0}% |
| **Realizado** | ${p.real ?? 0}% |
| **Equipes** | ${(p.equipes || []).join(', ') || 'N/A'} |

${p.alerta_ia ? `### 🤖 Alerta do Scrum Master AI\n> ${p.alerta_ia}` : ''}

---
*Sincronizado automaticamente pelo Gestão de Projetos MA*`

      // Ensure labels exist
      for (const label of labels) {
        await fetch(`https://api.github.com/repos/${repo}/labels`, {
          method: 'POST',
          headers: ghHeaders,
          body: JSON.stringify({ name: label, color: label === 'atrasado' ? 'e11d48' : label === 'estouro-orcamento' ? 'f59e0b' : '6366f1' })
        }) // Ignore errors (label may already exist)
      }

      let issueUrl = ''
      let issueNumber = 0

      if (p.github_issue_number) {
        // Update existing issue
        const res = await fetch(`https://api.github.com/repos/${repo}/issues/${p.github_issue_number}`, {
          method: 'PATCH',
          headers: ghHeaders,
          body: JSON.stringify({
            title: `[OS ${p.os}] ${p.nome}`,
            body,
            labels,
            state: p.status === 'Concluído' ? 'closed' : 'open'
          })
        })
        if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
        const issue = await res.json()
        issueUrl = issue.html_url
        issueNumber = issue.number
      } else {
        // Create new issue
        const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: 'POST',
          headers: ghHeaders,
          body: JSON.stringify({
            title: `[OS ${p.os}] ${p.nome}`,
            body,
            labels
          })
        })
        if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`)
        const issue = await res.json()
        issueUrl = issue.html_url
        issueNumber = issue.number
      }

      // Salva a referência do GitHub no banco
      await supabaseClient
        .from('projetos')
        .update({ github_issue_url: issueUrl, github_issue_number: issueNumber })
        .eq('id', projeto_id)

      return new Response(JSON.stringify({ success: true, issue_url: issueUrl, issue_number: issueNumber }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── ACTION: sync_all ─── Sincroniza TODOS os projetos ativos
    if (action === 'sync_all') {
      const { data: projetos, error: pErr } = await supabaseClient
        .from('projetos')
        .select('id')
        .not('status', 'in', '("Concluído","Cancelado")')

      if (pErr) throw pErr
      
      let synced = 0
      for (const p of (projetos || [])) {
        try {
          // Recursive call to self for each project
          await supabaseClient.functions.invoke('github-sync', {
            body: { action: 'sync_single', projeto_id: p.id, repo }
          })
          synced++
        } catch (e) {
          console.error(`Erro ao sincronizar projeto ${p.id}:`, e)
        }
      }

      return new Response(JSON.stringify({ success: true, synced }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error(`Ação "${action}" desconhecida. Use "sync_single" ou "sync_all".`)
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
