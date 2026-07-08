"""
Leitor de arquivos do MS Project (.mpp)
======================================================
Backend FastAPI que recebe um arquivo .mpp / .mpx / .xml do Microsoft Project,
lê o cronograma com a biblioteca MPXJ (via JPype + JVM) e devolve as tarefas
e o avanço físico em JSON.

Por que existe: o formato .mpp é binário e proprietário da Microsoft — não há
como lê-lo de forma confiável só com JavaScript no navegador. O MPXJ é a
biblioteca padrão de mercado, mas roda sobre a JVM, então precisa deste
pequeno serviço (Docker com Java embutido).
"""

import os
import tempfile
import time
import threading
from collections import defaultdict, deque
from contextlib import asynccontextmanager

import jpype
import jwt
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware

# Limite de tamanho de arquivo e rate-limit simples por IP, além do JWT
# (verify_jwt abaixo). Evita abuso grosseiro/acidental de um serviço
# gratuito de recursos limitados (Render free tier).
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB
RATE_LIMIT_REQUESTS = 10
RATE_LIMIT_WINDOW_S = 60
_rate_limit_hits: dict[str, deque] = defaultdict(deque)
_rate_limit_lock = threading.Lock()


def _checar_rate_limit(ip: str):
    agora = time.time()
    with _rate_limit_lock:
        hits = _rate_limit_hits[ip]
        while hits and agora - hits[0] > RATE_LIMIT_WINDOW_S:
            hits.popleft()
        if len(hits) >= RATE_LIMIT_REQUESTS:
            raise HTTPException(429, "Muitas requisições. Aguarde um minuto e tente de novo.")
        hits.append(agora)

# Classe Java carregada após a JVM iniciar (preenchida no lifespan).
UniversalProjectReader = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # A JVM é iniciada uma única vez no startup e mantida viva enquanto o
    # servidor roda (desligar a JVM do JPype em tempo de execução é instável).
    if not jpype.isJVMStarted():
        import mpxj  # registra os JARs do MPXJ no classpath do JPype  # noqa: F401
        jpype.startJVM()
    global UniversalProjectReader
    from org.mpxj.reader import UniversalProjectReader as _UPR
    UniversalProjectReader = _UPR
    yield


app = FastAPI(title="MPP Reader", lifespan=lifespan)

# CORS — domínios autorizados a chamar a API (frontend local + Vercel).
# Sobrescreva com a variável de ambiente ALLOWED_ORIGINS (separada por vírgula).
_ALLOWED_ORIGINS_FALLBACK = "http://localhost:5173,https://gest-o-de-projetos-eoum.vercel.app,https://gest-o-de-projetos-eight.vercel.app,https://frontend-beta-navy-63.vercel.app"
_origins_env = os.environ.get("ALLOWED_ORIGINS")
if not _origins_env:
    print(f"[startup] ALLOWED_ORIGINS não configurada — usando fallback: {_ALLOWED_ORIGINS_FALLBACK}")
_origins = _origins_env or _ALLOWED_ORIGINS_FALLBACK
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def _s(v):
    """Valor Java (ou None) -> string limpa."""
    return None if v is None else str(v)


def _f(v):
    """Number Java (ou None) -> float."""
    if v is None:
        return None
    try:
        return round(float(v.doubleValue()), 1)
    except Exception:
        try:
            return round(float(str(v)), 1)
        except Exception:
            return None


@app.get("/")
def health():
    return {"status": "ok", "service": "mpp-reader"}


# Validação do JWT do Supabase. Preferência: chave assimétrica nova (ES256,
# baixada do endpoint JWKS do projeto — SUPABASE_URL). Se SUPABASE_URL não
# estiver configurada, usa o secret legacy HS256 (SUPABASE_JWT_SECRET).
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
if SUPABASE_URL and not SUPABASE_URL.startswith(("http://", "https://")):
    SUPABASE_URL = f"https://{SUPABASE_URL}"
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
_jwks_client = (
    jwt.PyJWKClient(
        f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
        cache_keys=True,
        lifespan=300,  # re-busca o JWKS a cada 5 min (cobre rotação de chave)
        timeout=10,
    )
    if SUPABASE_URL
    else None
)
security = HTTPBearer()

