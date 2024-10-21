export type RowVersion = number
export type ReplicacheId = string

export type SearchResult = {
  replicache_id: ReplicacheId
  version?: number | null
}

export type CVRKey = string
export type CVREntries = Record<ReplicacheId, RowVersion>

/** Client-view record
 * @docs https://doc.replicache.dev/strategies/row-version#client-view-records */
export type CVR = Record<CVRKey, CVREntries>

export function cvrEntriesFromSearch(result: SearchResult[]) {
  const r: CVREntries = {}
  for (const row of result) {
    r[row.replicache_id] = row.version ?? 0
  }
  return r
}

export type CVRDiff = Record<string, CVREntryDiff>
export type CVREntryDiff = {
  puts: string[]
  dels: string[]
}

export function diffCVR(prev: CVR, next: CVR) {
  const r: CVRDiff = {}
  const names = [...new Set([...Object.keys(prev), ...Object.keys(next)])]
  for (const name of names) {
    const prevEntries = prev[name] ?? {}
    const nextEntries = next[name] ?? {}
    r[name] = {
      // To *put* into the client: those with stale row version
      puts: Object.keys(nextEntries).filter(
        (id) =>
          prevEntries[id] === undefined || prevEntries[id] < nextEntries[id],
      ),

      // To *delete* from the client: those that are not in the next CVR (deleted or access policies changed)
      dels: Object.keys(prevEntries).filter(
        (id) => nextEntries[id] === undefined,
      ),
    }
  }
  return r
}

export function isCVRDiffEmpty(diff: CVRDiff) {
  return Object.values(diff).every(
    (e) => e.puts.length === 0 && e.dels.length === 0,
  )
}
