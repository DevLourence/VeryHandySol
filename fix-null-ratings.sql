-- Fix reviews with null ratings
-- Run this in Supabase SQL Editor

-- Option 1: Set all null ratings to 5 stars
UPDATE reviews 
SET rating = 5 
WHERE rating IS NULL;

-- Option 2: Set specific review ratings
-- UPDATE reviews 
-- SET rating = 4 
-- WHERE id = 'your-review-id-here';

-- Verify the update
SELECT id, rating, comment, is_approved 
FROM reviews 
ORDER BY created_at DESC;