def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not _jwks_client and not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Autenticação não configurada no servidor.")
    token = credentials.credentials
    try:
        alg = jwt.get_unverified_header(token).get("alg", "")
        if _jwks_client and alg == "ES256":
            signing_key = _jwks_client.get_signing_key_from_jwt(token).key
            return jwt.decode(token, signing_key, algorithms=["ES256"], options={"verify_aud": False})
        if SUPABASE_JWT_SECRET and alg == "HS256":
            # Sessões antigas, emitidas antes da migração pra chave assimétrica.
            return jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        raise HTTPException(status_code=401, detail="Token inválido. Saia e entre de novo no sistema.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado. Saia e entre de novo no sistema.")
    except jwt.PyJWKClientError:
        raise HTTPException(status_code=401, detail="Não foi possível validar a assinatura do token. Saia e entre de novo no sistema.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")
    except (OSError, ValueError):
        # Falha de rede/parse ao buscar o JWKS (urllib) — não é culpa do
        # cliente; devolve 503 pra sinalizar indisponibilidade temporária.
        raise HTTPException(status_code=503, detail="Serviço de autenticação temporariamente indisponível. Tente de novo.")


@app.post("/parse")
def parse(request: Request, arquivo: UploadFile = File(...), token_payload: dict = Depends(verify_jwt)):
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    _checar_rate_limit(ip)

    nome = arquivo.filename or "projeto.mpp"
    if not nome.lower().endswith((".mpp", ".mpx", ".xml")):
        raise HTTPException(400, "Envie um arquivo .mpp, .mpx ou .xml do MS Project.")

    # Handlers síncronos rodam num threadpool; cada thread precisa estar
    # anexada à JVM antes de tocar em objetos Java.
    if not jpype.isThreadAttachedToJVM():
        jpype.attachThreadToJVM()

    conteudo = arquivo.file.read(MAX_FILE_SIZE + 1)
    if len(conteudo) > MAX_FILE_SIZE:
        raise HTTPException(413, f"Arquivo muito grande. Limite: {MAX_FILE_SIZE // (1024*1024)}MB.")

    suffix = os.path.splitext(nome)[1] or ".mpp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(conteudo)
        caminho = tmp.name

    try:
        project = UniversalProjectReader().read(caminho)
        if project is None:
            raise HTTPException(422, "Formato não reconhecido pelo leitor.")

        tarefas = []
        for t in project.getTasks():
            tarefas.append({
                "id": _s(t.getID()),
                "nome": _s(t.getName()),
                "pct": _f(t.getPercentageComplete()),
                "inicio": _s(t.getStart()),
                "fim": _s(t.getFinish()),
                "duracao": _s(t.getDuration()),
                "resumo": bool(t.getSummary()),
            })

        # Avanço geral: tarefa-resumo raiz (ID 0); se não houver, média das folhas.
        avanco = None
        try:
            raiz = project.getTaskByID(jpype.java.lang.Integer(0))
            if raiz is not None:
                avanco = _f(raiz.getPercentageComplete())
        except Exception:
            avanco = None
        if avanco is None:
            vals = [t["pct"] for t in tarefas if not t["resumo"] and t["pct"] is not None]
            if vals:
                avanco = round(sum(vals) / len(vals), 1)

        props = project.getProjectProperties()
        nome_proj = _s(props.getProjectTitle()) or _s(props.getName()) or nome

        return {
            "ok": True,
            "arquivo": nome,
            "projeto": nome_proj,
            "projeto_inicio": _s(props.getStartDate()),
            "projeto_fim": _s(props.getFinishDate()),
            "total_tarefas": len(tarefas),
            "avanco_geral": avanco,
            "tarefas": tarefas[:300],
        }
    finally:
        try:
            os.unlink(caminho)
        except OSError:
            pass
