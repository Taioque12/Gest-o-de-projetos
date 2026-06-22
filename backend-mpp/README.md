# Backend — Leitor de .mpp (MS Project)

Pequeno serviço FastAPI que lê arquivos do Microsoft Project (`.mpp`, `.mpx`, `.xml`)
usando a biblioteca **MPXJ** e devolve as tarefas + avanço físico em JSON.

> O `.mpp` é binário/proprietário e **não pode** ser lido só com JavaScript no
> navegador. O MPXJ resolve isso, mas roda sobre a JVM — por isso este serviço
> usa Docker com Java embutido.

## Endpoint

`POST /parse` — multipart, campo `arquivo` = o arquivo do MS Project.

Resposta:
```json
{
  "ok": true,
  "arquivo": "obra.mpp",
  "projeto": "Subestação 13,8kV",
  "total_tarefas": 42,
  "avanco_geral": 63.5,
  "tarefas": [ { "id": "1", "nome": "...", "pct": 80, "inicio": "...", "fim": "...", "resumo": false } ]
}
```

`GET /` — health check.

## Rodar localmente (Docker — recomendado)

```bash
cd backend-mpp
docker build -t mpp-reader .
docker run -p 8000:8000 mpp-reader
```

Sem Docker (precisa de Python 3.12 + Java JRE instalados):

```bash
cd backend-mpp
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Teste: abra http://localhost:8000 (deve responder `{"status":"ok"}`).

## Deploy (Render — free tier, HTTPS automático)

1. Crie conta em https://render.com e conecte o GitHub.
2. **New → Web Service** → selecione o repo `Gest-o-de-projetos`.
3. Configure:
   - **Root Directory**: `backend-mpp`
   - **Runtime**: `Docker`
   - **Instance Type**: Free
4. (Opcional) Variável de ambiente `ALLOWED_ORIGINS` com os domínios do frontend,
   separados por vírgula. Default já inclui o localhost e a URL da Vercel.
5. Deploy. A URL final será algo como `https://mpp-reader.onrender.com`.

> O free tier do Render "dorme" após ~15 min sem uso; a primeira chamada depois
> disso leva alguns segundos para acordar. Suficiente para demonstração.

## Conectar ao frontend

No projeto da Vercel (e no `.env.local` para testes), defina:

```
VITE_MPP_API_URL=https://SUA-URL.onrender.com
```

Depois faça redeploy do frontend.
