import {
  create_client_group_mutation,
  update_client_group_mutation,
} from '@/lib/db.mutations'
import { data_since_last_pull_query } from '@/lib/db.queries'
import { client } from '@/lib/edgedb'
import type { CustomPullRequest } from '@/lib/replicache.types'
import type { PatchOperation, PullResponseV1 } from 'replicache'
import { z } from 'zod'

// @TODO error handling
export async function process_pull({
  clientGroupID: client_group_id,
}: z.infer<typeof CustomPullRequest>): Promise<PullResponseV1> {
  const clientWithGlobals = client.withGlobals({
    current_group_id: client_group_id,
  })

  const { patch, lastMutationIDChanges } = await clientWithGlobals.transaction(
    async (tx) => {
      // #1: Get the client group and the data that changed since the last pull
      const {
        client_group,
        entries_deleted_since_last_pull,
        entries_updated_since_last_pull,
      } = await data_since_last_pull_query.run(tx, { client_group_id })

      // #2 update the group's last pulled at
      // (if group isn't yet stored, create it)
      if (client_group.is_stored) {
        await update_client_group_mutation.run(tx, {
          client_group_id: client_group.client_group_id,
          last_pulled_at: client_group.last_pulled_at,
        })
      } else {
        await create_client_group_mutation.run(tx, {
          client_group_id: client_group.client_group_id,
          last_pulled_at: client_group.last_pulled_at,
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
          value: entry,
        })),
      ]

      /**
       * @TODO is lastMutationIDChanges correct? I'm returning every client's  lastMutationID, which doesn't match the docs.
       * From the docs (https://doc.replicache.dev/reference/server-pull#lastmutationidchanges):
       * "A map of clients whose lastMutationID have changed since the last pull."
       *
       * What's the consequence of this? And what are the alternatives?
       */
      const lastMutationIDChanges: Record<string, number> = Object.fromEntries(
        client_group.clients.map((client) => [
          client.client_id,
          client.last_mutation_id,
        ]),
      )

      return { patch, lastMutationIDChanges }
    },
  )

  return {
    patch,
    lastMutationIDChanges,
    // @TODO: what to do about the cookie?
    cookie: null,
  }
}
