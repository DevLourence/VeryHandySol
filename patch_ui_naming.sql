-- VH Autoglass - UI NAMING PATCH
-- This script aligns your existing database columns with the current UI requirements without dropping tables.

-- 1. Align Services table (price -> price_fee)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='price') THEN
    ALTER TABLE public.services RENAME COLUMN price TO price_fee;
    ALTER TABLE public.services ALTER COLUMN price_fee TYPE text;
  END IF;
END $$;

-- 2. Align Bookings table (ensure photo_url exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='photo_url') THEN
    ALTER TABLE public.bookings ADD COLUMN photo_url text DEFAULT '[]';
  END IF;
END $$;

-- 3. Align Reviews table (ensure is_public and photo_urls exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='is_public') THEN
    ALTER TABLE public.reviews ADD COLUMN is_public boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='photo_urls') THEN
    ALTER TABLE public.reviews ADD COLUMN photo_urls text DEFAULT '[]';
  END IF;
END $$;

-- 4. Update Status Check
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- 5. Refresh RLS Policies
-- Bookings
DROP POLICY IF EXISTS "Admin manage all bookings" ON public.bookings;
CREATE POLICY "Admin manage all bookings" ON public.bookings FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Reviews
DROP POLICY IF EXISTS "Admin manage all reviews" ON public.reviews;
CREATE POLICY "Admin manage all reviews" ON public.reviews FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
DROP POLICY IF EXISTS "Public view approved" ON public.reviews;
CREATE POLICY "Public view approved" ON public.reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id);

-- Profiles
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
