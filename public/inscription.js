// Configuration et variables globales
let currentStep = 1;
const totalSteps = 3;
let formData = {};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initInscriptionPage();
    initFormNavigation();
    initFormValidation();
    initAnimations();
    initParticles();
});

// Initialisation de la page d'inscription
function initInscriptionPage() {
    console.log('Initialisation de la page d\'inscription 4nap');
    
    // Animation d'entrée des éléments
    gsap.from('.inscription-hero .hero-badge', {
        duration: 0.8,
        opacity: 0,
        y: 30,
        ease: 'power3.out',
        delay: 0.2
    });
    
    gsap.from('.inscription-hero .title-line', {
        duration: 1,
        opacity: 0,
        y: 50,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.4
    });
    
    gsap.from('.inscription-hero .hero-description', {
        duration: 0.8,
        opacity: 0,
        y: 30,
        ease: 'power3.out',
        delay: 0.8
    });
    
    // Animation des éléments du formulaire
    gsap.from('.form-sidebar', {
        duration: 1,
        opacity: 0,
        x: -50,
        ease: 'power3.out',
        delay: 1
    });
    
    gsap.from('.form-main', {
        duration: 1,
        opacity: 0,
        x: 50,
        ease: 'power3.out',
        delay: 1.2
    });
}

// Gestion de la navigation entre les étapes
function initFormNavigation() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('inscriptionForm');
    
    nextBtn.addEventListener('click', () => {
        if (validateCurrentStep()) {
            nextStep();
        }
    });
    
    prevBtn.addEventListener('click', () => {
        prevStep();
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateCurrentStep()) {
            submitForm();
        }
    });
}

// Validation du formulaire
function initFormValidation() {
    const inputs = document.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            validateField(input);
        });
        
        input.addEventListener('input', () => {
            clearFieldError(input);
        });
    });
}

// Validation d'un champ individuel
function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Validation selon le type de champ
    switch (fieldName) {
        case 'prenom':
        case 'nom':
            if (!value) {
                isValid = false;
                errorMessage = 'Ce champ est requis';
            } else if (value.length < 2) {
                isValid = false;
                errorMessage = 'Minimum 2 caractères';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value) {
                isValid = false;
                errorMessage = 'L\'email est requis';
            } else if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Format d\'email invalide';
            }
            break;
            
        case 'telephone':
            if (value && !/^[+]?[\d\s\-\(\)]{10,}$/.test(value)) {
                isValid = false;
                errorMessage = 'Format de téléphone invalide';
            }
            break;
            
        case 'adresse':
            if (!value) {
                isValid = false;
                errorMessage = 'L\'adresse est requise';
            }
            break;
            
        case 'codePostal':
            if (!value) {
                isValid = false;
                errorMessage = 'Le code postal est requis';
            } else if (!/^\d{5}$/.test(value)) {
                isValid = false;
                errorMessage = 'Format de code postal invalide (5 chiffres)';
            }
            break;
            
        case 'ville':
            if (!value) {
                isValid = false;
                errorMessage = 'La ville est requise';
            }
            break;
            
        case 'pays':
            if (!value) {
                isValid = false;
                errorMessage = 'Veuillez sélectionner un pays';
            }
            break;
            
        case 'conditions':
            if (!field.checked) {
                isValid = false;
                errorMessage = 'Vous devez accepter les conditions';
            }
            break;
    }
    
    // Affichage de l'erreur
    const errorElement = field.parentNode.querySelector('.form-error');
    if (errorElement) {
        if (isValid) {
            errorElement.textContent = '';
            field.classList.remove('error');
        } else {
            errorElement.textContent = errorMessage;
            field.classList.add('error');
        }
    }
    
    return isValid;
}

// Effacer l'erreur d'un champ
function clearFieldError(field) {
    const errorElement = field.parentNode.querySelector('.form-error');
    if (errorElement) {
        errorElement.textContent = '';
        field.classList.remove('error');
    }
}

// Validation de l'étape actuelle
function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requiredFields = currentStepElement.querySelectorAll('input[required], select[required]');
    const checkboxes = currentStepElement.querySelectorAll('input[type="checkbox"][required]');
    
    let isValid = true;
    
    // Validation des champs requis
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // Validation des checkboxes
    checkboxes.forEach(checkbox => {
        if (!validateField(checkbox)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// Passer à l'étape suivante
function nextStep() {
    if (currentStep < totalSteps) {
        saveStepData();
        
        const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        const nextStepElement = document.querySelector(`.form-step[data-step="${currentStep + 1}"]`);
        
        // Animation de sortie
        gsap.to(currentStepElement, {
            duration: 0.3,
            opacity: 0,
            x: -50,
            ease: 'power2.out',
            onComplete: () => {
                currentStepElement.classList.remove('active');
                nextStepElement.classList.add('active');
                
                // Animation d'entrée
                gsap.fromTo(nextStepElement, 
                    { opacity: 0, x: 50 },
                    { 
                        duration: 0.3,
                        opacity: 1,
                        x: 0,
                        ease: 'power2.out'
                    }
                );
            }
        });
        
        currentStep++;
        updateProgress();
        updateButtons();
    }
}

// Revenir à l'étape précédente
function prevStep() {
    if (currentStep > 1) {
        const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
        const prevStepElement = document.querySelector(`.form-step[data-step="${currentStep - 1}"]`);
        
        // Animation de sortie
        gsap.to(currentStepElement, {
            duration: 0.3,
            opacity: 0,
            x: 50,
            ease: 'power2.out',
            onComplete: () => {
                currentStepElement.classList.remove('active');
                prevStepElement.classList.add('active');
                
                // Animation d'entrée
                gsap.fromTo(prevStepElement,
                    { opacity: 0, x: -50 },
                    {
                        duration: 0.3,
                        opacity: 1,
                        x: 0,
                        ease: 'power2.out'
                    }
                );
            }
        });
        
        currentStep--;
        updateProgress();
        updateButtons();
    }
}

// Mettre à jour la barre de progression
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const currentStepSpan = document.getElementById('currentStep');
    
    const progressPercentage = (currentStep / totalSteps) * 100;
    
    gsap.to(progressFill, {
        duration: 0.5,
        width: `${progressPercentage}%`,
        ease: 'power2.out'
    });
    
    currentStepSpan.textContent = currentStep;
}

// Mettre à jour les boutons
function updateButtons() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    // Bouton précédent
    if (currentStep === 1) {
        prevBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
    }
    
    // Boutons suivant/submit
    if (currentStep === totalSteps) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'flex';
    } else {
        nextBtn.style.display = 'flex';
        submitBtn.style.display = 'none';
    }
}

