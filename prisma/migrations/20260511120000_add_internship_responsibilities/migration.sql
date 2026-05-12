-- Agrega responsibilities (lista "Lo que harás" del detalle de práctica).
-- Separado de requirements porque modela tareas del puesto, no expectativas del candidato.
-- Default ARRAY[]::TEXT[] permite que prácticas creadas antes de F-Detalle queden con lista vacía.

-- AlterTable
ALTER TABLE "internships" ADD COLUMN     "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[];
