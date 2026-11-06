import { useEffect } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from './supabaseClient'

/** Refetches the given queries whenever any of the tables change (Supabase Realtime; RLS applies). */
export function useLiveTables(tables: string[], queryKeys: QueryKey[]) {
  const qc = useQueryClient()
  const tablesKey = tables.join(',')
  const queryKeysKey = JSON.stringify(queryKeys)

  useEffect(() => {
    const channel = supabase.channel(`live_${tablesKey}_${Math.random().toString(36).slice(2)}`)
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        for (const queryKey of queryKeys) qc.invalidateQueries({ queryKey })
      })
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, queryKeysKey, qc])
}
