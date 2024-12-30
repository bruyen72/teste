window.addEventListener('load', function() {
    console.log('Página carregada completamente');

    // === MENU MOBILE ===
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            if (navMenu.classList.contains('active')) {
                navMenu.style.opacity = '0';
                navMenu.style.display = 'flex';
                setTimeout(() => navMenu.style.opacity = '1', 10);
            }
        });

        // Fecha ao clicar nos links
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            });
        });

        // Fecha ao clicar fora
        document.addEventListener('click', function(e) {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            }
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

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX, startY;

    function updateTransform() {
        if (modalImage) {
            modalImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        }
    }

    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
        modalContent.classList.remove('zoomed');
    }

    if (mainImage && modalImage && modalContent) {
        // Abrir modal
        mainImage.addEventListener('click', function() {
            modalImage.src = mainImage.src;
            imageModal.classList.add('active');
            resetZoom();
        });

        // Zoom com duplo clique
        modalContent.addEventListener('dblclick', function(e) {
            e.preventDefault();
            
            if (scale === 1) {
                scale = 2;
                modalContent.classList.add('zoomed');
                // Centraliza o zoom no ponto clicado
                const rect = modalImage.getBoundingClientRect();
                translateX = (window.innerWidth / 2 - e.clientX) * 2;
                translateY = (window.innerHeight / 2 - e.clientY) * 2;
            } else {
                resetZoom();
            }
            
            updateTransform();
        });

        // Arrastar imagem
        modalContent.addEventListener('mousedown', function(e) {
            if (scale > 1) {
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
                modalContent.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', function(e) {
            if (isDragging && scale > 1) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform();
            }
        });

        window.addEventListener('mouseup', function() {
            isDragging = false;
            modalContent.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        });

        // Navegação entre imagens
        if (thumbnails.length > 1) {
            modalPrevBtn.addEventListener('click', function() {
                currentImageIndex = (currentImageIndex - 1 + thumbnails.length) % thumbnails.length;
                modalImage.src = imageUrls[currentImageIndex];
                resetZoom();
                updateMainImage(currentImageIndex);
            });

            modalNextBtn.addEventListener('click', function() {
                currentImageIndex = (currentImageIndex + 1) % thumbnails.length;
                modalImage.src = imageUrls[currentImageIndex];
                resetZoom();
                updateMainImage(currentImageIndex);
            });
        }

        // Fechar modal
        closeModal.addEventListener('click', function() {
            imageModal.classList.remove('active');
            resetZoom();
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
            
            // Atualiza informações do produto
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

        // Fechar modal de cotação
        if (closeQuotationForm) {
            closeQuotationForm.addEventListener('click', function() {
                quotationModal.classList.remove('active');
            });
        }
    }

    // === EVENTOS GLOBAIS ===
    // Fechar modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            imageModal?.classList.remove('active');
            quotationModal?.classList.remove('active');
            resetZoom();
        }
    });

    // Fechar modais clicando fora
    window.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.classList.remove('active');
            resetZoom();
        }
        if (e.target === quotationModal) {
            quotationModal.classList.remove('active');
        }
    });
});