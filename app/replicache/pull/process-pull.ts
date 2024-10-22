import { client } from '@/lib/edgedb'
import {
  create_client_group_mutation,
  update_client_group_mutation,
} from '@/lib/edgedb.mutations'
import { data_since_last_pull_query } from '@/lib/edgedb.queries'
import type { CustomPullRequest } from '@/lib/replicache.types'
import type { PatchOperation, PullResponseV1 } from 'replicache'
import { z } from 'zod'

export async function process_pull({
  clientGroupID: client_group_id,
}: z.infer<typeof CustomPullRequest>): Promise<PullResponseV1> {
  const clientWithGlobals = client.withGlobals({
    current_group_id: client_group_id,
  })

  const { patch, lastMutationIDChanges, transaction_start_time } =
    await clientWithGlobals.transaction(async (tx) => {
      // #1: Get the client group and the data that changed since the last pull
      const {
        client_group,
        entries_deleted_since_last_pull,
        entries_updated_since_last_pull,
        transaction_start_time,
      } = await data_since_last_pull_query.run(tx, { client_group_id })

      console.log('[process-pull] data since last pull:', {
        client_group,
        entries_deleted_since_last_pull,
        entries_updated_since_last_pull,
      })

      // #2 update the group's last pulled at
      // (if group isn't yet stored, create it)
      if (client_group.in_db) {
        await update_client_group_mutation.run(tx, {
          client_group_id: client_group.client_group_id,
        })
      } else {
        await create_client_group_mutation.run(tx, {
          client_group_id: client_group.client_group_id,
        })
      }

      // #3 Construct the patch operations
      const patch: PatchOperation[] = [
        ...entries_deleted_since_last_pull.map((entry) => ({
          op: 'del' as const,
          key: entry.replicache_id,
        })),
        ...entries_updated_since_last_pull.map((entry) => ({
          op: 'put' as const,
          key: entry.replicache_id,
          value: JSON.parse(JSON.stringify(entry)),
        })),
      ]

      /**
       * @TODO is lastMutationIDChanges correct? I'm returning every client's  lastMutationID, which doesn't match the docs.
       * From the docs (https://doc.replicache.dev/reference/server-pull#lastmutationidchanges):
       * "A map of clients whose lastMutationID have changed since the last pull."
       *
       * What are the consequences of sending all IDs? And what are the alternatives for my set-up?
       */
      const lastMutationIDChanges: Record<string, number> = Object.fromEntries(
        client_group.clients.map((client) => [
          client.client_id,
          client.last_mutation_id,
        ]),
      )

      return {
        patch,
        lastMutationIDChanges,
        transaction_start_time,
      }
    })

  console.log('[process-pull] patches:', patch)
  return {
    patch,
    lastMutationIDChanges,
    // @TODO: what to do about cookies? Currently sending the current timestamp as it's ever-increasing and simple
    cookie: transaction_start_time.getTime(),
  }
}
