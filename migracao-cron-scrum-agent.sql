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
        headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhb291dHpieGtrY3lmdXdpamJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA5NTYyNCwiZXhwIjoyMDk3NjcxNjI0fQ.5S3dtP-6dQXYxV--aw0oxw1ehltg7rJEVGZJ3Di6d6k')
    );
    $$
);
