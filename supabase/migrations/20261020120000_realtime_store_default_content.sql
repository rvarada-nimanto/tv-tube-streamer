-- Let the TV display hear about default-content changes without a reload
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_default_content;
