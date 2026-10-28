-- TEMPORARY FIX: Disable RLS on evacuation_records for testing
-- This will allow us to see if data exists and is being loaded correctly

-- Disable RLS temporarily
ALTER TABLE evacuation_records DISABLE ROW LEVEL SECURITY;

-- Note: To re-enable RLS later, run:
-- ALTER TABLE evacuation_records ENABLE ROW LEVEL SECURITY;
