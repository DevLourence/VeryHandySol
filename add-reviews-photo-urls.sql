-- Add photo_urls column to reviews table
-- Run this in Supabase SQL Editor

-- Add photo_urls column to store review media
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Add comment to document the column
COMMENT ON COLUMN reviews.photo_urls IS 'Array of image/video URLs for review media (uploaded to ImgBB)';

-- Optional: Add index for reviews with photos
CREATE INDEX IF NOT EXISTS idx_reviews_with_photos 
ON reviews(id) 
WHERE photo_urls IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reviews' 
AND column_name = 'photo_urls';
