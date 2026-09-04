-- Estados terminales, control de reintentos e indices de rendimiento.
--
-- 1) `attempts` / `lastAttemptAt` / `terminalAt`
--    Antes, el estado "failed" era SIEMPRE reelegible. Los fallos permanentes
--    (CONSENT_OPT_OUT, CONSENT_NOT_OPTED_IN, PHONE_INVALID) se reclamaban de
--    nuevo cada 60 s indefinidamente: con 20.000 contactos importados eran
--    ~40.000 UPDATE por minuto de forma sostenida, sin enviar un solo mensaje.
--    `terminalAt` marca los que no deben reintentarse nunca mas.
--
-- 2) `status` VARCHAR(191) -> VARCHAR(16)
--    Sin `@db.VarChar`, Prisma generaba VARCHAR(191). MySQL dimensiona los
--    buffers de filesort y las tablas temporales por la longitud MAXIMA, no la
--    real: cualquier GROUP BY o filesort sobre `status` reservaba 764 bytes por
--    fila en lugar de 64. El valor mas largo en uso es 'undelivered' (11).
--
-- 3) Indices
--    `(status, updatedAt)`  -> el recuento de "fallidos" del dashboard no tenia
--                              ningun indice y hacia un lookup al PK por fila.
--    `(postId, status, id)` -> seleccion y reclamo de campana.
--    `(terminalAt)`         -> excluir de golpe los mensajes ya cerrados.

ALTER TABLE `message`
  ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lastAttemptAt` DATETIME(3) NULL,
  ADD COLUMN `terminalAt` DATETIME(3) NULL,
  MODIFY `status` VARCHAR(16) NOT NULL DEFAULT 'pending';

CREATE INDEX `message_status_updatedAt_idx` ON `message`(`status`, `updatedAt`);
CREATE INDEX `message_postId_status_id_idx` ON `message`(`postId`, `status`, `id`);
CREATE INDEX `message_terminalAt_idx` ON `message`(`terminalAt`);

-- Cierra de forma retroactiva los fallos que ya sabemos que son permanentes.
-- Sin esto, la tormenta de escritura seguiria activa sobre los datos actuales.
UPDATE `message`
   SET `terminalAt` = COALESCE(`updatedAt`, `createdAt`)
 WHERE `status` IN ('failed', 'undelivered')
   AND `errorCode` IN ('CONSENT_OPT_OUT', 'CONSENT_NOT_OPTED_IN', 'PHONE_INVALID', '21211', '63003', '131026');
