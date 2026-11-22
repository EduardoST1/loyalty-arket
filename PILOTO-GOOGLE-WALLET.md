# Piloto de Google Wallet de Arket Studio

1. En [Google Pay & Wallet Console](https://pay.google.com/business/console), selecciona el emisor de Arket Studio. Copia su **Issuer ID** y concede a la cuenta de servicio un rol autorizado para emitir. Durante la revisión, agrega la cuenta de Google del probador a la lista de pruebas si el emisor aparece en modo demo.
2. Prepara la clase de lealtad de Arket Studio con sufijo `arket_studio_loyalty`, logo HTTPS público, nombre, color y una descripción que indique cuántos sellos requiere la recompensa. Envía la clase a revisión y confirma que figure aprobada.
3. Completa las variables del piloto en el servidor. Define `NEXT_PUBLIC_APP_URL` con la URL HTTPS, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`, `GOOGLE_WALLET_CLASS_MODE=prepared` y `GOOGLE_LOYALTY_CLASS_ID=arket_studio_loyalty`. Conserva la clave privada en el servidor y registra los valores con los del emisor de Arket.
4. Con la base del piloto inicializada, verifica el acceso a la clase:

   ```bash
   node --env-file=.env --import tsx scripts/check-pilot.ts --google
   ```

5. Con datos ficticios y la cuenta autorizada de Android, abre `/registro` y pulsa **Agregar a Google Wallet**. Comprueba la marca, el PIN y el QR. Abre caja con el PIN de personal, busca al cliente por PIN y QR y suma seis sellos. Revisa el saldo en la tarjeta web y en Google Wallet. Canjea la recompensa en caja, comprueba el saldo y confirma que volver a canjear con saldo insuficiente se rechaza.
6. Cuando Google habilite el acceso de publicación, repite el guardado con una cuenta de Google que no esté en la lista de pruebas.

Cada clase preparada conserva su diseño. El sistema consulta su aprobación al emitir y actualiza el pase individual al sumar sellos o confirmar un canje. Mantén estable el sufijo de la clase una vez emitidas tarjetas.
