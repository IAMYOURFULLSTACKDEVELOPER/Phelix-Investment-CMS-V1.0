export type AppRole =
  | 'super_admin'
  | 'accountant'
  | 'operations_supervisor'
  | 'fuel_attendant'
  | 'evacuation_officer'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: AppRole
  depot: 'graftons' | 'hastings' | null
  is_active: boolean
}

export interface AuditLogEntry {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_role: AppRole
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  success: boolean
  error_message: string | null
  created_at: string
}

export interface AccountingEntry {
  id: string
  entry_date: string
  type: 'revenue' | 'expense'
  category: string
  amount: number
  description: string | null
  created_by: string
}

export interface PaymentMade {
  id: string
  paid_to: string
  amount: number
  purpose: string
  related_sector: 'evac' | 'operations' | 'fuel' | 'general' | null
  payment_date: string
  created_by: string
}

export type WorkerStatus = 'active' | 'suspended' | 'on_leave' | 'terminated'
export type IncidentSeverity = 'minor' | 'moderate' | 'severe'

export interface Worker {
  id: string
  full_name: string
  depot: 'graftons' | 'hastings'
  position: string | null
  status: WorkerStatus
  star_rating: number
  hired_at: string | null
}

export interface WorkerIncident {
  id: string
  worker_id: string
  description: string
  severity: IncidentSeverity
  incident_date: string
}

export interface WorkerPromotion {
  id: string
  worker_id: string
  from_position: string | null
  to_position: string
  reason: string | null
  decided_at: string
}

export interface FuelLog {
  id: string
  issued_by: string
  received_by: string
  depot: 'graftons' | 'hastings'
  quantity_liters: number
  dispensed_at: string
  dispenser_photo_path: string
  receipt_photo_path: string
}

export interface EvacuationRecord {
  id: string
  container_number: string
  container_weight: number
  usage_status_type: string
  truck_driver_name: string
  truck_license_plate: string
  delivered_at: string
  gate_out_time: string | null
  shipping_line: 'Grimaldi' | 'CMA CGM' | 'MAERSK LINE' | 'MSC' | 'HAPAG LLYOD' | null
  export_receipt_number: string | null
  booking_number: string | null
  barcode_number: string | null
  remarks: string | null
  terminal_clerk_name: string | null
  clerk_name: string | null
  truck_driver_signature: string | null
  customs_signature: string | null
  condition_statement: string
  processed_by: string
  processed_at: string
  document_generated: boolean
  document_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface EvacuationNotification {
  id: string
  super_admin_id: string
  evacuation_record_id: string
  message: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface EvacuationQuota {
  id: string
  shipping_line: 'Grimaldi' | 'CMA CGM' | 'MAERSK LINE' | 'MSC' | 'HAPAG LLYOD'
  total_evacuations: number
  current_evacuations: number
  created_at: string
  updated_at: string
}

export interface EvacuationTracking {
  id: string
  day_of_week: string
  officer_id: string
  officer_name: string
  shipping_line: string
  amount_done: number
  record_date: string
  created_at: string
}
