FROM python:3.9-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro para aproveitar o cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o resto do código
COPY . .

# Criar diretório de uploads
RUN mkdir -p static/uploads && chmod 777 static/uploads

# Expor porta
EXPOSE 8080

# Comando para rodar
CMD gunicorn --bind 0.0.0.0:8080 app:app