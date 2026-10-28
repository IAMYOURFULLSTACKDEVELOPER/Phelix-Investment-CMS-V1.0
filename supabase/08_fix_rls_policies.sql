-- Hotfix: Fix RLS Policies for Evacuation Tracking
-- Run this in Supabase SQL Editor to fix the RLS issue

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can insert evacuation tracking" ON evacuation_tracking;
DROP POLICY IF EXISTS "Super admins can update evacuation quotas" ON evacuation_quotas;

-- Add service role policy for evacuation_tracking inserts (for triggers)
CREATE POLICY "Service role can insert evacuation tracking"
  ON evacuation_tracking FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add service role policy for evacuation_quotas updates (for triggers)
CREATE POLICY "Service role can update evacuation quotas"
  ON evacuation_quotas FOR UPDATE
  TO service_role
  USING (true);

-- Recreate the trigger function with SECURITY DEFINER
DROP FUNCTION IF EXISTS track_evacuation_activity CASCADE;

CREATE OR REPLACE FUNCTION track_evacuation_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  officer_record RECORD;
  day_name TEXT;
BEGIN
  -- Get officer information
  SELECT full_name INTO officer_record
  FROM profiles
  WHERE id = NEW.processed_by;

  -- Get day of week
  day_name := TO_CHAR(NEW.processed_at, 'Day');

  -- Insert or update tracking record
  INSERT INTO evacuation_tracking (day_of_week, officer_id, officer_name, shipping_line, amount_done, record_date)
  VALUES (
    TRIM(day_name),
    NEW.processed_by,
    officer_record.full_name,
    COALESCE(NEW.shipping_line, 'Unknown'),
    1,
    DATE(NEW.processed_at)
  )
  ON CONFLICT DO NOTHING;

  -- Update current evacuations in quotas
  IF NEW.shipping_line IS NOT NULL THEN
    UPDATE evacuation_quotas
    SET current_evacuations = current_evacuations + 1
    WHERE shipping_line = NEW.shipping_line;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_track_evacuation_activity ON evacuation_records;
CREATE TRIGGER trigger_track_evacuation_activity
  AFTER INSERT ON evacuation_records
  FOR EACH ROW
  EXECUTE FUNCTION track_evacuation_activity();
