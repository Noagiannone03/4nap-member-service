const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');

// Configuration Google Wallet
const GOOGLE_WALLET_CONFIG = {
    issuerId: '3388000000022313053', // Remplace par ton Issuer ID Google
    classId: '4nap-membership-class',
    serviceAccountFile: './google-wallet-service-account.json' // Fichier de service Google
};

// Configuration Apple Wallet  
const APPLE_WALLET_CONFIG = {
    teamId: 'YOUR_TEAM_ID',          // Ton Team ID Apple Developer
    passTypeId: 'pass.fr.4nap.membership', // Ton Pass Type ID
    organizationName: '4nap - Fort Napoléon',
    description: 'Pass Membre 4nap'
};

/**
 * Générer un Google Wallet Pass
 */
async function generateGoogleWalletPass(memberData) {
    try {
        // Créer l'objet pass
        const genericObject = {
            id: `${GOOGLE_WALLET_CONFIG.issuerId}.${memberData.memberId}`,
            classId: `${GOOGLE_WALLET_CONFIG.issuerId}.${GOOGLE_WALLET_CONFIG.classId}`,
            state: 'ACTIVE',
            heroImage: {
                sourceUri: {
                    uri: 'https://api.4nap.fr/assets/4nap-hero.jpg'
                }
            },
            logo: {
                sourceUri: {
                    uri: 'https://api.4nap.fr/assets/4nap-logo.png'
                }
            },
            cardTitle: {
                defaultValue: {
                    language: 'fr-FR',
                    value: 'Pass Membre 4nap'
                }
            },
            subheader: {
                defaultValue: {
                    language: 'fr-FR',
                    value: `${memberData.prenom} ${memberData.nom}`
                }
            },
            textModulesData: [
                {
                    id: 'member_id',
                    header: 'ID Membre',
                    body: memberData.memberId
                }
            ],
            barcode: {
                type: 'QR_CODE',
                value: JSON.stringify({
                    type: '4nap-member',
                    memberId: memberData.memberId,
                    email: memberData.email,
                    timestamp: Date.now()
                }),
                alternateText: memberData.memberId
            },
            hexBackgroundColor: '#1a1a2e'
        };

        // JWT pour Google Wallet (version simplifiée)
        const claims = {
            iss: 'service-account@your-project.iam.gserviceaccount.com',
            aud: 'google',
            typ: 'savetowallet',
            payload: {
                genericObjects: [genericObject]
            }
        };

        // Note: En production, signe avec ta clé privée Google
        const jwtToken = 'demo-token-' + memberData.memberId;
        
        return {
            success: true,
            walletUrl: `https://pay.google.com/gp/v/save/${jwtToken}`,
            passId: genericObject.id
        };

    } catch (error) {
        console.error('❌ Erreur Google Wallet:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Générer un Apple Wallet Pass (.pkpass)
 */
async function generateAppleWalletPass(memberData) {
    try {
        const passData = {
            formatVersion: 1,
            passTypeIdentifier: APPLE_WALLET_CONFIG.passTypeId,
            serialNumber: memberData.memberId,
            teamIdentifier: APPLE_WALLET_CONFIG.teamId,
            organizationName: APPLE_WALLET_CONFIG.organizationName,
            description: APPLE_WALLET_CONFIG.description,
            logoText: '4nap',
            foregroundColor: 'rgb(255, 255, 255)',
            backgroundColor: 'rgb(26, 26, 46)',
            labelColor: 'rgb(0, 212, 255)',
            
            // Structure du pass
            generic: {
                primaryFields: [
                    {
                        key: 'member_name',
                        label: 'Membre',
                        value: `${memberData.prenom} ${memberData.nom}`
                    }
                ],
                secondaryFields: [
                    {
                        key: 'member_type',
                        label: 'Type',
                        value: memberData.typeMembre || 'Annuel'
                    },
                    {
                        key: 'member_id',
                        label: 'ID',
                        value: memberData.memberId
                    }
                ],
                auxiliaryFields: [
                    {
                        key: 'join_date',
                        label: 'Depuis',
                        value: new Date().toLocaleDateString('fr-FR')
                    }
                ],
                backFields: [
                    {
                        key: 'email',
                        label: 'Email',
                        value: memberData.email
                    },
                    {
                        key: 'website',
                        label: 'Site Web',
                        value: 'https://4nap.fr'
                    }
                ]
            },

            // QR Code
            barcode: {
                message: JSON.stringify({
                    type: '4nap-member',
                    memberId: memberData.memberId,
                    email: memberData.email,
                    timestamp: Date.now()
                }),
                format: 'PKBarcodeFormatQR',
                messageEncoding: 'iso-8859-1'
            },

            // Localisation
            locations: [
                {
                    latitude: 45.2992,   // Coordonnées du Fort Napoléon
                    longitude: 6.1184,
                    relevantText: 'Bienvenue au Fort Napoléon ! Votre pass membre est prêt.'
                }
            ],

            // Mise à jour automatique
            webServiceURL: 'https://api.4nap.fr/wallet',
            authenticationToken: 'auth-token-for-' + memberData.memberId
        };

        // Note: Pour générer le fichier .pkpass complet, il faut :
        // 1. Signer avec le certificat Apple Wallet
        // 2. Créer l'archive ZIP avec les assets
        // 3. Ceci nécessite les certificats Apple Developer

        return {
            success: true,
            passData: passData,
            downloadUrl: `https://api.4nap.fr/wallet/apple/${memberData.memberId}.pkpass`
        };

    } catch (error) {
        console.error('❌ Erreur Apple Wallet:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Générer les boutons Wallet pour l'email
 */
function generateWalletButtons(memberData) {
    const googleWalletUrl = `https://api.4nap.fr/wallet/google/${memberData.memberId}`;
    const appleWalletUrl = `https://api.4nap.fr/wallet/apple/${memberData.memberId}`;

    return {
        googleButton: `
            <a href="${googleWalletUrl}" 
               style="display: inline-block; margin: 10px 5px; padding: 12px 24px; 
                      background: #4285f4; color: white; text-decoration: none; 
                      border-radius: 8px; font-weight: bold; text-align: center;">
                📱 Ajouter à Google Wallet
            </a>
        `,
        appleButton: `
            <a href="${appleWalletUrl}"
               style="display: inline-block; margin: 10px 5px; padding: 12px 24px; 
                      background: #000; color: white; text-decoration: none; 
                      border-radius: 8px; font-weight: bold; text-align: center;">
                📱 Ajouter à Apple Wallet
            </a>
        `,
        bothButtons: `
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 12px;">
                <p style="margin-bottom: 15px; font-weight: bold; color: #333; font-size: 16px;">
                    📱 Ajoutez votre pass membre à votre téléphone :
                </p>
                <a href="${googleWalletUrl}" 
                   style="display: inline-block; margin: 5px; padding: 12px 20px; 
                          background: #4285f4; color: white; text-decoration: none; 
                          border-radius: 8px; font-weight: bold; font-size: 14px;">
                    📱 Google Wallet
                </a>
                <a href="${appleWalletUrl}"
                   style="display: inline-block; margin: 5px; padding: 12px 20px; 
                          background: #000; color: white; text-decoration: none; 
                          border-radius: 8px; font-weight: bold; font-size: 14px;">
                    📱 Apple Wallet
                </a>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">
                    Accédez rapidement à votre QR code depuis votre écran de verrouillage !
                </p>
            </div>
        `
    };
}

/**
 * Routes API pour les wallets
 */
function setupWalletRoutes(app) {
    // Route Google Wallet
    app.get('/wallet/google/:memberId', async (req, res) => {
        try {
            // Récupérer les données du membre
            const memberData = {
                memberId: req.params.memberId,
                prenom: 'Membre',
                nom: '4nap',
                email: 'membre@4nap.fr',
                typeMembre: 'Annuel'
            };
            
            const walletPass = await generateGoogleWalletPass(memberData);
            
            if (walletPass.success) {
                res.redirect(walletPass.walletUrl);
            } else {
                res.status(500).json({ error: 'Erreur génération Google Wallet' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Route Apple Wallet
    app.get('/wallet/apple/:memberId', async (req, res) => {
        try {
            // Pour l'instant, redirection vers instructions
            res.json({ 
                message: 'Apple Wallet en cours de développement',
                instructions: 'Utilisez Google Wallet ou le QR code dans le PDF'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

// Fonction utilitaire pour récupérer les données membre
async function getMemberData(memberId) {
    // Ici tu implémenterais la récupération depuis ta DB
    // Pour l'instant, on simule
    return {
        memberId: memberId,
        prenom: 'Test',
        nom: 'User',
        email: 'test@example.com',
        typeMembre: 'Annuel'
    };
}

module.exports = {
    generateGoogleWalletPass,
    generateAppleWalletPass,
    generateWalletButtons,
    setupWalletRoutes
}; 