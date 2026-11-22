# Credenciales Wallet (no subir a git)

## Google Wallet

1. Crea proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilita **Google Wallet API**
3. Crea una **Service Account** → Keys → JSON
4. Guarda el JSON aquí como `google-wallet-credentials.json`
5. En [Google Pay & Wallet Console](https://pay.google.com/business/console):
   - Crea / abre tu cuenta de Issuer
   - Copia el **Issuer ID**
   - Users → agrega el email de la Service Account con rol Admin
6. En `.env` llena:

```bash
GOOGLE_WALLET_ISSUER_ID="tu_issuer_id"
GOOGLE_SERVICE_ACCOUNT_EMAIL="...@....iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY_PATH="./certificates/google-wallet-credentials.json"
GOOGLE_LOYALTY_CLASS_ID="loyalty_class"
NEXT_PUBLIC_APP_URL="https://tu-dominio-publico.com"
GOOGLE_WALLET_LOGO_URL="https://tu-dominio-publico.com/wallet/program-logo.png"
```

El logo **debe ser HTTPS público** (Google no acepta localhost).
Por defecto el pass usa `public/wallet/program-logo.png`, `hero.png`, `wide-logo.png` y `sellos-0.png`…`sellos-6.png`.
Regenerar assets: `npm run wallet:assets`.

## Apple Wallet (opcional)

Requiere Apple Developer Program (**US$99/año**). Sin certificados, las rutas Apple responden 503.
