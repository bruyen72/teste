// Mobile menu toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileToggle.classList.toggle('active');
        console.log('Menu Mobile: Toggled');
    });

    // Fecha menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            mobileToggle.classList.remove('active');
        }
    });
} else {
    console.error('Menu Mobile: Elementos não encontrados');
}

// Image gallery
const mainImage = document.getElementById('mainImage');
const thumbnails = document.querySelectorAll('.thumbnail');
let imageList = [{% for img_path in all_images %}"{{ url_for('uploaded_file', filename=img_path) }}", {% endfor %}];
let currentIndex = 0;

function updateMainImage(index) {
    if (mainImage && imageList[index]) {
        currentIndex = index;
        mainImage.src = imageList[currentIndex];
        thumbnails.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === currentIndex);
        });
        console.log(`Imagem principal atualizada para o índice ${currentIndex}`);
    } else {
        console.error('Imagem principal ou lista de imagens ausente');
    }
}

thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => updateMainImage(index));
});

if (imageList.length > 0) {
    updateMainImage(0);
} else {
    console.error('Lista de imagens está vazia');
}

// Image modal
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const closeModal = document.getElementById('closeModal');
const modalPrevBtn = document.getElementById('modalPrevBtn');
const modalNextBtn = document.getElementById('modalNextBtn');
const modalContent = document.getElementById('modalContent');

if (mainImage && imageModal && modalImage) {
    mainImage.addEventListener('click', () => {
        modalImage.src = imageList[currentIndex];
        imageModal.classList.add('active');
        resetZoomPan();
        console.log('Modal de imagem aberto');
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        imageModal.classList.remove('active');
        resetZoomPan();
        console.log('Modal de imagem fechado');
    });
}

if (modalPrevBtn && modalNextBtn) {
    modalPrevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
        modalImage.src = imageList[currentIndex];
        resetZoomPan();
        console.log('Imagem anterior exibida no modal');
    });

    modalNextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % imageList.length;
        modalImage.src = imageList[currentIndex];
        resetZoomPan();
        console.log('Próxima imagem exibida no modal');
    });
}

// Modal zoom and pan
let scale = 1;
let translateX = 0;
let translateY = 0;

function updateModalTransform() {
    if (modalImage) {
        modalImage.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale})`;
    }
}

function resetZoomPan() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateModalTransform();
}

if (modalImage && modalContent) {
    modalImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.max(0.5, Math.min(5, scale + Math.sign(e.deltaY) * -0.1));
        updateModalTransform();
        console.log(`Zoom aplicado: ${scale}`);
    });

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    modalContent.addEventListener('mousedown', (e) => {
        if (scale > 1) {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            modalContent.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateModalTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modalContent.style.cursor = scale > 1 ? 'grab' : 'default';
        }
    });
}

// Quotation form handling
const quotationModal = document.getElementById('quotationModal');
const quotationButton = document.getElementById('quotationButton');
const closeQuotationForm = document.getElementById('closeQuotationForm');
const quotationForm = document.getElementById('quotationForm');
const quotationProductImage = document.getElementById('quotationProductImage');
const quotationProductName = document.getElementById('quotationProductName');
const quotationProductCategory = document.getElementById('quotationProductCategory');

if (quotationButton && quotationModal) {
    quotationButton.addEventListener('click', (e) => {
        e.preventDefault();
        quotationProductImage.src = mainImage ? mainImage.src : '';
        quotationProductName.textContent = '{{ product.name }}';
        quotationProductCategory.textContent = '{{ product.category }}';
        quotationModal.classList.add('active');
        console.log('Modal de cotação aberto');
    });
}

if (closeQuotationForm) {
    closeQuotationForm.addEventListener('click', () => {
        quotationModal.classList.remove('active');
        console.log('Modal de cotação fechado');
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

            if (!response.ok) throw new Error('Erro ao enviar cotação');
            alert('Cotação enviada com sucesso!');
            quotationForm.reset();
            quotationModal.classList.remove('active');
        } catch (error) {
            console.error('Erro ao enviar cotação:', error);
            alert('Erro ao enviar cotação.');
        }
    });
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
        resetZoomPan();
    }
    if (e.target === quotationModal) {
        quotationModal.classList.remove('active');
    }
});

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (imageModal) imageModal.classList.remove('active');
        if (quotationModal) quotationModal.classList.remove('active');
        resetZoomPan();
    }
});
