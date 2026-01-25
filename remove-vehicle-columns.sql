-- Remove vehicle-related columns from bookings table

ALTER TABLE public.bookings 
DROP COLUMN IF EXISTS vehicle_make,
DROP COLUMN IF EXISTS vehicle_model,
DROP COLUMN IF EXISTS vehicle_year;

-- Updated table structure (for reference):
-- bookings table now has:
-- - id (uuid, primary key)
-- - user_id (uuid, foreign key to profiles)
-- - service_type (text, required)
-- - preferred_date (date)
-- - preferred_time (time)
-- - location (text, required)
-- - status (text, default 'pending')
-- - notes (text)
-- - created_at (timestamp)
-- - updated_at (timestamp)
