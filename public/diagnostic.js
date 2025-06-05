const https = require('https');
const dns = require('dns');
const tls = require('tls');

console.log('🔍 DIAGNOSTIC API 4NAP\n');

// Test DNS
console.log('1️⃣ Test DNS...');
dns.lookup('api.4nap.fr', (err, address) => {
    if (err) {
        console.log('❌ DNS Error:', err.message);
    } else {
        console.log('✅ DNS OK:', address);
    }
    
    // Test SSL Certificate
    console.log('\n2️⃣ Test Certificat SSL...');
    const socket = tls.connect(443, 'api.4nap.fr', {
        servername: 'api.4nap.fr',
        rejectUnauthorized: false // On teste même avec un cert invalide
    }, () => {
        const cert = socket.getPeerCertificate();
        console.log('✅ SSL Connexion OK');
        console.log('📜 Certificat Info:');
        console.log('  - Subject:', cert.subject?.CN || 'N/A');
        console.log('  - Issuer:', cert.issuer?.CN || 'N/A');
        console.log('  - Valid from:', cert.valid_from);
        console.log('  - Valid to:', cert.valid_to);
        console.log('  - Fingerprint:', cert.fingerprint);
        
        // Vérifier si le certificat est valide pour le domaine
        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        
        if (now < validFrom || now > validTo) {
            console.log('❌ Certificat EXPIRÉ ou pas encore valide');
        } else {
            console.log('✅ Certificat dans la période de validité');
        }
        
        if (!cert.subject?.CN?.includes('4nap.fr') && !cert.subjectaltname?.includes('4nap.fr')) {
            console.log('❌ Certificat ne correspond pas au domaine 4nap.fr');
        } else {
            console.log('✅ Certificat correspond au domaine');
        }
        
        socket.end();
        testAPI();
    });
    
    socket.on('error', (err) => {
        console.log('❌ SSL Error:', err.message);
        testAPI();
    });
});

function testAPI() {
    console.log('\n3️⃣ Test API Endpoints...');
    
    // Test avec SSL validation désactivée
    const agent = new https.Agent({
        rejectUnauthorized: false
    });
    
    const endpoints = [
        '/api/test',
        '/api/send-membership-email'
    ];
    
    endpoints.forEach(endpoint => {
        console.log(`\n🔍 Test ${endpoint}...`);
        
        const req = https.get(`https://api.4nap.fr${endpoint}`, { agent }, (res) => {
            console.log(`📊 Status: ${res.statusCode}`);
            console.log(`📋 Headers:`, Object.keys(res.headers));
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data.length < 200) {
                    console.log('📄 Response:', data);
                } else {
                    console.log('📄 Response preview:', data.substring(0, 200) + '...');
                }
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ Request Error: ${err.message}`);
        });
        
        req.setTimeout(5000, () => {
            console.log('⏰ Request timeout');
            req.destroy();
        });
    });
} 