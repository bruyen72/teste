// Mobile menu toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const navMenu = document.querySelector('.nav-menu');

if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        console.log('Menu mobile toggled');
    });
}

// Image gallery
const mainImage = document.getElementById('mainImage');
const thumbnails = document.querySelectorAll('.thumbnail');
let imageList = [{% for img_path in all_images %}"{{ url_for('uploaded_file', filename=img_path) }}", {% endfor %}];
let currentIndex = 0;

function updateMainImage(index) {
    currentIndex = index;
    if (mainImage && imageList[currentIndex]) {
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

// Image modal
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const closeModal = document.getElementById('closeModal');
const modalPrevBtn = document.getElementById('modalPrevBtn');
const modalNextBtn = document.getElementById('modalNextBtn');
const modalContent = document.getElementById('modalContent');

if (mainImage) {
    mainImage.addEventListener('click', () => {
        if (imageModal && modalImage) {
            modalImage.src = imageList[currentIndex];
            imageModal.classList.add('active');
            resetZoomPan();
            console.log('Image modal opened');
        }
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        if (imageModal) {
            imageModal.classList.remove('active');
            resetZoomPan();
            console.log('Image modal closed');
        }
    });
}

// Modal navigation
if (modalPrevBtn && modalNextBtn && imageList.length > 1) {
    modalPrevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + imageList.length) % imageList.length;
        modalImage.src = imageList[currentIndex];
        resetZoomPan();
    });

    modalNextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % imageList.length;
        modalImage.src = imageList[currentIndex];
        resetZoomPan();
    });
} else if (modalPrevBtn && modalNextBtn) {
    modalPrevBtn.style.display = 'none';
    modalNextBtn.style.display = 'none';
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

if (modalImage) {
    modalImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        scale = Math.min(5, Math.max(0.5, scale + Math.sign(e.deltaY) * -0.1));
        updateModalTransform();
    });
}

if (modalContent) {
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

    modalContent.addEventListener('touchstart', (e) => {
        if (scale > 1 && e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
        }
    }, { passive: false });

    modalContent.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
            e.preventDefault();
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            updateModalTransform();
        }
    }, { passive: false });

    modalContent.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
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

if (quotationButton) {
    quotationButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (mainImage && quotationModal) {
            const fullImageUrl = window.location.origin + mainImage.getAttribute('src');
            quotationProductImage.src = fullImageUrl;
            quotationProductName.textContent = '{{ product.name }}';
            quotationProductCategory.textContent = '{{ product.category }}';
            quotationModal.classList.add('active');
            console.log('Quotation modal opened');
        }
    });
}

if (closeQuotationForm) {
    closeQuotationForm.addEventListener('click', () => {
        if (quotationModal) quotationModal.classList.remove('active');
        console.log('Quotation modal closed');
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
            if (quotationModal) quotationModal.classList.remove('active');
        } catch (error) {
            console.error(error);
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
        if (imageModal) {
            imageModal.classList.remove('active');
            resetZoomPan();
        }
        if (quotationModal) quotationModal.classList.remove('active');
    }
});
