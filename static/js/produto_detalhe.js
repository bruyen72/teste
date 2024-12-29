document.addEventListener('DOMContentLoaded', () => {
    console.log('Script carregado com sucesso e DOM pronto.');

    // === Menu Mobile ===
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
            console.log('Menu Mobile: Toggled');
        });

        document.addEventListener('click', (e) => {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
                console.log('Menu Mobile: Fechado ao clicar fora');
            }
        });
    } else {
        console.error('Menu Mobile: Elementos não encontrados.');
    }

    // === Galeria de Imagens ===
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');

    if (mainImage && thumbnails.length > 0) {
        thumbnails.forEach((thumb) => {
            thumb.addEventListener('click', () => {
                const imgSrc = thumb.getAttribute('data-img');
                if (imgSrc) {
                    mainImage.src = imgSrc;
                    console.log(`Imagem principal atualizada para ${imgSrc}`);
                }
            });
        });
    } else {
        console.error('Galeria de imagens: Elementos não encontrados.');
    }

    // === Modal de Imagem ===
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const closeModal = document.getElementById('closeModal');
    const modalPrevBtn = document.getElementById('modalPrevBtn');
    const modalNextBtn = document.getElementById('modalNextBtn');
    let currentIndex = 0;

    if (mainImage && imageModal && modalImage) {
        mainImage.addEventListener('click', () => {
            modalImage.src = mainImage.src;
            imageModal.classList.add('active');
            console.log('Modal de imagem aberto');
        });

        closeModal.addEventListener('click', () => {
            imageModal.classList.remove('active');
            console.log('Modal de imagem fechado');
        });

        modalPrevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
            modalImage.src = thumbnails[currentIndex].getAttribute('data-img');
            console.log(`Imagem anterior exibida no modal. Índice: ${currentIndex}`);
        });

        modalNextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % thumbnails.length;
            modalImage.src = thumbnails[currentIndex].getAttribute('data-img');
            console.log(`Próxima imagem exibida no modal. Índice: ${currentIndex}`);
        });
    } else {
        console.error('Modal de imagem: Elementos não encontrados.');
    }

    // === Formulário de Cotação ===
    const quotationModal = document.getElementById('quotationModal');
    const quotationButton = document.getElementById('quotationButton');
    const closeQuotationForm = document.getElementById('closeQuotationForm');

    if (quotationButton && quotationModal) {
        quotationButton.addEventListener('click', (e) => {
            e.preventDefault();
            quotationModal.classList.add('active');
            console.log('Modal de cotação aberto');
        });

        closeQuotationForm.addEventListener('click', () => {
            quotationModal.classList.remove('active');
            console.log('Modal de cotação fechado');
        });
    } else {
        console.error('Formulário de cotação: Elementos não encontrados.');
    }
});
