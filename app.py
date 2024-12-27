from flask import Flask, render_template, request, redirect, url_for, flash, send_from_directory, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import email.utils  # NÃO REMOVER
import os
import json
import uuid
import time
from datetime import datetime
from functools import wraps
from email.utils import formataddr
# Adicione esta linha para poder usar formatdate:
from email.utils import formatdate


app = Flask(__name__)

# Configurações básicas
basedir = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(basedir, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config.update(
    SECRET_KEY=os.urandom(24),
    SQLALCHEMY_DATABASE_URI='sqlite:///tecpoint.db',
    UPLOAD_FOLDER=UPLOAD_FOLDER,
    MAX_CONTENT_LENGTH=50 * 1024 * 1024  # 50MB max-limit
)

# Configurações de Email
SMTP_SERVER = 'smtps.uhserver.com'
SMTP_PORT = 465
SMTP_USERNAME = 'contato.tec@tecpoint.net.br'
SMTP_PASSWORD = 'tecpoint@2024B'

# Inicialização
db = SQLAlchemy(app)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

# Modelos
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(200), nullable=False)
    pdf_path = db.Column(db.String(200))
    category = db.Column(db.String(50))
    specs = db.Column(db.Text)
    image_paths = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

# Função de envio de email otimizada
def send_email_with_retry(subject, text_content, html_content, recipient, is_internal=False, max_retries=3):
    """Função de envio de email com suporte HTML melhorado"""
    try:
        # Criar mensagem com partes alternativas
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = SMTP_USERNAME
        msg['To'] = recipient
        msg['Date'] = email.utils.formatdate(localtime=True)

        # Exibir nome amigável no FROM
        msg['From'] = formataddr(("TecPoint Soluções", SMTP_USERNAME))

        # Adiciona as versões texto e HTML
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        # Tenta enviar
        for attempt in range(max_retries):
            try:
                with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                    server.ehlo()
                    server.login(SMTP_USERNAME, SMTP_PASSWORD)
                    server.sendmail(SMTP_USERNAME, [recipient], msg.as_string())
                    print(f"Email enviado para {recipient}")
                    return True
            except Exception as e:
                print(f"Tentativa {attempt + 1} falhou: {e}")
                if attempt == max_retries - 1:
                    return False
                time.sleep(2)
        return False
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False

# Funções auxiliares
def ensure_upload_dir():
    """Garante que o diretório de uploads existe"""
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
        if app.debug:
            os.chmod(app.config['UPLOAD_FOLDER'], 0o777)

def allowed_file(filename):
    """Verifica se a extensão do arquivo é permitida"""
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
    """Decorador para rotas que requerem autenticação"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

@app.template_filter('json_loads')
def json_loads_filter(json_string):
    """Filtro para carregar JSON de forma segura"""
    try:
        return json.loads(json_string) if json_string else []
    except:
        return []

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

@app.route('/produtos')
def produtos():
    category = request.args.get('category', 'all')
    if category == 'all':
        products = Product.query.order_by(Product.created_at.desc()).all()
    else:
        products = Product.query.filter_by(category=category).order_by(Product.created_at.desc()).all()
    return render_template('produtos.html', products=products, current_category=category)

@app.route('/produto/<int:id>')
def produto_detalhe(id):
    product = Product.query.get_or_404(id)
    related_products = Product.query.filter(
        Product.category == product.category,
        Product.id != product.id
    ).limit(3).all()
    return render_template('produto_detalhe.html', product=product, related_products=related_products)

@app.route('/enviar-cotacao', methods=['POST'])
def enviar_cotacao():
    try:
        dados = {
            'nome': request.form.get('name', '').strip(),
            'email': request.form.get('email', '').strip(),
            'telefone': request.form.get('phone', '').strip(),
            'empresa': request.form.get('company', 'Não informada').strip(),
            'produto': request.form.get('product_name', '').strip(),
            'categoria': request.form.get('product_category', '').strip(),
            'quantidade': request.form.get('quantity', '1').strip(),
            'mensagem': request.form.get('message', '').strip(),
            'data': datetime.now().strftime('%d/%m/%Y às %H:%M')
        }

        # Cria a mensagem apenas com conteúdo HTML simples
        msg = MIMEMultipart('related')  # Mudando para 'related' em vez de 'alternative'
        msg['Subject'] = f'Nova Cotação - {dados["produto"]}'
        msg['From'] = SMTP_USERNAME
        msg['To'] = SMTP_USERNAME
        msg['Date'] = email.utils.formatdate(localtime=True)

        # Exibe nome amigável no FROM
        msg['From'] = formataddr(("TecPoint Soluções", SMTP_USERNAME))

        # Adiciona cabeçalho de Reply-To para facilitar respostas
        msg.add_header('Reply-To', dados['email'])

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
                <h2 style="color: #00A859; border-bottom: 2px solid #00A859; padding-bottom: 10px;">Nova Solicitação de Cotação</h2>
                
                <h3 style="color: #444;">Dados do Cliente</h3>
                <p><strong>Nome:</strong> {dados['nome']}<br>
                <strong>Email:</strong> {dados['email']}<br>
                <strong>Telefone:</strong> {dados['telefone']}<br>
                <strong>Empresa:</strong> {dados['empresa']}</p>

                <div style="background: #fff; padding: 15px; border-left: 4px solid #00A859; margin: 20px 0;">
                    <h3 style="color: #444; margin-top: 0;">Produto Solicitado</h3>
                    <p><strong>Produto:</strong> {dados['produto']}<br>
                    <strong>Categoria:</strong> {dados['categoria']}<br>
                    <strong>Quantidade:</strong> {dados['quantidade']}</p>
                </div>

                <div style="background: #fff; padding: 15px; margin: 20px 0;">
                    <h3 style="color: #444; margin-top: 0;">Mensagem</h3>
                    <p>{dados['mensagem']}</p>
                </div>

                <p style="color: #666; font-style: italic; text-align: right;">
                    Solicitação recebida em {dados['data']}
                </p>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #00A859; font-weight: bold;">TecPoint Soluções em Comunicação</p>
                    <p>Tel: (11) 4508-7767 | Cel: (11) 99403-6111<br>
                    www.tecpoint.net.br</p>
                </div>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        with smtplib.SMTP_SSL('smtps.uhserver.com', 465) as server:
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        return jsonify({'message': 'Cotação enviada com sucesso!'}), 200

    except Exception as e:
        print(f'Erro: {e}')
        return jsonify({'error': 'Erro ao enviar'}), 500

# Funções auxiliares

# email do index.html
@app.route('/enviar-contato-site', methods=['POST'])
def enviar_contato_site():
    try:
        # Captura dos dados do cliente
        dados = request.get_json()
        
        # Validação dos dados
        if not all(key in dados for key in ['name', 'email', 'phone', 'message']):
            return jsonify({'error': 'Todos os campos são obrigatórios'}), 400

        # Criação da mensagem
        msg = MIMEText(f"""
