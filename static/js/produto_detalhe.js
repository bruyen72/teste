window.addEventListener('load', function() {
    console.log('Página carregada');

    // === MENU MOBILE ===
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            navMenu.classList.toggle('active');
        });
    }

    // === GALERIA DE IMAGENS ===
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');
    let currentImageIndex = 0;
    const imageUrls = Array.from(thumbnails).map(thumb => thumb.getAttribute('data-img'));

    function updateMainImage(index) {
        if (mainImage && thumbnails.length > 0) {
            currentImageIndex = index;
            mainImage.src = imageUrls[index];
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }
    }

    if (thumbnails.length > 0) {
        thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', () => updateMainImage(index));
        });
        updateMainImage(0);
    }

    // === MODAL DE IMAGEM COM ZOOM ===
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.getElementById('closeModal');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    let isZoomed = false;

    if (mainImage && modalImage) {
        // Abre modal
        mainImage.addEventListener('click', function() {
            modalImage.src = mainImage.src;
            imageModal.classList.add('active');
            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
            modalContent.style.cursor = 'zoom-in';
        });

        // Zoom simples
        modalContent.addEventListener('click', function(e) {
            if (e.target === modalImage) {
                isZoomed = !isZoomed;
                if (isZoomed) {
                    modalImage.style.transform = 'scale(2)';
                    modalContent.style.cursor = 'zoom-out';
                } else {
                    modalImage.style.transform = 'scale(1)';
                    modalContent.style.cursor = 'zoom-in';
                }
            }
        });

        // Navegação entre imagens
        if (thumbnails.length > 1) {
            modalPrevBtn.addEventListener('click', function() {
                currentImageIndex = (currentImageIndex - 1 + thumbnails.length) % thumbnails.length;
                modalImage.src = imageUrls[currentImageIndex];
                isZoomed = false;
                modalImage.style.transform = 'scale(1)';
                modalContent.style.cursor = 'zoom-in';
                updateMainImage(currentImageIndex);
            });

            modalNextBtn.addEventListener('click', function() {
                currentImageIndex = (currentImageIndex + 1) % thumbnails.length;
                modalImage.src = imageUrls[currentImageIndex];
                isZoomed = false;
                modalImage.style.transform = 'scale(1)';
                modalContent.style.cursor = 'zoom-in';
                updateMainImage(currentImageIndex);
            });
        }

        // Fecha modal
        closeModal.addEventListener('click', function() {
            imageModal.classList.remove('active');
            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
        });
    }

    // === FORMULÁRIO DE COTAÇÃO ===
    const quotationButton = document.getElementById('quotationButton');
    const quotationModal = document.getElementById('quotationModal');
    const closeQuotationForm = document.getElementById('closeQuotationForm');
    const quotationForm = document.getElementById('quotationForm');

    if (quotationButton && quotationModal && quotationForm) {
        // Abrir modal de cotação
        quotationButton.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('quotationProductImage').src = mainImage.src;
            document.getElementById('quotationProductName').textContent = document.querySelector('h1').textContent;
            document.getElementById('quotationProductCategory').textContent = document.querySelector('.produto-categoria').textContent;
            quotationModal.classList.add('active');
        });

        // Envio do formulário
        quotationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = quotationForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            try {
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
                submitButton.disabled = true;

                const formData = new FormData(quotationForm);
                formData.append('product_name', document.querySelector('h1').textContent);
                formData.append('product_category', document.querySelector('.produto-categoria').textContent);
                formData.append('product_image_url', mainImage.src.split('/').pop());

                const response = await fetch('/enviar-cotacao', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Cotação enviada com sucesso! Em breve entraremos em contato.');
                    quotationForm.reset();
                    quotationModal.classList.remove('active');
                } else {
                    throw new Error(data.error || 'Erro ao enviar cotação');
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao enviar cotação. Por favor, tente novamente.');
            } finally {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });

        // Fechar cotação
        if (closeQuotationForm) {
            closeQuotationForm.addEventListener('click', function() {
                quotationModal.classList.remove('active');
            });
        }
    }

    // === EVENTOS GLOBAIS ===
    // Fechar com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            imageModal?.classList.remove('active');
            quotationModal?.classList.remove('active');
            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
        }
    });

    // Fechar clicando fora
    window.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.classList.remove('active');
            isZoomed = false;
            modalImage.style.transform = 'scale(1)';
        }
        if (e.target === quotationModal) {
            quotationModal.classList.remove('active');
        }
    });
});