-- Fix RLS policies for bookings table

-- First, check if RLS is enabled
-- If you see no bookings, try disabling RLS temporarily:
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Then try viewing bookings in admin dashboard
-- If it works, re-enable with proper policies:

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;

-- Create new policies
CREATE POLICY "Authenticated users can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update bookings"
ON bookings FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (true);
