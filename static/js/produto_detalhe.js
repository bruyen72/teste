document.addEventListener('DOMContentLoaded', function () {
    // =============== MENU MOBILE ===============
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function () {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
            console.log('Menu clicked');
        });

        const menuLinks = navMenu.querySelectorAll('.nav-link');
        menuLinks.forEach(link => {
            link.addEventListener('click', function () {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            });
        });

        // Fecha menu ao clicar fora
        document.addEventListener('click', function (e) {
            if (!mobileToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                mobileToggle.classList.remove('active');
            }
        });
    }

    // =============== GALERIA DE IMAGENS ===============
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail');
    let imageList = [{% for img_path in all_images %}"{{ url_for('uploaded_file', filename=img_path) }}", {% endfor %}];
let currentIndex = 0;

function updateMainImage(index) {
    currentIndex = index;
    mainImage.src = imageList[currentIndex];
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentIndex);
    });
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

mainImage.addEventListener('click', () => {
    modalImage.src = imageList[currentIndex];
    imageModal.classList.add('active');
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateModalTransform();
});

closeModal.addEventListener('click', () => {
    imageModal.classList.remove('active');
    modalImage.style.transform = 'scale(1) translate(0,0)';
});

// Navegação do Modal
if (imageList.length > 1) {
    modalPrevBtn.style.display = 'block';
    modalNextBtn.style.display = 'block';

    modalPrevBtn.addEventListener('click', () => {
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = imageList.length - 1;
        currentIndex = newIndex;
        modalImage.src = imageList[currentIndex];
        resetZoomPan();
    });

    modalNextBtn.addEventListener('click', () => {
        let newIndex = currentIndex + 1;
        if (newIndex >= imageList.length) newIndex = 0;
        currentIndex = newIndex;
        modalImage.src = imageList[currentIndex];
        resetZoomPan();
    });
} else {
    modalPrevBtn.style.display = 'none';
    modalNextBtn.style.display = 'none';
}

// =============== ZOOM E PAN ===============
let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

function updateModalTransform() {
    modalImage.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale})`;
}

function resetZoomPan() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateModalTransform();
}

modalImage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * -0.1;
    scale = Math.max(0.5, Math.min(5, scale + delta));
    updateModalTransform();
});

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

// Touch events
modalContent.addEventListener('touchstart', (e) => {
    if (scale > 1 && e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - translateX;
        startY = e.touches[0].clientY - translateY;
    }
}, { passive: false });

modalContent.addEventListener('touchmove', (e) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
        e.preventDefault();
        translateX = e.touches[0].clientX - startX;
        translateY = e.touches[0].clientY - startY;
        updateModalTransform();
    }
}, { passive: false });

modalContent.addEventListener('touchend', () => {
    isDragging = false;
});

// =============== FORMULÁRIO DE COTAÇÃO ===============
const quotationModal = document.getElementById('quotationModal');
const quotationButton = document.getElementById('quotationButton');
const closeQuotationForm = document.getElementById('closeQuotationForm');
const quotationForm = document.getElementById('quotationForm');
const quotationProductImage = document.getElementById('quotationProductImage');
const quotationProductName = document.getElementById('quotationProductName');
const quotationProductCategory = document.getElementById('quotationProductCategory');

quotationButton.addEventListener('click', (e) => {
    e.preventDefault();
    const fullImageUrl = window.location.origin + mainImage.getAttribute('src');
    quotationProductImage.src = fullImageUrl;
    quotationProductName.textContent = '{{ product.name }}';
    quotationProductCategory.textContent = '{{ product.category }}';
    quotationModal.classList.add('active');
});

closeQuotationForm.addEventListener('click', () => {
    quotationModal.classList.remove('active');
});

quotationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(quotationForm);
    formData.append('product_name', '{{ product.name }}');
    formData.append('product_category', '{{ product.category }}');
    formData.append('product_image_url', '{{ product.image_path }}');

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
            alert('Cotação enviada com sucesso! Você receberá um email de confirmação em breve.');
            quotationForm.reset();
            quotationModal.classList.remove('active');
        } else {
            throw new Error(data.error || 'Erro ao enviar cotação');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao enviar cotação. Por favor, tente novamente ou entre em contato por telefone.');
    } finally {
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
});

// =============== FECHAMENTO GLOBAL ===============
// Fecha modais ao clicar fora
window.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
        resetZoomPan();
    }
    if (e.target === quotationModal) {
        quotationModal.classList.remove('active');
    }
});

// Fecha modais com tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        imageModal.classList.remove('active');
        resetZoomPan();
        quotationModal.classList.remove('active');
    }
});
