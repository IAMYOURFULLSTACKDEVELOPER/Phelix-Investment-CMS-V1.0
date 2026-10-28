import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import type { AppRole } from './types'
import Login from './pages/Login'
import Shell from './components/layout/Shell'
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard'
import AuditLog from './pages/admin/AuditLog'
import EvacuationQuota from './pages/admin/EvacuationQuota'
import AccountingDashboard from './pages/accounting/AccountingDashboard'
import PaymentsMade from './pages/accounting/PaymentsMade'
import OperationsDashboard from './pages/operations/OperationsDashboard'
import IncidentLog from './pages/operations/IncidentLog'
import FuelDashboard from './pages/fuel/FuelDashboard'
import EvacuationPanel from './pages/evacuation/EvacuationPanel'
import EvacuationDashboard from './pages/evacuation/EvacuationDashboard'
import EvacuationsDone from './pages/evacuation/EvacuationsDone'

function RoleGate({ allow, children }: { allow: AppRole[]; children: JSX.Element }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="p-8 text-sm text-ink/60">Loading…</div>
  if (!profile) return <Navigate to="/login" replace />

  // Restrict super admin access to only Mr Alfred Phelix
  // TEMPORARILY DISABLED - Uncomment to re-enable email restriction
  // if (profile.role === 'super_admin' && profile.email && profile.email !== 'phelixinvestment@gmail.com') {
  //   console.log('Super admin access denied. Email:', profile.email)
  //   return <Navigate to="/" replace />
  // }

  if (!allow.includes(profile.role) && profile.role !== 'super_admin') {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const { profile, loading } = useAuth()

  if (loading) return <div className="p-8 text-sm text-ink/60">Loading…</div>

  return (
    <Routes>
      <Route path="/login" element={profile ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={profile ? <Shell /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Landing />} />
        <Route
          path="admin"
          element={
            <RoleGate allow={['super_admin']}>
              <SuperAdminDashboard />
            </RoleGate>
          }
        />
        <Route
          path="admin/audit-log"
          element={
            <RoleGate allow={['super_admin']}>
              <AuditLog />
            </RoleGate>
          }
        />
        <Route
          path="admin/evacuation-quota"
          element={
            <RoleGate allow={['super_admin']}>
              <EvacuationQuota />
            </RoleGate>
          }
        />
        <Route
          path="accounting"
          element={
            <RoleGate allow={['accountant']}>
              <AccountingDashboard />
            </RoleGate>
          }
        />
        <Route
          path="accounting/payments"
          element={
            <RoleGate allow={['accountant']}>
              <PaymentsMade />
            </RoleGate>
          }
        />
        <Route
          path="operations"
          element={
            <RoleGate allow={['operations_supervisor']}>
              <OperationsDashboard />
            </RoleGate>
          }
        />
        <Route
          path="operations/incidents"
          element={
            <RoleGate allow={['operations_supervisor']}>
              <IncidentLog />
            </RoleGate>
          }
        />
        <Route
          path="fuel"
          element={
            <RoleGate allow={['fuel_attendant']}>
              <FuelDashboard />
            </RoleGate>
          }
        />
        <Route
          path="evacuation"
          element={
            <RoleGate allow={['evacuation_officer']}>
              <EvacuationPanel />
            </RoleGate>
          }
        />
        <Route
          path="evacuation/done"
          element={
            <RoleGate allow={['evacuation_officer']}>
              <EvacuationsDone />
            </RoleGate>
          }
        />
        <Route
          path="evacuation/dashboard"
          element={
            <RoleGate allow={['super_admin']}>
              <EvacuationDashboard />
            </RoleGate>
          }
        />
      </Route>
    </Routes>
  )
}

function Landing() {
  const { profile } = useAuth()
  const dest: Record<AppRole, string> = {
    super_admin: '/admin',
    accountant: '/accounting',
    operations_supervisor: '/operations',
    fuel_attendant: '/fuel',
    evacuation_officer: '/evacuation'
  }
  return <Navigate to={dest[profile!.role]} replace />
}
