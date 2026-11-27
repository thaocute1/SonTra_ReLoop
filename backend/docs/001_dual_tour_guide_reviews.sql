-- Migration: Tách riêng đánh giá Tour & Hướng dẫn viên (HDV)
-- Chạy script này trong Supabase SQL Editor khi muốn chuyển toàn bộ metadata sang cột native.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS guide_rating   int4        NULL CHECK (guide_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS tour_tags      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS guide_tags     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vendor_reply   text        NULL,
  ADD COLUMN IF NOT EXISTS replied_at     timestamptz NULL,
  ADD COLUMN IF NOT EXISTS edited_at      timestamptz NULL;

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS total_reviews  int4        NOT NULL DEFAULT 0;

-- Backfill dữ liệu vendor_reply cũ từng lưu trong cột images (JSONB) nếu có
UPDATE public.reviews
SET
  vendor_reply = COALESCE(
    vendor_reply,
    (
      SELECT elem->>'text'
      FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS elem
      WHERE jsonb_typeof(elem) = 'object' AND elem->>'type' = 'vendor_reply'
      LIMIT 1
    )
  ),
  images = COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(COALESCE(images, '[]'::jsonb)) AS elem
      WHERE NOT (jsonb_typeof(elem) = 'object' AND elem->>'type' IN ('vendor_reply', 'review_meta'))
    ),
    '[]'::jsonb
  )
WHERE jsonb_typeof(images) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(images) AS elem
    WHERE jsonb_typeof(elem) = 'object' AND elem->>'type' = 'vendor_reply'
  );
