FROM python:3.12-slim

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    && apt-get clean

# Criar diretório de trabalho
WORKDIR /app

# Copiar os arquivos necessários
COPY requirements.txt .

# Instalar dependências do Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do projeto
COPY . .

# Comando para iniciar o aplicativo
CMD ["python", "app.py"]
