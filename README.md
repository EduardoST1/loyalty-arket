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

El kit usa una base y un despliegue por negocio. El panel central multiempresa y Apple Wallet quedan pendientes.
