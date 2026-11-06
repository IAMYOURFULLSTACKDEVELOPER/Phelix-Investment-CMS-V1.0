import { supabase } from './supabaseClient'

/**
 * Log user actions to the audit log
 * This function calls the database function log_user_action
 */
export async function logAction(
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: Record<string, any>,
  success: boolean = true,
  errorMessage?: string
) {
  try {
    const { error } = await supabase.rpc('log_user_action', {
      p_action: action,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_details: details || {},
      p_success: success,
      p_error_message: errorMessage || null
    })
    
    if (error) {
      console.error('Failed to log action:', error)
    }
  } catch (error) {
    console.error('Exception in logAction:', error)
  }
}

/**
 * Helper function to log login actions
 */
export async function logLogin() {
  await logAction('user_login', 'auth', null, {
    timestamp: new Date().toISOString(),
    user_agent: navigator.userAgent
  })
}

/**
 * Helper function to log logout actions
 */
export async function logLogout() {
  await logAction('user_logout', 'auth', null, {
    timestamp: new Date().toISOString()
  })
}

/**
 * Helper function to log account creation
 */
export async function logAccountCreation() {
  await logAction('account_created', 'auth', null, {
    timestamp: new Date().toISOString()
  })
}

/**
 * Helper function to log accounting operations
 */
export async function logAccountingAction(
  action: 'created' | 'updated' | 'deleted',
  entryId: string,
  details: Record<string, any>
) {
  await logAction(
    `${action}_accounting_entry`,
    'accounting_entry',
    entryId,
    details
  )
}

/**
 * Helper function to log worker operations
 */
export async function logWorkerAction(
  action: 'created' | 'updated' | 'deleted',
  workerId: string,
  details: Record<string, any>
) {
  await logAction(
    `${action}_worker`,
    'worker',
    workerId,
    details
  )
}

/**
 * Helper function to log fuel operations
 */
export async function logFuelAction(
  action: 'created' | 'updated' | 'deleted',
  fuelLogId: string,
  details: Record<string, any>
) {
  await logAction(
    `${action}_fuel_log`,
    'fuel_log',
    fuelLogId,
    details
  )
}

/**
 * Helper function to log failed operations
 */
export async function logError(
  action: string,
  entityType?: string,
  entityId?: string,
  errorMessage?: string
) {
  await logAction(
    `failed_${action}`,
    entityType,
    entityId,
    { error_occurred: true },
    false,
    errorMessage
  )
}