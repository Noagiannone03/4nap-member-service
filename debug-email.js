const nodemailer = require('nodemailer');

console.log('🔍 Debug NodeMailer...\n');

// Test de configuration email
async function testEmailConfig() {
    console.log('1️⃣ Vérification des variables d\'environnement...');
    
    const emailUser = process.env.EMAIL_USER || 'NON_DEFINI';
    const emailPass = process.env.EMAIL_PASS || 'NON_DEFINI';
    
    console.log('📧 EMAIL_USER:', emailUser);
    console.log('🔑 EMAIL_PASS:', emailPass ? '***DEFINI***' : 'NON_DEFINI');
    
    if (emailUser === 'NON_DEFINI' || emailPass === 'NON_DEFINI') {
        console.log('❌ Variables d\'environnement manquantes !');
        return;
    }
    
    console.log('\n2️⃣ Test de connexion transporter...');
    
    // Différents providers à tester
    const providers = [
        {
            name: 'Gmail',
            config: {
                service: 'gmail',
                auth: { user: emailUser, pass: emailPass }
            }
        },
        {
            name: 'Outlook',
            config: {
                service: 'hotmail',
                auth: { user: emailUser, pass: emailPass }
            }
        },
        {
            name: 'SMTP Custom',
            config: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: { user: emailUser, pass: emailPass }
            }
        }
    ];
    
    for (const provider of providers) {
        try {
            console.log(`\n🧪 Test ${provider.name}...`);
            const transporter = nodemailer.createTransporter(provider.config);
            
            // Vérifier la connexion
            await transporter.verify();
            console.log(`✅ ${provider.name}: Connexion OK`);
            
            // Test d'envoi réel
            const info = await transporter.sendMail({
                from: emailUser,
                to: emailUser, // Envoi à soi-même pour test
                subject: `Test ${provider.name} - ${new Date().toLocaleTimeString()}`,
                text: `Email de test depuis ${provider.name}`,
                html: `<h3>✅ Email de test depuis ${provider.name}</h3><p>Timestamp: ${new Date()}</p>`
            });
            
            console.log(`✅ ${provider.name}: Email envoyé !`);
            console.log(`📧 Message ID: ${info.messageId}`);
            
            // Si on arrive ici, c'est que ça marche !
            return transporter;
            
        } catch (error) {
            console.log(`❌ ${provider.name}: ${error.message}`);
            
            // Diagnostic détaillé des erreurs courantes
            if (error.message.includes('Invalid login')) {
                console.log('💡 Suggestion: Vérifier les credentials email');
            }
            if (error.message.includes('Less secure app')) {
                console.log('💡 Suggestion: Activer "Accès moins sécurisé" sur Gmail');
            }
            if (error.message.includes('Application-specific password')) {
                console.log('💡 Suggestion: Utiliser un mot de passe d\'application Gmail');
            }
        }
    }
    
    console.log('\n❌ Aucun provider email ne fonctionne !');
}

// Test avec gestion d'erreur
testEmailConfig()
    .then(() => {
        console.log('\n🎉 Test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur globale:', error);
        process.exit(1);
    }); 