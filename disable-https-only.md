# 🔧 Comment désactiver temporairement HTTPS-Only Mode

Si vous n'avez pas de nom de domaine et voulez tester rapidement avec l'IP, voici comment désactiver le mode HTTPS-Only dans votre navigateur :

## 🦊 **Firefox**

1. Tapez `about:config` dans la barre d'adresse
2. Cliquez sur "J'accepte le risque !"
3. Recherchez `dom.security.https_only_mode`
4. Double-cliquez pour passer à `false`
5. Redémarrez Firefox

## 🌐 **Chrome/Edge**

1. Allez dans Paramètres → Confidentialité et sécurité → Sécurité
2. Désactivez "Toujours utiliser des connexions sécurisées"
3. Ou utilisez le mode incognito avec `--disable-web-security`

## 🎯 **Solution recommandée : Nom de domaine gratuit**

Au lieu de désactiver HTTPS-Only, obtenez un nom de domaine gratuit :

### Option 1 : No-IP (gratuit)
1. Inscrivez-vous sur [noip.com](https://www.noip.com/)
2. Créez un hostname gratuit (ex: `4nap-api.ddns.net`)
3. Pointez-le vers `185.98.137.153`
4. Utilisez ce domaine dans le script HTTPS

### Option 2 : Freenom (gratuit)
1. Inscrivez-vous sur [freenom.com](https://www.freenom.com/)
2. Obtenez un domaine gratuit `.tk`, `.ml`, `.ga`, `.cf`
3. Configurez les DNS A record vers `185.98.137.153`
4. Utilisez ce domaine dans le script HTTPS

## 📝 **Modification de l'URL**

Une fois votre domaine configuré, modifiez dans `inscription.js` :

```javascript
// Remplacez l'IP par votre domaine
const EMAIL_SERVER_URL = 'https://votre-domaine.com';
```

## 🔒 **Avantages HTTPS**

- ✅ Sécurité des données
- ✅ Confiance des utilisateurs  
- ✅ Compatibilité navigateurs modernes
- ✅ SEO amélioré
- ✅ Fonctionne avec tous les navigateurs 