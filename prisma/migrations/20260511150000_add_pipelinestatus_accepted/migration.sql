-- Agrega "Aprobado" como etapa explícita del kanban ATS.
-- Antes, INTERVIEW se mapeaba a status=ACCEPTED dentro del endpoint,
-- juntando "en entrevista" y "aprobado" en la misma columna del board.
-- Con este enum value separamos las dos etapas operativas.

-- AlterEnum
ALTER TYPE "PipelineStatus" ADD VALUE 'ACCEPTED';
