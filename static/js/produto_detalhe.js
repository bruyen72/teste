// Adicione isso dentro do bloco do formulário de cotação, após os outros eventos
const quotationForm = document.getElementById('quotationForm');

if (quotationForm) {
    quotationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Captura os dados do formulário
        const formData = new FormData(quotationForm);
        
        // Adiciona informações adicionais do produto
        formData.append('product_name', document.querySelector('h1').textContent);
        formData.append('product_category', document.querySelector('.produto-categoria').textContent);
        formData.append('product_image_url', mainImage.src.split('/').pop());

        // Altera o botão para loading
        const submitButton = quotationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        submitButton.disabled = true;

        try {
            const response = await fetch('/enviar-cotacao', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Mostra mensagem de sucesso
                alert('Cotação enviada com sucesso! Em breve entraremos em contato.');
                quotationForm.reset();
                quotationModal.classList.remove('active');
            } else {
                throw new Error(data.error || 'Erro ao enviar cotação');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao enviar cotação. Por favor, tente novamente ou entre em contato por telefone.');
        } finally {
            // Restaura o botão
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });

    // Máscara para telefone
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                e.target.value = value;
            }
        });
    }

    // Validação do email
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', (e) => {
            const email = e.target.value;
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!isValid) {
                emailInput.classList.add('invalid');
                emailInput.setCustomValidity('Por favor, insira um email válido');
            } else {
                emailInput.classList.remove('invalid');
                emailInput.setCustomValidity('');
            }
        });
    }

    // Habilita/desabilita botão com base na validação
    const inputs = quotationForm.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const isFormValid = Array.from(inputs).every(input => input.value.trim() !== '');
            submitButton.disabled = !isFormValid;
        });
    });
}