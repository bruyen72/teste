window.addEventListener('load', function() {
    // === MENU MOBILE ===
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });

        // Fecha ao clicar em qualquer link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });

        // Fecha ao clicar fora
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }

    // === GALERIA DE IMAGENS ===
    const mainImage = document.getElementById('mainImage');
    const modalImage = document.getElementById('modalImage');
    const modalContent = document.getElementById('modalContent');
    const imageModal = document.getElementById('imageModal');
    const closeModal = document.getElementById('closeModal');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    const thumbnails = document.querySelectorAll('.thumbnail');
    let currentImageIndex = 0;
    const ZOOM_LEVEL = 1.5;
    let isZoomed = false;

    // Atualizar imagem
    function updateImage(index) {
        if (mainImage && thumbnails.length > 0) {
            currentImageIndex = index;
            const newSrc = thumbnails[index].getAttribute('data-img');
            mainImage.src = newSrc;
            modalImage.src = newSrc;

            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });

            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
            modalContent.style.cursor = 'zoom-in';
        }
    }

    // Eventos das miniaturas
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => updateImage(index));
    });

    // Modal e Zoom
    if (mainImage && modalImage) {
        // Abrir modal
        mainImage.addEventListener('click', () => {
            imageModal.classList.add('active');
            modalImage.src = mainImage.src;
            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
            modalContent.style.cursor = 'zoom-in';
        });

        // Zoom
        modalImage.addEventListener('click', (e) => {
            e.stopPropagation();
            isZoomed = !isZoomed;
            modalImage.style.transform = isZoomed ? `scale(${ZOOM_LEVEL})` : 'scale(1)';
            modalContent.style.cursor = isZoomed ? 'zoom-out' : 'zoom-in';
        });

        // Navegação
        if (thumbnails.length > 1) {
            modalPrevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let newIndex = (currentImageIndex - 1 + thumbnails.length) % thumbnails.length;
                updateImage(newIndex);
            });

            modalNextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                let newIndex = (currentImageIndex + 1) % thumbnails.length;
                updateImage(newIndex);
            });
        }

        // Fechar modal
        closeModal.addEventListener('click', () => {
            imageModal.classList.remove('active');
            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                imageModal.classList.remove('active');
                isZoomed = false;
                modalImage.style.transform = 'scale(1)';
            }
        });

        // Fechar ao clicar fora
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) {
                imageModal.classList.remove('active');
                isZoomed = false;
                modalImage.style.transform = 'scale(1)';
            }
        });
    }

    // === FORMULÁRIO DE COTAÇÃO ===
    const quotationButton = document.getElementById('quotationButton');
    const quotationModal = document.getElementById('quotationModal');
    const closeQuotationForm = document.getElementById('closeQuotationForm');
    const quotationForm = document.getElementById('quotationForm');

    if (quotationButton && quotationModal && quotationForm) {
        quotationButton.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('quotationProductImage').src = mainImage.src;
            document.getElementById('quotationProductName').textContent = document.querySelector('h1').textContent;
            document.getElementById('quotationProductCategory').textContent = document.querySelector('.produto-categoria').textContent;
            quotationModal.classList.add('active');
        });

        // Envio do formulário
        quotationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = quotationForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            try {
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                submitButton.disabled = true;

                const formData = new FormData(quotationForm);
                formData.append('product_name', document.querySelector('h1').textContent);
                formData.append('product_category', document.querySelector('.produto-categoria').textContent);

                const response = await fetch('/enviar-cotacao', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    alert('Cotação enviada com sucesso!');
                    quotationForm.reset();
                    quotationModal.classList.remove('active');
                } else {
                    throw new Error('Erro ao enviar cotação');
                }
            } catch (error) {
                alert('Erro ao enviar. Por favor, tente novamente.');
            } finally {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });

        // Fechar modal de cotação
        closeQuotationForm?.addEventListener('click', () => {
            quotationModal.classList.remove('active');
        });

        // Fechar ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === quotationModal) {
                quotationModal.classList.remove('active');
            }
        });
    }
});