document.addEventListener('DOMContentLoaded', function () {
    // =============== MENU MOBILE ===============
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        // Alterna o menu ao clicar no botão
        mobileToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
            console.log('Menu Mobile: Estado alterado.');
        });

        // Fecha o menu ao clicar em qualquer link
        const menuLinks = navMenu.querySelectorAll('.nav-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', function () {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
                console.log(`Menu fechado após clicar em: ${link.textContent}`);
            });
        });

        // Fecha o menu ao clicar fora dele
        document.addEventListener('click', function (e) {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                if (navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    mobileToggle.classList.remove('active');
                    console.log('Menu Mobile: Fechado ao clicar fora.');
                }
            }
        });
    } else {
        console.error('Menu Mobile: Falta o botão de toggle ou o menu no DOM.');
    }

    // =============== GALERIA DE IMAGENS ===============
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');
    let imageList = []; // Inicializar com dados reais no backend
    let currentIndex = 0;

    function updateMainImage(index) {
        currentIndex = index;
        if (mainImage && imageList.length) {
            mainImage.src = imageList[currentIndex];
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === currentIndex);
            });
        }
    }

    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            updateMainImage(index);
        });
    });

    if (imageList.length > 1) {
        updateMainImage(0);
    }

    // =============== MODAL DE IMAGEM ===============
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModal = document.getElementById('closeModal');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    const modalContent = document.getElementById('modalContent');

    if (mainImage) {
        mainImage.addEventListener('click', () => {
            if (imageModal && modalImage && imageList.length) {
                modalImage.src = imageList[currentIndex];
                imageModal.classList.add('active');
            }
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (imageModal) imageModal.classList.remove('active');
        });
    }

    if (modalPrevBtn && modalNextBtn) {
        modalPrevBtn.addEventListener('click', () => {
            if (imageList.length > 0) {
                currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
                modalImage.src = imageList[currentIndex];
            }
        });

        modalNextBtn.addEventListener('click', () => {
            if (imageList.length > 0) {
                currentIndex = (currentIndex + 1) % imageList.length;
                modalImage.src = imageList[currentIndex];
            }
        });
    }

    // =============== ZOOM E PAN ===============
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    function updateModalTransform() {
        if (modalImage) {
            modalImage.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale})`;
        }
    }

    modalContent.addEventListener('mousedown', (e) => {
        let startX = e.clientX - translateX;
        let startY = e.clientY - translateY;

        const moveHandler = (event) => {
            translateX = event.clientX - startX;
            translateY = event.clientY - startY;
            updateModalTransform();
        };

        const stopHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', stopHandler);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', stopHandler);
    });

    // =============== FORMULÁRIO DE COTAÇÃO ===============
    const quotationModal = document.getElementById('quotationModal');
    const quotationButton = document.getElementById('quotationButton');
    const closeQuotationForm = document.getElementById('closeQuotationForm');
    const quotationForm = document.getElementById('quotationForm');

    if (quotationButton) {
        quotationButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (quotationModal) {
                quotationModal.classList.add('active');
            }
        });
    }

    if (closeQuotationForm) {
        closeQuotationForm.addEventListener('click', () => {
            if (quotationModal) {
                quotationModal.classList.remove('active');
            }
        });
    }

    if (quotationForm) {
        quotationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(quotationForm);

            try {
                const response = await fetch('/enviar-cotacao', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Erro ao enviar cotação');
                }

                alert('Cotação enviada com sucesso!');
                quotationForm.reset();
                if (quotationModal) quotationModal.classList.remove('active');
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // =============== FECHAMENTO GLOBAL ===============
    document.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            imageModal.classList.remove('active');
        }

        if (e.target === quotationModal) {
            quotationModal.classList.remove('active');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (imageModal) imageModal.classList.remove('active');
            if (quotationModal) quotationModal.classList.remove('active');
        }
    });
});
