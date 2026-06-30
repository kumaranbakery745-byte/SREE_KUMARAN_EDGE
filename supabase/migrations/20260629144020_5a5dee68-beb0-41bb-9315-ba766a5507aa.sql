CREATE TABLE public.print_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_html TEXT NOT NULL,
  outlet_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

GRANT SELECT, INSERT, UPDATE ON public.print_jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_jobs TO authenticated;
GRANT ALL ON public.print_jobs TO service_role;

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read print jobs" ON public.print_jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can create print jobs" ON public.print_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update print jobs" ON public.print_jobs FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
ALTER TABLE public.print_jobs REPLICA IDENTITY FULL;

CREATE INDEX idx_print_jobs_status_created ON public.print_jobs (status, created_at);