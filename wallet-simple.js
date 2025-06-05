// Version simplifiée des boutons wallet - Sans API requise

/**
 * Générer une page PWA pour le pass membre
 */
function generatePassPage(memberData) {
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pass Membre 4nap - ${memberData.prenom} ${memberData.nom}</title>
        
        <!-- PWA Meta Tags -->
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="Pass 4nap">
        <meta name="theme-color" content="#1a1a2e">
        
        <!-- Icons pour PWA -->
        <link rel="apple-touch-icon" href="https://api.4nap.fr/icons/icon-192.png">
        <link rel="icon" type="image/png" sizes="192x192" href="https://api.4nap.fr/icons/icon-192.png">
        <link rel="manifest" href="/pass/${memberData.memberId}/manifest.json">
        
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: white;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .pass-container {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 30px;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                max-width: 400px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }
            
            .logo {
                font-size: 2em;
                font-weight: bold;
                background: linear-gradient(135deg, #00d4ff, #9933ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            
            .subtitle {
                color: #aaa;
                margin-bottom: 30px;
                font-size: 0.9em;
            }
            
            .member-name {
                font-size: 1.5em;
                font-weight: bold;
                margin-bottom: 10px;
                color: #00d4ff;
            }
            
            .member-id {
                color: #ccc;
                font-size: 0.9em;
                margin-bottom: 30px;
                letter-spacing: 1px;
            }
            
            .qr-container {
                background: white;
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                display: inline-block;
            }
            
            .qr-code {
                width: 200px;
                height: 200px;
                border-radius: 10px;
            }
            
            .instructions {
                background: rgba(0, 212, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
                font-size: 0.85em;
                line-height: 1.4;
            }
            
            .add-to-home {
                background: linear-gradient(135deg, #00d4ff, #9933ff);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-weight: bold;
                font-size: 1em;
                cursor: pointer;
                margin: 10px;
                transition: transform 0.2s;
            }
            
            .add-to-home:hover {
                transform: translateY(-2px);
            }
            
            .wallet-actions {
                margin: 20px 0;
            }
            
            .wallet-btn {
                display: inline-block;
                margin: 5px;
                padding: 12px 20px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 0.9em;
                transition: transform 0.2s;
            }
            
            .google-wallet {
                background: #4285f4;
                color: white;
            }
            
            .apple-wallet {
                background: #000;
                color: white;
            }
            
            .wallet-btn:hover {
                transform: translateY(-2px);
            }
            
            .footer {
                margin-top: 30px;
                font-size: 0.8em;
                color: #888;
                text-align: center;
            }
            
            @media (max-width: 480px) {
                .pass-container { padding: 20px; }
                .qr-code { width: 150px; height: 150px; }
                .member-name { font-size: 1.3em; }
            }
        </style>
    </head>
    <body>
        <div class="pass-container">
            <div class="logo">4nap</div>
            <div class="subtitle">Fort Napoléon • La Seyne</div>
            
            <div class="member-name">${memberData.prenom} ${memberData.nom}</div>
            <div class="member-id">ID: ${memberData.memberId}</div>
            
            <div class="qr-container">
                <canvas class="qr-code" id="qrCode"></canvas>
            </div>
            
            <div class="instructions">
                <strong>📱 Comment utiliser :</strong><br>
                • Présentez ce QR code à l'entrée du Fort<br>
                • Ajoutez cette page à votre écran d'accueil<br>
                • Accès rapide même hors ligne
            </div>
            
            <button class="add-to-home" onclick="addToHomeScreen()">
                📱 Ajouter à l'écran d'accueil
            </button>
            
            <div class="wallet-actions">
                <a href="/pass/${memberData.memberId}/google" class="wallet-btn google-wallet">
                    📱 Google Wallet
                </a>
                <a href="/pass/${memberData.memberId}/apple" class="wallet-btn apple-wallet">
                    📱 Apple Wallet
                </a>
            </div>
            
            <div class="footer">
                Pass Membre 4nap • ${new Date().toLocaleDateString('fr-FR')}<br>
                <small>www.4nap.fr</small>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
            // Générer le QR code
            const qrData = {
                type: '4nap-member',
                memberId: '${memberData.memberId}',
                email: '${memberData.email}',
                name: '${memberData.prenom} ${memberData.nom}',
                timestamp: ${Date.now()}
            };
            
            QRCode.toCanvas(document.getElementById('qrCode'), JSON.stringify(qrData), {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            // PWA Installation
            let deferredPrompt;
            
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
            });
            
            function addToHomeScreen() {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('PWA installée');
                        }
                        deferredPrompt = null;
                    });
                } else {
                    // Instructions manuelles
                    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                        alert('📱 Sur iOS: Appuyez sur le bouton Partager puis "Sur l\\'écran d\\'accueil"');
                    } else if (/Android/.test(navigator.userAgent)) {
                        alert('📱 Sur Android: Menu du navigateur > "Ajouter à l\\'écran d\\'accueil"');
                    } else {
                        alert('📱 Utilisez le menu de votre navigateur pour ajouter cette page à l\\'écran d\\'accueil');
                    }
                }
            }
            
            // Service Worker pour PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/pass/sw.js')
                    .then(registration => console.log('SW registered'))
                    .catch(error => console.log('SW registration failed'));
            }
        </script>
    </body>
    </html>
    `;
}

/**
 * Générer le manifest PWA
 */
function generatePWAManifest(memberData) {
    return {
        name: `Pass 4nap - ${memberData.prenom} ${memberData.nom}`,
        short_name: "Pass 4nap",
        description: "Pass membre 4nap Fort Napoléon",
        start_url: `/pass/${memberData.memberId}`,
        display: "standalone",
        background_color: "#1a1a2e",
        theme_color: "#00d4ff",
        orientation: "portrait",
        icons: [
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png"
            },
            {
                src: "/icons/icon-512.png", 
                sizes: "512x512",
                type: "image/png"
            }
        ],
        categories: ["productivity", "utilities"]
    };
}

/**
 * Service Worker pour PWA
 */
function generateServiceWorker() {
    return `
    const CACHE_NAME = '4nap-pass-v1';
    const urlsToCache = [
        '/pass/',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'
    ];
    
    self.addEventListener('install', event => {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => cache.addAll(urlsToCache))
        );
    });
    
    self.addEventListener('fetch', event => {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request);
                })
        );
    });
    `;
}

/**
 * Boutons simplifiés pour l'email
 */
function generateSimpleWalletButtons(memberData) {
    const passUrl = `https://api.4nap.fr/pass/${memberData.memberId}`;
    
    return {
        simpleButtons: `
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 12px;">
                <p style="margin-bottom: 15px; font-weight: bold; color: #333; font-size: 16px;">
                    📱 Accédez à votre pass membre :
                </p>
                <a href="${passUrl}" 
                   style="display: inline-block; margin: 10px; padding: 15px 30px; 
                          background: linear-gradient(135deg, #00d4ff, #9933ff); color: white; text-decoration: none; 
                          border-radius: 10px; font-weight: bold; font-size: 16px;">
                    🎫 Ouvrir mon Pass
                </a>
                <p style="margin-top: 15px; font-size: 13px; color: #666; line-height: 1.4;">
                    • Ajoutez à votre écran d'accueil pour un accès rapide<br>
                    • QR code disponible même hors ligne<br>
                    • Compatible avec Google Wallet et Apple Wallet
                </p>
            </div>
        `
    };
}

