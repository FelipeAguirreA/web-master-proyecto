-- CreateTable: wishlist de prácticas guardadas por el estudiante.
-- Cascada ON DELETE: si se elimina User o Internship, los rows asociados
-- desaparecen automáticamente (sin huérfanos).
CREATE TABLE "saved_internships" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_internships_pkey" PRIMARY KEY ("id")
);

-- @@unique: 1 estudiante no puede guardar la misma práctica 2 veces.
CREATE UNIQUE INDEX "saved_internships_studentId_internshipId_key"
    ON "saved_internships"("studentId", "internshipId");

-- Soporta el query "mis guardadas ordenadas por más reciente".
CREATE INDEX "saved_internships_studentId_createdAt_idx"
    ON "saved_internships"("studentId", "createdAt" DESC);

-- FKs con cascada para no dejar huérfanos al borrar User/Internship.
ALTER TABLE "saved_internships"
    ADD CONSTRAINT "saved_internships_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_internships"
    ADD CONSTRAINT "saved_internships_internshipId_fkey"
    FOREIGN KEY ("internshipId") REFERENCES "internships"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
