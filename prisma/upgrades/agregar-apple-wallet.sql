-- Ejecutar una vez sobre una base multiempresa que todavía no tenga appleLogo.
ALTER TABLE `tenants` ADD COLUMN `appleLogo` MEDIUMBLOB NULL;
