-- FIX INFINITE RECURSION IN RLS POLICIES
-- Run this script in your Supabase SQL Editor to fix the "Infinite recursion detected" error.

-- 1. Create a secure function to check admin status
-- This function is SECURITY DEFINER, meaning it runs with elevated privileges
-- and bypasses the RLS on the profiles table, breaking the recursion loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;

-- 3. Re-create the profiles policy using the secure function
CREATE POLICY "Admin full access profiles" ON public.profiles
FOR ALL
USING (public.is_admin());

-- 4. (Optional but Recommended) Update other admin policies for consistency and performance
DROP POLICY IF EXISTS "Admin manage services" ON public.services;
CREATE POLICY "Admin manage services" ON public.services FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage branches" ON public.branches;
CREATE POLICY "Admin manage branches" ON public.branches FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage portfolio" ON public.portfolio;
CREATE POLICY "Admin manage portfolio" ON public.portfolio FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage all bookings" ON public.bookings;
CREATE POLICY "Admin manage all bookings" ON public.bookings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admin manage all reviews" ON public.reviews;
CREATE POLICY "Admin manage all reviews" ON public.reviews FOR ALL USING (public.is_admin());
