/* =========================================
   INDIANA ADMIN — Logic
   Firebase Auth + Firestore + Cloudinary
   ========================================= */

// ────────────────────────────────────────
//  STATE
// ────────────────────────────────────────
let siteData = {};            // Datos actuales de Firestore
let pendingUploads = {};      // Archivos pendientes de subir
let deletedImages  = [];      // public_ids a borrar en Cloudinary

const SECTIONS = ['hero', 'almuerzo', 'cenas', 'galeria', 'nosotros', 'social'];
const MAX_IMAGES_SECTION = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// ────────────────────────────────────────
//  INIT
// ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initNavigation();
    initCounters();
    initFileInputs();
});


// ════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════
function initAuth() {
    const loginBtn   = document.getElementById('loginBtn');
    const logoutBtn  = document.getElementById('logoutBtn');
    const loginEmail = document.getElementById('loginEmail');
    const loginPass  = document.getElementById('loginPass');

    loginBtn.addEventListener('click', handleLogin);
    loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    logoutBtn.addEventListener('click', () => auth.signOut());

    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'flex';
            loadAllData();
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('dashboard').style.display = 'none';
        }
    });
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    const errEl = document.getElementById('loginError');

    if (!email || !pass) {
        errEl.textContent = 'Completá email y contraseña.';
        errEl.style.display = 'block';
        return;
    }

    try {
        errEl.style.display = 'none';
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
        const msgs = {
            'auth/user-not-found': 'Usuario no encontrado.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/invalid-credential': 'Credenciales inválidas.',
            'auth/too-many-requests': 'Demasiados intentos. Esperá un momento.',
            'auth/invalid-email': 'Email no válido.'
        };
        errEl.textContent = msgs[err.code] || 'Error al iniciar sesión.';
        errEl.style.display = 'block';
    }
}


