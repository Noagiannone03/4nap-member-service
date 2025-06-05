#!/bin/bash

echo "🔒 Configuration HTTPS pour 4nap avec Let's Encrypt..."

# 1. Installer Certbot
echo "📦 Installation de Certbot..."
apt update
apt install snapd -y
snap install core; snap refresh core
snap install --classic certbot

# 2. Créer le lien symlink
ln -sf /snap/bin/certbot /usr/bin/certbot

# 3. Demander le domaine (ou utiliser l'IP)
echo ""
echo "🌍 Configuration du domaine..."
echo "Avez-vous un nom de domaine pointant vers ce VPS ? (ex: api.4nap.fr)"
echo "Si non, nous utiliserons l'IP 185.98.137.153"
read -p "Entrez votre domaine (ou appuyez sur Entrée pour utiliser l'IP): " DOMAIN

if [ -z "$DOMAIN" ]; then
    DOMAIN="185.98.137.153"
    echo "⚠️  Utilisation de l'IP. Pour un vrai domaine, configurez votre DNS d'abord."
fi

echo "📝 Domaine configuré: $DOMAIN"

# 4. Modifier la configuration Nginx pour le domaine
echo "⚙️  Configuration Nginx pour HTTPS..."
cat > /etc/nginx/sites-available/4nap-https << EOF
# Configuration HTTP (redirection vers HTTPS)
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # Certificats SSL (seront générés par Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Configuration SSL moderne
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Configuration CORS globale
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    add_header 'Access-Control-Max-Age' 1728000 always;
    
    # Répondre aux requêtes OPTIONS (preflight)
    location / {
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # Proxy vers le serveur Node.js
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API spécifique
    location /api/ {
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Headers CORS forcés
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }
    
    # Logs
    access_log /var/log/nginx/4nap_https_access.log;
    error_log /var/log/nginx/4nap_https_error.log;
}
EOF

# 5. Activer la nouvelle configuration (temporairement sans SSL)
echo "🔄 Configuration temporaire..."
rm -f /etc/nginx/sites-enabled/*
ln -sf /etc/nginx/sites-available/4nap-https /etc/nginx/sites-enabled/4nap-https

# Configuration temporaire pour obtenir le certificat
cat > /etc/nginx/sites-available/4nap-temp << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/*
ln -sf /etc/nginx/sites-available/4nap-temp /etc/nginx/sites-enabled/4nap-temp

# 6. Test et redémarrage Nginx
nginx -t && systemctl reload nginx

# 7. Obtenir le certificat SSL
echo ""
echo "🔒 Génération du certificat SSL..."
echo "IMPORTANT: Assurez-vous que le domaine $DOMAIN pointe vers ce serveur !"

if [ "$DOMAIN" = "185.98.137.153" ]; then
    echo "❌ Let's Encrypt ne fonctionne pas avec les adresses IP."
    echo "💡 Solutions alternatives:"
    echo "1. Utilisez un nom de domaine gratuit (ex: freenom.com, no-ip.com)"
    echo "2. Ou désactivez HTTPS-Only dans votre navigateur temporairement"
    echo "3. Ou servez votre site en HTTP également"
    exit 1
fi

# Obtenir le certificat
certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Certificat SSL obtenu avec succès!"
    
    # 8. Activer la configuration HTTPS complète
    rm -f /etc/nginx/sites-enabled/*
    ln -sf /etc/nginx/sites-available/4nap-https /etc/nginx/sites-enabled/4nap-https
    
    # 9. Ouvrir le port 443
    ufw allow 443/tcp
    
    # 10. Test final et redémarrage
    nginx -t && systemctl reload nginx
    
    echo ""
    echo "🎉 HTTPS configuré avec succès !"
    echo "🌍 URL HTTPS: https://$DOMAIN/api/test"
    echo "🔄 Renouvellement automatique configuré"
    
    # Test
    curl -s https://$DOMAIN/api/test || echo "❌ Test HTTPS échoué"
    
else
    echo "❌ Échec de l'obtention du certificat SSL"
    echo "📋 Vérifiez que:"
    echo "   - Le domaine $DOMAIN pointe vers ce serveur"
    echo "   - Le port 80 est ouvert"
    echo "   - Aucun firewall ne bloque"
fi 