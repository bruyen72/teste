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


app = Flask(
    __name__,
    static_folder='static',
    static_url_path=''  # URL raiz para arquivos estáticos
)

# Configuração do diretório de uploads
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')

# Cria a pasta de uploads se ela não existir
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configurações do Flask e SQLAlchemy
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', os.urandom(24)),  # Chave secreta para sessões
    SQLALCHEMY_DATABASE_URI=os.environ.get('DATABASE_URL', 'sqlite:///tecpoint.db'),  # Banco de dados
    SQLALCHEMY_TRACK_MODIFICATIONS=False,  # Desabilita notificações de modificação
    UPLOAD_FOLDER=UPLOAD_FOLDER,  # Define o diretório de uploads
    MAX_CONTENT_LENGTH=50 * 1024 * 1024  # Limite de tamanho do upload (50 MB)
)
# Ajuste o DATABASE_URL para PostgreSQL
if 'DATABASE_URL' in os.environ:
    database_url = os.environ['DATABASE_URL']
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://")
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url

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
        # Validação dos campos obrigatórios
        required_fields = ['name', 'email', 'phone', 'product_name', 'product_category']
        for field in required_fields:
            if not request.form.get(field):
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400

        dados = {
            'nome': request.form.get('name', '').strip(),
            'email': request.form.get('email', '').strip(),
            'telefone': request.form.get('phone', '').strip(),
            'empresa': request.form.get('company', 'Não informada').strip(),
            'produto': request.form.get('product_name', '').strip(),
            'categoria': request.form.get('product_category', '').strip(),
            'quantidade': request.form.get('quantity', '1').strip(),
            'mensagem': request.form.get('message', '').strip(),
            'data': datetime.now().strftime('%d/%m/%Y às %H:%M'),
            'produto_imagem': request.form.get('product_image_url', ''),
            'hora': datetime.now().strftime('%H:%M')
        }

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nova Cotação - TecPoint</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f4f4f4; -webkit-font-smoothing: antialiased;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <!-- Header com Logo -->
                            <tr>
                                <td style="text-align: center; padding: 30px; background: linear-gradient(135deg, #00A859 0%, #008548 100%);">
                                    <img src="https://www.tecpoint.net.br/static/LogoTecPoint.png" alt="TecPoint Logo" style="width: 180px; height: auto; margin-bottom: 20px;">
                                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Nova Solicitação de Cotação</h1>
                                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                                        Recebida em {dados['data']}
                                    </p>
                                </td>
                            </tr>

                            <!-- Status Banner -->
                            <tr>
                                <td style="background-color: #e8f5e9; padding: 15px; text-align: center; border-bottom: 1px solid #c8e6c9;">
                                    <p style="margin: 0; color: #00A859; font-weight: 500;">
                                        ✨ Nova solicitação recebida às {dados['hora']}
                                    </p>
                                </td>
                            </tr>

                            <!-- Informações do Cliente -->
                            <tr>
                                <td style="padding: 30px;">
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td>
                                                <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                                                    👤 Dados do Cliente
                                                </h2>
                                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                        <tr>
                                                            <td style="padding: 8px 0;">
                                                                <strong style="color: #00A859; font-weight: 500;">Nome:</strong>
                                                                <span style="color: #4a5568; margin-left: 8px;">{dados['nome']}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0;">
                                                                <strong style="color: #00A859; font-weight: 500;">Email:</strong>
                                                                <span style="color: #4a5568; margin-left: 8px;">{dados['email']}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0;">
                                                                <strong style="color: #00A859; font-weight: 500;">Telefone:</strong>
                                                                <span style="color: #4a5568; margin-left: 8px;">{dados['telefone']}</span>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding: 8px 0;">
                                                                <strong style="color: #00A859; font-weight: 500;">Empresa:</strong>
                                                                <span style="color: #4a5568; margin-left: 8px;">{dados['empresa']}</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Detalhes do Produto -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                                        🛍️ Detalhes do Produto
                                    </h2>
                                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="width: 120px; vertical-align: top;">
                                                    <img src="{dados['produto_imagem']}" alt="{dados['produto']}" 
                                                         style="width: 120px; height: 120px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0;">
                                                </td>
                                                <td style="padding-left: 20px; vertical-align: top;">
                                                    <h3 style="color: #00A859; margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                                                        {dados['produto']}
                                                    </h3>
                                                    <p style="margin: 0 0 8px 0; color: #4a5568;">
                                                        <strong style="color: #2d3748;">Categoria:</strong> {dados['categoria']}
                                                    </p>
                                                    <p style="margin: 0; color: #4a5568;">
                                                        <strong style="color: #2d3748;">Quantidade Solicitada:</strong> {dados['quantidade']} unidade(s)
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                </td>
                            </tr>

                            <!-- Mensagem do Cliente -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">
                                        💬 Mensagem Adicional
                                    </h2>
                                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                                        <p style="margin: 0; color: #4a5568; line-height: 1.6;">
                                            {dados['mensagem'] if dados['mensagem'] else 'Nenhuma mensagem adicional fornecida.'}
                                        </p>
                                    </div>
                                </td>
                            </tr>

                            <!-- Call to Action -->
                            <tr>
                                <td style="padding: 0 30px 30px 30px;">
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="background-color: #f7f7f7; border-radius: 8px; padding: 20px; text-align: center;">
                                                <p style="margin: 0 0 15px 0; color: #2d3748;">
                                                    Responda diretamente a este email para entrar em contato com o cliente.
                                                </p>
                                                <a href="mailto:{dados['email']}" 
                                                   style="background-color: #00A859; color: white; padding: 12px 24px; 
                                                          text-decoration: none; border-radius: 6px; font-weight: 500; 
                                                          display: inline-block;">
                                                    Responder ao Cliente
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                                    <img src="https://www.tecpoint.net.br/static/LogoTecPoint.png" alt="TecPoint Logo" 
                                         style="width: 140px; height: auto; margin-bottom: 20px;">
                                    <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px;">
                                        TecPoint Soluções em Comunicação
                                    </p>
                                    <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                                        Tel: (11) 4508-7767 | Cel: (11) 99403-6111<br>
                                        www.tecpoint.net.br
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        # Criar mensagem de email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'Nova Cotação - {dados["produto"]}'
        msg['From'] = formataddr(("TecPoint Soluções", SMTP_USERNAME))
        msg['To'] = SMTP_USERNAME
        msg['Date'] = formatdate(localtime=True)
        msg.add_header('Reply-To', dados['email'])

        # Anexar conteúdo HTML
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        # Enviar email
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        return jsonify({'message': 'Cotação enviada com sucesso!'}), 200

    except smtplib.SMTPException as smtp_error:
        print(f'Erro SMTP ao enviar cotação: {smtp_error}')
        return jsonify({'error': 'Erro no servidor de email. Tente novamente mais tarde.'}), 500
    except Exception as e:
        print(f'Erro geral ao enviar cotação: {e}')
        return jsonify({'error': 'Ocorreu um erro inesperado'}), 500

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
# -----------------------------------------------------------------------

