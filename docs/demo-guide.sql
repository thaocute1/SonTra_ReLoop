-- Run in Supabase SQL Editor, not Table Editor.
-- Demo login: guide.demo@sontra.test
-- Demo password: GuideDemo@123
-- NULL selects the existing vendor with the smallest ID.
-- Replace NULL with a specific public.vendors.id to choose another vendor.
-- Creates a Django application account; no Supabase Auth account is required
-- for this project's email/password login endpoint.

BEGIN;

DO $demo$
DECLARE
    demo_vendor_id bigint := NULL;
    demo_user_id bigint;
    demo_guide_id bigint;
    demo_hash text := 'pbkdf2_sha256$1000000$ZFqTVuqg1bOPtrve1ypwm1$tTLW4jjiAvUx4wOVEPCukChjTth245NQMIJGywBspQI=';
BEGIN
    IF demo_vendor_id IS NULL THEN
        SELECT id INTO demo_vendor_id
        FROM public.vendors WHERE deleted_at IS NULL ORDER BY id LIMIT 1;
    END IF;

    IF demo_vendor_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.vendors WHERE id = demo_vendor_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Can tao vendor truoc, hoac chon lai demo_vendor_id.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.users WHERE email = 'guide.demo@sontra.test') THEN
        SELECT id INTO demo_user_id FROM public.users
        WHERE email = 'guide.demo@sontra.test' AND role = 'guide'
          AND status = 'active' AND deleted_at IS NULL AND password_hash = demo_hash;
        IF demo_user_id IS NULL THEN
            RAISE EXCEPTION 'Email demo da ton tai voi thong tin khac. Khong ghi de tai khoan.';
        END IF;
    ELSE
        INSERT INTO public.users (
            name, email, password_hash, phone, role, status,
            total_eco_points, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            'Huong dan vien Demo Son Tra', 'guide.demo@sontra.test', demo_hash,
            NULL, 'guide', 'active', 0, '{}'::jsonb, NOW(), NOW()
        ) RETURNING id INTO demo_user_id;
    END IF;

    SELECT id INTO demo_guide_id FROM public.guides
    WHERE user_id = demo_user_id AND vendor_id = demo_vendor_id;

    IF demo_guide_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.guides WHERE user_id = demo_user_id) THEN
            RAISE EXCEPTION 'Ho so demo thuoc vendor khac. Khong thay doi phan cong.';
        END IF;
        INSERT INTO public.guides (
            vendor_id, user_id, license_number, languages,
            experience_years, avg_rating, created_at, updated_at
        ) VALUES (
            demo_vendor_id, demo_user_id, 'DEMO-ONLY', '["vi"]'::jsonb,
            2, 0, NOW(), NOW()
        ) RETURNING id INTO demo_guide_id;
    END IF;

    RAISE NOTICE 'Demo user_id=%, guide_id=%, vendor_id=%', demo_user_id, demo_guide_id, demo_vendor_id;
END
$demo$;

COMMIT;

SELECT u.email, u.role, u.status, g.id AS guide_id, g.vendor_id, v.brand_name
FROM public.users u
JOIN public.guides g ON g.user_id = u.id
JOIN public.vendors v ON v.id = g.vendor_id
WHERE u.email = 'guide.demo@sontra.test';

-- This script does not assign or change real trips.
-- Assign this guide to a test trip belonging to the same vendor to test the roster.
