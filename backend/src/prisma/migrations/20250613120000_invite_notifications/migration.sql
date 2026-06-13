-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "declined" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invite" ADD COLUMN "declinedAt" TIMESTAMP(3);
ALTER TABLE "Invite" ADD COLUMN "userId" TEXT;
ALTER TABLE "Invite" ADD COLUMN "invitedById" TEXT;

-- CreateIndex
CREATE INDEX "Invite_userId_idx" ON "Invite"("userId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
