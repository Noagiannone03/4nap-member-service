#!/bin/bash

echo "🔍 Diagnostic du port 80..."

# 1. Identifier ce qui utilise le port 80
echo "📊 Services utilisant le port 80:"
sudo netstat -tulpn | grep :80

echo ""
echo "🔍 Processus sur le port 80:"
sudo lsof -i :80

# 2. Vérifier Apache2
echo ""
echo "🔍 Statut Apache2:"
if systemctl is-active --quiet apache2; then
    echo "❌ Apache2 est actif - va l'arrêter..."
    sudo systemctl stop apache2
    sudo systemctl disable apache2
    echo "✅ Apache2 arrêté"
else
    echo "✅ Apache2 n'est pas actif"
fi

# 3. Tenter de libérer le port 80
echo ""
echo "🔄 Tentative de libération du port 80..."
sudo fuser -k 80/tcp 2>/dev/null || echo "Aucun processus à tuer"

# 4. Essayer de démarrer Nginx sur port 80
echo ""
echo "🚀 Tentative de démarrage Nginx sur port 80..."
sudo systemctl start nginx

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx démarré avec succès sur port 80!"
    echo "🌍 Test: curl http://185.98.137.153/api/test"
    curl -s http://localhost/api/test || echo "❌ API non accessible"
else
    echo "❌ Échec démarrage Nginx sur port 80"
    echo ""
    echo "🔄 Configuration alternative sur port 8080..."
    
    # Configuration alternative
    sudo cp nginx-4nap-8080.conf /etc/nginx/sites-available/4nap-8080
    sudo rm -f /etc/nginx/sites-enabled/4nap
    sudo ln -sf /etc/nginx/sites-available/4nap-8080 /etc/nginx/sites-enabled/4nap-8080
    
    # Test et redémarrage
    sudo nginx -t
    if [ $? -eq 0 ]; then
        sudo systemctl restart nginx
        sudo ufw allow 8080/tcp
        
        if systemctl is-active --quiet nginx; then
            echo "✅ Nginx démarré sur port 8080!"
            echo "🌍 Nouvelle URL: http://185.98.137.153:8080/api/test"
            curl -s http://localhost:8080/api/test || echo "❌ API non accessible"
            
            echo ""
            echo "⚠️  IMPORTANT: Modifiez l'URL dans inscription.js:"
            echo "const EMAIL_SERVER_URL = 'http://185.98.137.153:8080';"
        else
            echo "❌ Échec total - vérifiez les logs"
            sudo journalctl -xeu nginx.service --no-pager -l
        fi
    else
        echo "❌ Configuration Nginx invalide"
    fi
fi

echo ""
echo "📋 État final:"
sudo systemctl status nginx --no-pager -l 