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

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3000;

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
    contentSecurityPolicy: false // Désactivé pour permettre les appels cross-origin
}));

// CORS permissif pour accepter tous les domaines
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

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
                <p>📱 Votre pass fidélité QR code unique est joint à cet email en PDF.</p>
                <p>🏰 Nous avons hâte de vous accueillir au Fort Napoléon !</p>
            </div>
        </div>
    </body>
    </html>
    `;
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