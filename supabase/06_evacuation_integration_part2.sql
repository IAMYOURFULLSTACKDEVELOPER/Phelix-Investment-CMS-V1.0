-- ============================================================================
-- PART 2: EVACUATION INTEGRATION
-- ============================================================================
-- Run AFTER the enum addition in Part 1 has committed.
--
-- Required existing objects:
--   public.app_role containing 'evacuation_officer'
--   public.profiles with id, role, full_name
--   public.auth_role()
--   public.is_super_admin()
--   public.log_user_action(...) compatible with the audit calls below
--
-- Existing table data is preserved.
-- Existing tables must already have the expected column structure.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CHECK PREREQUISITES
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF current_setting('server_version_num')::integer < 150000 THEN
        RAISE EXCEPTION
            'This script requires PostgreSQL 15+ for the security_invoker view.';
    END IF;

    IF to_regclass('public.profiles') IS NULL THEN
        RAISE EXCEPTION 'Required table public.profiles does not exist.';
    END IF;

    IF to_regprocedure('public.auth_role()') IS NULL THEN
        RAISE EXCEPTION 'Required function public.auth_role() does not exist.';
    END IF;

    IF to_regprocedure('public.is_super_admin()') IS NULL THEN
        RAISE EXCEPTION
            'Required function public.is_super_admin() does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc AS p
        JOIN pg_namespace AS n
            ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'log_user_action'
    ) THEN
        RAISE EXCEPTION
            'Required audit helper public.log_user_action does not exist.';
    END IF;

    -- This intentionally uses the enum value without adding it.
    -- If Part 1 was not committed, this check fails.
    PERFORM 'evacuation_officer'::public.app_role;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. EVACUATION RECORDS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.evacuation_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Container information
    container_number text NOT NULL,
    container_weight numeric(10,2) NOT NULL,
    usage_status_type text NOT NULL,

    -- Truck information
    truck_driver_name text NOT NULL,
    truck_license_plate text NOT NULL,

    -- Timing information
    delivered_at date NOT NULL,
    gate_out_time timestamptz,

    -- Shipping line
    shipping_line text CHECK (
        shipping_line IN (
            'Grimaldi',
            'CMA CGM',
            'MAERSK LINE',
            'MSC',
            'HAPAG LLYOD'
        )
    ),

    -- Document references
    export_receipt_number text,
    booking_number text,
    barcode_number text,

    -- Additional information
    remarks text,

    -- Signatories
    terminal_clerk_name text,
    clerk_name text,
    truck_driver_signature text,
    customs_signature text,

    condition_statement text DEFAULT
        'This equipment was received/Delivered in good condition except as noted above.',

    -- Processing information
    processed_by uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,

    processed_at timestamptz NOT NULL DEFAULT now(),

    -- Document generation
    document_generated boolean DEFAULT false,
    document_generated_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evacuation_container_number
    ON public.evacuation_records(container_number);

CREATE INDEX IF NOT EXISTS idx_evacuation_processed_by
    ON public.evacuation_records(processed_by);

