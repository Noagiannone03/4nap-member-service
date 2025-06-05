# 🏰 4nap - Système de Membre Fort Napoléon

## 📋 Description

Système de membre ultra design pour le projet Fort Napoléon (4nap) à La Seyne. Une application web moderne avec :

- **Interface ultra design** avec dark theme et animations GSAP
- **Système d'inscription** multi-étapes avec validation
- **Génération automatique de QR codes** pour chaque membre
- **Base de données Firebase** pour la persistance
- **Système d'email automatique** avec PDF de pass fidélité
- **Backend Node.js** sécurisé avec Express

## 🎯 Fonctionnalités

### ✨ Page d'accueil
- Design moderne avec dark theme
- Couleurs flashy (bleu, vert, rose, orange)
- Animations GSAP fluides
- Flat design avec bords arrondis et shadows
- Effets de particules animées
- Navigation smooth scroll

### 📝 Système d'inscription
- Formulaire multi-étapes (3 étapes)
- Validation en temps réel
- Animations entre les étapes
- Barre de progression
- Interface responsive

### 🗄️ Base de données
- Collection Firebase "membres"
- Structure complète des données
- Types de membre (annuel, etc.)
- Dates de début/fin d'abonnement
- Statut de renouvellement

### 📱 QR Code & Pass Fidélité
- Génération automatique de QR code unique
- QR code lié à l'ID du membre Firebase
- PDF de pass fidélité personnalisé
- Envoi automatique par email

### 📧 Système d'email
- Email HTML ultra design
- PDF en pièce jointe
- Configuration SMTP
- Templates personnalisés

## 🚀 Installation

### Prérequis
- Node.js 16+ 
- NPM ou Yarn
- Compte Firebase
- Configuration SMTP (Gmail, etc.)

### 1. Clone et installation
```bash
git clone [votre-repo]
cd 4nap-verif
npm install
```

### 2. Configuration Firebase
1. Créez un projet Firebase sur https://console.firebase.google.com
2. Activez Firestore Database
3. Créez une clé de service (Settings → Service accounts → Generate new private key)
4. Téléchargez le fichier JSON

### 3. Configuration des variables d'environnement
Copiez `env.example` vers `.env` et configurez :

```env
# Configuration Firebase
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY=votre-private-key
FIREBASE_CLIENT_EMAIL=votre-client-email

# Configuration Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app

# Configuration serveur
PORT=3000
NODE_ENV=production
BASE_URL=http://185.98.137.153:3000
JWT_SECRET=votre-secret-key-ultra-secure
```

### 4. Configuration Gmail (recommandé)
1. Activez l'authentification à 2 facteurs
2. Générez un mot de passe d'application spécifique
3. Utilisez ce mot de passe dans `SMTP_PASS`

## 🏗️ Déploiement sur VPS

### Connexion au VPS
```bash
ssh root@185.98.137.153
```

### Installation des dépendances système
```bash
# Mise à jour du système
apt update && apt upgrade -y

# Installation de Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Installation de PM2 (gestionnaire de processus)
npm install -g pm2

# Installation de Nginx (optionnel, pour proxy reverse)
apt install nginx -y
```

### Déploiement de l'application
```bash
# Création du dossier projet
mkdir -p /var/www/4nap-verif
cd /var/www/4nap-verif

# Upload des fichiers (ou git clone)
# ... upload de tous les fichiers du projet

# Installation des dépendances
npm install --production

# Configuration des variables d'environnement
cp env.example .env
nano .env  # Editez avec vos vraies valeurs

# Test de démarrage
npm start
```

### Configuration PM2 (Production)
```bash
# Créer le fichier de configuration PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '4nap-membership',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save
pm2 startup

# Voir les logs
pm2 logs 4nap-membership
```

