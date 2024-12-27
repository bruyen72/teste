from flask import Flask, render_template, request, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send-email', methods=['POST'])
def send_email():
    try:
        data = request.json
        nome = data.get('nome')
        email = data.get('email')
        telefone = data.get('telefone', 'Não informado')
        mensagem = data.get('mensagem')

        # Configuração do servidor SMTP
        sender_email = "SEU_EMAIL@gmail.com"  # Substitua pelo seu e-mail
        sender_password = "BRPO14hulk"      # Substitua pela senha de app
        recipient_email = "brunoruthes92@gmail.com"

        # Configurar o e-mail
        subject = f"Nova Mensagem de {nome}"
        body = f"""
        Você recebeu uma nova mensagem de contato:
        Nome: {nome}
        E-mail: {email}
        Telefone: {telefone}
        Mensagem:
        {mensagem}
        """

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        # Enviar o e-mail
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)

        return jsonify({"message": "E-mail enviado com sucesso!"}), 200

    except Exception as e:
        print(e)
        return jsonify({"message": "Erro ao enviar o e-mail."}), 500

if __name__ == '__main__':
    app.run(debug=True)
