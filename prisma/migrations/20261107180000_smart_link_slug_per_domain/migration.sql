-- A link name is now unique per custom domain, so mariafarm.me/here and other.me/here can both exist.
DROP INDEX "SmartLink_slug_key";
CREATE INDEX "SmartLink_slug_idx" ON "SmartLink"("slug");
CREATE UNIQUE INDEX "SmartLink_domainId_slug_key" ON "SmartLink"("domainId", "slug");
