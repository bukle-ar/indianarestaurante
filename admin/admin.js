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
        if (confirm('¿Eliminar esta imagen?')) {
            if (publicId) deletedImages.push(publicId);
            item.remove();
            updateOrderNumbers(item.parentElement || document.querySelector('.img-grid'));
        }
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
