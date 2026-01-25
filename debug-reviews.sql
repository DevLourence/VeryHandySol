-- Check if reviews exist and verify table structure
-- Run this in Supabase SQL Editor to debug

-- 1. Check if reviews table exists and has data
SELECT COUNT(*) as total_reviews FROM reviews;

-- 2. View all reviews with user info
SELECT 
    r.id,
    r.rating,
    r.comment,
    r.is_approved,
    r.created_at,
    p.full_name as client_name,
    r.user_id
FROM reviews r
LEFT JOIN profiles p ON r.user_id = p.id
ORDER BY r.created_at DESC
LIMIT 10;

-- 3. Check reviews table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reviews'
ORDER BY ordinal_position;

-- 4. Check if there are any RLS policies blocking access
SELECT * FROM pg_policies WHERE tablename = 'reviews';
