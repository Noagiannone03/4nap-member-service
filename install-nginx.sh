#!/bin/bash

echo "🚀 Installation et configuration Nginx pour 4nap..."

# 1. Installer Nginx
echo "📦 Installation de Nginx..."
apt update
apt install nginx -y

# 2. Copier la configuration
echo "⚙️  Configuration de Nginx..."
cp nginx-4nap.conf /etc/nginx/sites-available/4nap
ln -sf /etc/nginx/sites-available/4nap /etc/nginx/sites-enabled/4nap

# 3. Supprimer la configuration par défaut
rm -f /etc/nginx/sites-enabled/default

# 4. Tester la configuration
echo "🧪 Test de la configuration Nginx..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration Nginx valide"
    
    # 5. Redémarrer Nginx
    echo "🔄 Redémarrage de Nginx..."
    systemctl restart nginx
    systemctl enable nginx
    
    # 6. Ouvrir le port 80
    echo "🔓 Ouverture du port 80..."
    ufw allow 80/tcp
    
    # 7. Vérifier l'état
    echo "📊 État des services:"
    systemctl status nginx --no-pager -l
    systemctl status 4nap-server --no-pager -l
    
    echo ""
    echo "🎉 Installation terminée !"
    echo "🌍 Testez maintenant: http://185.98.137.153/api/test"
    echo "📋 Logs Nginx: tail -f /var/log/nginx/4nap_error.log"
    
else
    echo "❌ Erreur dans la configuration Nginx"
    exit 1
fi 