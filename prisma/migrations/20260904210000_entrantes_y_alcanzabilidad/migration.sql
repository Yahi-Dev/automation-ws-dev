-- Mensajes entrantes y alcanzabilidad del contacto.
--
-- 1) `inbound_messages`: hasta ahora el webhook de entrada leia el cuerpo solo
--    para detectar STOP/BAJA y lo descartaba. Un "quiero darme de baja" de un
--    numero desconocido se perdia SIN DEJAR RASTRO, y las respuestas de los
--    contactos no se podian ver en ningun sitio. Es ademas el entregable
--    "recibir respuestas a traves de un webhook" del contrato.
--
-- 2) `contacts.unreachableAt` / `unreachableCode`: no existe forma oficial de
--    saber si un numero tiene WhatsApp ANTES de enviar (Meta nunca lo expuso en
--    Cloud API y el endpoint de la On-Premises API se apago el 23-oct-2025). La
--    unica senal fiable es el error de entrega del primer intento.

CREATE TABLE `inbound_messages` (
  `id`          INTEGER NOT NULL AUTO_INCREMENT,
  `fromPhone`   VARCHAR(32) NOT NULL,
  `body`        TEXT NOT NULL,
  `providerSid` VARCHAR(128) NULL,
  `handledAs`   VARCHAR(24) NOT NULL DEFAULT 'ninguno',
  `keyword`     VARCHAR(64) NULL,
  `contactId`   INTEGER NULL,
  `receivedAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `inbound_messages_providerSid_key`(`providerSid`),
  INDEX `inbound_messages_receivedAt_idx`(`receivedAt`),
  INDEX `inbound_messages_fromPhone_idx`(`fromPhone`),
  INDEX `inbound_messages_contactId_idx`(`contactId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inbound_messages`
  ADD CONSTRAINT `inbound_messages_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `contacts`
  ADD COLUMN `unreachableAt` DATETIME(3) NULL,
  ADD COLUMN `unreachableCode` VARCHAR(16) NULL;
