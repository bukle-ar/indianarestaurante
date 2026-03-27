/* =========================================
   INDIANA LOUNGE — App JS
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ---------- Nav scroll effect ----------
    const header = document.querySelector('.header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ---------- Mobile menu toggle ----------
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // ---------- Smooth reveal on scroll ----------
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections and cards
    document.querySelectorAll('.section, .menu-card, .nosotros__detail, .galeria__item').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });

// ---------- Almuerzo slider ----------
    const slides = document.querySelector('.almuerzo__slides');
    if (slides) {
        const total = slides.querySelectorAll('img').length - 1; // no contar el clon
        let current = 0;

        setInterval(() => {
            current++;
            slides.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            slides.style.transform = `translateX(-${current * 100}%)`;

            // Cuando llega al clon, salta invisible a la primera
            if (current === total) {
                setTimeout(() => {
                    slides.style.transition = 'none';
                    current = 0;
                    slides.style.transform = 'translateX(0)';
                }, 850);
            }
        }, 3000);
    }

    // ---------- Cenas slider ----------
    const cenasSlides = document.querySelector('.cenas__slides');
    if (cenasSlides) {
        const cenasTotal = cenasSlides.querySelectorAll('img').length - 1;
        let cenasCurrent = 0;

        setInterval(() => {
            cenasCurrent++;
            cenasSlides.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            cenasSlides.style.transform = `translateX(-${cenasCurrent * 100}%)`;

            if (cenasCurrent === cenasTotal) {
                setTimeout(() => {
                    cenasSlides.style.transition = 'none';
                    cenasCurrent = 0;
                    cenasSlides.style.transform = 'translateX(0)';
                }, 850);
            }
        }, 3000);
    }

// ---------- Galería zoom en móvil ----------
    if (window.innerWidth <= 968) {
        const galeriaImages = document.querySelectorAll('.galeria__item img');
        const allSrcs = Array.from(galeriaImages).map(img => img.src);
        let zoomIndex = 0;

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.classList.add('galeria__zoom');

        overlay.innerHTML = `
            <button class="galeria__zoom-close">&times;</button>
            <button class="galeria__zoom-prev">&#8249;</button>
            <img src="" alt="Zoom plato">
            <button class="galeria__zoom-next">&#8250;</button>
        `;

        document.body.appendChild(overlay);

        const zoomImg = overlay.querySelector('img');
        const closeBtn = overlay.querySelector('.galeria__zoom-close');
        const prevBtn = overlay.querySelector('.galeria__zoom-prev');
        const nextBtn = overlay.querySelector('.galeria__zoom-next');

        function showImage(index) {
            zoomIndex = index;
            zoomImg.src = allSrcs[zoomIndex];
        }

        galeriaImages.forEach((img, i) => {
            img.addEventListener('click', () => {
                showImage(i);
                overlay.classList.add('active');
            });
        });

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomIndex = (zoomIndex - 1 + allSrcs.length) % allSrcs.length;
            showImage(zoomIndex);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomIndex = (zoomIndex + 1) % allSrcs.length;
            showImage(zoomIndex);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    }
});