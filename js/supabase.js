import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm';

export const supabase = createClient(
  'https://tilulkkukndyqpouizba.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHVsa2t1a25keXFwb3VpemJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTkxOTEsImV4cCI6MjA5NDQ3NTE5MX0.ffe0dbJKXHjA29JU2inOqCB1baJaJ-X0eDpen1_extc'
);
