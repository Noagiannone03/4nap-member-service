// Importation des modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

// Import wallet integration
const { generateWalletButtons, setupWalletRoutes } = require('./wallet-integration');

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Nodemailer
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: 'mail73.lwspanel.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    console.log('✅ Configuration email initialisée');
} catch (error) {
    console.error('❌ Erreur configuration email:', error.message);
}

// Middleware de sécurité
app.use(helmet({
    contentSecurityPolicy: false // Désactivé pour permettre les appels cross-origin
}));

// CORS permissif pour accepter tous les domaines (développement)
app.use(cors({
    origin: true, // Accepte toutes les origines
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: false,
    optionsSuccessStatus: 200 // Pour les anciens navigateurs
}));

// Headers CORS supplémentaires pour plus de compatibilité
app.use((req, res, next) => {
    // Log de debug
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight 24h
    
    // Répondre aux requêtes OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        console.log('🔧 Requête OPTIONS (preflight) reçue pour:', req.path);
        return res.status(200).end();
    }
    
    next();
});

// Limitation du taux de requêtes
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // Limite à 10 emails par heure par IP
    message: {
        error: 'Limite d\'emails atteinte, veuillez réessayer plus tard.'
    }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Créer les dossiers nécessaires
const dirs = ['temp', 'qr-codes'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Route de test
app.get('/', (req, res) => {
    res.json({
        message: '4nap Email Service',
        status: 'online',
        endpoints: {
            email: 'POST /api/send-membership-email',
            test: 'GET /api/test'
        }
    });
});

// Route de test
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Serveur email 4nap fonctionnel',
        timestamp: new Date().toISOString(),
        email_configured: !!transporter
    });
});

// API: Envoyer email de membership
app.post('/api/send-membership-email', emailLimiter, async (req, res) => {
    try {
        const memberData = req.body;
        
        // Validation des données essentielles
        if (!memberData.email || !memberData.prenom || !memberData.nom || !memberData.memberId) {
            return res.status(400).json({
                error: 'Données manquantes',
                required: ['email', 'prenom', 'nom', 'memberId']
            });
        }

        // Générer le QR code
        const qrCodeData = await generateQRCode(memberData.memberId);
        
        // Ajouter le QR code aux données du membre
        memberData.qrCodeData = qrCodeData;

        // Générer le PDF
        const pdfPath = await generateMembershipPDF(memberData);
        
        // Envoyer l'email
        const emailSent = await sendMembershipEmail(memberData, pdfPath);
        
        // Nettoyer le fichier PDF temporaire
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        if (emailSent) {
            res.json({
                success: true,
                message: 'Email envoyé avec succès',
                qrCode: qrCodeData
            });
        } else {
            res.status(500).json({
                error: 'Erreur lors de l\'envoi de l\'email'
            });
        }

    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            message: error.message
        });
    }
});

