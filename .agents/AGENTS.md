# Regras Globais do Projeto (Project-Scoped Rules)

## Verificação e Instalação de Skills na Inicialização
Sempre que você iniciar uma nova conversa ou sessão neste projeto, você DEVE agir proativamente com o seguinte comportamento:
1. Verificar a integridade e existência da pasta `.agents/skills` e seus respectivos agentes/skills.
2. Checar se as skills listadas na estrutura estão devidamente acessíveis no contexto.
3. Se alguma skill estiver faltando, corrompida, ou se houver necessidade de instalação de novas skills, você deve alertar o usuário e sugerir/efetuar a reparação ou instalação (ex: solicitando a cópia dos diretórios necessários).
4. Informar o usuário brevemente, logo após a primeira interação, sobre o status dessa verificação (Ex: "✅ Skills e Agentes verificados e prontos para uso").

## Otimização de Contexto e Memória na Inicialização
Para garantir a máxima eficiência e economia de tokens tanto para Claude quanto para Gemini, toda vez que uma sessão for iniciada neste projeto, você DEVE:
1. Ativar o modo de economia severa e respostas ultracondensadas representado por `/caveman ultra` (aplicando as heurísticas dessa skill para escrever o mínimo de texto possível e agir com máxima objetividade).
2. Inicializar proativamente o sistema de memória persistente `claude-mem` (ou o gerenciador de memória equivalente da sua arquitetura), assegurando que todo o contexto relevante seja salvo e recuperado otimizadamente.