// ════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════
function initNavigation() {
    const links = document.querySelectorAll('.sidebar__link');
    links.forEach(link => {
        link.addEventListener('click', () => {
            // Sidebar links
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            // Panels
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            const section = link.dataset.section;
            document.getElementById(`panel-${section}`).classList.add('active');
            // Title
            document.getElementById('sectionTitle').textContent = link.textContent.trim();
        });
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', saveAllData);
}


// ════════════════════════════════════════
//  LOAD DATA
// ════════════════════════════════════════
async function loadAllData() {
    showLoading('Cargando datos...');
    try {
        const snap = await db.collection('site_content').get();
        snap.forEach(doc => { siteData[doc.id] = doc.data(); });
        populateAllFields();
        await loadMenuAdmin();
    } catch (err) {
        console.error('Error cargando datos:', err);
        showToast('Error al cargar los datos', 'error');
    }
    hideLoading();
}

function populateAllFields() {
    // Hero
    const hero = siteData.hero || {};
    setVal('heroTagline', hero.tagline || '');
    if (hero.heroImage) {
        setImagePreview('heroImagePreview', hero.heroImage);
    }

    // Almuerzo
    const alm = siteData.almuerzo || {};
    setVal('almuerzoLabel',   alm.label || '');
    setVal('almuerzoTitle',   alm.title || '');
    setVal('almuerzoDesc',    alm.description || '');
    setVal('almuerzoDias',    alm.scheduleDays || '');
    setVal('almuerzoHoras',   alm.scheduleHours || '');
    setVal('almuerzoBtnText', alm.buttonText || '');
    setVal('almuerzoWaMsg',   alm.whatsappMessage || '');
    renderImageGrid('almuerzoImages', alm.images || [], MAX_IMAGES_SECTION, 'almuerzoImgCount');

    // Cenas
    const cen = siteData.cenas || {};
    setVal('cenasLabel',   cen.label || '');
    setVal('cenasTitle',   cen.title || '');
    setVal('cenasDesc',    cen.description || '');
    setVal('cenasDias',    cen.scheduleDays || '');
    setVal('cenasHoras',   cen.scheduleHours || '');
    setVal('cenasBtnText', cen.buttonText || '');
    setVal('cenasWaMsg',   cen.whatsappMessage || '');
    renderImageGrid('cenasImages', cen.images || [], MAX_IMAGES_SECTION, 'cenasImgCount');

    // Galería
    const gal = siteData.galeria || {};
    renderImageGrid('galeriaImages', gal.images || [], null, 'galeriaImgCount');

    // Nosotros
    const nos = siteData.nosotros || {};
    setVal('nosotrosLabel',   nos.label || '');
    setVal('nosotrosTitle',   nos.title || '');
    setVal('nosotrosDesc1',   (nos.descriptions && nos.descriptions[0]) || '');
    setVal('nosotrosDesc2',   (nos.descriptions && nos.descriptions[1]) || '');
    setVal('nosotrosDesc3',   (nos.descriptions && nos.descriptions[2]) || '');
    setVal('nosotrosAddress',       nos.address || '');
    setVal('nosotrosAlmuerzoDias',  nos.almuerzoDays || '');
    setVal('nosotrosAlmuerzoHoras', nos.almuerzoHours || '');
    setVal('nosotrosCenasDias',     nos.cenasDays || '');
    setVal('nosotrosCenasHoras',    nos.cenasHours || '');

    // Social
    const soc = siteData.social || {};
    setVal('socialWhatsapp',  soc.whatsapp || '');
    setVal('socialInstagram', soc.instagram || '');

    // Update counters
    updateAllCounters();
}


// ════════════════════════════════════════
//  SAVE DATA
// ════════════════════════════════════════
async function saveAllData() {
    showLoading('Guardando cambios...');

    try {
        // 1. Subir imágenes pendientes a Cloudinary
        await uploadPendingImages();

        // 2. Recolectar datos de los formularios
        const batch = db.batch();

        // Hero
        batch.set(db.collection('site_content').doc('hero'), {
            tagline:   getVal('heroTagline'),
            heroImage: siteData.hero?.heroImage || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Almuerzo
        batch.set(db.collection('site_content').doc('almuerzo'), {
            label:           getVal('almuerzoLabel'),
            title:           getVal('almuerzoTitle'),
            description:     getVal('almuerzoDesc'),
            scheduleDays:    getVal('almuerzoDias'),
            scheduleHours:   getVal('almuerzoHoras'),
            buttonText:      getVal('almuerzoBtnText'),
            whatsappMessage: getVal('almuerzoWaMsg'),
            images:          getImagesFromGrid('almuerzoImages'),
            updatedAt:       firebase.firestore.FieldValue.serverTimestamp()
        });

        // Cenas
        batch.set(db.collection('site_content').doc('cenas'), {
            label:           getVal('cenasLabel'),
            title:           getVal('cenasTitle'),
            description:     getVal('cenasDesc'),
            scheduleDays:    getVal('cenasDias'),
            scheduleHours:   getVal('cenasHoras'),
            buttonText:      getVal('cenasBtnText'),
            whatsappMessage: getVal('cenasWaMsg'),
            images:          getImagesFromGrid('cenasImages'),
            updatedAt:       firebase.firestore.FieldValue.serverTimestamp()
        });

        // Galería
        batch.set(db.collection('site_content').doc('galeria'), {
            images:    getImagesFromGrid('galeriaImages'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Nosotros
        batch.set(db.collection('site_content').doc('nosotros'), {
            label:         getVal('nosotrosLabel'),
            title:         getVal('nosotrosTitle'),
            descriptions:  [
                getVal('nosotrosDesc1'),
                getVal('nosotrosDesc2'),
                getVal('nosotrosDesc3')
            ].filter(t => t.trim()),
            address:        getVal('nosotrosAddress'),
            almuerzoDays:   getVal('nosotrosAlmuerzoDias'),
            almuerzoHours:  getVal('nosotrosAlmuerzoHoras'),
            cenasDays:      getVal('nosotrosCenasDias'),
            cenasHours:     getVal('nosotrosCenasHoras'),
            updatedAt:      firebase.firestore.FieldValue.serverTimestamp()
        });

        // Social
        batch.set(db.collection('site_content').doc('social'), {
            whatsapp:  getVal('socialWhatsapp'),
            instagram: getVal('socialInstagram'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Menú
        batch.set(db.collection('site_content').doc('menu'), {
            categories: menuCategories,
            updatedAt:  firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        // 3. Actualizar state local
        await loadAllData();

        showToast('Cambios guardados correctamente', 'success');
    } catch (err) {
        console.error('Error guardando:', err);
        showToast('Error al guardar: ' + err.message, 'error');
    }

    hideLoading();
}


// ════════════════════════════════════════
//  CLOUDINARY UPLOAD
// ════════════════════════════════════════
async function uploadToCloudinary(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', `indiana/${folder}`);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
        { method: 'POST', body: formData }
    );

    if (!res.ok) throw new Error('Error subiendo imagen a Cloudinary');
    return res.json();
}

async function uploadPendingImages() {
    const keys = Object.keys(pendingUploads);
    if (!keys.length) return;

    for (const key of keys) {
        const { file, folder, callback } = pendingUploads[key];
        try {
            const result = await uploadToCloudinary(file, folder);
            callback(result);
        } catch (err) {
            console.error(`Error subiendo ${key}:`, err);
            showToast(`Error subiendo imagen: ${file.name}`, 'error');
        }
    }
    pendingUploads = {};
}


// ════════════════════════════════════════
//  IMAGE GRID MANAGEMENT
// ════════════════════════════════════════
function renderImageGrid(containerId, images, maxImages, countId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sorted = [...images].sort((a, b) => a.order - b.order);
    container.innerHTML = '';

    sorted.forEach((img, i) => {
        const item = createImageItem(img.url, img.publicId, i + 1);
        container.appendChild(item);
    });

    updateImageCount(countId, sorted.length, maxImages);
    initSortable(container);
}

function createImageItem(url, publicId, order) {
    const item = document.createElement('div');
    item.classList.add('img-grid__item');
    item.dataset.url = url;
    item.dataset.publicId = publicId || '';

    item.innerHTML = `
        <img src="${url}" alt="Foto">
        <button class="img-grid__delete" title="Eliminar">&times;</button>
        <span class="img-grid__order">${order}</span>
    `;

    item.querySelector('.img-grid__delete').addEventListener('click', (e) => {
        e.stopPropagation();
        modalConfirm('Eliminar imagen', '¿Eliminar esta imagen?').then(ok => { if (ok) {
            if (publicId) deletedImages.push(publicId);
            item.remove();
            updateOrderNumbers(item.parentElement || document.querySelector('.img-grid'));
        }});
    });

    return item;
}

function initSortable(container) {
    if (container._sortable) container._sortable.destroy();

    container._sortable = new Sortable(container, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: () => updateOrderNumbers(container)
    });
}

function updateOrderNumbers(container) {
    if (!container) return;
    const items = container.querySelectorAll('.img-grid__item');
    items.forEach((item, i) => {
        const orderEl = item.querySelector('.img-grid__order');
        if (orderEl) orderEl.textContent = i + 1;
    });

    // Update count badge
    const section = container.id.replace('Images', '');
    const countId = `${section}ImgCount`;
    const countEl = document.getElementById(countId);
    if (countEl) {
        const max = (section === 'galeria') ? null : MAX_IMAGES_SECTION;
        updateImageCount(countId, items.length, max);
    }
}

function updateImageCount(countId, count, max) {
    const el = document.getElementById(countId);
    if (!el) return;
    el.textContent = max ? `${count}/${max}` : count;
}

function getImagesFromGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const items = container.querySelectorAll('.img-grid__item');
    return Array.from(items).map((item, i) => ({
        url:      item.dataset.url,
        publicId: item.dataset.publicId || '',
        order:    i
    }));
}


// ════════════════════════════════════════
//  FILE INPUT HANDLERS
// ════════════════════════════════════════
function initFileInputs() {
    // Hero single image
    document.getElementById('heroFileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!validateFile(file)) return;

        showLoading('Subiendo imagen...');
        try {
            const result = await uploadToCloudinary(file, 'hero');
            siteData.hero = siteData.hero || {};
            siteData.hero.heroImage = result.secure_url;
            setImagePreview('heroImagePreview', result.secure_url);
            showToast('Imagen subida. Recordá guardar los cambios.', 'success');
        } catch (err) {
            showToast('Error al subir imagen', 'error');
        }
        hideLoading();
        e.target.value = '';
    });

    // Almuerzo images
    setupMultiImageInput('almuerzoFileInput', 'almuerzoImages', 'almuerzo', MAX_IMAGES_SECTION, 'almuerzoImgCount');

    // Cenas images
    setupMultiImageInput('cenasFileInput', 'cenasImages', 'cenas', MAX_IMAGES_SECTION, 'cenasImgCount');

    // Galería images (sin límite)
    setupMultiImageInput('galeriaFileInput', 'galeriaImages', 'galeria', null, 'galeriaImgCount');
}

function setupMultiImageInput(inputId, gridId, folder, maxImages, countId) {
    document.getElementById(inputId).addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        const container = document.getElementById(gridId);
        const currentCount = container.querySelectorAll('.img-grid__item').length;

        // Validar límite
        if (maxImages && (currentCount + files.length) > maxImages) {
            showToast(`Máximo ${maxImages} fotos en esta sección. Podés agregar ${maxImages - currentCount} más.`, 'error');
            e.target.value = '';
            return;
        }

        // Validar tipos
        const validFiles = files.filter(f => {
            if (!validateFile(f, false)) {
                showToast(`${f.name}: formato no permitido. Solo JPG, PNG y JPEG.`, 'error');
                return false;
            }
            return true;
        });

        if (!validFiles.length) { e.target.value = ''; return; }

        showLoading('Subiendo imágenes...');

        for (const file of validFiles) {
            try {
                const result = await uploadToCloudinary(file, folder);
                const order = container.querySelectorAll('.img-grid__item').length;
                const item = createImageItem(result.secure_url, result.public_id, order + 1);
                container.appendChild(item);
            } catch (err) {
                showToast(`Error al subir ${file.name}`, 'error');
            }
        }

        initSortable(container);
        updateOrderNumbers(container);
        hideLoading();
        showToast('Imágenes subidas. Recordá guardar los cambios.', 'success');
        e.target.value = '';
    });
}


// ════════════════════════════════════════
//  CHARACTER COUNTERS
// ════════════════════════════════════════
function initCounters() {
    const counters = [
        { input: 'heroTagline',    counter: 'heroTaglineCount' },
        { input: 'almuerzoDesc',   counter: 'almuerzoDescCount' },
        { input: 'almuerzoBtnText',counter: 'almuerzoBtnCount' },
        { input: 'cenasDesc',      counter: 'cenasDescCount' },
        { input: 'cenasBtnText',   counter: 'cenasBtnCount' },
    ];

    counters.forEach(({ input, counter }) => {
        const inputEl = document.getElementById(input);
        const countEl = document.getElementById(counter);
        if (inputEl && countEl) {
            inputEl.addEventListener('input', () => {
                countEl.textContent = inputEl.value.length;
            });
        }
    });
}

function updateAllCounters() {
    document.querySelectorAll('.field__counter span').forEach(span => {
        const input = span.closest('.field')?.querySelector('input, textarea');
        if (input) span.textContent = input.value.length;
    });
}

// ════════════════════════════════════════
//  MODAL CUSTOM
// ════════════════════════════════════════
function showModal({ title, body, buttons }) {
    const modal = document.getElementById('adminModal');
    const titleEl = document.getElementById('adminModalTitle');
    const bodyEl = document.getElementById('adminModalBody');
    const actionsEl = document.getElementById('adminModalActions');
    const backdrop = document.getElementById('adminModalBackdrop');

    titleEl.textContent = title || '';
    bodyEl.innerHTML = body || '';
    actionsEl.innerHTML = '';

    buttons.forEach(btn => {
        const el = document.createElement('button');
        el.textContent = btn.text;
        el.className = btn.primary ? 'btn-primary btn-sm' : 'btn-outline btn-sm';
        el.addEventListener('click', () => {
            modal.classList.remove('active');
            if (btn.action) btn.action();
        });
        actionsEl.appendChild(el);
    });

    backdrop.onclick = () => modal.classList.remove('active');
    modal.classList.add('active');
    setTimeout(() => { const i = bodyEl.querySelector('input'); if (i) i.focus(); }, 100);
}

function modalPrompt(title, placeholder, defaultVal) {
    return new Promise(resolve => {
        showModal({
            title,
            body: `<div class="field"><input type="text" id="modalInput" placeholder="${placeholder || ''}" value="${defaultVal || ''}" maxlength="80"></div>`,
            buttons: [
                { text: 'Cancelar', action: () => resolve(null) },
                { text: 'Aceptar', primary: true, action: () => resolve(document.getElementById('modalInput').value.trim() || null) }
            ]
        });
        setTimeout(() => {
            const inp = document.getElementById('modalInput');
            if (inp) inp.onkeydown = e => { if (e.key === 'Enter') { document.getElementById('adminModal').classList.remove('active'); resolve(inp.value.trim() || null); } };
        }, 100);
    });
}

function modalConfirm(title, message) {
    return new Promise(resolve => {
        showModal({
            title,
            body: `<p>${message}</p>`,
            buttons: [
                { text: 'Cancelar', action: () => resolve(false) },
                { text: 'Confirmar', primary: true, action: () => resolve(true) }
            ]
        });
    });
}


// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function setImagePreview(containerId, url) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<img src="${url}" alt="Preview">`;
}

function validateFile(file, showMsg = true) {
    if (!ALLOWED_TYPES.includes(file.type)) {
        if (showMsg) showToast('Formato no permitido. Solo JPG, PNG y JPEG.', 'error');
        return false;
    }
    if (file.size > 10 * 1024 * 1024) {
        if (showMsg) showToast('La imagen supera los 10MB.', 'error');
        return false;
    }
    return true;
}

function showLoading(text) {
    document.getElementById('loadingText').textContent = text || 'Cargando...';
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => { toast.className = 'toast'; }, 4000);
}

// ════════════════════════════════════════
//  MOBILE SIDEBAR TOGGLE
// ════════════════════════════════════════
(function() {
    const toggle  = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    const closeBtn = document.getElementById('sidebarClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    // Cerrar sidebar al tocar un link (mobile)
    document.querySelectorAll('.sidebar__link').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        });
    });
})();


// ════════════════════════════════════════
//  MENU ADMIN CRUD
// ════════════════════════════════════════
let menuCategories = [];
let currentEditCat = null;

async function loadMenuAdmin() {
    try {
        const doc = await db.collection('site_content').doc('menu').get();
        if (doc.exists && doc.data().categories) {
            menuCategories = doc.data().categories.sort((a, b) => a.order - b.order);
        } else {
            menuCategories = [];
        }
    } catch (err) {
        menuCategories = [];
    }
    renderMenuCategories();
}

function renderMenuCategories() {
    const list = document.getElementById('menuCategoriesList');
    const countEl = document.getElementById('menuCatCount');
    if (!list) return;

    list.innerHTML = '';
    if (countEl) countEl.textContent = menuCategories.length;

    menuCategories.forEach((cat, i) => {
        const prodCount = cat.products ? cat.products.length : 0;
        const div = document.createElement('div');
        div.classList.add('menu-cat-item');
        div.innerHTML = `
            <div class="menu-cat-item__info">
                <span class="menu-cat-item__name">${cat.name}</span>
                <span class="menu-cat-item__count">${prodCount} productos</span>
            </div>
            <div class="menu-cat-item__actions">
                <button class="btn-outline btn-sm" data-action="edit-cat" data-index="${i}">Editar</button>
                <button class="btn-danger" data-action="delete-cat" data-index="${i}">Eliminar</button>
                <span class="menu-cat-item__arrow">›</span>
            </div>
        `;

        // Click en la fila abre los productos
        div.addEventListener('click', (e) => {
            if (e.target.closest('[data-action]')) return;
            openCategoryProducts(i);
        });

        div.querySelector('[data-action="edit-cat"]').addEventListener('click', async (e) => {
            e.stopPropagation();
            const newName = await modalPrompt('Renombrar categoría', 'Nombre', cat.name);
            if (newName) {
                menuCategories[i].name = newName.toUpperCase();
                renderMenuCategories();
                showToast('Categoría renombrada. Guardá los cambios.', 'success');
            }
        });

        div.querySelector('[data-action="delete-cat"]').addEventListener('click', async (e) => {
            e.stopPropagation();
            const ok = await modalConfirm('Eliminar categoría', `¿Eliminar <strong>${cat.name}</strong> y todos sus productos?`);
            if (ok) {
                menuCategories.splice(i, 1);
                menuCategories.forEach((c, idx) => c.order = idx);
                renderMenuCategories();
                showToast('Categoría eliminada. Guardá los cambios.', 'success');
            }
        });

        list.appendChild(div);
    });
}

function openCategoryProducts(catIndex) {
    currentEditCat = catIndex;
    document.getElementById('menuCategoriesCard').style.display = 'none';
    document.getElementById('menuProductsCard').style.display = 'block';
    document.getElementById('menuProductsTitle').textContent = menuCategories[catIndex].name;
    renderMenuProducts();
}

function renderMenuProducts() {
    const cat = menuCategories[currentEditCat];
    if (!cat) return;

    const list = document.getElementById('menuProductsList');
    list.innerHTML = '';

    const products = cat.products || [];
    products.sort((a, b) => a.order - b.order);

    products.forEach((prod, i) => {
        const div = document.createElement('div');
        div.classList.add('menu-product-item');
        div.innerHTML = `
            <div class="menu-product-item__info">
                <div class="menu-product-item__name">${prod.name}</div>
                <div class="menu-product-item__desc">${prod.description || ''} ${prod.taxFreePrice ? '| Sin imp: $' + Number(prod.taxFreePrice).toLocaleString('es-AR') : ''}</div>
            </div>
            <span class="menu-product-item__price">$ ${Number(prod.price || 0).toLocaleString('es-AR')}</span>
            <div class="menu-product-item__actions">
                <button class="btn-outline btn-sm" data-action="edit-prod">Editar</button>
                <button class="btn-danger" data-action="delete-prod">Eliminar</button>
            </div>
        `;

        div.querySelector('[data-action="edit-prod"]').addEventListener('click', () => editProduct(i));
        div.querySelector('[data-action="delete-prod"]').addEventListener('click', async () => {
            const ok = await modalConfirm('Eliminar producto', `¿Eliminar <strong>${prod.name}</strong>?`);
            if (ok) {
                cat.products.splice(i, 1);
                cat.products.forEach((p, idx) => p.order = idx);
                renderMenuProducts();
                showToast('Producto eliminado. Guardá los cambios.', 'success');
            }
        });

        list.appendChild(div);
    });
}

function editProduct(prodIndex) {
    const cat = menuCategories[currentEditCat];
    const isNew = prodIndex === -1;
    const prod = isNew ? { name: '', price: 0, taxFreePrice: 0, description: '', order: (cat.products || []).length } : cat.products[prodIndex];

    const existing = document.querySelector('.product-form');
    if (existing) existing.remove();

    const form = document.createElement('div');
    form.classList.add('product-form');
    form.innerHTML = `
        <div class="product-form__header">
            <span class="product-form__title">${isNew ? 'Nuevo producto' : 'Editar producto'}</span>
            <button class="btn-sm btn-outline" id="cancelProdForm">Cancelar</button>
        </div>
        <div class="field">
            <label>Nombre</label>
            <input type="text" id="prodName" value="${prod.name}" maxlength="80">
        </div>
        <div class="field">
            <label>Descripción (opcional)</label>
            <input type="text" id="prodDesc" value="${prod.description || ''}" maxlength="200">
        </div>
        <div class="field-row">
            <div class="field">
                <label>Precio ($)</label>
                <input type="number" id="prodPrice" value="${prod.price || 0}" min="0" step="0.01">
            </div>
            <div class="field">
                <label>Precio sin impuestos ($)</label>
                <input type="number" id="prodTaxFree" value="${prod.taxFreePrice || 0}" min="0" step="0.01">
            </div>
        </div>
        <button class="btn-primary btn-sm" id="saveProdForm" style="margin-top:12px;">Guardar producto</button>
    `;

    const list = document.getElementById('menuProductsList');
    list.parentNode.insertBefore(form, list);

    form.querySelector('#cancelProdForm').addEventListener('click', () => form.remove());
    form.querySelector('#saveProdForm').addEventListener('click', () => {
        const name = document.getElementById('prodName').value.trim();
        if (!name) { showToast('El nombre es obligatorio', 'error'); return; }

        const data = {
            name: name,
            description: document.getElementById('prodDesc').value.trim(),
            price: parseFloat(document.getElementById('prodPrice').value) || 0,
            taxFreePrice: parseFloat(document.getElementById('prodTaxFree').value) || 0,
            order: prod.order
        };

        if (isNew) {
            if (!cat.products) cat.products = [];
            cat.products.push(data);
        } else {
            cat.products[prodIndex] = data;
        }

        form.remove();
        renderMenuProducts();
        showToast('Producto actualizado. Guardá los cambios.', 'success');
    });

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Init menu admin buttons
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('menuBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('menuProductsCard').style.display = 'none';
            document.getElementById('menuCategoriesCard').style.display = 'block';
            currentEditCat = null;
        });
    }

    const addCatBtn = document.getElementById('addCategoryBtn');
    if (addCatBtn) {
    addCatBtn.addEventListener('click', async () => {
            const name = await modalPrompt('Nueva categoría', 'Nombre de la categoría');
            if (name) {
                menuCategories.push({
                    id: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    name: name.toUpperCase(),
                    order: menuCategories.length,
                    products: []
                });
                renderMenuCategories();
                showToast('Categoría creada. Guardá los cambios.', 'success');
            }
        });
    }

    const addProdBtn = document.getElementById('addProductBtn');
    if (addProdBtn) {
        addProdBtn.addEventListener('click', () => editProduct(-1));
    }
});