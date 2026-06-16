-- Documents table file metadata
alter table public.documents
add column if not exists storage_path text,
add column if not exists file_name text,
add column if not exists file_type text,
add column if not exists file_size bigint;

-- Supabase Storage policies for public event document uploads.
-- Run this after creating a PUBLIC bucket named: event-documents

create policy "Allow public read event documents"
on storage.objects
for select
to anon
using (bucket_id = 'event-documents');

create policy "Allow anon upload event documents"
on storage.objects
for insert
to anon
with check (bucket_id = 'event-documents');

create policy "Allow anon update event documents"
on storage.objects
for update
to anon
using (bucket_id = 'event-documents')
with check (bucket_id = 'event-documents');

create policy "Allow anon delete event documents"
on storage.objects
for delete
to anon
using (bucket_id = 'event-documents');
