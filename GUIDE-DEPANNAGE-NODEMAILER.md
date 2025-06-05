# 🔧 Guide de Dépannage NodeMailer

## 🚨 Problèmes Identifiés

D'après tes tests, voici les problèmes identifiés :

### 1. ❌ Certificat SSL Invalide
- **Symptôme** : "Impossible d'établir une relation de confiance pour le canal sécurisé SSL/TLS"
- **Impact** : Bloque toutes les connexions HTTPS sécurisées

### 2. ❌ Erreur 500 sur l'API
- **Symptôme** : Le serveur répond mais retourne une erreur interne
- **Impact** : L'API NodeMailer crashe

## 🔍 Diagnostic Complet

### Étape 1: Vérifier le Certificat SSL

#### Sur ton VPS (commandes à exécuter manuellement) :

```bash
# Vérifier si le certificat existe
sudo ls -la /etc/letsencrypt/live/api.4nap.fr/

# Vérifier l'expiration du certificat
sudo openssl x509 -in /etc/letsencrypt/live/api.4nap.fr/fullchain.pem -text -noout | grep -A 2 "Not Before\|Not After"

# Tester le certificat depuis le serveur
curl -I https://api.4nap.fr/api/test

# Vérifier la configuration Nginx/Apache
sudo nginx -t
# ou
sudo apache2ctl configtest
```

#### Solutions pour le certificat :

**Si certificat expiré :**
```bash
# Renouveler le certificat Let's Encrypt
sudo certbot renew

# Redémarrer le serveur web
sudo systemctl reload nginx
# ou
sudo systemctl reload apache2
```

**Si certificat manquant :**
```bash
# Créer un nouveau certificat
sudo certbot --nginx -d api.4nap.fr
# ou
sudo certbot --apache -d api.4nap.fr
```

### Étape 2: Diagnostiquer NodeMailer

#### Vérifier les logs du serveur :

```bash
# Logs de l'application Node.js
pm2 logs
# ou
sudo journalctl -u ton-service-nodejs -f

# Logs du serveur web
sudo tail -f /var/log/nginx/error.log
# ou
sudo tail -f /var/log/apache2/error.log
```

#### Configuration NodeMailer Recommandée :

```javascript
// Configuration robuste pour NodeMailer
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
    service: 'gmail', // ou ton provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Options de sécurité
    secure: true,
    port: 465,
    tls: {
        rejectUnauthorized: false // Temporaire pour debug
    }
});

// Test de connexion
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Erreur transporter:', error);
    } else {
        console.log('✅ Serveur email prêt');
    }
});
```

### Étape 3: Vérifier la Configuration du Serveur

#### Variables d'environnement à vérifier :

```bash
# Vérifier les variables d'env
echo $EMAIL_USER
echo $EMAIL_PASS
echo $NODE_ENV
```

#### Ports et firewall :

```bash
# Vérifier les ports ouverts
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3000

# Vérifier le firewall
sudo ufw status
sudo iptables -L
```

## 🛠 Solutions par Priorité

### 🔥 URGENT - Fixer le SSL

1. **Renouveler le certificat Let's Encrypt**
2. **Vérifier la configuration Nginx/Apache**
3. **Redémarrer les services**

### 📧 Fixer NodeMailer

1. **Vérifier les credentials email**
2. **Tester avec un provider différent (Gmail, SendGrid)**
3. **Ajouter des logs détaillés**

### 🔍 Debug Avancé

Si les problèmes persistent :

```javascript
// Code de debug NodeMailer
const testEmail = async () => {
    try {
        console.log('🔍 Test connexion email...');
        
        // Test avec différents providers
        const providers = [
            { name: 'Gmail', service: 'gmail' },
            { name: 'Outlook', service: 'hotmail' }
        ];
        
        for (const provider of providers) {
            try {
                const transporter = nodemailer.createTransporter({
                    service: provider.service,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });
                
                await transporter.verify();
                console.log(`✅ ${provider.name} OK`);
                return transporter;
            } catch (err) {
                console.log(`❌ ${provider.name} Error:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Erreur globale:', error);
    }
};
```

## 📋 Checklist de Vérification

- [ ] Certificat SSL valide et non expiré
- [ ] Configuration serveur web (Nginx/Apache) correcte
- [ ] Variables d'environnement définies
- [ ] Credentials email valides
- [ ] Ports 80, 443, 25, 587, 465 accessibles
- [ ] Firewall configuré correctement
- [ ] Logs d'erreurs consultés
- [ ] Service Node.js redémarré

## 🚀 Solutions Rapides

### Si tout est cassé :

```bash
# Solution d'urgence
sudo systemctl restart nginx
sudo systemctl restart apache2
pm2 restart all
sudo certbot renew --force-renewal
```

### Test manuel depuis le VPS :

```bash
# Test direct NodeMailer
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: { user: 'ton@email.com', pass: 'tonpassword' }
});
transporter.verify().then(console.log).catch(console.error);
"
```

---

**🔥 RAPPEL IMPORTANT :** 
- Le certificat SSL doit être valide pour que les navigateurs acceptent les connexions
- NodeMailer a besoin de credentials email valides
- Vérifier les logs est essentiel pour identifier la cause exacte

Utilise le fichier `test-integration.html` pour diagnostiquer en temps réel depuis ton navigateur ! 🚀 