-- 1. Adicionar campo para guardar a sabedoria/bronca do Scrum Agent
ALTER TABLE projetos 
ADD COLUMN IF NOT EXISTS alerta_ia text;

-- 2. Ativar extensões necessárias para disparar tarefas em background
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Agendar a chamada HTTP para a Edge Function todo dia às 03:00 da manhã
-- Substitua a URL base pela URL real do seu projeto. 
-- Obs: Como estamos no SQL Editor remoto, nós já saberemos a URL (https://uaooutzbxkkcyfuwijbi.supabase.co)

SELECT cron.schedule(
    'scrum-master-diario',
    '0 3 * * *', -- Roda todos os dias às 03:00 am
    $$
    SELECT net.http_post(
        url:='https://uaooutzbxkkcyfuwijbi.supabase.co/functions/v1/scrum-agent',
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY')
    );
    $$
);
