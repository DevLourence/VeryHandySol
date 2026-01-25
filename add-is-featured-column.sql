-- Add is_featured column to reviews table for selective display on landing page
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Update existing approved reviews to be featured by default to maintain current state
UPDATE public.reviews SET is_featured = true WHERE is_approved = true;
