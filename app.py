from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, session, jsonify
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
import uuid
import time
from datetime import datetime
from functools import wraps
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from email.utils import formataddr, formatdate

# Inicialização do Flask
app = Flask(
    __name__,
    static_folder='static',
    static_url_path=''
)

# Configuração do ambiente e diretórios
if 'VERCEL' in os.environ:
    UPLOAD_FOLDER = '/tmp'
    DATABASE_FILE = '/tmp/database.json'
else:
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
    DATABASE_FILE = 'database.json'

# Criar pasta de uploads
try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
except Exception as e:
    print(f"Erro ao criar pasta: {e}")

# Configurações básicas
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', os.urandom(24)),
    UPLOAD_FOLDER=UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH=50 * 1024 * 1024  # 50MB
)

# Configure email settings
SMTP_SERVER = 'smtps.uhserver.com'
SMTP_PORT = 465
SMTP_USERNAME = 'contato.tec@tecpoint.net.br'
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', 'tecpoint@2024B')

# Extensões permitidas
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'txt'}

# Sistema de dados em arquivo
class FileDatabase:
    def __init__(self, filename):
        self.filename = filename
        self.data = self.load()

    def load(self):
        try:
            if os.path.exists(self.filename):
                with open(self.filename, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Erro ao carregar banco: {e}")
        return {'products': [], 'admin': None}

    def save(self):
        try:
            with open(self.filename, 'w') as f:
                json.dump(self.data, f, indent=4)
        except Exception as e:
            print(f"Erro ao salvar banco: {e}")

    def add_product(self, product_data):
        product_data['id'] = str(uuid.uuid4())
        product_data['created_at'] = datetime.now().isoformat()
        self.data['products'].append(product_data)
        self.save()
        return product_data

    def get_products(self, category=None):
        products = self.data.get('products', [])
        if category and category != 'all':
            products = [p for p in products if p['category'] == category]
        return products

    def get_product(self, id):
        products = self.data.get('products', [])
        return next((p for p in products if p['id'] == id), None)

    def delete_product(self, id):
        products = self.data.get('products', [])
        self.data['products'] = [p for p in products if p['id'] != id]
        self.save()

# Inicializar banco de dados em arquivo
db = FileDatabase(DATABASE_FILE)

# Funções auxiliares
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
def save_file(file):
    """Salva o arquivo com nome único"""
    if not file or not file.filename:
        return None
    if not allowed_file(file.filename):
        return None
    try:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        if app.debug:
            os.chmod(file_path, 0o666)
        return unique_filename
    except Exception as e:
        print(f"Erro ao salvar arquivo: {e}")
        return None

def delete_file(filename):
    """Remove um arquivo de forma segura"""
    if filename:
        try:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Erro ao remover arquivo: {e}")

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

def send_email(subject, html_content, recipient, reply_to=None):
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr(("TecPoint Soluções", SMTP_USERNAME))
        msg['To'] = recipient
        msg['Date'] = formatdate(localtime=True)
        
        if reply_to:
            msg.add_header('Reply-To', reply_to)

        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False

# Rotas de Upload
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nome de arquivo vazio'}), 400
    
    if file and allowed_file(file.filename):
        try:
            filename = save_file(file)
            if filename:
                return jsonify({
                    'message': 'Arquivo enviado com sucesso',
                    'filename': filename
                }), 200
            return jsonify({'error': 'Erro ao salvar arquivo'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Tipo de arquivo não permitido'}), 400

@app.route('/files/<filename>')
def get_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception:
        return jsonify({'error': 'Arquivo não encontrado'}), 404

@app.route('/produtos')
def produtos():
    category = request.args.get('category', 'all')
    products = db.get_products(category)
    return render_template('produtos.html', products=products, current_category=category)

@app.route('/produto/<string:id>')
def produto_detalhe(id):
    product = db.get_product(id)
    if not product:
        return redirect(url_for('produtos'))
    
    # Busca produtos relacionados
    related_products = [p for p in db.get_products() 
                       if p['category'] == product['category'] 
                       and p['id'] != id][:3]
    
    return render_template('produto_detalhe.html', 
                         product=product, 
                         related_products=related_products)

@app.route('/admin/produtos/adicionar', methods=['GET', 'POST'])
@admin_required
def admin_add_product():
    if request.method == 'POST':
        try:
            form_data = {
                'name': request.form.get('name'),
                'description': request.form.get('description'),
                'category': request.form.get('category'),
                'specs': request.form.getlist('spec'),
                'image': request.files.get('image'),
                'pdf': request.files.get('pdf'),
                'additional_files': request.files.getlist('images')
            }

            if not all([form_data['name'], form_data['description'], 
                       form_data['category'], form_data['image']]):
                flash('Preencha todos os campos obrigatórios')
                return redirect(url_for('admin_add_product'))

            specs = [s.strip() for s in form_data['specs'] if s.strip()]
            if not specs:
                flash('Adicione pelo menos uma especificação')
                return redirect(url_for('admin_add_product'))

            # Salva arquivos
            image_filename = save_file(form_data['image'])
            if not image_filename:
                flash('Erro ao salvar imagem principal')
                return redirect(url_for('admin_add_product'))

            pdf_filename = save_file(form_data['pdf']) if form_data['pdf'] else None

            additional_images = []
            for f in form_data['additional_files']:
                if f:
                    img_name = save_file(f)
                    if img_name:
                        additional_images.append(img_name)

            # Cria produto
            product_data = {
                'name': form_data['name'],
                'description': form_data['description'],
                'category': form_data['category'],
                'specs': specs,
                'image_path': image_filename,
                'pdf_path': pdf_filename,
                'image_paths': additional_images
            }

            db.add_product(product_data)
            flash('Produto adicionado com sucesso!')
            return redirect(url_for('admin_dashboard'))

        except Exception as e:
            print(f"Erro ao adicionar produto: {e}")
            flash('Erro ao adicionar produto')
            return redirect(url_for('admin_add_product'))

    return render_template('admin/add_product.html')
@app.route('/admin/produtos/excluir/<string:id>', methods=['POST'])
@admin_required
def admin_delete_product(id):
    product = db.get_product(id)
    
    if product:
        try:
            # Remove arquivos
            if product.get('image_path'):
                delete_file(product['image_path'])
                
            if product.get('pdf_path'):
                delete_file(product['pdf_path'])

            if product.get('image_paths'):
                for img_file in product['image_paths']:
                    delete_file(img_file)
            
            db.delete_product(id)
            flash('Produto excluído com sucesso!')

        except Exception as e:
            print(f"Erro ao excluir produto: {e}")
            flash('Erro ao excluir produto')
    else:
        flash('Produto não encontrado')
    
    return redirect(url_for('admin_dashboard'))

@app.route('/admin')
@admin_required
def admin_dashboard():
    products = db.get_products()
    return render_template('admin/dashboard.html', products=products)

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin_dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin_data = db.data.get('admin', {
            'username': 'admin',
            'password': 'admin123'
        })
        
        if username == admin_data['username'] and password == admin_data['password']:
            session['admin_logged_in'] = True
            flash('Login realizado com sucesso!')
            return redirect(url_for('admin_dashboard'))
        
        flash('Usuário ou senha incorretos')
    return render_template('admin/login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('Logout realizado com sucesso!')
    return redirect(url_for('admin_login'))

@app.route('/enviar-cotacao', methods=['POST'])
def enviar_cotacao():
    try:
        dados = {
            'nome': request.form.get('name', '').strip(),
            'email': request.form.get('email', '').strip(),
            'telefone': request.form.get('phone', '').strip(),
            'produto': request.form.get('product_name', '').strip(),
            'categoria': request.form.get('product_category', '').strip(),
            'quantidade': request.form.get('quantity', '1').strip(),
            'mensagem': request.form.get('message', '').strip(),
            'data': datetime.now().strftime('%d/%m/%Y às %H:%M')
        }

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #00A859;">Nova Solicitação de Cotação</h2>
            <div style="margin: 20px 0;">
                <h3>Dados do Cliente</h3>
                <p>
                <strong>Nome:</strong> {dados['nome']}<br>
                <strong>Email:</strong> {dados['email']}<br>
                <strong>Telefone:</strong> {dados['telefone']}</p>
            </div>
            <div style="margin: 20px 0;">
                <h3>Produto Solicitado</h3>
                <p>
                <strong>Produto:</strong> {dados['produto']}<br>
                <strong>Categoria:</strong> {dados['categoria']}<br>
                <strong>Quantidade:</strong> {dados['quantidade']}</p>
            </div>
            <div style="margin: 20px 0;">
                <h3>Mensagem</h3>
                <p>{dados['mensagem']}</p>
            </div>
            <p style="color: #666; font-style: italic;">Recebido em {dados['data']}</p>
        </body>
        </html>
        """

        if send_email(
            f'Nova Cotação - {dados["produto"]}',
            html_content,
            SMTP_USERNAME,
            reply_to=dados['email']
        ):
            return jsonify({'message': 'Cotação enviada com sucesso!'}), 200
        return jsonify({'error': 'Erro ao enviar cotação'}), 500

    except Exception as e:
        print(f'Erro ao enviar cotação: {e}')
        return jsonify({'error': 'Ocorreu um erro inesperado'}), 500

@app.route('/enviar-contatoTEC', methods=['POST'])
def enviar_contato_form():
    try:
        user_name = request.form.get('name', '').strip()
        user_email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        message = request.form.get('message', '').strip()

        if not user_name or not user_email or not message:
            return jsonify({
                'error': 'Todos os campos obrigatórios precisam ser preenchidos'
            }), 400

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #00A859;">Nova Mensagem de Contato</h2>
            <p><strong>Nome:</strong> {user_name}</p>
            <p><strong>Email:</strong> {user_email}</p>
            <p><strong>Telefone:</strong> {phone}</p>
            <h3>Mensagem:</h3>
            <p>{message}</p>
        </body>
        </html>
        """

        if send_email(
            'Nova Mensagem - Site TecPoint',
            html_content,
            SMTP_USERNAME,
            reply_to=user_email
        ):
            return jsonify({'message': 'Mensagem enviada com sucesso!'}), 200
        return jsonify({'error': 'Erro ao enviar mensagem'}), 500

    except Exception as e:
        print(f'Erro geral: {e}')
        return jsonify({'error': 'Ocorreu um erro inesperado'}), 500
    # Rotas básicas
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/solucoes')
def solucoes():
    return render_template('solucoes.html')

@app.route('/contato')
def contato():
    return render_template('contato.html')

# Uploads e arquivos
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve arquivos de upload de forma segura"""
    try:
        if not secure_filename(filename) == filename:
            print(f"Tentativa de acesso a arquivo inseguro: {filename}")
            return "Acesso negado", 403
            
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(file_path):
            print(f"Arquivo não encontrado: {filename}")
            return "Arquivo não encontrado", 404
            
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        print(f"Erro ao servir arquivo {filename}: {e}")
        return "Erro ao acessar arquivo", 500

# Tratamento de erros
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

@app.errorhandler(413)
def request_entity_too_large(e):
    flash('O arquivo enviado é muito grande. Por favor, reduza o tamanho.')
    return redirect(url_for('admin_add_product'))

# Configurações de segurança
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# Inicialização do sistema de arquivos
@app.before_first_request
def init_system():
    try:
        # Garantir que a pasta de uploads existe
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        print("Pasta de uploads verificada!")

        # Criar arquivo de dados se não existir
        if not os.path.exists(DATABASE_FILE):
            initial_data = {
                'products': [],
                'admin': {
                    'username': 'admin',
                    'password': 'admin123'  # Em produção, usar hash
                }
            }
            with open(DATABASE_FILE, 'w') as f:
                json.dump(initial_data, f, indent=4)
            print("Arquivo de dados criado!")

    except Exception as e:
        print(f"Erro na inicialização: {e}")

# Inicialização do app
if __name__ == '__main__':
    try:
        # Garantir que os diretórios existem
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        print(f"Diretório de uploads criado: {UPLOAD_FOLDER}")
        
        # Configurar porta e iniciar servidor
        port = int(os.environ.get('PORT', 8080))
        print(f"Iniciando servidor na porta {port}...")
        
        app.run(
            host='0.0.0.0', 
            port=port,
            debug=os.environ.get('DEBUG', 'False').lower() == 'true'
        )
        
    except Exception as e:
        print(f"Erro ao inicializar aplicação: {e}")