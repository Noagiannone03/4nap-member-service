// Enregistrement des plugins GSAP
gsap.registerPlugin(ScrollTrigger);

// Configuration GSAP
gsap.config({
    nullTargetWarn: false
});

// Variables globales
let isLoaded = false;

// Fonction d'initialisation
function init() {
    if (isLoaded) return;
    isLoaded = true;
    
    // Animations de chargement
    initLoadingAnimations();
    
    // Animations au scroll
    initScrollAnimations();
    
    // Gestion des interactions
    initInteractions();
    
    // Effets de particules
    initParticles();
    
    // Navigation sticky
    initNavigation();
}

// Animations de chargement de la page
function initLoadingAnimations() {
    // Timeline principal pour le hero
    const heroTl = gsap.timeline();
    
    // Animation du badge
    heroTl.from('.hero-badge', {
        duration: 0.8,
        opacity: 0,
        y: 30,
        ease: 'power3.out'
    });
    
    // Animation du titre ligne par ligne
    heroTl.from('.title-line', {
        duration: 1,
        opacity: 0,
        y: 50,
        stagger: 0.2,
        ease: 'power3.out'
    }, '-=0.4');
    
    // Animation de la description
    heroTl.from('.hero-description', {
        duration: 0.8,
        opacity: 0,
        y: 30,
        ease: 'power3.out'
    }, '-=0.6');
    
    // Animation des boutons
    heroTl.from('.hero-buttons .btn', {
        duration: 0.8,
        opacity: 0,
        y: 30,
        stagger: 0.1,
        ease: 'power3.out'
    }, '-=0.4');
    
    // Animation de la carte flottante
    heroTl.from('.floating-card', {
        duration: 1.2,
        opacity: 0,
        scale: 0.8,
        rotation: 10,
        ease: 'elastic.out(1, 0.8)'
    }, '-=0.8');
    
    // Animation de la navigation
    gsap.from('.navbar', {
        duration: 1,
        opacity: 0,
        y: -80,
        ease: 'power3.out',
        delay: 0.5
    });
}

// Animations au scroll
function initScrollAnimations() {
    // Animation des cartes de projet
    gsap.utils.toArray('.projet-card').forEach((card, index) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse'
            },
            duration: 0.8,
            opacity: 0,
            y: 50,
            rotation: 5,
            ease: 'power3.out',
            delay: index * 0.1
        });
    });
    
    // Animation du titre de section
    gsap.utils.toArray('.section-title').forEach(title => {
        gsap.from(title, {
            scrollTrigger: {
                trigger: title,
                start: 'top 85%',
                toggleActions: 'play none none reverse'
            },
            duration: 1,
            opacity: 0,
            y: 40,
            ease: 'power3.out'
        });
    });
    
    // Animation de la section membership
    gsap.from('.membership-info', {
        scrollTrigger: {
            trigger: '.membership',
            start: 'top 70%',
            toggleActions: 'play none none reverse'
        },
        duration: 1,
        opacity: 0,
        x: -50,
        ease: 'power3.out'
    });
    
    gsap.from('.membership-card', {
        scrollTrigger: {
            trigger: '.membership',
            start: 'top 70%',
            toggleActions: 'play none none reverse'
        },
        duration: 1,
        opacity: 0,
        x: 50,
        scale: 0.9,
        ease: 'power3.out',
        delay: 0.2
    });
    
    // Animation parallax sur les éléments
    gsap.utils.toArray('.floating-card').forEach(element => {
        gsap.to(element, {
            yPercent: -50,
            ease: 'none',
            scrollTrigger: {
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    });
}

// Gestion des interactions
function initInteractions() {
    // Boutons avec effet hover
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            gsap.to(btn, {
                duration: 0.3,
                scale: 1.05,
                ease: 'power2.out'
            });
        });
        
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                duration: 0.3,
                scale: 1,
                ease: 'power2.out'
            });
        });
        
        btn.addEventListener('mousedown', () => {
            gsap.to(btn, {
                duration: 0.1,
                scale: 0.95,
                ease: 'power2.out'
            });
        });
        
        btn.addEventListener('mouseup', () => {
            gsap.to(btn, {
                duration: 0.1,
                scale: 1.05,
                ease: 'power2.out'
            });
        });
    });
    
    // Animation des cartes projet au hover
    const projectCards = document.querySelectorAll('.projet-card');
    projectCards.forEach(card => {
        const icon = card.querySelector('.card-icon');
        
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                duration: 0.3,
                y: -10,
                ease: 'power2.out'
            });
            gsap.to(icon, {
                duration: 0.3,
                rotation: 10,
                scale: 1.1,
                ease: 'power2.out'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                duration: 0.3,
                y: 0,
                ease: 'power2.out'
            });
            gsap.to(icon, {
                duration: 0.3,
                rotation: 0,
                scale: 1,
                ease: 'power2.out'
            });
        });
    });
    
    // Gestion des clics pour l'inscription
    const joinButtons = document.querySelectorAll('#joinBtn, #startMembership');
    joinButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Animation de clic
            gsap.to(btn, {
                duration: 0.1,
                scale: 0.95,
                ease: 'power2.out',
                onComplete: () => {
                    gsap.to(btn, {
                        duration: 0.2,
                        scale: 1,
                        ease: 'elastic.out(1, 0.3)'
                    });
                }
            });
            
            // Redirection vers la page d'inscription
            setTimeout(() => {
                window.location.href = '/inscription.html';
            }, 300);
        });
    });
}

