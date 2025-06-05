const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

// Configuration de l'application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuration du transporteur email
let transporter;

async function setupEmailTransporter() {
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

        // Test de la connexion
        await transporter.verify();
        console.log('✅ Configuration email OK');
        return true;
    } catch (error) {
        console.error('❌ Erreur configuration email:', error.message);
        return false;
    }
}

// Fonction pour générer un QR code
async function generateQRCode(text) {
    try {
        return await QRCode.toDataURL(text);
    } catch (error) {
        console.error('Erreur génération QR code:', error);
        throw error;
    }
}

// Fonction pour générer un PDF avec QR code
function generatePDF(member) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const chunks = [];
            
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            
            // En-tête
            doc.fontSize(20).fillColor('#2c3e50').text('CARTE DE MEMBRE', 50, 50);
            doc.fontSize(16).fillColor('#34495e').text('Fort Napoléon - La Seyne-sur-Mer', 50, 80);
            
            // Informations du membre
            doc.fontSize(12).fillColor('#2c3e50');
            doc.text(`Nom: ${member.prenom} ${member.nom}`, 50, 120);
            doc.text(`Type: ${member.typeMembre}`, 50, 140);
            doc.text(`ID Membre: ${member.memberId}`, 50, 160);
            doc.text(`Date d'expiration: ${member.dateExpiration}`, 50, 180);
            
            // QR Code (sera ajouté après génération)
            doc.text('QR Code à scanner:', 50, 220);
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// Routes principales
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: '🚀 Serveur Email 4nap opérationnel',
        timestamp: new Date().toISOString(),
        endpoints: {
            'GET /api/test': 'Test du serveur',
            'POST /api/send-membership-email': 'Envoi email membre',
            'POST /webhook/helloasso': 'Webhook HelloAsso'
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        status: 'success',
        message: 'API fonctionnelle',
        timestamp: new Date().toISOString(),
        email: transporter ? 'Configuré' : 'Non configuré'
    });
});

