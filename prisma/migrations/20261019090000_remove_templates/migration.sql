-- Pro Card, Personal Card and Simple Stack were removed: pages using them switch to the classic layout.
UPDATE "Page" SET "layout" = 'classic' WHERE "layout" IN ('pro-card', 'personal-card', 'simple-stack');
DELETE FROM "TemplateShowcase" WHERE "layout" IN ('pro-card', 'personal-card', 'simple-stack');
