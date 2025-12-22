-- Create storage bucket for store content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-content', 'store-content', true);

-- Allow authenticated users to upload to their store folder
CREATE POLICY "Store owners can upload content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their content
CREATE POLICY "Store owners can update content"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their content
CREATE POLICY "Store owners can delete content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to store content
CREATE POLICY "Public can view store content"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-content');