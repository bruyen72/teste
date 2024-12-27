# Use uma imagem Python base
FROM python:3.12-slim

# Instale dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && apt-get clean

# Configure o diretório de trabalho
WORKDIR /app

# Copie o arquivo de dependências
COPY requirements.txt .

# Instale as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copie o código do projeto
COPY . .

# Defina o comando padrão para rodar o app
CMD ["python", "app.py"]
