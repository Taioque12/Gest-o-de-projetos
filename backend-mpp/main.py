"""
MA CONEGLIAN · Leitor de arquivos do MS Project (.mpp)
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
from contextlib import asynccontextmanager

import jpype
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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


app = FastAPI(title="MA CONEGLIAN · MPP Reader", lifespan=lifespan)

# CORS — domínios autorizados a chamar a API (frontend local + Vercel).
# Sobrescreva com a variável de ambiente ALLOWED_ORIGINS (separada por vírgula).
_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,https://gest-o-de-projetos-eoum.vercel.app,https://gest-o-de-projetos-eight.vercel.app,https://frontend-beta-navy-63.vercel.app",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.post("/parse")
def parse(arquivo: UploadFile = File(...)):
    nome = arquivo.filename or "projeto.mpp"
    if not nome.lower().endswith((".mpp", ".mpx", ".xml")):
        raise HTTPException(400, "Envie um arquivo .mpp, .mpx ou .xml do MS Project.")

    # Handlers síncronos rodam num threadpool; cada thread precisa estar
    # anexada à JVM antes de tocar em objetos Java.
    if not jpype.isThreadAttachedToJVM():
        jpype.attachThreadToJVM()

    suffix = os.path.splitext(nome)[1] or ".mpp"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(arquivo.file.read())
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
