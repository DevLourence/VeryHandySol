-- VeryHandy Solution Inc. - UI-READY SUPABASE SCHEMA
-- This schema is precision-engineered to match the exact requirements of the Client and Admin Dashboards.

-- 1. CLEANUP (Optional - Use with caution)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.portfolio CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- 2. CREATE HELPER FUNCTIONS
-- This solves the "Infinite Recursion" error in RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE TABLES

-- PROFILES: Stores user identity and permissions
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  address text,
  age integer,
  role text DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SERVICES: The service catalog
CREATE TABLE public.services (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_fee text, -- UI uses 'price_fee' and stores it as a string/text
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BRANCHES: Physical locations
CREATE TABLE public.branches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  address text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BOOKINGS: Customer service requests
CREATE TABLE public.bookings (
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
CREATE TABLE public.reviews (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id bigint REFERENCES public.bookings(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  photo_urls text DEFAULT '[]', -- UI uses 'photo_urls' (plural) and stores as JSON string
  is_approved boolean DEFAULT false,
  is_public boolean DEFAULT false, -- UI uses this for media privacy and purging
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- PORTFOLIO: Recent work gallery
CREATE TABLE public.portfolio (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ACTIVITY LOGS & NOTIFICATIONS
CREATE TABLE public.activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  entity_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'danger')),
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. AUTHENTICATION SYNC (Trigger)
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

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Precision-tuned for Admin authority and Client privacy

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Services, Branches, Portfolio
CREATE POLICY "Public view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admin manage services" ON public.services FOR ALL USING (public.is_admin());

CREATE POLICY "Public view branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Admin manage branches" ON public.branches FOR ALL USING (public.is_admin());

CREATE POLICY "Public view portfolio" ON public.portfolio FOR SELECT USING (true);
CREATE POLICY "Admin manage portfolio" ON public.portfolio FOR ALL USING (public.is_admin());

-- Bookings
CREATE POLICY "Admin manage all bookings" ON public.bookings FOR ALL USING (public.is_admin());
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews
CREATE POLICY "Admin manage all reviews" ON public.reviews FOR ALL USING (public.is_admin());
CREATE POLICY "Public view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Users create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activity Logs
CREATE POLICY "Admins view logs" ON public.activity_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins insert logs" ON public.activity_logs FOR INSERT WITH CHECK (public.is_admin());

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all notifications" ON public.notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Auth users insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. SEED DATA
INSERT INTO public.services (name, description, price_fee) VALUES
('Drywall Repair', 'Professional repair of cracks, holes, and dents in drywall.', 'Starting at $99.00'),
('Interior Stain & Paint', 'Give your interiors a fresh new look with professional painting.', 'Custom Quote'),
('Exterior Stain & Paint', 'Durable and high-quality exterior staining and painting.', 'Custom Quote'),
('Flooring & Tiling', 'Professional installation for tile, laminate, and hardwood.', 'Starting at $150.00'),
('Furniture Assembly', 'Expert assembly for desks, bookshelves, and bed frames.', 'Starting at $75.00'),
('Light Fixture Installation', 'Safe installation of new light fixtures to brighten your spaces.', 'Starting at $85.00');

INSERT INTO public.branches (name, address) VALUES
('VeryHandy Solution Hub - Mobile Unit', 'Roaming Service Area - Red Deer & Surrounding');

INSERT INTO public.portfolio (title, image_url) VALUES
('Luxury Kitchen Tiling', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a'),
('Living Room Transformation', 'https://images.unsplash.com/photo-1513694203232-719a280e022f');
