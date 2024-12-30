window.addEventListener('load', function() {
    console.log('Página carregada');

    // === MENU MOBILE ===
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function(e) {
            e.preventDefault();
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Fecha menu ao clicar no link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
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
    let isDragging = false;
    let startX, startY;
    let translateX = 0;
    let translateY = 0;

    function resetImage() {
        isZoomed = false;
        translateX = 0;
        translateY = 0;
        modalImage.style.transform = 'translate(0, 0) scale(1)';
        modalContent.style.cursor = 'zoom-in';
    }

    function updateImagePosition() {
        modalImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${isZoomed ? 2 : 1})`;
    }

    if (mainImage && modalImage && modalContent) {
        // Abrir modal
        mainImage.addEventListener('click', function() {
            modalImage.src = mainImage.src;
            imageModal.classList.add('active');
            resetImage();
        });

        // Zoom e movimento
        modalContent.addEventListener('click', function(e) {
            if (e.target === modalImage) {
                isZoomed = !isZoomed;
                if (isZoomed) {
                    modalContent.style.cursor = 'grab';
                    modalImage.style.transform = 'scale(2)';
                } else {
                    resetImage();
                }
            }
        });

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
                updateImagePosition();
            }
        });

        window.addEventListener('mouseup', function() {
            isDragging = false;
            if (isZoomed) {
                modalContent.style.cursor = 'grab';
            }
        });

        // Navegação
        if (thumbnails.length > 1) {
            modalPrevBtn.addEventListener('click', function() {
                currentImageIndex = (currentImageIndex - 1 + thumbnails.length) % thumbnails.length;
                modalImage.src = imageUrls[currentImageIndex];
                resetImage();
                updateMainImage(currentImageIndex);
            });

            modalNextBtn.addEventListener('click', function() {
                currentImageIndex = (currentImageIndex + 1) % thumbnails.length;
                modalImage.src = imageUrls[currentImageIndex];
                resetImage();
                updateMainImage(currentImageIndex);
            });
        }

        // Fechar modal
        closeModal.addEventListener('click', function() {
            imageModal.classList.remove('active');
            resetImage();
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
            
            // Mostra loading
            const submitButton = quotationForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitButton.disabled = true;
        
            try {
                const formData = new FormData();
                
                // Adiciona os campos manualmente
                formData.append('name', document.getElementById('name').value);
                formData.append('email', document.getElementById('email').value);
                formData.append('phone', document.getElementById('phone').value);
                formData.append('company', document.getElementById('company').value);
                formData.append('message', document.getElementById('message').value);
                formData.append('product_name', document.querySelector('h1').textContent);
                formData.append('product_category', document.querySelector('.produto-categoria').textContent);
                formData.append('product_image_url', mainImage.src.split('/').pop());
                formData.append('quantity', document.getElementById('quantity').value);
        
                // Adiciona logs para debug
                console.log('Enviando dados:', Object.fromEntries(formData));
        
                const response = await fetch('/enviar-cotacao', {
                    method: 'POST',
                    body: formData
                });
        
                console.log('Status da resposta:', response.status);
                const data = await response.json();
                console.log('Resposta:', data);
        
                if (response.ok) {
                    alert('Cotação enviada com sucesso! Você receberá um email de confirmação em breve.');
                    quotationForm.reset();
                    quotationModal.classList.remove('active');
                } else {
                    throw new Error(data.error || 'Erro ao enviar cotação');
                }
            } catch (error) {
                console.error('Erro detalhado:', error);
                alert('Erro ao enviar cotação. Por favor, tente novamente ou entre em contato por telefone.');
            } finally {
                submitButton.innerHTML = originalButtonText;
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
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            imageModal?.classList.remove('active');
            quotationModal?.classList.remove('active');
            resetImage();
        }
    });

    window.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.classList.remove('active');
            resetImage();
        }
        if (e.target === quotationModal) {
            quotationModal.classList.remove('active');
        }
    });
});