# Regras Globais do Projeto (Project-Scoped Rules)

## Verificação e Instalação de Skills na Inicialização
Sempre que você iniciar uma nova conversa ou sessão neste projeto, você DEVE agir proativamente com o seguinte comportamento:
1. Verificar a integridade e existência da pasta `.agents/skills` e seus respectivos agentes/skills.
2. Checar se as skills listadas na estrutura estão devidamente acessíveis no contexto.
3. Se alguma skill estiver faltando, corrompida, ou se houver necessidade de instalação de novas skills, você deve alertar o usuário e sugerir/efetuar a reparação ou instalação (ex: solicitando a cópia dos diretórios necessários).
4. Informar o usuário brevemente, logo após a primeira interação, sobre o status dessa verificação (Ex: "✅ Skills e Agentes verificados e prontos para uso").
