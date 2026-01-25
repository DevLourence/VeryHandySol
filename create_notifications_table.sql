-- VH Autoglass - IN-APP NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, -- Target user
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'danger')),
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb, -- Store booking_id or other contextual data
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Admin can view all notifications (optional, but useful for audit)
CREATE POLICY "Admins can view all notifications" ON public.notifications
FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- System/Public can insert notifications (to allow client -> admin and admin -> client)
-- In a production app, this would ideally be handled by a secure Edge Function, 
-- but for simplicity, we allow authenticated users to insert.
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
