# 🚀 Guide de Déploiement Rapide 4nap

## ⚡ Déploiement en 5 étapes

### 1. 🔑 Connexion au VPS
```bash
ssh root@185.98.137.153
# Mot de passe: MRq377wEj
```

### 2. 📦 Installation des prérequis (première fois seulement)
```bash
# Mise à jour système
apt update && apt upgrade -y

# Installation Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Installation PM2
npm install -g pm2

# Installation des utilitaires
apt install -y git curl nginx htop
```

### 3. 📁 Préparation du projet
```bash
# Création du dossier
mkdir -p /var/www/4nap-verif
cd /var/www/4nap-verif

# Upload des fichiers du projet (copiez tous les fichiers ici)
# Ou clonez depuis git si vous avez un repo
```

### 4. ⚙️ Configuration
```bash
# Installation des dépendances
npm install --production

# Configuration de l'environnement
cp env.example .env
nano .env  # Configurez avec vos vraies valeurs

# Création des dossiers nécessaires
mkdir -p temp uploads qr-codes logs

# Permissions
chown -R www-data:www-data /var/www/4nap-verif
chmod -R 755 /var/www/4nap-verif
```

### 5. 🚀 Lancement
```bash
# Démarrage avec PM2
pm2 start ecosystem.config.js

# Sauvegarde config PM2
pm2 save
pm2 startup

# Vérification
pm2 status
pm2 logs 4nap-membership
```

## 📋 Configuration requise dans .env

```env
# Firebase (OBLIGATOIRE)
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nvotre-clé\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project.iam.gserviceaccount.com

# Email Gmail (OBLIGATOIRE)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app

# Serveur
PORT=3000
NODE_ENV=production
BASE_URL=http://185.98.137.153:3000
JWT_SECRET=votre-secret-ultra-secure-ici
```

## 🔧 Configuration Firebase

### 1. Créer le projet Firebase
1. Allez sur https://console.firebase.google.com
2. Créez un nouveau projet "4nap-membership"
3. Activez Firestore Database
4. Réglez les règles Firestore en mode test

### 2. Générer la clé de service
1. Project Settings → Service accounts
2. Generate new private key
3. Téléchargez le fichier JSON
4. Copiez les valeurs dans le fichier .env

## 📧 Configuration Gmail

### 1. Activer l'authentification 2FA
1. Google Account → Sécurité
2. Activez l'authentification à 2 facteurs

### 2. Générer mot de passe d'application
1. Google Account → Sécurité → Mots de passe d'application
2. Sélectionnez "Mail" et "Autre (nom personnalisé)"
3. Nommez "4nap-server"
4. Utilisez ce mot de passe dans SMTP_PASS

## 🌐 Test de l'application

```bash
# Test local sur le VPS
curl http://localhost:3000

# Accès externe
# http://185.98.137.153:3000
```

## 🔧 Commandes utiles

```bash
# Status de l'application
pm2 status

# Logs en temps réel
pm2 logs 4nap-membership

# Redémarrer
pm2 restart 4nap-membership

# Arrêter
pm2 stop 4nap-membership

# Monitoring système
htop
df -h
free -h

# Nginx (si configuré)
systemctl status nginx
nginx -t
systemctl reload nginx
```

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs
pm2 logs 4nap-membership

# Vérifier le fichier .env
cat .env

# Test manuel
node server.js
```

### Erreur Firebase
- Vérifiez FIREBASE_PROJECT_ID
- Vérifiez que la clé privée est correctement formatée
- Vérifiez les permissions Firestore

### Erreur Email
- Vérifiez SMTP_USER et SMTP_PASS
- Assurez-vous d'utiliser un mot de passe d'application
- Testez avec un email simple

### Port déjà utilisé
```bash
# Voir qui utilise le port 3000
netstat -tulpn | grep 3000

# Tuer le processus si nécessaire
kill -9 PID
```

## 🔄 Mise à jour

```bash
# Arrêter l'app
pm2 stop 4nap-membership

# Mettre à jour les fichiers
# (upload nouveaux fichiers)

# Installer nouvelles dépendances
npm install --production

# Redémarrer
pm2 start 4nap-membership
```

## 📊 URLs importantes

- **Application**: http://185.98.137.153:3000
- **Inscription**: http://185.98.137.153:3000/inscription
- **API Membres**: http://185.98.137.153:3000/api/membres

## ✅ Checklist finale

- [ ] VPS accessible en SSH
- [ ] Node.js 18+ installé
- [ ] PM2 installé
- [ ] Projet uploadé dans /var/www/4nap-verif
- [ ] Dépendances installées (npm install)
- [ ] Fichier .env configuré
- [ ] Firebase configuré et testé
- [ ] Email Gmail configuré et testé
- [ ] Application démarrée avec PM2
- [ ] Test d'accès via navigateur
- [ ] Logs vérifiés (pas d'erreurs)

🎉 **Votre système de membre 4nap est prêt !** 