-- Tabla del contador de rate-limit de better-auth.
--
-- El almacenamiento del rate-limit pasa de "secondary-storage" a "database"
-- cuando no hay un Redis real configurado. Motivo: `SafeRedis` degrada de forma
-- transparente a un mapa en memoria del proceso, y en un despliegue serverless
-- cada peticion puede caer en un proceso distinto. Un contador por invocacion
-- no limita nada: la proteccion contra fuerza bruta era decorativa.
CREATE TABLE `rate_limit` (
  `id`          VARCHAR(191) NOT NULL,
  `key`         VARCHAR(191) NOT NULL,
  `count`       INTEGER NOT NULL,
  `lastRequest` BIGINT NOT NULL,

  UNIQUE INDEX `rate_limit_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
