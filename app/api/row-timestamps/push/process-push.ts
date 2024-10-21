import {
  create_todo_mutation,
  delete_todo_mutation,
  modify_clients_mutation,
  update_todo_mutation,
} from '@/lib/db.mutations'
import { fetch_client_group_query } from '@/lib/db.queries'
import { client } from '@/lib/edgedb'
import { Mutation, type CustomPushRequest } from '@/lib/replicache.types'
import type { MutationV1, PushResponse } from 'replicache'
import { z } from 'zod'

// @TODO error handling
// @TODO handle potential conflicts (currently it's last-writer-wins)
export async function process_push({
  clientGroupID: client_group_id,
  mutations,
}: z.infer<typeof CustomPushRequest>): Promise<
  PushResponse | { success: true }
> {
  const clientWithGlobals = client.withGlobals({
    current_group_id: client_group_id,
  })

  await clientWithGlobals.transaction(async (tx) => {
    const client_group = await fetch_client_group_query.run(tx, {
      client_group_id,
    })

    const clients_with_last_mutation_ids = mutations.reduce(
      (acc, mutation) => {
        if (
          !client_group.clients.find((c) => c.client_id === mutation.clientID)
        ) {
          const in_acc = acc.new.find((c) => c.client_id === mutation.clientID)
          if (!in_acc || in_acc.last_mutation_id < mutation.id) {
            acc.new.push({
              client_id: mutation.clientID,
              last_mutation_id: mutation.id,
            })
          }
        } else {
          const in_acc = acc.in_server.find(
            (c) => c.client_id === mutation.clientID,
          )
          if (!in_acc || in_acc.last_mutation_id < mutation.id) {
            acc.in_server.push({
              client_id: mutation.clientID,
              last_mutation_id: mutation.id,
            })
          }
        }

        return acc
      },
      {} as {
        new: {
          client_id: MutationV1['clientID']
          last_mutation_id: MutationV1['id']
        }[]
        in_server: {
          client_id: MutationV1['clientID']
          last_mutation_id: MutationV1['id']
        }[]
      },
    )

    if (Object.keys(clients_with_last_mutation_ids).length > 0) {
      await modify_clients_mutation.run(tx, {
        client_group_id,
        ...clients_with_last_mutation_ids,
      })
    }

    const all_clients = [
      ...clients_with_last_mutation_ids.new,
      ...clients_with_last_mutation_ids.in_server,
    ]

    for (const rawMutation of mutations) {
      const client = all_clients.find(
        (c) => c.client_id === rawMutation.clientID,
      )
      if (!client) continue

      const parsedMutation = Mutation.safeParse(rawMutation)

      // Even if the mutation is invalid, we treat it as completed
      // to avoid the client from retrying it indefinitely.
      // See: https://doc.replicache.dev/reference/server-push#error-handling
      if (!parsedMutation.success) continue

      const mutation = parsedMutation.data
      switch (mutation.name) {
        case 'createTodo':
          await create_todo_mutation.run(tx, {
            client_group_id: client_group.client_group_id,
            complete: mutation.args.complete,
            content: mutation.args.content,
            replicache_id: mutation.clientID,
          })
        case 'deleteTodo':
          await delete_todo_mutation.run(tx, {
            replicache_id: mutation.clientID,
          })
        case 'updateTodo':
          await update_todo_mutation.run(tx, {
            complete: mutation.args.complete,
            replicache_id: mutation.clientID,
          })
        default:
          break
      }
    }
  })

  return {
    success: true,
  }
}
