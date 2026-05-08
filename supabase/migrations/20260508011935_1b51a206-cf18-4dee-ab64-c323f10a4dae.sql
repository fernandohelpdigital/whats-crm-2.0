
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'flow-runner-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://qvkthrhjlhennplzfuow.supabase.co/functions/v1/flow-runner',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a3RocmhqbGhlbm5wbHpmdW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDIxMzUsImV4cCI6MjA4NTk3ODEzNX0.8oggXca-2aAapbBN3GWzrbf0vQQRXIJRU9kf6AdKSDg"}'::jsonb,
    body:='{"action":"process_scheduled"}'::jsonb
  );
  $$
);
