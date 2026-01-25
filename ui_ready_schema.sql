-- VH Autoglass - UI-READY SUPABASE SCHEMA
-- This schema is precision-engineered to match the exact requirements of the Client and Admin Dashboards.

-- 1. CLEANUP (Optional - Use with caution)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. CREATE TABLES

-- PROFILES: Stores user identity and permissions
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  address text,
  age integer,
  role text DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SERVICES: The service catalog
CREATE TABLE IF NOT EXISTS public.services (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_fee text, -- UI uses 'price_fee' and stores it as a string/text
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BRANCHES: Physical locations
CREATE TABLE IF NOT EXISTS public.branches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BOOKINGS: Customer service requests
CREATE TABLE IF NOT EXISTS public.bookings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_type text,
  location text,
  preferred_date date,
  preferred_time time,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes text,
  photo_url text DEFAULT '[]', -- UI uses 'photo_url' (singular) for media management and stores as JSON string
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- REVIEWS: Customer feedback
CREATE TABLE IF NOT EXISTS public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id bigint REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  photo_urls text DEFAULT '[]', -- UI uses 'photo_urls' (plural) and stores as JSON string
  is_approved boolean DEFAULT false,
  is_public boolean DEFAULT false, -- UI uses this for media privacy and purging
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PORTFOLIO: Recent work gallery
CREATE TABLE IF NOT EXISTS public.portfolio (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. AUTHENTICATION SYNC (Trigger)
-- This automatically creates a profile when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, address, age, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Unnamed User'), 
    new.email,
    new.raw_user_meta_data->>'address', 
    (new.raw_user_meta_data->>'age')::integer,
    COALESCE(new.raw_user_meta_data->>'role', 'client')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Precision-tuned for Admin authority and Client privacy

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

-- Profiles: Admins manage all, Users see all (for avatars/names), Users update own
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Services & Branches & Portfolio: Public Read, Admin Write
CREATE POLICY "Public view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admin manage services" ON public.services FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Public view branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Admin manage branches" ON public.branches FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Public view portfolio" ON public.portfolio FOR SELECT USING (true);
CREATE POLICY "Admin manage portfolio" ON public.portfolio FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Bookings: Admins see all, Users manage own
CREATE POLICY "Admin manage all bookings" ON public.bookings FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews: Admins manage all, Public sees approved/public, Users create own
CREATE POLICY "Admin manage all reviews" ON public.reviews FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Public view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Users create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
