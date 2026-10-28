-- Diagnostic Query to Check Evacuation Records and RLS Policies
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if evacuation_records table has data
SELECT COUNT(*) as total_records
FROM evacuation_records;

-- 2. Show recent evacuation records (bypass RLS by using service role context)
SELECT 
  id,
  container_number,
  truck_driver_name,
  processed_by,
  processed_at,
  delivered_at
FROM evacuation_records
ORDER BY processed_at DESC
LIMIT 10;

-- 3. Check your user's role
SELECT 
  id,
  full_name,
  email,
  role
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check RLS policies on evacuation_records
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'evacuation_records';

-- 5. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'evacuation_records';
