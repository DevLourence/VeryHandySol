-- Check review ratings in database
-- Run this in Supabase SQL Editor

SELECT 
    id,
    rating,
    comment,
    is_approved,
    photo_urls,
    created_at
FROM reviews
WHERE is_approved = true
ORDER BY created_at DESC;
