-- Migration: Add 'avatar_url' to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '';

-- Update RLS to allow users to update their own avatar (already covered by existing policy, but good to verify)
-- Existing policy: "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id); (This covers it)
