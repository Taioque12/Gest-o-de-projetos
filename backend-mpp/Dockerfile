FROM python:3.12-slim

# Java (JRE) é necessário porque o MPXJ roda sobre a JVM (via JPype).
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PORT=8000

# Limita o heap da JVM para caber em free tiers de 512MB (Koyeb/Render).
ENV JAVA_TOOL_OPTIONS="-Xmx320m"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Render/Railway injetam a porta via $PORT. 1 worker mantém uma única JVM.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
