-- Template showcases are frozen copies of a real page, and new pages start as a copy of them.
-- Replace the owner's personal Fanvue link (the "exclusive content" button on Spotlight Card) with
-- the same placeholder the code sample uses, so new pages don't inherit someone else's link.
UPDATE "TemplateShowcase"
SET "data" = jsonb_set(
      "data"::jsonb,
      '{blocks}',
      (
        SELECT COALESCE(
          jsonb_agg(
            CASE WHEN b->>'url' ILIKE '%fanvue%' THEN jsonb_set(b, '{url}', '"https://example.com/vip"') ELSE b END
            ORDER BY ord
          ),
          '[]'::jsonb
        )
        FROM jsonb_array_elements("data"::jsonb -> 'blocks') WITH ORDINALITY AS t(b, ord)
      )
    ),
    "updatedAt" = NOW()
WHERE jsonb_typeof("data"::jsonb -> 'blocks') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements("data"::jsonb -> 'blocks') AS x(b) WHERE b->>'url' ILIKE '%fanvue%');