NOVA MENSAGEM DO SITE:

Nome: {dados['name']}
Email: {dados['email']}
Telefone: {dados['phone']}

Mensagem:
{dados['message']}

--
Enviado através do formulário da página inicial
""", 'plain', 'utf-8')
        
        msg['Subject'] = 'Nova Mensagem - Site TecPoint'
        msg['From'] = formataddr(("TecPoint Contato", SMTP_USERNAME))
        msg['To'] = SMTP_USERNAME
        
        # Adiciona cabeçalho de Reply-To para facilitar respostas
        msg.add_header('Reply-To', dados['email'])

        # Envio do e-mail
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return jsonify({'message': 'Mensagem enviada com sucesso!'}), 200

    except smtplib.SMTPException as smtp_error:
        print(f'Erro SMTP ao enviar email do site: {smtp_error}')
        return jsonify({'error': 'Erro no envio de e-mail, tente novamente mais tarde'}), 500
    except Exception as e:
        print(f'Erro geral: {e}')
        return jsonify({'error': 'Ocorreu um erro inesperado'}), 500

def is_valid_email(email):
    """Valida formato básico do email"""
    try:
        user_part, domain_part = email.rsplit('@', 1)
        return len(user_part) > 0 and len(domain_part) > 3 and '.' in domain_part
    except:
        return False

def save_failed_email(dados):
    """Salva emails que falharam para retry posterior"""
    try:
        with open('failed_emails.json', 'a') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'dados': dados
            }, f)
            f.write('\n')
    except Exception as e:
        print(f"Erro ao salvar email falho: {e}")

@app.route('/admin')
@admin_required
def admin_dashboard():
    products = Product.query.order_by(Product.created_at.desc()).all()
    return render_template('admin/dashboard.html', products=products)

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin_dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        if admin and check_password_hash(admin.password_hash, password):
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

@app.route('/admin/produtos/adicionar', methods=['GET', 'POST'])
@admin_required
def admin_add_product():
    if request.method == 'POST':
        try:
            # Dados do formulário
            form_data = {
                'name': request.form.get('name'),
                'description': request.form.get('description'),
                'category': request.form.get('category'),
                'specs': request.form.getlist('spec'),
                'image': request.files.get('image'),
                'pdf': request.files.get('pdf'),
                'additional_files': request.files.getlist('images')
            }
            # Validações
            if not all([form_data['name'], form_data['description'], 
                       form_data['category'], form_data['image']]):
                flash('Preencha todos os campos obrigatórios')
                return redirect(url_for('admin_add_product'))

            # Processa especificações
            specs = [s.strip() for s in form_data['specs'] if s.strip()]
            if not specs:
                flash('Adicione pelo menos uma especificação')
                return redirect(url_for('admin_add_product'))

            # Salva imagem principal
            image_filename = save_file(form_data['image'])
            if not image_filename:
                flash('Erro ao salvar imagem principal')
                return redirect(url_for('admin_add_product'))

            # Salva PDF se existir
            pdf_filename = save_file(form_data['pdf']) if form_data['pdf'] else None

            # Processa imagens adicionais
            additional_images = []
            for f in form_data['additional_files']:
                if f:
                    img_name = save_file(f)
                    if img_name:
                        additional_images.append(img_name)

            # Cria produto
            product = Product(
                name=form_data['name'],
                description=form_data['description'],
                category=form_data['category'],
                specs=json.dumps(specs),
                image_path=image_filename,
                pdf_path=pdf_filename,
                image_paths=json.dumps(additional_images) if additional_images else None
            )

            db.session.add(product)
            db.session.commit()
            flash('Produto adicionado com sucesso!')
            return redirect(url_for('admin_dashboard'))

        except Exception as e:
            db.session.rollback()
            print(f"Erro ao adicionar produto: {e}")
            flash('Erro ao adicionar produto')
            return redirect(url_for('admin_add_product'))

    return render_template('admin/add_product.html')

@app.route('/admin/produtos/excluir/<int:id>', methods=['POST'])
@admin_required
def admin_delete_product(id):
    product = Product.query.get_or_404(id)
    
    try:
        # Remove arquivos
        if product.image_path:
            delete_file(product.image_path)
            
        if product.pdf_path:
            delete_file(product.pdf_path)

        if product.image_paths:
            try:
                extra_images = json.loads(product.image_paths)
                for img_file in extra_images:
                    delete_file(img_file)
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar image_paths: {e}")
        
        db.session.delete(product)
        db.session.commit()
        flash('Produto excluído com sucesso!')

    except Exception as e:
        db.session.rollback()
        print(f"Erro ao excluir produto: {e}")
        flash('Erro ao excluir produto')
    
    return redirect(url_for('admin_dashboard'))

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

# Configurações de segurança adicionais
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# ------------------------------------------------------------------------
# NOVA ROTA /enviar-contato IDENTICA AO /enviar-contato-site:
# (Usando request.get_json(), corpo 'plain', e sem remover nenhum código.)
# ------------------------------------------------------------------------
@app.route('/enviar-contatoTEC', methods=['POST'])
def enviar_contato_form():
    try:
        # Como o formulário está enviando FormData, usamos request.form
        user_name = request.form.get('name', '').strip()
        user_email = request.form.get('email', '').strip()
        phone = request.form.get('phone', '').strip()
        message = request.form.get('message', '').strip()

        # Validação simples
        if not user_name or not user_email or not message:
            return jsonify({'error': 'Todos os campos obrigatórios precisam ser preenchidos'}), 400

        # Criação da mensagem de texto simples
        msg = MIMEText(f"""
