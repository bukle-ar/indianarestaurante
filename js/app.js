/* =========================================
   INDIANA LOUNGE — App JS (Dinámico)
   Lee contenido desde Firestore
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ─── Nav scroll effect ───
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        header && header.classList.toggle('scrolled', window.scrollY > 60);
    });

    // ─── Mobile menu toggle ───
    const navToggle = document.getElementById('navToggle');
    const navMenu   = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        document.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // ─── Reveal on scroll ───
    const observerOpts = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
        });
    }, observerOpts);

    document.querySelectorAll('.section, .menu-card, .nosotros__detail, .galeria__item').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // ─── Cargar contenido desde Firestore ───
    loadSiteContent();
});


// ════════════════════════════════════════
//  CARGA DINÁMICA DE CONTENIDO
// ════════════════════════════════════════

async function loadSiteContent() {
    try {
        const snap = await db.collection('site_content').get();
        const data = {};
        snap.forEach(doc => { data[doc.id] = doc.data(); });

        if (Object.keys(data).length === 0) return; // Sin datos, se queda con HTML estático

        if (data.hero)      renderHero(data.hero);
        if (data.almuerzo)  renderAlmuerzo(data.almuerzo, data.social);
        if (data.cenas)     renderCenas(data.cenas, data.social);
        if (data.galeria)   renderGaleria(data.galeria);
        if (data.nosotros)  renderNosotros(data.nosotros, data.social);
        if (data.social)    renderSocialLinks(data.social);

    } catch (err) {
        console.warn('No se pudo cargar contenido dinámico, mostrando fallback.', err);
    }
}


// ─── HERO ───
function renderHero(d) {
    const bg      = document.getElementById('heroBg');
    const tagline = document.getElementById('heroTagline');

    if (d.heroImage && bg) bg.style.backgroundImage = `url('${d.heroImage}')`;
    if (d.tagline && tagline) tagline.textContent = d.tagline;
}


// ─── ALMUERZO ───
function renderAlmuerzo(d, social) {
    setText('almuerzoLabel', d.label);
    setHTML('almuerzoTitle', brText(d.title));
    setText('almuerzoDesc',  d.description);
    setText('almuerzoDias',  d.scheduleDays);
    setText('almuerzoHoras', d.scheduleHours);
    setText('almuerzoBtnText', d.buttonText);

    // WhatsApp link
    const waBtn = document.getElementById('almuerzoWhatsapp');
    if (waBtn && social && social.whatsapp) {
        const msg = encodeURIComponent(d.whatsappMessage || 'Hola! Quiero consultar por el menú mensual');
        waBtn.href = `https://api.whatsapp.com/send/?phone=${social.whatsapp}&text=${msg}&type=phone_number&app_absent=0`;
    }

    // Slider
    const container = document.getElementById('almuerzoSlides');
    if (container && d.images && d.images.length) {
        const sorted = [...d.images].sort((a, b) => a.order - b.order);
        container.innerHTML = '';
        sorted.forEach(img => {
            const el = document.createElement('img');
            el.src = img.url;
            el.alt = 'Menú Indiana';
            el.loading = 'lazy';
            container.appendChild(el);
        });
        // Clon de la primera para loop infinito
        const clone = document.createElement('img');
        clone.src = sorted[0].url;
        clone.alt = 'Menú Indiana';
        container.appendChild(clone);

        initSlider(container, sorted.length);
    }
}


// ─── CENAS ───
function renderCenas(d, social) {
    setText('cenasLabel', d.label);
    setHTML('cenasTitle', brText(d.title));
    setText('cenasDesc',  d.description);
    setText('cenasDias',  d.scheduleDays);
    setText('cenasHoras', d.scheduleHours);
    setText('cenasBtnText', d.buttonText);

    const waBtn = document.getElementById('cenasWhatsapp');
    if (waBtn && social && social.whatsapp) {
        const msg = encodeURIComponent(d.whatsappMessage || 'Hola! Quiero hacer una reserva');
        waBtn.href = `https://api.whatsapp.com/send/?phone=${social.whatsapp}&text=${msg}&type=phone_number&app_absent=0`;
    }

    const container = document.getElementById('cenasSlides');
    if (container && d.images && d.images.length) {
        const sorted = [...d.images].sort((a, b) => a.order - b.order);
        container.innerHTML = '';
        sorted.forEach(img => {
            const el = document.createElement('img');
            el.src = img.url;
            el.alt = 'Cenas Indiana';
            el.loading = 'lazy';
            container.appendChild(el);
        });
        const clone = document.createElement('img');
        clone.src = sorted[0].url;
        clone.alt = 'Cenas Indiana';
        container.appendChild(clone);

        initSlider(container, sorted.length);
    }
}


// ─── GALERÍA ───
function renderGaleria(d) {
    const grid = document.getElementById('galeriaGrid');
    if (!grid || !d.images || !d.images.length) return;

    const sorted = [...d.images].sort((a, b) => a.order - b.order);
    grid.innerHTML = '';

    sorted.forEach(img => {
        const item = document.createElement('div');
        item.classList.add('galeria__item');
        const el = document.createElement('img');
        el.src = img.url;
        el.alt = 'Plato Indiana';
        el.loading = 'lazy';
        item.appendChild(el);
        grid.appendChild(item);
    });

    // Re-observe para reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
        });
    }, { threshold: 0.15 });

    grid.querySelectorAll('.galeria__item').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

    // Zoom móvil
    if (window.innerWidth <= 968) initMobileZoom();
}


// ─── NOSOTROS ───
function renderNosotros(d, social) {
    setText('nosotrosLabel', d.label);
    setText('nosotrosTitle', d.title);

    const descContainer = document.getElementById('nosotrosDescriptions');
    if (descContainer && d.descriptions && d.descriptions.length) {
        descContainer.innerHTML = '';
        d.descriptions.forEach(text => {
            const p = document.createElement('p');
            p.classList.add('nosotros__desc');
            p.textContent = text;
            descContainer.appendChild(p);
        });
    }

    setText('nosotrosAddress',       d.address);
    setText('nosotrosAlmuerzoDias',  d.almuerzoDays);
    setText('nosotrosAlmuerzoHoras', d.almuerzoHours);
    setText('nosotrosCenasDias',     d.cenasDays);
    setText('nosotrosCenasHoras',    d.cenasHours);
}


// ─── SOCIAL LINKS ───
function renderSocialLinks(d) {
    // WhatsApp en nosotros
    const waBtn = document.getElementById('nosotrosWhatsapp');
    if (waBtn && d.whatsapp) {
        waBtn.href = `https://api.whatsapp.com/send/?phone=${d.whatsapp}&type=phone_number&app_absent=0`;
    }
    // Instagram en nosotros
    const igBtn = document.getElementById('nosotrosInstagram');
    if (igBtn && d.instagram) {
        igBtn.href = d.instagram;
    }
}


// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════

function setText(id, val) {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = val;
}

function setHTML(id, val) {
    const el = document.getElementById(id);
    if (el && val != null) el.innerHTML = val;
}

/** Convierte \n en <br> para títulos multilínea (sanitizado contra XSS) */
function brText(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/\n/g, '<br>');
}

