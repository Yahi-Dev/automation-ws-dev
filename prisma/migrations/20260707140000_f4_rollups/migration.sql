-- F4: rollup diario de actividad para el dashboard + índice por sentAt.

-- Índice que acelera la recomputación del rollup (conteos por sentAt).
CREATE INDEX `message_sentAt_idx` ON `message`(`sentAt`);

-- Tabla rollup (una fila por día).
CREATE TABLE `message_daily_stats` (
  `day` DATETIME(3) NOT NULL,
  `enviados` INTEGER NOT NULL DEFAULT 0,
  `fallidos` INTEGER NOT NULL DEFAULT 0,
  `pendientes` INTEGER NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
