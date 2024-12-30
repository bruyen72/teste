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
    const thumbnails = document.querySelectorAll('.thumbnail');
    let currentImageIndex = 0;
    const imageUrls = Array.from(thumbnails).map(thumb => thumb.getAttribute('data-img'));

    function updateMainImage(index) {
        currentImageIndex = index;
        mainImage.src = imageUrls[index];
        thumbnails.forEach((thumb, i) => thumb.classList.toggle('active', i === index));
    }

    if (thumbnails.length > 0) {
        thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', () => updateMainImage(index));
        });
        updateMainImage(0);
    }

    // === MODAL COM ZOOM CONTROLADO ===
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.getElementById('closeModal');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    let isZoomed = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    function resetImagePosition() {
        isZoomed = false;
        isDragging = false;
        translateX = 0;
        translateY = 0;
        modalImage.style.transform = 'scale(1)';
        modalContent.style.cursor = 'zoom-in';
    }

    if (mainImage && modalImage) {
        // Abrir modal
        mainImage.addEventListener('click', function() {
            modalImage.src = mainImage.src;
            imageModal.classList.add('active');
            resetImagePosition();
        });

        // Zoom controlado
        modalImage.addEventListener('click', function(e) {
            e.stopPropagation();
            isZoomed = !isZoomed;
            
            if (isZoomed) {
                modalImage.style.transform = 'scale(2)';
                modalContent.style.cursor = 'grab';
            } else {
                resetImagePosition();
            }
        });

        // Movimento da imagem apenas quando zoom ativo
        modalContent.addEventListener('mousedown', function(e) {
            if (isZoomed) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                modalContent.style.cursor = 'grabbing';
            }
        });

        modalContent.addEventListener('mousemove', function(e) {
            if (isDragging && isZoomed) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                modalImage.style.transform = `scale(2) translate(${translateX}px, ${translateY}px)`;
            }
        });

        // Navegação de imagens
        if (thumbnails.length > 1) {
            modalPrevBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                currentImageIndex = (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
                modalImage.src = imageUrls[currentImageIndex];
                resetImagePosition();
                updateMainImage(currentImageIndex);
            });

            modalNextBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                currentImageIndex = (currentImageIndex + 1) % imageUrls.length;
                modalImage.src = imageUrls[currentImageIndex];
                resetImagePosition();
                updateMainImage(currentImageIndex);
            });
        }

        // Reset ao soltar o mouse
        window.addEventListener('mouseup', function() {
            isDragging = false;
            modalContent.style.cursor = isZoomed ? 'grab' : 'zoom-in';
        });

        // Fechar modal
        closeModal.addEventListener('click', function() {
            imageModal.classList.remove('active');
            resetImagePosition();
        });
    }

    // === FORMULÁRIO DE COTAÇÃO ===
    const quotationButton = document.getElementById('quotationButton');
    const quotationModal = document.getElementById('quotationModal');
    const closeQuotationForm = document.getElementById('closeQuotationForm');
    const quotationForm = document.getElementById('quotationForm');

    if (quotationButton && quotationModal) {
        quotationButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Atualiza informações do produto
            document.getElementById('quotationProductImage').src = mainImage.src;
            document.getElementById('quotationProductName').textContent = document.querySelector('h1').textContent;
            document.getElementById('quotationProductCategory').textContent = document.querySelector('.produto-categoria').textContent;
            
            quotationModal.classList.add('active');
        });

        // Formulário
        if (quotationForm) {
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
                    alert('Erro ao enviar. Tente novamente.');
                } finally {
                    submitButton.innerHTML = originalText;
                    submitButton.disabled = false;
                }
            });
        }

        // Fechar modal de cotação
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
            resetImagePosition();
        }
    });

    // Fechar ao clicar fora
    window.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.classList.remove('active');
            resetImagePosition();
        }
        if (e.target === quotationModal) {
            quotationModal.classList.remove('active');
        }
    });
});