// Route principale pour envoyer un email de membre
app.post('/api/send-membership-email', async (req, res) => {
    try {
        const { memberId, email, prenom, nom, typeMembre } = req.body;

        if (!email || !prenom || !nom) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        console.log(`📧 Envoi email pour: ${prenom} ${nom} (${email})`);

        // Calculer la date d'expiration
        const dateExpiration = new Date();
        if (typeMembre === 'annuel') {
            dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
        } else {
            dateExpiration.setMonth(dateExpiration.getMonth() + 1);
        }

        const member = {
            memberId: memberId || `4NAP-${Date.now()}`,
            prenom,
            nom,
            email,
            typeMembre: typeMembre || 'annuel',
            dateExpiration: dateExpiration.toLocaleDateString('fr-FR')
        };

        // Générer QR code avec les infos membre
        const qrData = `Membre 4nap: ${member.prenom} ${member.nom} - ID: ${member.memberId} - Expire: ${member.dateExpiration}`;
        const qrCodeDataURL = await generateQRCode(qrData);

        // Email HTML
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
                .qr-section { background: #f8f9ff; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
                .member-info { background: #e8f4fd; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Bienvenue ${member.prenom} !</h1>
                    <p>Votre carte de membre est prête</p>
                </div>
                
                <div class="content">
                    <p>Bonjour <strong>${member.prenom}</strong> ! 👋</p>
                    
                    <p>Félicitations ! Votre <span class="highlight">carte de membre du Fort Napoléon</span> a été générée avec succès ! 🏰✨</p>
                    
                    <div class="qr-section">
                        <h3>🎫 Votre QR Code Membre</h3>
                        <img src="${qrCodeDataURL}" alt="QR Code Membre" style="max-width: 200px; margin: 20px 0;">
                        <p><strong>Présentez ce QR code</strong> lors de votre visite au Fort Napoléon</p>
                    </div>
                    
                    <div class="member-info">
                        <h4>📋 Informations de votre carte :</h4>
                        <ul>
                            <li><strong>Nom :</strong> ${member.prenom} ${member.nom}</li>
                            <li><strong>ID Membre :</strong> ${member.memberId}</li>
                            <li><strong>Type :</strong> ${member.typeMembre}</li>
                            <li><strong>Valable jusqu'au :</strong> ${member.dateExpiration}</li>
                        </ul>
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
            to: email,
            subject: `🎫 ${prenom}, votre carte membre Fort Napoléon est prête !`,
            html: emailHtml
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email envoyé à ${email}:`, result.messageId);

        res.json({
            success: true,
            message: 'Email envoyé avec succès',
            memberId: member.memberId,
            messageId: result.messageId
        });

    } catch (error) {
        console.error('❌ Erreur envoi email:', error);
        res.status(500).json({ error: error.message });
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
            
            // Envoyer l'email de bienvenue
            await sendWelcomeEmailWithMembership(email, firstName, lastName, amount, memberId, expirationDate);
            
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

// Route de test pour simuler un webhook HelloAsso
app.post('/api/send-helloasso-webhook', async (req, res) => {
    try {
        const { email, prenom, montant } = req.body;
        
        console.log(`🧪 Test webhook HelloAsso: ${prenom} (${email}) - ${montant}€`);
        
        const memberId = 'TEST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        
        await sendWelcomeEmailWithMembership(email, prenom, 'Test', montant, memberId, expirationDate);
        
        res.json({ 
            success: true, 
            message: 'Email de test envoyé avec succès',
            memberId: memberId
        });
        
    } catch (error) {
        console.error('❌ Erreur test webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fonction pour envoyer l'email de bienvenue HelloAsso
async function sendWelcomeEmailWithMembership(email, firstName, lastName, purchaseAmount, memberId, expirationDate) {
    try {
        // Générer QR code avec les infos membre
        const qrData = `Membre 4nap: ${firstName} ${lastName} - ID: ${memberId} - Expire: ${expirationDate.toLocaleDateString('fr-FR')}`;
        const qrCodeDataURL = await generateQRCode(qrData);
        
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
                .qr-section { background: #f8f9ff; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
                .fort-info { background: #e8f4fd; border-left: 4px solid #2196F3; padding: 20px; margin: 20px 0; border-radius: 8px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Merci ${firstName} !</h1>
                    <p>Votre achat nous fait énormément plaisir</p>
                </div>
                
                <div class="content">
                    <p>Bonjour <strong>${firstName}</strong> ! 👋</p>
                    
                    <p>Nous venons de voir que vous avez effectué un achat de <span class="highlight">${purchaseAmount}€</span> sur notre billetterie HelloAsso ! 🎫</p>
                    
                    <p>Pour vous remercier de votre confiance, nous avons le plaisir de vous <strong>offrir un abonnement de membre du Fort Napoléon pendant 12 mois</strong> ! 🏰✨</p>
                    
                    <div class="qr-section">
                        <h3>🎁 Votre Carte Membre est prête !</h3>
                        <img src="${qrCodeDataURL}" alt="QR Code Membre" style="max-width: 200px; margin: 20px 0;">
                        <p><strong>Présentez ce QR code</strong> lors de votre visite au Fort Napoléon</p>
                        <p><small>💡 <strong>Astuce :</strong> Sauvegardez cette image ou imprimez cet email !</small></p>
                    </div>
                    
                    <div class="fort-info">
                        <h4>🏰 Votre abonnement membre inclut :</h4>
                        <ul>
                            <li><strong>Accès privilégié</strong> au Fort Napoléon</li>
                            <li><strong>Réductions</strong> sur nos événements</li>
                            <li><strong>Invitations</strong> aux vernissages privés</li>
                            <li><strong>Newsletter exclusive</strong> avec les coulisses</li>
                        </ul>
                        <p><strong>📅 Valable jusqu'au ${expirationDate.toLocaleDateString('fr-FR')}</strong></p>
                        <p><strong>🆔 ID Membre : ${memberId}</strong></p>
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
            to: email,
            subject: `🎁 ${firstName}, votre pass membre Fort Napoléon vous attend !`,
            html: emailHtml
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email de bienvenue envoyé à ${email}:`, result.messageId);
        
        return result;
        
    } catch (error) {
        console.error('❌ Erreur envoi email de bienvenue:', error);
        throw error;
    }
}

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        availableRoutes: ['/', '/api/test', '/api/send-membership-email', '/webhook/helloasso']
    });
});

// Démarrage du serveur
async function startServer() {
    const emailReady = await setupEmailTransporter();
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log('\n🚀 Serveur Email 4nap démarré !');
        console.log(`📍 URL: http://localhost:${PORT}`);
        console.log(`🌍 Accessible sur: http://0.0.0.0:${PORT}`);
        console.log(`📧 Email configuré: ${emailReady ? '✅' : '❌'}`);
        console.log('🎯 Endpoints:');
        console.log('   GET  / - Info serveur');
        console.log('   GET  /api/test - Test serveur');
        console.log('   POST /api/send-membership-email - Envoi email');
        console.log('   POST /webhook/helloasso - Webhook HelloAsso');
        console.log('');
    });
}

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt du serveur...');
    process.exit(0);
});

startServer().catch(console.error); 