# Arket Loyalty

Piloto de lealtad de Arket Studio. Incluye registro, tarjeta web, Google Wallet y panel de caja con búsqueda por PIN o QR. Cada visita suma un sello. Caja confirma el canje y la tarjeta refleja el saldo restante.

## Arranque

1. Usa Node.js 22 o 24 y una base MySQL vacía dedicada al piloto. Copia `.env.example` a `.env` y configura `DATABASE_URL`, dos secretos de sesión distintos de al menos 32 caracteres y un PIN de caja aleatorio de al menos ocho dígitos.
2. Ejecuta los comandos en la carpeta del kit.

   ```bash
   npm ci
   npm run db:push
   node --env-file=.env --import tsx prisma/seed.ts
   node --env-file=.env --import tsx scripts/check-pilot.ts
   npm run dev
   ```

3. Abre `/registro` para crear una tarjeta de prueba. Abre `/login` para entrar a `/barista` con el PIN de caja. `/wallet` vuelve a mostrar la tarjeta desde el navegador donde se hizo el registro.
4. Sigue [la guía de Google Wallet](PILOTO-GOOGLE-WALLET.md) para conectar el emisor de Arket. En producción usa HTTPS y compila con las variables `NEXT_PUBLIC_*` del negocio antes de iniciar la app con `npm start`.

La meta inicial es de seis sellos. Cambia `NEXT_PUBLIC_STAMP_GOAL` y `NEXT_PUBLIC_STAMP_REWARD` antes de abrir un programa nuevo. Usa la misma regla de recompensa en la clase de Google. Los documentos incluidos describen una prueba con datos ficticios. Antes de recibir clientes reales, publica los términos y el aviso de privacidad del programa y define cómo recuperar la tarjeta en otro navegador.

El panel central comparte una base entre negocios. Consulta la configuración de Apple Wallet más abajo.

## Panel central de Arket

1. Agrega `ARKET_ADMIN_PASSWORD` al entorno del servidor. Usa una contraseña aleatoria de al menos 20 caracteres, independiente de los PIN y secretos de sesión.
2. Aplica el esquema de Prisma a la base del piloto antes de abrir la nueva versión. En una instalación nueva usa `npm run db:push`. Si actualizas un piloto existente, respalda la base, detén la app y ejecuta una vez `npx prisma db execute --schema prisma/schema.prisma --file prisma/upgrades/piloto-a-multiempresa.sql`. Los PIN existentes se conservan y la unicidad pasa a verificarse por negocio.
3. Abre `/admin` e inicia sesión. Crea el negocio con un identificador para su URL, su programa, la meta, la recompensa y un PIN de caja de 8 a 16 dígitos. El logo por URL HTTPS es opcional.
4. Desde la ficha del negocio abre **Registro de clientes** o **Acceso a caja**. Las rutas quedan bajo `/n/IDENTIFICADOR/`. Usa esas rutas para operar cada negocio. El paquete elegido se guarda como dato comercial.
5. Para Google Wallet, prepara una clase aprobada en el emisor compartido y guarda en la ficha del negocio solo su sufijo. Las credenciales del emisor se configuran una vez en el servidor. La tarjeta web y caja están disponibles sin una clase de Google.

## Apple Wallet

La instalación usa un **Pass Type ID** y una firma de Arket para todos los negocios. En la ficha de cada negocio, ajusta el nombre y los colores y carga su logo para Apple si corresponde. Cada cliente recibe su propio pase firmado y Wallet consulta el saldo actualizado después de las operaciones de caja.

1. Para una base multiempresa existente, ejecuta una vez `npx prisma db execute --schema prisma/schema.prisma --file prisma/upgrades/agregar-apple-wallet.sql` antes de desplegar. Para una base del piloto original, aplica primero `piloto-a-multiempresa.sql`. En una base nueva, `npm run db:push` crea el esquema completo.
2. En Apple Developer crea el Pass Type ID y su certificado, y obtén el certificado intermedio WWDR que firma el certificado del pase. Exporta la clave privada correspondiente como PEM. Configura en el servidor `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_SIGNER_CERT_PEM_BASE64`, `APPLE_SIGNER_KEY_PEM_BASE64` y `APPLE_WWDR_PEM_BASE64`. Cada valor Base64 codifica el archivo PEM completo. Si la clave PEM está cifrada, define `APPLE_SIGNER_KEY_PASSPHRASE`.
3. Genera `APPLE_PASS_AUTH_SECRET` con al menos 32 caracteres aleatorios. Conserva el secreto incluso si renuevas el certificado, ya que los pases guardados lo usan para autenticarse.
4. Define `NEXT_PUBLIC_APP_URL` con la URL HTTPS del sitio. El servicio de actualización queda bajo `/api/wallet/apple`. Si usas otra URL pública HTTPS para esa ruta, configúrala en `APPLE_WEB_SERVICE_URL`.
5. Desde un iPhone, registra un cliente de prueba, pulsa **Agregar a Apple Wallet** y confirma la instalación. Desde caja registra una visita y un canje y comprueba que el saldo cambie en Wallet. Hostinger debe permitir la conexión saliente HTTP/2 a APNs por el puerto 443.

[Configuración del servicio de Apple Wallet](https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes).
