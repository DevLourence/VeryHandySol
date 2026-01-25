-- Add photo_urls column to bookings table
-- This column stores ImageKit URLs for booking media files

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Add comment to document the column
COMMENT ON COLUMN bookings.photo_urls IS 'Array of ImageKit CDN URLs for booking photos and videos';

-- Optional: Add index for faster queries on bookings with photos
CREATE INDEX IF NOT EXISTS idx_bookings_with_photos 
ON bookings(id) 
WHERE photo_urls IS NOT NULL;
