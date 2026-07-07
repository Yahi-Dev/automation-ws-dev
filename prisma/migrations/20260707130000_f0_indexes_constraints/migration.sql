-- F0: deduplicación de datos + constraints únicos + índices para escalabilidad.
-- La deduplicación es idempotente (0 filas afectadas si no hay duplicados).

-- 1) Reasignar mensajes de contactos duplicados al contacto de menor id (por teléfono)
UPDATE `message` m
  JOIN `contacts` c ON m.`contactId` = c.`id`
  JOIN (SELECT `phone`, MIN(`id`) AS keep_id FROM `contacts` GROUP BY `phone`) k
    ON c.`phone` = k.`phone`
  SET m.`contactId` = k.keep_id
  WHERE m.`contactId` <> k.keep_id;

-- 2) Reasignar eventos de consentimiento al contacto conservado
UPDATE `consent_events` ce
  JOIN `contacts` c ON ce.`contactId` = c.`id`
  JOIN (SELECT `phone`, MIN(`id`) AS keep_id FROM `contacts` GROUP BY `phone`) k
    ON c.`phone` = k.`phone`
  SET ce.`contactId` = k.keep_id
  WHERE ce.`contactId` <> k.keep_id;

-- 3) Eliminar mensajes duplicados por (postId, contactId), conservando el de menor id
DELETE m FROM `message` m
  JOIN (SELECT `postId`, `contactId`, MIN(`id`) AS keep_id
        FROM `message` GROUP BY `postId`, `contactId`) k
    ON m.`postId` = k.`postId` AND m.`contactId` = k.`contactId`
  WHERE m.`id` <> k.keep_id;

-- 4) Eliminar contactos duplicados por teléfono, conservando el de menor id
DELETE c FROM `contacts` c
  JOIN (SELECT `phone`, MIN(`id`) AS keep_id FROM `contacts` GROUP BY `phone`) k
    ON c.`phone` = k.`phone`
  WHERE c.`id` <> k.keep_id;

-- 5) phone -> VARCHAR(32) (indexable de forma única)
ALTER TABLE `contacts` MODIFY `phone` VARCHAR(32) NOT NULL;

-- 6) Constraints únicos e índices
CREATE UNIQUE INDEX `contacts_phone_key` ON `contacts`(`phone`);
CREATE INDEX `contacts_createdAt_idx` ON `contacts`(`createdAt`);

CREATE UNIQUE INDEX `message_postId_contactId_key` ON `message`(`postId`, `contactId`);
CREATE INDEX `message_postId_status_idx` ON `message`(`postId`, `status`);
CREATE INDEX `message_status_createdAt_idx` ON `message`(`status`, `createdAt`);

CREATE INDEX `posts_schedule_idx` ON `posts`(`schedule`);
CREATE INDEX `posts_createdAt_idx` ON `posts`(`createdAt`);