NOVA MENSAGEM DO SITE (FormData):

Nome: {user_name}
Email: {user_email}
Telefone: {phone}

Mensagem:
{message}

--
Enviado através do formulário (rota /enviar-contato)
""", 'plain', 'utf-8')
        
        # Ajustando cabeçalhos
        msg['Subject'] = 'Nova Mensagem - Site TecPoint'
        msg['From'] = formataddr(("TecPoint Contato", SMTP_USERNAME))
        msg['To'] = SMTP_USERNAME

        # Adiciona cabeçalho de Reply-To para facilitar respostas ao remetente
        msg.add_header('Reply-To', user_email)

        # Envio do e-mail via SMTP_SSL
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        # Retorno de sucesso em JSON
        return jsonify({'message': 'Mensagem enviada com sucesso!'}), 200

    except smtplib.SMTPException as smtp_error:
        print(f'Erro SMTP ao enviar email do site: {smtp_error}')
        return jsonify({'error': 'Erro no envio de e-mail, tente novamente mais tarde'}), 500
    except Exception as e:
        print(f'Erro geral: {e}')
        return jsonify({'error': 'Ocorreu um erro inesperado'}), 500

# ------------------------------------------------------------------------
# FIM NOVA ROTA
# ------------------------------------------------------------------------

if __name__ == '__main__':
    with app.app_context():
        try:
            # Garante que o diretório de uploads existe
            ensure_upload_dir()
            
            # Inicializa o banco de dados
            db.create_all()
            
            # Cria admin padrão se não existir
            if not Admin.query.filter_by(username='admin').first():
                admin = Admin(
                    username='admin',
                    password_hash=generate_password_hash('admin123')
                )
                db.session.add(admin)
                db.session.commit()
                print("Admin padrão criado com sucesso!")
            
            print("Sistema inicializado com sucesso!")

            # ---- Ajuste para configuração de porta (mantendo padrão em 5000 para local) ----
            port = int(os.environ.get('PORT', 5000))  # Usa 5000 como padrão para ambiente local
            app.run(debug=False, host="0.0.0.0", port=port)  # Configura para aceitar conexões externas

        except Exception as e:
            print(f"Erro na inicialização: {e}")

