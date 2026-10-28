import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { AppRole } from '../../types'
import { LayoutDashboard, Calculator, Users, Fuel, Activity, FileText, ClipboardList, LogOut } from 'lucide-react'

const NAV: Record<AppRole, { to: string; label: string; icon: any }[]> = {
  super_admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/accounting', label: 'Accounting', icon: Calculator },
    { to: '/operations', label: 'Operations', icon: Users },
    { to: '/fuel', label: 'Fuel Monitoring', icon: Fuel },
    { to: '/evacuation/dashboard', label: 'Evacuations', icon: Activity },
    { to: '/admin/evacuation-quota', label: 'Evacuation Quota', icon: ClipboardList },
    { to: '/admin/audit-log', label: 'Audit Log', icon: FileText }
  ],
  accountant: [
    { to: '/accounting', label: 'Daily / Monthly / Yearly', icon: Calculator },
    { to: '/accounting/payments', label: 'Payments Made', icon: FileText }
  ],
  operations_supervisor: [
    { to: '/operations', label: 'Worker Directory', icon: Users },
    { to: '/operations/incidents', label: 'Incidents & Promotions', icon: ClipboardList }
  ],
  fuel_attendant: [{ to: '/fuel', label: 'Fuel Log', icon: Fuel }],
  evacuation_officer: [
    { to: '/evacuation', label: 'Evacuation Panel', icon: Activity },
    { to: '/evacuation/done', label: 'Evacuations Done', icon: ClipboardList }
  ]
}

export default function Shell() {
  const { profile, signOut } = useAuth()
  if (!profile) return null
  const links = NAV[profile.role]

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-ink text-surface flex flex-col shrink-0">
        <div className="p-5">
          <p className="font-display text-xl">Phelix CMS</p>
          <p className="text-xs text-surface/50 mt-0.5">{roleLabel(profile.role)}</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm ${
                  isActive ? 'bg-surface/10 text-surface' : 'text-surface/60 hover:text-surface'
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-surface/10">
          <p className="px-3 text-sm text-surface/80 mb-2">{profile.full_name}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-surface/50 hover:text-surface rounded hover:bg-surface/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-surface overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

function roleLabel(role: AppRole) {
  return {
    super_admin: 'Super Admin',
    accountant: 'Accountant',
    operations_supervisor: 'Operations Supervisor',
    fuel_attendant: 'Fuel Attendant',
    evacuation_officer: 'Evacuation Officer'
  }[role]
}
