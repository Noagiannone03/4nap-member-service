#!/bin/bash

# Script de déploiement automatique pour 4nap
# Usage: ./deploy.sh

set -e

echo "🚀 Démarrage du déploiement 4nap..."

# Configuration
VPS_HOST="185.98.137.153"
VPS_USER="root"
REMOTE_DIR="/var/www/4nap-verif"
LOCAL_DIR="."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification des prérequis
echo_info "Vérification des prérequis..."

if ! command -v rsync &> /dev/null; then
    echo_error "rsync n'est pas installé. Installation..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install rsync
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y rsync
    fi
fi

# Test de connexion SSH
echo_info "Test de connexion SSH..."
if ! ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} "echo 'Connexion OK'"; then
    echo_error "Impossible de se connecter au VPS. Vérifiez la connexion SSH."
    exit 1
fi
echo_success "Connexion SSH établie"

# Création du dossier sur le VPS si nécessaire
echo_info "Préparation du dossier de destination..."
ssh ${VPS_USER}@${VPS_HOST} "mkdir -p ${REMOTE_DIR}"

# Synchronisation des fichiers
echo_info "Synchronisation des fichiers..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude 'temp/' \
    --exclude 'uploads/' \
    --exclude 'qr-codes/' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    ${LOCAL_DIR}/ ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/

echo_success "Fichiers synchronisés"

# Installation des dépendances et configuration sur le VPS
echo_info "Installation des dépendances sur le VPS..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
set -e

cd /var/www/4nap-verif

# Installation des dépendances Node.js
echo "📦 Installation des dépendances..."
npm install --production

# Création des dossiers nécessaires
echo "📁 Création des dossiers..."
mkdir -p temp uploads qr-codes logs

# Configuration des permissions
echo "🔐 Configuration des permissions..."
chown -R www-data:www-data /var/www/4nap-verif || chown -R root:root /var/www/4nap-verif
chmod -R 755 /var/www/4nap-verif

# Vérification du fichier .env
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env manquant. Copie du template..."
    cp env.example .env
    echo "❗ IMPORTANT: Configurez le fichier .env avec vos vraies valeurs !"
fi

echo "✅ Configuration terminée"
EOF

echo_success "Dépendances installées"

# Gestion du processus PM2
echo_info "Gestion du processus PM2..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
set -e

cd /var/www/4nap-verif

# Vérifier si PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installation de PM2..."
    npm install -g pm2
fi

# Arrêter l'ancienne instance si elle existe
if pm2 list | grep -q "4nap-membership"; then
    echo "🛑 Arrêt de l'ancienne instance..."
    pm2 stop 4nap-membership
    pm2 delete 4nap-membership
fi

# Démarrer la nouvelle instance
echo "🚀 Démarrage de la nouvelle instance..."
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configuration du démarrage automatique (première fois seulement)
if [ ! -f /etc/systemd/system/pm2-root.service ]; then
    echo "⚙️  Configuration du démarrage automatique..."
    pm2 startup systemd -u root --hp /root
fi

echo "✅ PM2 configuré et démarré"
EOF

echo_success "Application déployée avec PM2"

# Vérification du statut
echo_info "Vérification du statut de l'application..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
echo "📊 Statut PM2:"
pm2 status

echo ""
echo "🔍 Test de connectivité:"
sleep 3
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ L'application répond sur le port 3000"
else
    echo "❌ L'application ne répond pas"
    echo "📋 Logs récents:"
    pm2 logs 4nap-membership --lines 10
fi
EOF

# Configuration Nginx (optionnel)
read -p "Voulez-vous configurer Nginx ? (y/N): " configure_nginx
if [[ $configure_nginx =~ ^[Yy]$ ]]; then
    echo_info "Configuration de Nginx..."
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
# Installation de Nginx si nécessaire
if ! command -v nginx &> /dev/null; then
    echo "📦 Installation de Nginx..."
    apt update && apt install -y nginx
fi

# Configuration Nginx
cat > /etc/nginx/sites-available/4nap << 'NGINXEOF'
server {
    listen 80;
    server_name 185.98.137.153;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        client_max_body_size 10M;
    }
}
NGINXEOF

# Activer le site
ln -sf /etc/nginx/sites-available/4nap /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test et rechargement
nginx -t && systemctl reload nginx

echo "✅ Nginx configuré"
EOF
    echo_success "Nginx configuré"
fi

# Résumé final
echo ""
echo "🎉 Déploiement terminé avec succès !"
echo ""
echo "📋 Informations utiles :"
echo "🌐 URL: http://${VPS_HOST}:3000"
echo "📁 Dossier: ${REMOTE_DIR}"
echo ""
echo "🔧 Commandes utiles :"
echo "   ssh ${VPS_USER}@${VPS_HOST}"
echo "   cd ${REMOTE_DIR}"
echo "   pm2 status"
echo "   pm2 logs 4nap-membership"
echo "   pm2 restart 4nap-membership"
echo ""
echo "⚠️  N'oubliez pas de :"
echo "   1. Configurer le fichier .env sur le VPS"
echo "   2. Configurer Firebase"
echo "   3. Configurer l'email SMTP"
echo ""
echo_success "Déploiement 4nap terminé ! 🏰" 