import { client as edgedb_client } from '@/lib/edgedb'
import {
  create_todo_mutation,
  delete_todo_mutation,
  update_todo_mutation,
} from '@/lib/edgedb.mutations'
import { fetch_client_group_query } from '@/lib/edgedb.queries'
import { type ClientPushInfo } from '@/lib/replicache.types'
import { z } from 'zod'
import type { Mutation } from './mutation.types'

/**
 * Mutators that are executed on the server to modify state in the database.
 * If an update mutation needs to do any conflict resolution, it should be handled in the handler.
 *
 * A simple conflict resolution strategy is that of property-based last-writer-wins: in the `updateTodo` example above,
 * arguments are optional and the `update_todo_mutation` will only update the fields provided in the mutation.
 *
 * These mutators produce **canonical** mutations, which get sent to front-end clients and replace any speculative mutations they may have.
 *
 * See Replicache docs for more information: https://doc.replicache.dev/byob/remote-mutations
 */
export const MUTATORS_DB: {
  [MutationName in z.infer<typeof Mutation>['name']]: (args: {
    mutation: Extract<z.infer<typeof Mutation>, { name: MutationName }>
    tx: Parameters<Parameters<typeof edgedb_client.transaction>[0]>[0]
    client: ClientPushInfo
    client_group: Awaited<ReturnType<typeof fetch_client_group_query.run>>
  }) => Promise<unknown> // result of the mutation is discarded
} = {
  createTodo: ({ tx, client_group, mutation }) =>
    create_todo_mutation.run(tx, {
      client_group_id: client_group.client_group_id,
      complete: mutation.args.complete,
      content: mutation.args.content,
      replicache_id: mutation.args.replicache_id,
      created_at: mutation.args.created_at,
    }),

  deleteTodo: ({ tx, mutation }) =>
    delete_todo_mutation.run(tx, {
      replicache_id: mutation.args.replicache_id,
    }),

  updateTodo: ({ tx, mutation }) =>
    update_todo_mutation.run(tx, {
      replicache_id: mutation.args.replicache_id,
      complete: mutation.args.complete,
      content: mutation.args.content,
    }),
}
