-- Ejecutar una vez sobre la base del piloto anterior, con la aplicación detenida.
ALTER TABLE `tenants`
  ADD COLUMN `clubName` VARCHAR(191) NULL,
  ADD COLUMN `googleClass` VARCHAR(191) NULL,
  ADD COLUMN `plan` VARCHAR(191) NOT NULL DEFAULT 'lealtad',
  ADD COLUMN `staffPinHash` VARCHAR(191) NULL,
  ADD COLUMN `stampGoal` INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN `stampReward` VARCHAR(191) NOT NULL DEFAULT 'Recompensa de lealtad',
  ADD COLUMN `tagline` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `tenants_googleClass_key` (`googleClass`);

ALTER TABLE `clientes`
  ADD UNIQUE INDEX `clientes_tenantId_pin_key` (`tenantId`, `pin`),
  DROP INDEX `clientes_pin_key`;