// Route pour recevoir les webhooks HelloAsso
app.post('/webhook/helloasso', async (req, res) => {
    try {
        console.log('🎯 Webhook HelloAsso reçu:', JSON.stringify(req.body, null, 2));
        
        const webhookData = req.body;
        
        // Vérifier que c'est bien un paiement
        if (webhookData.eventType === 'Payment' && webhookData.data) {
            const payment = webhookData.data;
            const order = payment.order;
            const payer = payment.payer;
            
            // Extraire les informations importantes
            const email = payer.email;
            const firstName = payer.firstName || 'Ami(e)';
            const lastName = payer.lastName || '';
            const amount = payment.amount / 100; // HelloAsso envoie en centimes
            
            console.log(`💰 Nouveau paiement de ${firstName} ${lastName} (${email}) : ${amount}€`);
            
            // Générer un ID membre unique
            const memberId = 'HA-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            // Calculer la date d'expiration (12 mois)
            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
            
            // Créer le member pour le pass
            const member = {
                id: memberId,
                firstName: firstName,
                lastName: lastName,
                email: email,
                type: 'Membre Fort Nap',
                expirationDate: expirationDate.toLocaleDateString('fr-FR'),
                source: 'HelloAsso Purchase'
            };
            
            // Envoyer l'email de bienvenue avec pass
            await sendWelcomeEmailWithPass(member, amount);
            
            res.status(200).json({ success: true, message: 'Webhook traité avec succès' });
        } else {
            console.log('ℹ️ Webhook ignoré - pas un paiement:', webhookData.eventType);
            res.status(200).json({ success: true, message: 'Webhook reçu mais ignoré' });
        }
        
    } catch (error) {
        console.error('❌ Erreur webhook HelloAsso:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Configuration des routes wallet
setupWalletRoutes(app);

// Fonctions utilitaires

// Génération du QR code
async function generateQRCode(memberId) {
    try {
        const qrData = {
            type: '4nap-member',
            memberId: memberId,
            timestamp: Date.now(),
            version: '1.0'
        };
        
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
            type: 'image/png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 256
        });
        
        console.log(`✅ QR code généré pour le membre ${memberId}`);
        return qrCodeDataURL;
        
    } catch (error) {
        console.error('❌ Erreur lors de la génération du QR code:', error);
        throw error;
    }
}

// Génération du PDF de membership
async function generateMembershipPDF(member) {
    return new Promise((resolve, reject) => {
        try {
            const pdfPath = `temp/membership-${member.memberId}-${Date.now()}.pdf`;
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(pdfPath);
            
            doc.pipe(stream);
            
            // En-tête
            doc.fontSize(24)
               .fillColor('#00d4ff')
               .text('4nap - Fort Napoléon', 50, 50);
               
            doc.fontSize(16)
               .fillColor('#666666')
               .text('Pass Fidélité Membre', 50, 80);
            
            // Ligne de séparation
            doc.moveTo(50, 110)
               .lineTo(550, 110)
               .strokeColor('#00d4ff')
               .lineWidth(2)
               .stroke();
            
            // Informations du membre
            doc.fontSize(14)
               .fillColor('#000000')
               .text('Informations du Membre', 50, 140);
            
            const memberInfo = [
                `Nom: ${member.nom}`,
                `Prénom: ${member.prenom}`,
                `Email: ${member.email}`,
                `Type: ${member.typeMembre || 'Membre'}`,
                `Date d'inscription: ${new Date().toLocaleDateString('fr-FR')}`,
                `ID Membre: ${member.memberId}`
            ];
            
            let yPos = 170;
            memberInfo.forEach(info => {
                doc.text(info, 50, yPos);
                yPos += 25;
            });
            
            // QR Code
            if (member.qrCodeData) {
                const base64Data = member.qrCodeData.replace(/^data:image\/png;base64,/, '');
                const qrBuffer = Buffer.from(base64Data, 'base64');
                doc.image(qrBuffer, 350, 140, { width: 150 });
            }
            
            // Instructions
            doc.fontSize(12)
               .fillColor('#666666')
               .text('Instructions:', 50, 400)
               .text('• Présentez ce QR code lors de votre visite au Fort Napoléon', 50, 420)
               .text('• Ce pass est personnel et non transférable', 50, 440)
               .text('• Conservez ce document précieusement', 50, 460);
            
            // Pied de page
            doc.fontSize(10)
               .fillColor('#999999')
               .text('4nap - Fort Napoléon, La Seyne-sur-Mer', 50, 700)
               .text('www.4nap.fr | contact@4nap.fr', 50, 715);
            
            doc.end();
            
            stream.on('finish', () => {
                console.log(`✅ PDF généré: ${pdfPath}`);
                resolve(pdfPath);
            });
            
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Envoi de l'email de membership
async function sendMembershipEmail(member, pdfPath) {
    if (!transporter) {
        console.log('⚠️  Configuration email manquante');
        return false;
    }
    
    try {
        const mailOptions = {
            from: `"4nap - Fort Napoléon" <${process.env.SMTP_USER}>`,
            to: member.email,
            subject: '🎉 Bienvenue dans l\'équipe 4nap ! Votre pass fidélité',
            html: generateEmailHTML(member),
            attachments: [
                {
                    filename: `4nap-pass-fidelite-${member.prenom}-${member.nom}.pdf`,
                    path: pdfPath,
                    contentType: 'application/pdf'
                }
            ]
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email envoyé:', info.messageId);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
        return false;
    }
}

// Génération du HTML de l'email
function generateEmailHTML(member) {
    const walletButtons = generateWalletButtons(member);
    
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #00d4ff, #9933ff); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; }
            .welcome { text-align: center; margin-bottom: 30px; }
            .member-info { background: #f8f9fa; border-radius: 15px; padding: 25px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>4nap</h1>
                <p>Fort Napoléon - La Seyne</p>
            </div>
            <div class="content">
                <div class="welcome">
                    <h2>🎉 Bienvenue ${member.prenom} !</h2>
                    <p>Félicitations ! Vous êtes maintenant membre de la communauté 4nap.</p>
                </div>
                <div class="member-info">
                    <h3>📋 Vos informations</h3>
                    <p><strong>Nom:</strong> ${member.prenom} ${member.nom}</p>
                    <p><strong>Email:</strong> ${member.email}</p>
                    <p><strong>ID Membre:</strong> ${member.memberId}</p>
                </div>
                
                ${walletButtons.bothButtons}
                
                <p>📱 Votre pass fidélité QR code unique est également joint à cet email en PDF.</p>
                <p>🏰 Nous avons hâte de vous accueillir au Fort Napoléon !</p>
                
                <div style="margin-top: 30px; padding: 20px; background: #e8f4fd; border-radius: 10px; border-left: 4px solid #00d4ff;">
                    <h4 style="margin: 0 0 10px 0; color: #0066cc;">💡 Comment utiliser votre pass :</h4>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
                        <li>🎯 <strong>Ajoutez à votre wallet</strong> : Cliquez sur un bouton ci-dessus</li>
                        <li>📱 <strong>Accès rapide</strong> : Votre QR code sera accessible depuis l'écran de verrouillage</li>
                        <li>🏰 <strong>Au Fort</strong> : Présentez le QR code à l'entrée</li>
                        <li>📄 <strong>Alternative</strong> : Utilisez le PDF joint à cet email</li>
                    </ul>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// Fonction pour envoyer l'email de bienvenue avec pass membre
async function sendWelcomeEmailWithPass(member, purchaseAmount) {
    try {
        // Générer les liens wallet
        const googleWalletUrl = `https://4nap.fr/wallet/google/${member.id}`;
        const appleWalletUrl = `https://4nap.fr/wallet/apple/${member.id}`;
        
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f7fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
                .content { padding: 40px 30px; }
                .highlight { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; }
                .wallet-section { background: #f8f9ff; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
                .wallet-buttons { display: flex; gap: 15px; justify-content: center; margin: 20px 0; flex-wrap: wrap; }
                .wallet-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: transform 0.2s; }
                .google-wallet { background: #4285f4; color: white; }
                .apple-wallet { background: #000; color: white; }
                .wallet-btn:hover { transform: translateY(-2px); }
                .fort-info { background: #e8f4fd; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
                .emoji { font-size: 1.2em; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Merci ${member.firstName} !</h1>
                    <p>Votre achat nous fait énormément plaisir</p>
                </div>
                
                <div class="content">
                    <p>Bonjour <strong>${member.firstName}</strong> ! 👋</p>
                    
                    <p>Nous venons de voir que vous avez effectué un achat de <span class="highlight">${purchaseAmount}€</span> sur notre billetterie HelloAsso ! 🎫</p>
                    
                    <p>Pour vous remercier de votre confiance, nous avons le plaisir de vous <strong>offrir un abonnement de membre du Fort Napoléon pendant 12 mois</strong> ! 🏰✨</p>
                    
                    <div class="wallet-section">
                        <h3>🎁 Votre Pass Membre est prêt !</h3>
                        <p>Ajoutez-le directement à votre smartphone :</p>
                        
                        <div class="wallet-buttons">
                            <a href="${googleWalletUrl}" class="wallet-btn google-wallet">
                                📱 Ajouter à Google Wallet
                            </a>
                            <a href="${appleWalletUrl}" class="wallet-btn apple-wallet">
                                🍎 Ajouter à Apple Wallet
                            </a>
                        </div>
                        
                        <p><small>💡 <strong>Astuce :</strong> Votre pass sera toujours accessible dans l'app Wallet de votre téléphone !</small></p>
                    </div>
                    
                    <div class="fort-info">
                        <h4>🏰 Votre abonnement membre inclut :</h4>
                        <ul>
                            <li><strong>Accès privilégié</strong> au Fort Napoléon</li>
                            <li><strong>Réductions</strong> sur nos événements</li>
                            <li><strong>Invitations</strong> aux vernissages privés</li>
                            <li><strong>Newsletter exclusive</strong> avec les coulisses</li>
                        </ul>
                        <p><strong>📅 Valable jusqu'au ${member.expirationDate}</strong></p>
                    </div>
                    
                    <p>Nous avons hâte de vous accueillir au Fort Napoléon ! 🌊</p>
                    
                    <p>L'équipe 4nap 💙</p>
                </div>
                
                <div class="footer">
                    <p>🏰 Fort Napoléon • La Seyne-sur-Mer<br>
                    📧 contact@4nap.fr • 🌐 4nap.fr</p>
                </div>
            </div>
        </body>
        </html>`;
        
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: member.email,
            subject: `🎁 ${member.firstName}, votre pass membre Fort Napoléon vous attend !`,
            html: emailHtml
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email de bienvenue envoyé à ${member.email}:`, result.messageId);
        
        return result;
        
    } catch (error) {
        console.error('❌ Erreur envoi email de bienvenue:', error);
        throw error;
    }
}

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint non trouvé',
        available_endpoints: [
            'GET /',
            'GET /api/test',
            'POST /api/send-membership-email'
        ]
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        error: 'Erreur interne du serveur'
    });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Serveur Email 4nap démarré !
📍 URL: http://localhost:${PORT}
🌍 Accessible sur: http://0.0.0.0:${PORT}
📧 Email configuré: ${transporter ? '✅' : '❌'}
🎯 Endpoints:
   GET  / - Info serveur
   GET  /api/test - Test serveur
   POST /api/send-membership-email - Envoi email
    `);
});

process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt du serveur...');
    process.exit(0);
});

module.exports = app; 