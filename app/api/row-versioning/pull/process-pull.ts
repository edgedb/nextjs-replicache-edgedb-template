import { z } from 'zod'
import {
  cvrEntriesFromSearch,
  diffCVR,
  isCVRDiffEmpty,
  type CVR,
  type CVREntries,
  type CVRKey,
  type SearchResult,
} from './cvr'
import type { NextRequest } from 'next/server'
import { client } from '@/lib/edgedb'
import type {
  PatchOperation,
  PullResponse,
  PullResponseOKV1,
  PullResponseV1,
} from 'replicache'
import type { Todo } from '@/dbschema/interfaces'
import { nanoid } from 'nanoid'

const cookie = z.object({
  order: z.number(),
  cvr_id: z.string(),
})

type Cookie = z.infer<typeof cookie>

export const PullRequest = z.object({
  cookie: z.union([cookie, z.null()]),
  profileID: z.string(),
  clientGroupID: z.string(),
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
})

const cvrCache = new Map<CVRKey, CVR>()

type ReplicacheClientGroup = {
  client_group_id: string
  cvr_version: number
}

// Implements the algorithm from:
// https://doc.replicache.dev/strategies/row-version#pull
export async function processPull({
  user_id,
  client_group_id,
  cookie,
}: {
  user_id: string
  client_group_id: string
  cookie: Cookie | null
}): Promise<PullResponseV1> {
  const clientWithGlobals = client.withGlobals({
    currentGroupID: client_group_id,
  })

  // 1: Fetch prevCVR
  const prevCVR = cookie ? cvrCache.get(cookie.cvr_id) : undefined
  // 2: Init baseCVR
  const baseCVR: CVR = prevCVR ?? {}
  console.log({ prevCVR, baseCVR })

  const txResult = await clientWithGlobals.transaction(async (tx) => {
    const defaultClientGroup: ReplicacheClientGroup = {
      client_group_id: client_group_id,
      cvr_version: 0,
    }
    // 4-5: getClientGroup(body.clientGroupID), verify user
    const baseClientGroupRecord =
      (await tx.querySingle<ReplicacheClientGroup>(
        `
      SELECT ReplicacheClientGroup { client_group_id, cvr_version }
      FILTER .client_group_id = <str>$client_group_id
      LIMIT 1
    `,
        { client_group_id },
      )) ?? defaultClientGroup

    const [todosMeta, clientMeta] = await Promise.all([
      // 6: Read meta for entire domain data - EdgeDB's access policies filter the results automatically
      tx.query<SearchResult>(
        `
        SELECT Todo { replicache_id, version }
      `,
      ),
      // 7: Read all clients in ClientGroup
      tx.query<SearchResult>(
        `
        SELECT ReplicacheClient { replicache_id := .clientID, version := .lastMutationID }
        FILTER .client_group_id = <str>$client_group_id
      `,
        { client_group_id },
      ),
    ])
    console.log({ baseClientGroupRecord, clientMeta, todosMeta })

    // 8: Build nextCVR
    const nextCVR: CVR = {
      todo: cvrEntriesFromSearch(todosMeta),
      client: cvrEntriesFromSearch(clientMeta),
    }
    console.log({ nextCVR })

    // 9: calculate diffs
    const diff = diffCVR(baseCVR, nextCVR)
    console.log({ diff })

    // 10: If diff is empty, return no-op PR
    if (prevCVR && isCVRDiffEmpty(diff)) {
      return null
    }

    // 11: get full entities that changed
    const [todos] = await Promise.all([
      tx.query<Todo>(
        `
        SELECT Todo
      `,
      ),
    ])
    console.log({ todos })

    // 12: changed clients - no need to re-read clients from database,
    // we already have their versions.
    const clients: CVREntries = {}
    for (const clientID of diff.client.puts) {
      clients[clientID] = nextCVR.client[clientID]
    }
    console.log({ clients })

    // 13: newCVRVersion
    const baseCVRVersion = cookie?.order ?? 0
    const nextCVRVersion =
      Math.max(baseCVRVersion, baseClientGroupRecord.cvr_version) + 1

    // 14: Write ClientGroupRecord
    const nextClientGroupRecord = {
      ...baseClientGroupRecord,
      cvrVersion: nextCVRVersion,
    }
    console.log({ nextClientGroupRecord })

    // @TODO: understand and write putClientGroup
    // await putClientGroup(executor, nextClientGroupRecord)

    return {
      entities: {
        todo: { dels: diff.todo.dels, puts: todos },
      },
      clients,
      nextCVR,
      nextCVRVersion,
    }
  })

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie,
      lastMutationIDChanges: {},
      patch: [],
    }
  }

  // @TODO: finish understanding and implementing this portion
  const { entities, clients, nextCVR, nextCVRVersion } = txResult

  // 16-17: store cvr
  const cvr_id = nanoid()
  cvrCache.set(cvr_id, nextCVR)

  // 18(i): build patch
  const patch: PatchOperation[] = []
  if (prevCVR === undefined) {
    patch.push({ op: 'clear' })
  }

  for (const [name, { puts, dels }] of Object.entries(entities)) {
    for (const id of dels) {
      patch.push({ op: 'del', key: `${name}/${id}` })
    }
    for (const entity of puts) {
      patch.push({
        op: 'put',
        key: `${name}/${entity.id}`,
        value: entity,
      })
    }
  }

  // 18(ii): construct cookie
  const nextCookie: Cookie = {
    order: nextCVRVersion,
    cvr_id: cvr_id,
  }

  // 17(iii): lastMutationIDChanges
  const lastMutationIDChanges = clients

  return {
    cookie: nextCookie,
    lastMutationIDChanges,
    patch,
  }
}
