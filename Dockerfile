# Use uma imagem Python leve
FROM python:3.10-slim

# Instale dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && apt-get clean

# Crie um diretório de trabalho
WORKDIR /app

# Copie os arquivos necessários
COPY requirements.txt .

# Instale dependências do Python
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copie o restante dos arquivos do projeto
COPY . .

# Comando padrão ao rodar o container
CMD ["python", "app.py"]