CREATE INDEX IF NOT EXISTS idx_evacuation_delivered_at
    ON public.evacuation_records(delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_evacuation_shipping_line
    ON public.evacuation_records(shipping_line);

CREATE INDEX IF NOT EXISTS idx_evacuation_processed_at
    ON public.evacuation_records(processed_at DESC);

ALTER TABLE public.evacuation_records
    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. EVACUATION RECORD POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "evacuation_officer_insert"
    ON public.evacuation_records;

CREATE POLICY "evacuation_officer_insert"
    ON public.evacuation_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.auth_role() = 'super_admin'
        OR (
            public.auth_role() = 'evacuation_officer'
            AND processed_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "evacuation_officer_read_own"
    ON public.evacuation_records;

CREATE POLICY "evacuation_officer_read_own"
    ON public.evacuation_records
    FOR SELECT
    TO authenticated
    USING (
        public.auth_role() = 'super_admin'
        OR (
            public.auth_role() = 'evacuation_officer'
            AND processed_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "evacuation_super_admin_read"
    ON public.evacuation_records;

CREATE POLICY "evacuation_super_admin_read"
    ON public.evacuation_records
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "evacuation_super_admin_update"
    ON public.evacuation_records;

CREATE POLICY "evacuation_super_admin_update"
    ON public.evacuation_records
    FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin()
    )
    WITH CHECK (
        public.is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- 4. EVACUATION NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.evacuation_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    super_admin_id uuid NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,

    evacuation_record_id uuid NOT NULL
        REFERENCES public.evacuation_records(id) ON DELETE CASCADE,

    message text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evacuation_notifications_admin
    ON public.evacuation_notifications(super_admin_id);

CREATE INDEX IF NOT EXISTS idx_evacuation_notifications_record
    ON public.evacuation_notifications(evacuation_record_id);

CREATE INDEX IF NOT EXISTS idx_evacuation_notifications_is_read
    ON public.evacuation_notifications(is_read, created_at DESC);

ALTER TABLE public.evacuation_notifications
    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5. NOTIFICATION POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "notifications_read"
    ON public.evacuation_notifications;

CREATE POLICY "notifications_read"
    ON public.evacuation_notifications
    FOR SELECT
    TO authenticated
    USING (
        super_admin_id = auth.uid()
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "notifications_insert"
    ON public.evacuation_notifications;

-- Preserves the original direct-insert permission for super admins.
-- Trigger-generated notifications use the definer function below.
CREATE POLICY "notifications_insert"
    ON public.evacuation_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "notifications_update"
    ON public.evacuation_notifications;

CREATE POLICY "notifications_update"
    ON public.evacuation_notifications
    FOR UPDATE
    TO authenticated
    USING (
        super_admin_id = auth.uid()
        OR public.is_super_admin()
    )
    WITH CHECK (
        super_admin_id = auth.uid()
        OR public.is_super_admin()
    );

-- ----------------------------------------------------------------------------
-- 6. NOTIFICATION FUNCTION AND TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_super_admin_on_evacuation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_super_admin_id uuid;
    v_officer_name text;
BEGIN
    -- Preserve the original behavior: notify one super admin.
    -- Ordering makes the selection deterministic.
    SELECT p.id
    INTO v_super_admin_id
    FROM public.profiles AS p
    WHERE p.role = 'super_admin'
    ORDER BY p.id
    LIMIT 1;

    SELECT p.full_name
    INTO v_officer_name
    FROM public.profiles AS p
    WHERE p.id = NEW.processed_by;

    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.evacuation_notifications (
            super_admin_id,
            evacuation_record_id,
            message
        )
        VALUES (
            v_super_admin_id,
            NEW.id,
            format(
                'Evacuation Alert: %s evacuated Container %s (Plate: %s, Weight: %s kg, Shipping Line: %s)',
                coalesce(v_officer_name, 'Unknown officer'),
                NEW.container_number,
                NEW.truck_license_plate,
                NEW.container_weight,
                coalesce(NEW.shipping_line, 'N/A')
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_super_admin_on_evacuation_trigger
    ON public.evacuation_records;

CREATE TRIGGER notify_super_admin_on_evacuation_trigger
    AFTER INSERT ON public.evacuation_records
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_super_admin_on_evacuation();

-- ----------------------------------------------------------------------------
-- 7. AUDIT FUNCTION AND TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_evacuation_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_user_action(
            'created_evacuation_record',
            'evacuation_record',
            NEW.id,
            jsonb_build_object(
                'container_number', NEW.container_number,
                'truck_driver_name', NEW.truck_driver_name,
                'truck_license_plate', NEW.truck_license_plate,
                'shipping_line', NEW.shipping_line,
                'container_weight', NEW.container_weight,
                'delivered_at', NEW.delivered_at
            )
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_user_action(
            'updated_evacuation_record',
            'evacuation_record',
            NEW.id,
            jsonb_build_object(
                'container_number', NEW.container_number,
                'old_gate_out_time', OLD.gate_out_time,
                'new_gate_out_time', NEW.gate_out_time
            )
        );

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_user_action(
            'deleted_evacuation_record',
            'evacuation_record',
            OLD.id,
            jsonb_build_object(
                'container_number', OLD.container_number,
                'truck_driver_name', OLD.truck_driver_name
            )
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS evacuation_records_audit
    ON public.evacuation_records;

CREATE TRIGGER evacuation_records_audit
    AFTER INSERT OR UPDATE OR DELETE
    ON public.evacuation_records
    FOR EACH ROW
    EXECUTE FUNCTION public.log_evacuation_changes();

-- ----------------------------------------------------------------------------
-- 8. UPDATED-AT FUNCTION AND TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_evacuation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_evacuation_updated_at_trigger
    ON public.evacuation_records;

CREATE TRIGGER update_evacuation_updated_at_trigger
    BEFORE UPDATE ON public.evacuation_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_evacuation_updated_at();

-- ----------------------------------------------------------------------------
-- 9. CONTAINER-EXISTS HELPER
-- ----------------------------------------------------------------------------
-- Uses caller permissions and RLS.
-- The unique index independently enforces global uniqueness.

CREATE OR REPLACE FUNCTION public.container_exists(
    p_container_number text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.evacuation_records AS er
        WHERE er.container_number = p_container_number
    );
$$;

-- ----------------------------------------------------------------------------
-- 10. STORAGE BUCKET AND POLICIES
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'evacuation-docs',
    'evacuation-docs',
    false
)
ON CONFLICT (id) DO UPDATE
SET public = false;

DROP POLICY IF EXISTS "evacuation_docs_upload"
    ON storage.objects;

CREATE POLICY "evacuation_docs_upload"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'evacuation-docs'
        AND public.auth_role() IN (
            'evacuation_officer',
            'super_admin'
        )
    );

DROP POLICY IF EXISTS "evacuation_docs_read"
    ON storage.objects;

CREATE POLICY "evacuation_docs_read"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'evacuation-docs'
        AND public.auth_role() IN (
            'evacuation_officer',
            'super_admin'
        )
    );

-- ----------------------------------------------------------------------------
-- 11. SUPER-ADMIN STATISTICS VIEW
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.evacuation_statistics
WITH (security_invoker = true)
AS
SELECT
    er.processed_by,
    p.full_name AS officer_name,
    count(*) AS total_evacuations,
    count(DISTINCT er.shipping_line) AS unique_shipping_lines,
    sum(er.container_weight) AS total_weight,
    min(er.delivered_at) AS first_evacuation,
    max(er.delivered_at) AS last_evacuation
FROM public.evacuation_records AS er
JOIN public.profiles AS p
    ON er.processed_by = p.id
WHERE public.is_super_admin()
GROUP BY
    er.processed_by,
    p.full_name;

-- ----------------------------------------------------------------------------
-- 12. GET EVACUATIONS BY OFFICER
-- ----------------------------------------------------------------------------
-- Uses caller permissions and RLS, plus an explicit officer/admin check.

CREATE OR REPLACE FUNCTION public.get_evacuations_by_officer(
    p_officer_id uuid,
    p_limit int DEFAULT 100
)
RETURNS TABLE (
    id uuid,
    container_number text,
    container_weight numeric,
    truck_driver_name text,
    truck_license_plate text,
    delivered_at date,
    shipping_line text,
    booking_number text,
    processed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        er.id,
        er.container_number,
        er.container_weight,
        er.truck_driver_name,
        er.truck_license_plate,
        er.delivered_at,
        er.shipping_line,
        er.booking_number,
        er.processed_at
    FROM public.evacuation_records AS er
    WHERE er.processed_by = p_officer_id
      AND (
          public.is_super_admin()
          OR (
              public.auth_role() = 'evacuation_officer'
              AND p_officer_id = auth.uid()
          )
      )
    ORDER BY er.processed_at DESC
    LIMIT LEAST(
        GREATEST(COALESCE(p_limit, 100), 1),
        1000
    );
$$;

-- ----------------------------------------------------------------------------
-- 13. AUTHENTICATED ACCESS
-- ----------------------------------------------------------------------------
-- Table privileges allow operations to reach RLS.
-- Policies above still determine which rows users may access.

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE
    ON public.evacuation_records
    TO authenticated;

GRANT SELECT, INSERT, UPDATE
    ON public.evacuation_notifications
    TO authenticated;

GRANT SELECT
    ON public.evacuation_statistics
    TO authenticated;

-- Restrict direct helper execution to authenticated users.
REVOKE ALL
    ON FUNCTION public.container_exists(text)
    FROM PUBLIC, anon;

GRANT EXECUTE
    ON FUNCTION public.container_exists(text)
    TO authenticated;

REVOKE ALL
    ON FUNCTION public.get_evacuations_by_officer(uuid, integer)
    FROM PUBLIC, anon;

GRANT EXECUTE
    ON FUNCTION public.get_evacuations_by_officer(uuid, integer)
    TO authenticated;

COMMIT;

-- ============================================================================
-- END OF PART 2
-- ============================================================================