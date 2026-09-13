-- Respuestas individuales a los mensajes entrantes.
--
-- Hasta ahora la pantalla de entrantes solo DEJABA VER lo que la gente
-- contestaba: no habia forma de contestarle desde la app. Y el numero de
-- WhatsApp registrado en Twilio deja de funcionar en la aplicacion normal de
-- WhatsApp, asi que tampoco se podia contestar desde el telefono. En la
-- practica, quien escribia a la empresa se quedaba sin respuesta.
--
-- No se reutiliza `message` a proposito: esa tabla exige `postId` (una campana)
-- y `contactId`, y una respuesta puede ir a un numero que no esta en la agenda.
-- Ademas su unique (postId, contactId) es lo que impide duplicar envios
-- masivos; meter respuestas sueltas ahi lo romperia.
CREATE TABLE `outbound_replies` (
  `id`           INTEGER NOT NULL AUTO_INCREMENT,
  `toPhone`      VARCHAR(32) NOT NULL,
  `body`         TEXT NOT NULL,
  `providerSid`  VARCHAR(128) NULL,
  `status`       VARCHAR(16) NOT NULL DEFAULT 'queued',
  `errorCode`    VARCHAR(32) NULL,
  `errorMessage` TEXT NULL,
  `contactId`    INTEGER NULL,
  `inboundId`    INTEGER NULL,
  `sentBy`       VARCHAR(191) NOT NULL,
  `sentAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deliveredAt`  DATETIME(3) NULL,
  `readAt`       DATETIME(3) NULL,
  `updatedAt`    DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `outbound_replies_providerSid_key`(`providerSid`),
  INDEX `outbound_replies_toPhone_sentAt_idx`(`toPhone`, `sentAt`),
  INDEX `outbound_replies_contactId_idx`(`contactId`),
  INDEX `outbound_replies_inboundId_idx`(`inboundId`),
  INDEX `outbound_replies_sentAt_idx`(`sentAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `outbound_replies`
  ADD CONSTRAINT `outbound_replies_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `outbound_replies`
  ADD CONSTRAINT `outbound_replies_inboundId_fkey`
  FOREIGN KEY (`inboundId`) REFERENCES `inbound_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
