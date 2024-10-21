import { z } from 'zod'

const cookie = z.object({
  order: z.number(),
  cvr_id: z.string(),
})

export const CustomPullRequest = z.object({
  cookie: z.union([cookie, z.null()]),
  profileID: z.string(),
  clientGroupID: z.string(),
  pullVersion: z.literal(1),
  schemaVersion: z.string(),
})

export type ReplicacheClientGroup = {
  client_group_id: string
}

const BaseReplicacheMutation = z.object({
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

const CreateTodoMutation = BaseReplicacheMutation.extend({
  name: z.literal('createTodo'),
  args: z.object({
    complete: z.boolean(),
    content: z.string(),
    replicache_id: z.string(),
  }),
})

const UpdateTodoMutation = BaseReplicacheMutation.extend({
  name: z.literal('updateTodo'),
  args: z.object({
    complete: z.boolean(),
    replicache_id: z.string(),
  }),
})

const DeleteTodoMutation = BaseReplicacheMutation.extend({
  name: z.literal('deleteTodo'),
  args: z.object({
    replicache_id: z.string(),
  }),
})

export const Mutation = z.union([
  CreateTodoMutation,
  UpdateTodoMutation,
  DeleteTodoMutation,
])

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
