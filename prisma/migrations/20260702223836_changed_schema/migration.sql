-- DropIndex
DROP INDEX "documents_embedding_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "skills" TEXT[];
