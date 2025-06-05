@echo off
echo 🚀 Déploiement 4nap sur VPS...
echo.

REM Configuration
set VPS_HOST=185.98.137.153
set VPS_USER=root
set REMOTE_DIR=/var/www/4nap-verif

echo 📦 Transfert des fichiers vers le VPS...
scp -r * %VPS_USER%@%VPS_HOST%:%REMOTE_DIR%/

echo.
echo 🔧 Configuration sur le VPS...
ssh %VPS_USER%@%VPS_HOST% "cd %REMOTE_DIR% && npm install --production && pm2 restart 4nap-membership || pm2 start ecosystem.config.js"

echo.
echo ✅ Déploiement terminé !
echo 🌐 URL: http://%VPS_HOST%:3000
pause 