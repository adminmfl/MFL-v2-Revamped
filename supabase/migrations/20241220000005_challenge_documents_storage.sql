-- Create storage bucket for challenge documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-documents',
  'challenge-documents',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for challenge-documents bucket
CREATE POLICY "Anyone can view challenge documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'challenge-documents');

CREATE POLICY "Authenticated users can upload challenge documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'challenge-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own challenge documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'challenge-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own challenge documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'challenge-documents'
  AND auth.role() = 'authenticated'
);