// Sauvegarder les données de l'étape
function saveStepData() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const inputs = currentStepElement.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else {
            formData[input.name] = input.value;
        }
    });
}

// Soumettre le formulaire
async function submitForm() {
    try {
        saveStepData();
        
        // Afficher le modal de chargement
        showLoadingModal();
        
        // Préparer les données
        const memberData = {
            ...formData,
            dateInscription: new Date().toISOString(),
            dateDebutAbonnement: new Date().toISOString(),
            dateFinAbonnement: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 an
            statut: 'actif',
            renouvele: false
        };
        
        console.log('Données à envoyer:', memberData);
        
        // Envoyer les données au serveur
        const response = await fetch('/api/membres', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(memberData)
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Réponse du serveur:', result);
        
        // Masquer le modal de chargement
        hideLoadingModal();
        
        // Afficher le modal de succès avec le QR code
        showSuccessModal(result.qrCode, result.memberId);
        
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        hideLoadingModal();
        showErrorMessage('Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
    }
}

// Afficher le modal de chargement
function showLoadingModal() {
    const modal = document.getElementById('loadingModal');
    modal.style.display = 'flex';
    
    gsap.fromTo(modal, 
        { opacity: 0 },
        { 
            duration: 0.3,
            opacity: 1,
            ease: 'power2.out'
        }
    );
}

// Masquer le modal de chargement
function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    
    gsap.to(modal, {
        duration: 0.3,
        opacity: 0,
        ease: 'power2.out',
        onComplete: () => {
            modal.style.display = 'none';
        }
    });
}

// Afficher le modal de succès
function showSuccessModal(qrCodeData, memberId) {
    const modal = document.getElementById('successModal');
    const qrDisplay = document.getElementById('qrCodeDisplay');
    
    // Générer et afficher le QR code
    if (qrCodeData) {
        qrDisplay.innerHTML = `<img src="${qrCodeData}" alt="QR Code 4nap" style="max-width: 200px;">`;
    }
    
    modal.style.display = 'flex';
    
    gsap.fromTo(modal,
        { opacity: 0 },
        {
            duration: 0.5,
            opacity: 1,
            ease: 'power2.out'
        }
    );
    
    // Animation des éléments du modal
    gsap.from('.success-animation > *', {
        duration: 0.8,
        opacity: 0,
        y: 30,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2
    });
}

// Afficher un message d'erreur
function showErrorMessage(message) {
    // Créer un toast d'erreur
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff0099, #ff6600);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 8px 32px rgba(255, 0, 153, 0.3);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animation d'entrée
    gsap.fromTo(toast,
        { opacity: 0, x: 50 },
        { 
            duration: 0.5,
            opacity: 1,
            x: 0,
            ease: 'power3.out'
        }
    );
    
    // Suppression automatique
    setTimeout(() => {
        gsap.to(toast, {
            duration: 0.5,
            opacity: 0,
            x: 50,
            ease: 'power3.out',
            onComplete: () => {
                document.body.removeChild(toast);
            }
        });
    }, 5000);
}

// Initialiser les animations
function initAnimations() {
    // Animation de la carte d'aperçu
    const cardPreview = document.querySelector('.card-preview');
    if (cardPreview) {
        gsap.to(cardPreview, {
            duration: 6,
            y: -10,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
        });
    }
    
    // Animation des icônes de feature
    const featureIcons = document.querySelectorAll('.feature-icon');
    featureIcons.forEach((icon, index) => {
        gsap.to(icon, {
            duration: 2 + index * 0.5,
            rotation: 360,
            ease: 'none',
            repeat: -1,
            delay: index * 2
        });
    });
}

// Effet de particules (réutilisation du code de la page principale)
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 3 + 1}px;
            height: ${Math.random() * 3 + 1}px;
            background: ${getRandomColor()};
            border-radius: 50%;
            opacity: ${Math.random() * 0.4 + 0.1};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
        `;
        
        particlesContainer.appendChild(particle);
        
        // Animation de la particule
        gsap.to(particle, {
            duration: Math.random() * 15 + 10,
            x: Math.random() * 100 - 50,
            y: Math.random() * 100 - 50,
            rotation: Math.random() * 360,
            ease: 'none',
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

// Gestion des erreurs globales
window.addEventListener('error', (e) => {
    console.error('Erreur JavaScript:', e.error);
    showErrorMessage('Une erreur technique est survenue.');
});

// Export pour usage global
window.InscriptionManager = {
    validateField,
    nextStep,
    prevStep,
    submitForm
}; 