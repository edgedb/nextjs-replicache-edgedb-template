import type { MutationV1 } from 'replicache'
import { z } from 'zod'

export type ClientPushInfo = {
  client_id: MutationV1['clientID']
  last_mutation_id_in_db: MutationV1['id']
  last_mutation_id_in_request: MutationV1['id']
}

export const CustomPullRequest = z.object({
  cookie: z.union([z.number(), z.null()]),
  profileID: z.string(),
  clientGroupID: z.string(),
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
})

export type ReplicacheClientGroup = {
  client_group_id: string
}

export const BaseReplicacheMutation = z.object({
  clientID: z.string(),
  timestamp: z.number(),
  id: z.number(),
})

export const CustomPushRequest = z.object({
  profileID: z.string(),
  clientGroupID: z.string(),
  pushVersion: z.literal(1),
  schemaVersion: z.string(),
  /**
   * un-filtered mutations - they get validated on a per-mutation basis via the `Mutation` type below
   */
  mutations: z.array(BaseReplicacheMutation.passthrough()),
})

/**
 * Processes the `X-Replicache-RequestID` header to extract the clientID, sessionID, and request count.
 *
 * `<clientid>-<sessionid>-<request count>`
 * @docs https://doc.replicache.dev/reference/server-pull#x-replicache-requestid
 */
export function processRequestId(request: Request) {
  const requestID = request.headers.get('X-Replicache-RequestID')
  const [clientID, sessionID, requestCount] = requestID?.split('-') ?? []

  return { clientID, sessionID, requestCount }
}