/**
 * Routes pour les passes
 */
function setupSimpleWalletRoutes(app) {
    // Page principale du pass
    app.get('/pass/:memberId', (req, res) => {
        const memberData = {
            memberId: req.params.memberId,
            prenom: 'Membre',
            nom: '4nap',
            email: 'membre@4nap.fr'
        };
        
        const passPage = generatePassPage(memberData);
        res.send(passPage);
    });
    
    // Manifest PWA
    app.get('/pass/:memberId/manifest.json', (req, res) => {
        const memberData = {
            memberId: req.params.memberId,
            prenom: 'Membre',
            nom: '4nap'
        };
        
        const manifest = generatePWAManifest(memberData);
        res.json(manifest);
    });
    
    // Service Worker
    app.get('/pass/sw.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.send(generateServiceWorker());
    });
    
    // Redirection Google Wallet (version demo)
    app.get('/pass/:memberId/google', (req, res) => {
        res.json({
            message: 'Google Wallet en cours de configuration',
            alternative: `Utilisez le pass PWA : https://api.4nap.fr/pass/${req.params.memberId}`
        });
    });
    
    // Redirection Apple Wallet (version demo)
    app.get('/pass/:memberId/apple', (req, res) => {
        res.json({
            message: 'Apple Wallet en cours de configuration', 
            alternative: `Utilisez le pass PWA : https://api.4nap.fr/pass/${req.params.memberId}`
        });
    });
}

module.exports = {
    generatePassPage,
    generateSimpleWalletButtons,
    setupSimpleWalletRoutes,
    generatePWAManifest,
    generateServiceWorker
}; 