-- AlterEnum
ALTER TYPE "CompanyStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;
