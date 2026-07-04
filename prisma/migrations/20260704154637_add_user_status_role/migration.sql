-- AlterTable
ALTER TABLE `user` ADD COLUMN `role` VARCHAR(16) NOT NULL DEFAULT 'user',
    ADD COLUMN `status` VARCHAR(16) NOT NULL DEFAULT 'pending';

-- Los usuarios existentes quedan aprobados para no bloquearlos.
UPDATE `user` SET `status` = 'approved';

-- Las cuentas semilla actuales quedan como admin.
UPDATE `user` SET `role` = 'admin'
  WHERE `email` IN ('yahinnielvas@gmail.com', 'yahinnieltheking01@gmail.com');
