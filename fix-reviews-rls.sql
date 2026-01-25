-- Fix Reviews RLS Policies for Admin Access
-- Run this in Supabase SQL Editor

-- Enable RLS on reviews table (if not already enabled)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON reviews;
DROP POLICY IF EXISTS "Public can view approved reviews" ON reviews;

-- 1. Allow users to view their own reviews
CREATE POLICY "Users can view their own reviews"
ON reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Allow users to insert their own reviews
CREATE POLICY "Users can insert their own reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Allow admins to view ALL reviews
CREATE POLICY "Admins can view all reviews"
ON reviews FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 4. Allow admins to update reviews (approve/reject)
CREATE POLICY "Admins can update reviews"
ON reviews FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 5. Allow public to view approved reviews (for landing page)
CREATE POLICY "Public can view approved reviews"
ON reviews FOR SELECT
TO anon
USING (is_approved = true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'reviews';
