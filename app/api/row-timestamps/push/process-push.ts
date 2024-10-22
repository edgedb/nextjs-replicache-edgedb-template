import {
  create_client_group_mutation,
  create_todo_mutation,
  delete_todo_mutation,
  modify_clients_mutation,
  update_todo_mutation,
} from '@/lib/db.mutations'
import { fetch_client_group_query } from '@/lib/db.queries'
import { client as edgedb_client } from '@/lib/edgedb'
import { Mutation, type CustomPushRequest } from '@/lib/replicache.types'
import type { MutationV1, PushResponse } from 'replicache'
import { z } from 'zod'

type ClientInfo = {
  client_id: MutationV1['clientID']
  last_mutation_id_in_db: MutationV1['id']
  last_mutation_id_in_request: MutationV1['id']
}

// @TODO error handling
// @TODO handle potential conflicts (currently it's last-writer-wins)
export async function process_push({
  clientGroupID: client_group_id,
  mutations,
}: z.infer<typeof CustomPushRequest>): Promise<
  PushResponse | { success: true }
> {
  const clientWithGlobals = edgedb_client.withGlobals({
    current_group_id: client_group_id,
  })

  await clientWithGlobals.transaction(async (tx) => {
    /** #1 fetch the client group */
    const client_group = await fetch_client_group_query.run(tx, {
      client_group_id,
    })

    /** #2 create it in the DB if it doesn't yet exist */
    if (!client_group.in_db) {
      console.log('[process-push] creating client group', {
        client_group_id: client_group.client_group_id,
      })
      await create_client_group_mutation.run(tx, {
        client_group_id: client_group.client_group_id,
      })
    }

    /** #3 parse all clients and their last mutation ids, divided by whether they are new or already in the db */
    const clients_with_last_mutation_ids = parse_clients({
      mutations,
      client_group,
    })

    /** #4 optimistically update the clients' `last_mutation_id`s in the db to the latest corresponding mutation ids in the request
     * - Clients not yet in the DB will be created
     * - If the transaction fails, `last_mutation_id`s will be rolled back to their previous values
     */
    await modify_clients_mutation.run(tx, {
      client_group_id,
      ...clients_with_last_mutation_ids,
    })

    const all_clients = [
      ...clients_with_last_mutation_ids.new,
      ...clients_with_last_mutation_ids.in_db,
    ]

    /** #5 process & perform mutations */
    for (const rawMutation of mutations) {
      const client = all_clients.find(
        (c) => c.client_id === rawMutation.clientID,
      )
      if (!client) continue

      await perform_mutation({
        rawMutation,
        client,
        tx,
        client_group,
      })
    }
  })

  return {
    success: true,
  }
}

async function perform_mutation({
  client_group,
  client,
  rawMutation,
  tx,
}: {
  client_group: Awaited<ReturnType<typeof fetch_client_group_query.run>>
  client: ClientInfo
  rawMutation: z.infer<typeof CustomPushRequest>['mutations'][number]
  tx: Parameters<Parameters<typeof edgedb_client.transaction>[0]>[0]
}) {
  const parsedMutation = Mutation.safeParse(rawMutation)

  // Even if the mutation is invalid, we treat it as completed
  // to avoid the client from retrying it indefinitely.
  // See: https://doc.replicache.dev/reference/server-push#error-handling
  if (!parsedMutation.success) return

  const mutation = parsedMutation.data

  const last_mutation_id = client.last_mutation_id_in_db ?? -1

  // Skip mutation if it has already been processed
  if (mutation.id <= last_mutation_id) {
    console.log('[process-push] skipping mutation', {
      mutationId: mutation.id,
      last_mutation_id: last_mutation_id,
    })
    return
  }

  switch (mutation.name) {
    case 'createTodo':
      console.log('[process-push] createTodo', mutation)
      await create_todo_mutation.run(tx, {
        client_group_id: client_group.client_group_id,
        complete: mutation.args.complete,
        content: mutation.args.content,
        replicache_id: mutation.args.replicache_id,
      })
      break
    case 'deleteTodo':
      console.log('[process-push] deleteTodo', mutation)
      await delete_todo_mutation.run(tx, {
        replicache_id: mutation.args.replicache_id,
      })
      break
    case 'updateTodo':
      console.log('[process-push] updateTodo', mutation)
      await update_todo_mutation.run(tx, {
        complete: mutation.args.complete,
        replicache_id: mutation.args.replicache_id,
      })
      break
    default:
      break
  }
}

function parse_clients({
  mutations,
  client_group,
}: {
  mutations: z.infer<typeof CustomPushRequest>['mutations']
  client_group: Awaited<ReturnType<typeof fetch_client_group_query.run>>
}) {
  const clients_with_ids = {
    new: [] as ClientInfo[],
    in_db: [] as ClientInfo[],
  }

  for (const mutation of mutations) {
    const client_in_db = client_group.clients.find(
      (c) => c.client_id === mutation.clientID,
    )

    if (!client_in_db) {
      const existing = clients_with_ids.new.find(
        (c) => c.client_id === mutation.clientID,
      )
      if (!existing) {
        clients_with_ids.new.push({
          client_id: mutation.clientID,
          last_mutation_id_in_request: mutation.id,
          // For clients that don't yet exist in the DB, last_mutation_id starts at -1 to indicate that all of its mutations should be applied
          last_mutation_id_in_db: -1,
        })
      } else {
        existing.last_mutation_id_in_request = Math.max(
          existing.last_mutation_id_in_request,
          mutation.id,
        )
      }

      continue
    }

    const existing = clients_with_ids.in_db.find(
      (c) => c.client_id === mutation.clientID,
    )
    if (!existing) {
      clients_with_ids.in_db.push({
        client_id: mutation.clientID,
        last_mutation_id_in_request: mutation.id,
        last_mutation_id_in_db: client_in_db.last_mutation_id,
      })
    } else {
      existing.last_mutation_id_in_request = Math.max(
        existing.last_mutation_id_in_request,
        mutation.id,
      )
    }
  }

  return clients_with_ids
}
