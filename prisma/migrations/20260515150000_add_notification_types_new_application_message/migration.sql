-- AlterEnum: agrega NEW_APPLICATION y NEW_MESSAGE al tipo NotificationType.
-- ALTER TYPE ... ADD VALUE es no-bloqueante y safe en producción.
ALTER TYPE "NotificationType" ADD VALUE 'NEW_APPLICATION';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_MESSAGE';
