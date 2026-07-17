-- 1. Adicionar campo para guardar a sabedoria/bronca do Scrum Agent
ALTER TABLE projetos 
ADD COLUMN IF NOT EXISTS alerta_ia text;

-- 2. Ativar extensões necessárias para disparar tarefas em background
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Agendar a chamada HTTP para a Edge Function todo dia às 03:00 da manhã
SELECT cron.schedule(
    'scrum-master-diario',
    '0 3 * * *',
    $$
    SELECT net.http_post(
        url:='https://uaooutzbxkkcyfuwijbi.supabase.co/functions/v1/scrum-agent',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer {{SUPABASE_SERVICE_ROLE_KEY}}')
    );
    $$
);
