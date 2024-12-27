// (1) Menu Toggle (seu código original)
const mobileToggle = document.querySelector('.mobile-toggle');
const navMenu = document.querySelector('.nav-menu');
if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

// (2) Smooth Scroll (opcional)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        }
    });
});

// (3) Form Submission com envio real de email
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Captura os valores
        const formValues = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            message: document.getElementById('message').value
        };

        // Bloqueia o botão e mostra "enviando..."
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        submitButton.disabled = true;

        try {
            // Monta FormData para enviar como multipart/form-data
            const formData = new FormData();
            Object.keys(formValues).forEach(key => {
                formData.append(key, formValues[key]);
            });

            // Envia para /enviar-contato
            const response = await fetch('/enviar-contatoTEC', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                alert('Mensagem enviada com sucesso!');
                contactForm.reset();
            } else {
                throw new Error(data.error || 'Erro ao enviar mensagem');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao enviar mensagem. Por favor, tente novamente ou entre em contato por telefone.');
        } finally {
            // Restaura o botão
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
}

// (4) Animation on Scroll (opcional)
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    },
    { threshold: 0.1 }
);
document.querySelectorAll('.contato-form, .contato-info, .footer-section')
    .forEach(el => observer.observe(el));