# 🔑 Guide Configuration Google Wallet & Apple Wallet

## 📱 Google Wallet (Google Pay) Configuration

### Étape 1: Créer un compte Google Cloud
1. **Aller sur :** https://console.cloud.google.com/
2. **Créer un nouveau projet :** "4nap-wallet"
3. **Activer les APIs :**
   - Google Wallet API
   - Google Pay API

### Étape 2: Créer un compte service
```bash
# Dans Google Cloud Console > IAM & Admin > Service Accounts
1. Créer un compte service : "4nap-wallet-service"
2. Télécharger le fichier JSON des clés
3. Renommer : google-wallet-service-account.json
```

### Étape 3: Obtenir l'Issuer ID
1. **Aller sur :** https://pay.google.com/business/console
2. **Créer un nouvel émetteur :** "4nap Fort Napoleon"
3. **Noter l'Issuer ID** (format: 3388000000022313053)

### Étape 4: Configurer les variables d'environnement
```bash
# Ajouter dans .env
GOOGLE_WALLET_ISSUER_ID=3388000000022313053
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=4nap-wallet-service@ton-projet.iam.gserviceaccount.com
```

### Étape 5: Configuration complète Google Wallet

```javascript
// google-wallet-config.js
const { GoogleAuth } = require('google-auth-library');

const GOOGLE_WALLET_CONFIG = {
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID,
    serviceAccountFile: './google-wallet-service-account.json',
    projectId: 'ton-projet-id',
    classId: '4nap-membership-class'
};

async function initGoogleWallet() {
    const auth = new GoogleAuth({
        keyFile: GOOGLE_WALLET_CONFIG.serviceAccountFile,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
    });
    
    return auth;
}
```

---

## 🍎 Apple Wallet Configuration

### Étape 1: Compte Apple Developer
- **Coût :** 99€/an
- **Lien :** https://developer.apple.com/account/

### Étape 2: Créer un Pass Type ID
1. **Aller sur :** Certificates, Identifiers & Profiles
2. **Identifiers > Pass Type IDs**
3. **Créer :** `pass.fr.4nap.membership`
4. **Description :** "4nap Member Pass"

### Étape 3: Créer les certificats
```bash
# 1. Pass Type ID Certificate
- Télécharger le certificat .cer
- Convertir en .p12 avec Keychain Access

# 2. WWDR Certificate
- Télécharger Apple Worldwide Developer Relations Intermediate Certificate
```

### Étape 4: Configuration Apple Wallet

```javascript
// apple-wallet-config.js
const APPLE_WALLET_CONFIG = {
    teamId: 'ABC123DEF4',  // Ton Team ID
    passTypeId: 'pass.fr.4nap.membership',
    organizationName: '4nap - Fort Napoléon',
    certificatePath: './certificates/pass-certificate.p12',
    certificatePassword: 'ton-mot-de-passe',
    wwdrCertificatePath: './certificates/wwdr.pem'
};
```

---

## 🚀 Version Simplifiée (Sans API)

### Pour commencer SANS les APIs complètes :

#### **Google Wallet - Version Link :**
```javascript
// Version simplifiée avec des liens directs
function generateSimpleGoogleWalletLink(memberData) {
    const passData = {
        iss: 'noreply@4nap.fr',  // Ton email
        aud: 'google',
        typ: 'savetowallet',
        iat: Math.floor(Date.now() / 1000),
        payload: {
            genericObjects: [{
                id: `4nap.${memberData.memberId}`,
                classId: '4nap.membership',
                genericType: 'GENERIC_TYPE_UNSPECIFIED',
                hexBackgroundColor: '#1a1a2e',
                logo: {
                    sourceUri: { uri: 'https://api.4nap.fr/logo.png' }
                },
                cardTitle: { defaultValue: { value: 'Pass Membre 4nap' }},
                subheader: { defaultValue: { value: `${memberData.prenom} ${memberData.nom}` }},
                header: { defaultValue: { value: 'Membre Actif' }},
                barcode: {
                    type: 'QR_CODE',
                    value: memberData.memberId
                }
            }]
        }
    };
    
    // Version demo (sans signature)
    const token = Buffer.from(JSON.stringify(passData)).toString('base64');
    return `https://pay.google.com/gp/v/save/${token}`;
}
```

#### **Apple Wallet - Version PKPass Simple :**
```javascript
// Utiliser un service tiers comme PassKit.com
const PASSKIT_CONFIG = {
    baseUrl: 'https://api.passkit.com/v1/passes',
    apiKey: 'ton-api-key-passkit'  // Service tiers
};
```

---

## 💡 Solutions Alternatives (Plus Simples)

### 1. **PassKit.com** (Service tiers)
- **Coût :** 29$/mois
- **Avantage :** Gère Google + Apple
- **Lien :** https://passkit.com/

### 2. **Wallet Passes** (Service tiers)
- **Coût :** 19$/mois  
- **Avantage :** Simple à intégrer
- **Lien :** https://walletpasses.appspot.com/

### 3. **Version Progressive Web App (PWA)**
```javascript
// Alternative : PWA avec Add to Home Screen
function generatePWAPass(memberData) {
    return `https://api.4nap.fr/pass/${memberData.memberId}`;
}
```

---

## 🛠 Installation Rapide (Version Demo)

### Dépendances nécessaires :
```bash
npm install google-auth-library jsonwebtoken passkit-generator
```

### Variables d'environnement minimales :
```bash
# .env
GOOGLE_WALLET_ISSUER_ID=demo
APPLE_TEAM_ID=demo
PASSKIT_API_KEY=demo  # Si tu utilises un service tiers
```

---

## 🎯 Recommandation pour 4nap

### **Phase 1 : Version Simple (Maintenant)**
- ✅ Boutons dans l'email qui redirigent vers une page web
- ✅ Page web avec QR code + instructions
- ✅ "Add to Home Screen" PWA

### **Phase 2 : APIs Complètes (Plus tard)**
- 🔄 Configuration Google Wallet API
- 🔄 Certificats Apple Wallet
- 🔄 Vrais passes wallet

### **Phase 3 : Service Tiers (Recommandé)**
- 🎯 PassKit.com ou équivalent
- 🎯 Plus simple à maintenir
- 🎯 Support Google + Apple

**Veux-tu qu'on commence par la version simple ou tu préfères directement configurer les APIs ? 🤔** 