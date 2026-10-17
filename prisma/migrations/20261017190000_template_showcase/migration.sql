-- CreateTable
CREATE TABLE "TemplateShowcase" (
    "layout" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateShowcase_pkey" PRIMARY KEY ("layout")
);

-- Freeze the pages already showcased: copy their content and the images it uses
-- (new keys "sc<key>", owned by no page) into one preview per template.
DO $$
DECLARE
  p RECORD;
  m RECORD;
  doc TEXT;
BEGIN
  FOR p IN SELECT * FROM "Page" WHERE showcase LOOP
    doc := json_build_object(
      'displayName', p."displayName",
      'bio', p.bio,
      'tagline', p.tagline,
      'avatarUrl', p."avatarUrl",
      'heroUrl', p."heroUrl",
      'themeKey', p."themeKey",
      'themeOverrides', p."themeOverrides",
      'warningTemplate', p."warningTemplate",
      'verified', (p."verifiedAt" IS NOT NULL AND p."showVerified"),
      'blocks', COALESCE((
        SELECT json_agg(json_build_object('type', b.type, 'title', b.title, 'url', b.url, 'data', b.data, 'contentWarning', b."contentWarning") ORDER BY b.position)
        FROM "Block" b WHERE b."pageId" = p.id AND b.enabled
      ), '[]'::json)
    )::text;
    FOR m IN SELECT key FROM "Media" WHERE "pageId" = p.id LOOP
      IF position(('/media/' || m.key) IN doc) > 0 THEN
        INSERT INTO "Media" (key, "pageId", "contentType", bytes, "createdAt")
          SELECT 'sc' || key, 'showcase', "contentType", bytes, now() FROM "Media" WHERE key = m.key
          ON CONFLICT (key) DO NOTHING;
        doc := replace(doc, '/media/' || m.key, '/media/sc' || m.key);
      END IF;
    END LOOP;
    INSERT INTO "TemplateShowcase" (layout, data, "updatedAt") VALUES (p.layout, doc::jsonb, now())
      ON CONFLICT (layout) DO UPDATE SET data = EXCLUDED.data, "updatedAt" = now();
  END LOOP;
END $$;
