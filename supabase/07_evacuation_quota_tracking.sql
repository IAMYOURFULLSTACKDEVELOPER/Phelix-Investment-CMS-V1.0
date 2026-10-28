-- Evacuation Quota and Tracking System Migration
-- This migration adds tables for managing evacuation quotas and tracking user activity

-- Create evacuation_quotas table
CREATE TABLE IF NOT EXISTS evacuation_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipping_line TEXT NOT NULL CHECK (shipping_line IN ('Grimaldi', 'CMA CGM', 'MAERSK LINE', 'MSC', 'HAPAG LLYOD')),
  total_evacuations INTEGER NOT NULL DEFAULT 0,
  current_evacuations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evacuation_tracking table
CREATE TABLE IF NOT EXISTS evacuation_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week TEXT NOT NULL,
  officer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  officer_name TEXT NOT NULL,
  shipping_line TEXT NOT NULL,
  amount_done INTEGER NOT NULL DEFAULT 0,
  record_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evacuation_tracking_officer ON evacuation_tracking(officer_id);
CREATE INDEX IF NOT EXISTS idx_evacuation_tracking_date ON evacuation_tracking(record_date);
CREATE INDEX IF NOT EXISTS idx_evacuation_tracking_shipping_line ON evacuation_tracking(shipping_line);
CREATE INDEX IF NOT EXISTS idx_evacuation_quotas_shipping_line ON evacuation_quotas(shipping_line);

-- Enable Row Level Security
ALTER TABLE evacuation_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE evacuation_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evacuation_quotas
-- Only super_admin can read/write evacuation quotas
CREATE POLICY "Super admins can view evacuation quotas"
  ON evacuation_quotas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert evacuation quotas"
  ON evacuation_quotas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Allow service role to update (for triggers)
CREATE POLICY "Service role can update evacuation quotas"
  ON evacuation_quotas FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Super admins can update evacuation quotas"
  ON evacuation_quotas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policies for evacuation_tracking
-- Only super_admin can read evacuation tracking
CREATE POLICY "Super admins can view evacuation tracking"
  ON evacuation_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Allow service role to insert (for triggers)
CREATE POLICY "Service role can insert evacuation tracking"
  ON evacuation_tracking FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Super admins can update evacuation tracking"
  ON evacuation_tracking FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Trigger to update updated_at timestamp for evacuation_quotas
CREATE OR REPLACE FUNCTION update_evacuation_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evacuation_quotas_updated_at
  BEFORE UPDATE ON evacuation_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_evacuation_quotas_updated_at();

-- Insert default evacuation quotas for all shipping lines
INSERT INTO evacuation_quotas (shipping_line, total_evacuations, current_evacuations)
VALUES
  ('Grimaldi', 0, 0),
  ('CMA CGM', 0, 0),
  ('MAERSK LINE', 0, 0),
  ('MSC', 0, 0),
  ('HAPAG LLYOD', 0, 0)
ON CONFLICT DO NOTHING;

-- Function to automatically track evacuation when a record is created
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

-- Create trigger to automatically track evacuation activity
DROP TRIGGER IF EXISTS trigger_track_evacuation_activity ON evacuation_records;
CREATE TRIGGER trigger_track_evacuation_activity
  AFTER INSERT ON evacuation_records
  FOR EACH ROW
  EXECUTE FUNCTION track_evacuation_activity();
