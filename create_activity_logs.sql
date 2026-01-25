-- Activity Logs Table
CREATE TABLE public.activity_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- The admin who performed the action
  action_type text NOT NULL, -- e.g., 'UPDATE_STATUS', 'DELETE_CLIENT', 'PROMOTE_ADMIN'
  description text NOT NULL, -- Human readable details
  entity_id text, -- ID of the affected record (booking_id, user_id, etc.)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can VIEW all logs
CREATE POLICY "Admins view logs" ON public.activity_logs 
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can INSERT logs (server-side or via dashboard actions)
CREATE POLICY "Admins insert logs" ON public.activity_logs 
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Optional: Clean up old logs (e.g., via cron later) but for now we keep history.
