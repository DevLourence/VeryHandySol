-- Create Supabase Storage bucket for booking media
-- Run this in Supabase SQL Editor

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-media', 'booking-media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for booking-media bucket

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload booking media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'booking-media');

-- Policy: Allow public read access to all files
CREATE POLICY "Public read access for booking media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'booking-media');

-- Policy: Allow users to delete their own uploads (optional)
CREATE POLICY "Users can delete their own booking media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'booking-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add comment
COMMENT ON TABLE storage.objects IS 'Storage for booking photos and videos';