// Effet de particules animées
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 1}px;
            height: ${Math.random() * 4 + 1}px;
            background: ${getRandomColor()};
            border-radius: 50%;
            opacity: ${Math.random() * 0.5 + 0.2};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
        `;
        
        particlesContainer.appendChild(particle);
        
        // Animation de la particule
        gsap.to(particle, {
            duration: Math.random() * 20 + 10,
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
            rotation: Math.random() * 360,
            ease: 'none',
            repeat: -1,
            yoyo: true
        });
        
        // Animation d'opacité
        gsap.to(particle, {
            duration: Math.random() * 3 + 2,
            opacity: Math.random() * 0.8 + 0.2,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
    }
}

// Couleurs aléatoires pour les particules
function getRandomColor() {
    const colors = ['#00d4ff', '#00ff88', '#ff0099', '#ff6600', '#9933ff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Navigation sticky
function initNavigation() {
    const navbar = document.getElementById('navbar');
    
    ScrollTrigger.create({
        start: 'top -80',
        end: 99999,
        toggleClass: {className: 'scrolled', targets: navbar}
    });
    
    // Ajout du style pour la navigation scrollée
    const style = document.createElement('style');
    style.textContent = `
        .navbar.scrolled {
            background: rgba(10, 10, 11, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }
    `;
    document.head.appendChild(style);
    
    // Navigation smooth scroll
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                gsap.to(window, {
                    duration: 1,
                    scrollTo: {
                        y: targetElement,
                        offsetY: 80
                    },
                    ease: 'power3.inOut'
                });
            }
        });
    });
}

// Animation d'entrée pour les éléments visibles
function animateOnScroll() {
    const elements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .scale-in');
    
    elements.forEach(element => {
        gsap.set(element, {
            opacity: 0,
            y: element.classList.contains('fade-in') ? 50 : 0,
            x: element.classList.contains('slide-in-left') ? -50 : 
               element.classList.contains('slide-in-right') ? 50 : 0,
            scale: element.classList.contains('scale-in') ? 0.8 : 1
        });
        
        ScrollTrigger.create({
            trigger: element,
            start: 'top 80%',
            onEnter: () => {
                gsap.to(element, {
                    duration: 0.8,
                    opacity: 1,
                    y: 0,
                    x: 0,
                    scale: 1,
                    ease: 'power3.out'
                });
            }
        });
    });
}

// Animation de la carte QR preview
function animateQRPreview() {
    const qrPreview = document.querySelector('.qr-preview');
    if (qrPreview) {
        gsap.to(qrPreview, {
            duration: 2,
            rotation: 360,
            ease: 'none',
            repeat: -1
        });
        
        gsap.to(qrPreview, {
            duration: 3,
            scale: 1.1,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
    }
}

// Gestion du redimensionnement
function handleResize() {
    ScrollTrigger.refresh();
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', handleResize);

// Animation de la carte QR quand la page est chargée
window.addEventListener('load', () => {
    animateQRPreview();
    animateOnScroll();
});

// Gestion des erreurs
window.addEventListener('error', (e) => {
    console.error('Erreur JavaScript:', e.error);
});

// Préchargement des images
function preloadImages() {
    const imageUrls = [
        'assets/logo.svg'
    ];
    
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

// Performance monitoring
function initPerformanceMonitoring() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Temps de chargement:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }, 0);
        });
    }
}

// Initialisation des fonctionnalités supplémentaires
document.addEventListener('DOMContentLoaded', () => {
    preloadImages();
    initPerformanceMonitoring();
});

// Export pour utilisation globale
window.FourNapAnimations = {
    init,
    animateOnScroll,
    handleResize
}; 