# Logo após as definições de Product e Admin
@app.before_first_request
def init_database():
    with app.app_context():
        try:
            # Criar todas as tabelas
            db.create_all()
            print("Tabelas criadas com sucesso!")

            # Verificar e criar admin padrão se não existir
            admin = Admin.query.filter_by(username='admin').first()
            if not admin:
                admin = Admin(
                    username='admin',
                    password_hash=generate_password_hash('admin123')
                )
                db.session.add(admin)
                db.session.commit()
                print("Admin criado com sucesso!")

            # Verificar se existem produtos
            produtos_count = Product.query.count()
            print(f"Total de produtos no banco: {produtos_count}")

            # Garantir que a pasta de uploads existe
            uploads_dir = os.path.join(os.getcwd(), 'static', 'uploads')
            if not os.path.exists(uploads_dir):
                os.makedirs(uploads_dir)
                print("Pasta de uploads criada!")

        except Exception as e:
            print(f"Erro na inicialização: {e}")
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
            # Inicializa o banco de dados e garante que todas as tabelas sejam criadas
            print("Inicializando o banco de dados...")
            db.create_all()
            print("Tabelas criadas com sucesso!")

            # Cria admin padrão, caso não exista
            print("Verificando existência do admin padrão...")
            if not Admin.query.filter_by(username='admin').first():
                admin = Admin(
                    username='admin',
                    password_hash=generate_password_hash('admin123')
                )
                db.session.add(admin)
                db.session.commit()
                print("Admin padrão criado com sucesso!")
            else:
                print("Admin padrão já existe.")

            # Configura a porta e inicia o servidor
            port = int(os.environ.get('PORT', 8080))  # Padrão para Fly.io
            print(f"Iniciando o servidor na porta {port}...")
            app.run(host='0.0.0.0', port=port)
        except Exception as e:
            # Tratamento genérico de erro
            print(f"Erro ao inicializar a aplicação: {e}")
