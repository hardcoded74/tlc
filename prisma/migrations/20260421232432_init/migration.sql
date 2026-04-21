-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('pending', 'building', 'reviewing', 'packaging', 'complete', 'failed');

-- CreateTable
CREATE TABLE "LessonRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'pending',
    "topic" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "classLength" INTEGER,
    "subject" TEXT,
    "objective" TEXT,
    "notes" TEXT,
    "sourceUploadId" TEXT,
    "hunterBuild" JSONB,
    "christineBuild" JSONB,
    "review" JSONB,
    "hunterPackage" JSONB,
    "christinePackage" JSONB,
    "finalPackage" JSONB,
    "timings" JSONB,
    "tokenUsage" JSONB,
    "errorLog" JSONB,
    "ipHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceUpload" (
    "id" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "parseMethod" TEXT NOT NULL,
    "textContent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipHash" TEXT NOT NULL,

    CONSTRAINT "SourceUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageStats" (
    "id" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lessonsCreated" INTEGER NOT NULL,
    "tokensIn" BIGINT NOT NULL,
    "tokensOut" BIGINT NOT NULL,
    "avgLatencyMs" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,

    CONSTRAINT "UsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonRun_createdAt_idx" ON "LessonRun"("createdAt");

-- CreateIndex
CREATE INDEX "LessonRun_expiresAt_idx" ON "LessonRun"("expiresAt");

-- CreateIndex
CREATE INDEX "LessonRun_ipHash_idx" ON "LessonRun"("ipHash");

-- CreateIndex
CREATE INDEX "SourceUpload_expiresAt_idx" ON "SourceUpload"("expiresAt");

-- CreateIndex
CREATE INDEX "SourceUpload_ipHash_idx" ON "SourceUpload"("ipHash");

-- CreateIndex
CREATE INDEX "SourceUpload_contentHash_idx" ON "SourceUpload"("contentHash");

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_ipHash_windowStart_key" ON "RateLimitBucket"("ipHash", "windowStart");

-- CreateIndex
CREATE INDEX "UsageStats_recordedAt_idx" ON "UsageStats"("recordedAt");
