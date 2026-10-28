import type { ReactNode } from 'react'

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-8 pt-8 pb-4 border-b border-ink/10">
      <h1 className="font-display text-2xl">{title}</h1>
      {sub && <p className="text-sm text-ink/50 mt-1">{sub}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-ink/10 p-5 ${className}`}>{children}</div>
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <p className="text-xs text-ink/50">{label}</p>
      <p className="font-display text-2xl mt-1" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </Card>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink/60 block mb-1">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ink/40 bg-white'

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-ink/50 border-b border-ink/10">
          {head.map((h) => (
            <th key={h} className="pb-2 pr-4 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/5">{children}</tbody>
    </table>
  )
}
