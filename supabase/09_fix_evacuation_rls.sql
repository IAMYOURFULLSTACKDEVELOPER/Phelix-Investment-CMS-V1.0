-- Fix: Update RLS policies for evacuation_records to use direct role check
-- This ensures super admin can read all evacuation records

-- Drop existing policies
DROP POLICY IF EXISTS "evacuation_officer_read_own" ON public.evacuation_records;
DROP POLICY IF EXISTS "evacuation_super_admin_read" ON public.evacuation_records;
DROP POLICY IF EXISTS "evacuation_super_admin_update" ON public.evacuation_records;

-- Create new policies with direct role check (more reliable)
CREATE POLICY "evacuation_records_read"
  ON public.evacuation_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'evacuation_officer'
      )
      AND processed_by = auth.uid()
    )
  );

CREATE POLICY "evacuation_records_update"
  ON public.evacuation_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'evacuation_officer'
      )
      AND processed_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'evacuation_officer'
      )
      AND processed_by = auth.uid()
    )
  );

-- Also fix notifications to use direct role check
DROP POLICY IF EXISTS "notifications_read" ON public.evacuation_notifications;

CREATE POLICY "notifications_read"
  ON public.evacuation_notifications
  FOR SELECT
  TO authenticated
  USING (
    super_admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
