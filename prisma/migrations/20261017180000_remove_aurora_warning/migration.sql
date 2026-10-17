-- Clear Blue is the default warning design; the "aurora" design was removed (its users move to Clear Blue).
ALTER TABLE "SmartLink" ALTER COLUMN "warningTemplate" SET DEFAULT 'clear-blue';
UPDATE "SmartLink" SET "warningTemplate" = 'clear-blue' WHERE "warningTemplate" = 'aurora';
UPDATE "Page" SET "warningTemplate" = 'clear-blue' WHERE "warningTemplate" = 'aurora';