### Configuration Nginx (optionnel)
```bash
# Créer la configuration Nginx
cat > /etc/nginx/sites-available/4nap << EOF
server {
    listen 80;
    server_name 185.98.137.153;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Limites de sécurité
        client_max_body_size 10M;
    }
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/4nap /etc/nginx/sites-enabled/
nginx -t  # Test de configuration
systemctl reload nginx
```

### Configuration du pare-feu
```bash
# UFW (si installé)
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 3000/tcp # Node.js (si pas de Nginx)
ufw enable

# iptables (alternative)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## 📁 Structure du projet

```
4nap-verif/
├── public/                 # Fichiers statiques
│   ├── index.html         # Page d'accueil
│   ├── inscription.html   # Page d'inscription
│   ├── styles.css         # CSS principal
│   ├── inscription.css    # CSS inscription
│   ├── script.js          # JS principal
│   └── inscription.js     # JS inscription
├── server.js              # Serveur Express principal
├── package.json           # Dépendances Node.js
├── .env                   # Variables d'environnement
├── env.example            # Exemple de configuration
├── ecosystem.config.js    # Configuration PM2
├── temp/                  # Fichiers temporaires
├── qr-codes/             # QR codes générés
└── README.md             # Documentation
```

## 🔧 API Endpoints

### POST `/api/membres`
Créer un nouveau membre
```json
{
  "prenom": "John",
  "nom": "Doe",
  "email": "john@example.com",
  "telephone": "0123456789",
  "adresse": "123 Rue Example",
  "codePostal": "83500",
  "ville": "La Seyne",
  "pays": "FR",
  "typeMembre": "annuel",
  "conditions": true,
  "newsletter": false
}
```

### GET `/api/membres/:id`
Récupérer un membre par ID

### GET `/api/membres`
Lister tous les membres (admin)

## 🎨 Customisation

### Couleurs (CSS Variables)
```css
:root {
  --blue: #00d4ff;
  --green: #00ff88;
  --pink: #ff0099;
  --orange: #ff6600;
  --purple: #9933ff;
}
```

### Animations GSAP
Les animations sont configurables dans `script.js` et `inscription.js`

## 🔒 Sécurité

- Rate limiting sur les inscriptions
- Validation côté serveur
- Headers de sécurité avec Helmet
- Variables d'environnement pour les secrets
- CORS configuré

## 📊 Monitoring

### Logs
```bash
# Logs PM2
pm2 logs 4nap-membership

# Logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Métriques
```bash
# Status PM2
pm2 status
pm2 monit

# Utilisation système
htop
df -h
free -h
```

## 🐛 Dépannage

### Problèmes fréquents

1. **Erreur Firebase**
   - Vérifiez les variables d'environnement
   - Contrôlez les permissions Firestore

2. **Erreur Email**
   - Vérifiez la configuration SMTP
   - Testez avec un mot de passe d'application Gmail

3. **Erreur de port**
   - Vérifiez qu'aucun autre service n'utilise le port 3000
   - Changez le port dans `.env` si nécessaire

4. **Permissions fichiers**
   ```bash
   chown -R www-data:www-data /var/www/4nap-verif
   chmod -R 755 /var/www/4nap-verif
   ```

## 🔄 Mise à jour

```bash
# Arrêter l'application
pm2 stop 4nap-membership

# Mise à jour des fichiers
# ... upload nouveaux fichiers

# Installer nouvelles dépendances
npm install --production

# Redémarrer
pm2 start 4nap-membership
```

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs avec `pm2 logs`
2. Consultez la documentation Firebase
3. Vérifiez la configuration email

## 🎉 Utilisation

1. **Accès à l'application** : http://185.98.137.153:3000
2. **Page d'inscription** : http://185.98.137.153:3000/inscription
3. **Les membres s'inscrivent** et reçoivent automatiquement leur pass QR code par email
4. **Les données sont sauvegardées** dans Firebase Firestore
5. **Administration** possible via l'API `/api/membres`

---

🏰 **4nap - Fort Napoléon** | Créé avec ❤️ pour La Seyne-sur-Mer 