/** Slider automático infinito */
function initSlider(container, total) {
    let current = 0;
    setInterval(() => {
        current++;
        container.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        container.style.transform  = `translateX(-${current * 100}%)`;

        if (current === total) {
            setTimeout(() => {
                container.style.transition = 'none';
                current = 0;
                container.style.transform = 'translateX(0)';
            }, 850);
        }
    }, 3000);
}

/** Zoom móvil para galería */
function initMobileZoom() {
    const galeriaImages = document.querySelectorAll('.galeria__item img');
    if (!galeriaImages.length) return;

    const allSrcs = Array.from(galeriaImages).map(img => img.src);
    let zoomIndex = 0;

    const overlay = document.createElement('div');
    overlay.classList.add('galeria__zoom');
    overlay.innerHTML = `
        <button class="galeria__zoom-close">&times;</button>
        <button class="galeria__zoom-prev">&#8249;</button>
        <img src="" alt="Zoom plato">
        <button class="galeria__zoom-next">&#8250;</button>
    `;
    document.body.appendChild(overlay);

    const zoomImg  = overlay.querySelector('img');
    const closeBtn = overlay.querySelector('.galeria__zoom-close');
    const prevBtn  = overlay.querySelector('.galeria__zoom-prev');
    const nextBtn  = overlay.querySelector('.galeria__zoom-next');

    function showImage(i) { zoomIndex = i; zoomImg.src = allSrcs[zoomIndex]; }

    galeriaImages.forEach((img, i) => {
        img.addEventListener('click', () => { showImage(i); overlay.classList.add('active'); });
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomIndex = (zoomIndex - 1 + allSrcs.length) % allSrcs.length; showImage(zoomIndex); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomIndex = (zoomIndex + 1) % allSrcs.length; showImage(zoomIndex); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
}

// ════════════════════════════════════════
//  MENÚ MODAL (PÚBLICO)
// ════════════════════════════════════════

(function initMenuModal() {
    const openBtn    = document.getElementById('openMenuBtn');
    const modal      = document.getElementById('menuModal');
    const backdrop   = document.getElementById('menuBackdrop');
    const closeBtn   = document.getElementById('menuModalClose');
    const backBtn    = document.getElementById('menuModalBack');
    const titleEl    = document.getElementById('menuModalTitle');
    const bodyEl     = document.getElementById('menuModalBody');

    if (!openBtn || !modal) return;

    let menuData = null;

    openBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (!menuData) await loadMenuData();
        showCategories();
    });

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    backBtn.addEventListener('click', () => showCategories());

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    async function loadMenuData() {
        try {
            const doc = await db.collection('site_content').doc('menu').get();
            if (doc.exists) menuData = doc.data();
        } catch (err) {
            console.warn('Error cargando menú:', err);
        }
    }

    function showCategories() {
        titleEl.textContent = 'Nuestra Carta';
        backBtn.style.display = 'none';

        if (!menuData || !menuData.categories || !menuData.categories.length) {
            bodyEl.innerHTML = '<p style="text-align:center;color:#8a8580;">El menú no está disponible en este momento.</p>';
            return;
        }

        const sorted = [...menuData.categories].sort((a, b) => a.order - b.order);

    let html = '<div class="menu-cat-grid">';
        sorted.forEach(cat => {
            // Podés borrar también la variable 'count' si querés, ya que no se va a usar
            html += `
                <div class="menu-cat-card" data-cat-id="${cat.id}">
                    <div class="menu-cat-card__name">${escapeHtml(cat.name)}</div>
                </div>
            `;
        });

        html += '</div>';
        bodyEl.innerHTML = html;

        bodyEl.querySelectorAll('.menu-cat-card').forEach(card => {
            card.addEventListener('click', () => {
                const catId = card.dataset.catId;
                const cat = sorted.find(c => c.id === catId);
                if (cat) showProducts(cat);
            });
        });
    }

    function showProducts(cat) {
        titleEl.textContent = cat.name;
        backBtn.style.display = 'block';

        if (!cat.products || !cat.products.length) {
            bodyEl.innerHTML = '<p style="text-align:center;color:#8a8580;">Sin productos en esta categoría.</p>';
            return;
        }

        const sorted = [...cat.products].sort((a, b) => a.order - b.order);
        let html = '<div class="menu-product-list">';
        sorted.forEach(prod => {
            html += `
                <div class="menu-product-card">
                    <div class="menu-product-card__header">
                        <span class="menu-product-card__name">${escapeHtml(prod.name)}</span>
                        <span class="menu-product-card__price">$ ${formatPrice(prod.price)}</span>
                    </div>
                    ${prod.description ? `<div class="menu-product-card__desc">${escapeHtml(prod.description)}</div>` : ''}
                    ${prod.taxFreePrice ? `<div class="menu-product-card__tax">Sin impuestos nacionales: $ ${formatPrice(prod.taxFreePrice)}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
        bodyEl.innerHTML = html;
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    function formatPrice(n) {
        if (n == null) return '0';
        return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
})();