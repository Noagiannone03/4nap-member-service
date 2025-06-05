// Importation des modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const admin = require('firebase-admin');
require('dotenv').config();

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Firebase
let db;
try {
    // Initialisation Firebase Admin
    const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebasestore.app`
    });

    db = admin.firestore();
    console.log('✅ Firebase initialisé avec succès');
} catch (error) {
    console.error('❌ Erreur lors de l\'initialisation Firebase:', error.message);
    console.log('⚠️  Mode développement activé sans Firebase');
}

// Configuration Nodemailer
let transporter;
try {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
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
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Limitation du taux de requêtes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite chaque IP à 100 requêtes par fenêtre
    message: {
        error: 'Trop de requêtes, veuillez réessayer plus tard.'
    }
});

const inscriptionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // Limite à 3 inscriptions par heure par IP
    message: {
        error: 'Limite d\'inscriptions atteinte, veuillez réessayer plus tard.'
    }
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Créer les dossiers nécessaires
const dirs = ['uploads', 'temp', 'qr-codes'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Routes principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/inscription', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inscription.html'));
});

// API: Créer un nouveau membre
app.post('/api/membres', inscriptionLimiter, async (req, res) => {
    try {
        const memberData = req.body;
        
        // Validation des données
        const validation = validateMemberData(memberData);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Données invalides',
                details: validation.errors
            });
        }

        // Générer un ID unique pour le membre
        const memberId = uuidv4();
        
        // Préparer les données du membre
        const member = {
            id: memberId,
            ...memberData,
            dateCreation: new Date().toISOString(),
            qrCodeData: null,
            emailEnvoye: false
        };

        // Générer le QR code
        const qrCodeData = await generateQRCode(memberId);
        member.qrCodeData = qrCodeData;

        // Sauvegarder dans Firebase (si disponible)
        if (db) {
            await db.collection('membres').doc(memberId).set(member);
            console.log(`✅ Membre ${memberId} sauvegardé dans Firebase`);
        } else {
            // Mode développement - sauvegarder localement
            const membersFile = path.join(__dirname, 'temp', 'membres.json');
            let members = [];
            
            if (fs.existsSync(membersFile)) {
                const data = fs.readFileSync(membersFile, 'utf8');
                members = JSON.parse(data);
            }
            
            members.push(member);
            fs.writeFileSync(membersFile, JSON.stringify(members, null, 2));
            console.log(`✅ Membre ${memberId} sauvegardé localement`);
        }

        // Générer et envoyer le PDF par email
        const pdfPath = await generateMembershipPDF(member);
        const emailSent = await sendMembershipEmail(member, pdfPath);
        
        if (emailSent) {
            member.emailEnvoye = true;
            // Mettre à jour le status email
            if (db) {
                await db.collection('membres').doc(memberId).update({ emailEnvoye: true });
            }
        }

        // Nettoyer le fichier PDF temporaire
        if (fs.existsSync(pdfPath)) {
            fs.unlinkSync(pdfPath);
        }

        res.status(201).json({
            success: true,
            message: 'Membre créé avec succès',
            memberId: memberId,
            qrCode: qrCodeData,
            emailEnvoye: emailSent
        });

    } catch (error) {
        console.error('❌ Erreur lors de la création du membre:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur',
            message: 'Une erreur est survenue lors de la création du membre'
        });
    }
});

// API: Récupérer un membre par ID
app.get('/api/membres/:id', async (req, res) => {
    try {
        const memberId = req.params.id;
        
        let member = null;
        
        if (db) {
            const doc = await db.collection('membres').doc(memberId).get();
            if (doc.exists) {
                member = { id: doc.id, ...doc.data() };
            }
        } else {
            // Mode développement
            const membersFile = path.join(__dirname, 'temp', 'membres.json');
            if (fs.existsSync(membersFile)) {
                const data = fs.readFileSync(membersFile, 'utf8');
                const members = JSON.parse(data);
                member = members.find(m => m.id === memberId);
            }
        }

        if (!member) {
            return res.status(404).json({
                error: 'Membre non trouvé'
            });
        }

        res.json({
            success: true,
            member: member
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération du membre:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur'
        });
    }
});

// API: Lister tous les membres (pour admin)
app.get('/api/membres', async (req, res) => {
    try {
        let members = [];
        
        if (db) {
            const snapshot = await db.collection('membres').get();
            members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            // Mode développement
            const membersFile = path.join(__dirname, 'temp', 'membres.json');
            if (fs.existsSync(membersFile)) {
                const data = fs.readFileSync(membersFile, 'utf8');
                members = JSON.parse(data);
            }
        }

        res.json({
            success: true,
            members: members,
            total: members.length
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des membres:', error);
        res.status(500).json({
            error: 'Erreur interne du serveur'
        });
    }
});

// Fonctions utilitaires

// Validation des données du membre
function validateMemberData(data) {
    const errors = [];
    
    if (!data.prenom || data.prenom.trim().length < 2) {
        errors.push('Le prénom est requis (minimum 2 caractères)');
    }
    
    if (!data.nom || data.nom.trim().length < 2) {
        errors.push('Le nom est requis (minimum 2 caractères)');
    }
    
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('Email valide requis');
    }
    
    if (!data.adresse || data.adresse.trim().length < 5) {
        errors.push('Adresse complète requise');
    }
    
    if (!data.codePostal || !/^\d{5}$/.test(data.codePostal)) {
        errors.push('Code postal valide requis (5 chiffres)');
    }
    
    if (!data.ville || data.ville.trim().length < 2) {
        errors.push('Ville requise');
    }
    
    if (!data.pays) {
        errors.push('Pays requis');
    }
    
    if (!data.typeMembre) {
        errors.push('Type de membre requis');
    }
    
    if (!data.conditions) {
        errors.push('Acceptation des conditions requise');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

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
        
        // Sauvegarder le QR code comme fichier
        const qrCodePath = path.join(__dirname, 'qr-codes', `${memberId}.png`);
        const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(qrCodePath, base64Data, 'base64');
        
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
            const pdfPath = path.join(__dirname, 'temp', `membership-${member.id}.pdf`);
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
                `Type: ${member.typeMembre}`,
                `Date d'inscription: ${new Date(member.dateInscription).toLocaleDateString('fr-FR')}`,
                `Valide jusqu'au: ${new Date(member.dateFinAbonnement).toLocaleDateString('fr-FR')}`,
                `ID Membre: ${member.id}`
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
        console.log('⚠️  Configuration email manquante, email non envoyé');
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
    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue chez 4nap</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #0a0a0b, #1a1a1b);
                margin: 0;
                padding: 20px;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            .header {
                background: linear-gradient(135deg, #00d4ff, #9933ff);
                padding: 40px 20px;
                text-align: center;
                color: white;
            }
            .header h1 {
                margin: 0;
                font-size: 36px;
                font-weight: bold;
            }
            .header p {
                margin: 10px 0 0 0;
                font-size: 18px;
                opacity: 0.9;
            }
            .content {
                padding: 40px 30px;
            }
            .welcome-message {
                text-align: center;
                margin-bottom: 30px;
            }
            .welcome-message h2 {
                color: #00d4ff;
                font-size: 28px;
                margin-bottom: 10px;
            }
            .member-info {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 25px;
                margin: 30px 0;
                border-left: 5px solid #00d4ff;
            }
            .member-info h3 {
                color: #333;
                margin-bottom: 15px;
                font-size: 20px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
                border-bottom: none;
            }
            .info-label {
                font-weight: bold;
                color: #666;
            }
            .features {
                margin: 30px 0;
            }
            .features h3 {
                color: #00d4ff;
                font-size: 22px;
                margin-bottom: 20px;
            }
            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 10px;
            }
            .feature-icon {
                font-size: 24px;
                margin-right: 15px;
                width: 40px;
                text-align: center;
            }
            .cta {
                text-align: center;
                margin: 40px 0;
                padding: 30px;
                background: linear-gradient(135deg, #00ff88, #00d4ff);
                border-radius: 15px;
                color: white;
            }
            .cta h3 {
                margin-bottom: 15px;
                font-size: 24px;
            }
            .footer {
                background: #333;
                color: white;
                padding: 30px;
                text-align: center;
            }
            .footer p {
                margin: 5px 0;
                opacity: 0.8;
            }
            .qr-info {
                background: linear-gradient(135deg, #ff0099, #ff6600);
                color: white;
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>4nap</h1>
                <p>Fort Napoléon - La Seyne</p>
            </div>
            
            <div class="content">
                <div class="welcome-message">
                    <h2>🎉 Bienvenue ${member.prenom} !</h2>
                    <p>Félicitations ! Vous êtes maintenant membre de la communauté 4nap.</p>
                </div>
                
                <div class="member-info">
                    <h3>📋 Vos informations de membre</h3>
                    <div class="info-row">
                        <span class="info-label">Nom complet:</span>
                        <span>${member.prenom} ${member.nom}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Type de membre:</span>
                        <span>${member.typeMembre}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date d'inscription:</span>
                        <span>${new Date(member.dateInscription).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Valide jusqu'au:</span>
                        <span>${new Date(member.dateFinAbonnement).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ID Membre:</span>
                        <span>${member.id}</span>
                    </div>
                </div>
                
                <div class="qr-info">
                    <h3>📱 Votre Pass QR Code</h3>
                    <p>Votre pass fidélité QR code unique est joint à cet email en PDF. Conservez-le précieusement et présentez-le lors de vos visites au Fort Napoléon.</p>
                </div>
                
                <div class="features">
                    <h3>✨ Vos avantages membre</h3>
                    <div class="feature-item">
                        <div class="feature-icon">🎫</div>
                        <div>
                            <strong>Accès privilégié</strong><br>
                            Entrée prioritaire au Fort Napoléon
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🎁</div>
                        <div>
                            <strong>Programme fidélité</strong><br>
                            Réductions et avantages exclusifs
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📅</div>
                        <div>
                            <strong>Événements exclusifs</strong><br>
                            Invitation aux événements membres
                        </div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">💬</div>
                        <div>
                            <strong>Support prioritaire</strong><br>
                            Assistance dédiée aux membres
                        </div>
                    </div>
                </div>
                
                <div class="cta">
                    <h3>🚀 Prêt à vivre l'expérience 4nap ?</h3>
                    <p>Votre aventure au Fort Napoléon commence maintenant. Nous avons hâte de vous accueillir !</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>4nap - Fort Napoléon</strong></p>
                <p>La Seyne-sur-Mer, France</p>
                <p>www.4nap.fr | contact@4nap.fr</p>
                <p style="font-size: 12px; margin-top: 20px;">
                    Cet email a été envoyé automatiquement. Si vous avez des questions, contactez-nous.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Page non trouvée',
        message: 'La ressource demandée n\'existe pas'
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: 'Une erreur inattendue s\'est produite'
    });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Serveur 4nap démarré avec succès !
📍 URL: http://localhost:${PORT}
🌍 Accessible sur: http://0.0.0.0:${PORT}
🔧 Environnement: ${process.env.NODE_ENV || 'development'}
📧 Email configuré: ${transporter ? '✅' : '❌'}
🔥 Firebase configuré: ${db ? '✅' : '❌'}
    `);
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt du serveur...');
    process.exit(0);
});

module.exports = app; 