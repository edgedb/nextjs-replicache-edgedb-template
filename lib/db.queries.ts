import e from '@/dbschema/edgeql'
import type { $str } from '@/dbschema/edgeql/modules/std'
import type { $expr_Param } from '@/dbschema/edgeql/params'
import type { scalarTypeWithConstructor } from '@/dbschema/edgeql/reflection'

function select_client_group(
  client_group_id: $expr_Param<
    'client_group_id',
    scalarTypeWithConstructor<$str, never>,
    false
  >,
) {
  const stored_client_group = e.select(e.ReplicacheClientGroup, (rg) => ({
    filter_single: e.op(rg.client_group_id, '=', client_group_id),

    client_group_id: true,
    last_pulled_at: true,
    in_db: e.bool(true),
  }))

  // In case the client group doesn't exist, create a default with current timestamp and no clients
  const client_group = e.select({
    client_group_id: e.op(
      stored_client_group.client_group_id,
      '??',
      client_group_id,
    ),
    last_pulled_at: e.op(
      stored_client_group.last_pulled_at,
      '??',
      e.datetime_of_transaction(),
    ),
    clients: e.select(e.ReplicacheClient, (c) => ({
      filter: e.op(c.client_group, '=', stored_client_group),

      client_id: true,
      last_mutation_id: true,
    })),
    in_db: e.op(stored_client_group.in_db, '??', e.bool(false)),
  })

  return client_group
}

export const fetch_client_group_query = e.params(
  {
    client_group_id: e.str,
  },
  (params) => {
    return select_client_group(params.client_group_id)
  },
)

export const data_since_last_pull_query = e.params(
  {
    client_group_id: e.str,
  },
  (params) => {
    const client_group = select_client_group(params.client_group_id)

    const entries_deleted_since_last_pull = e.select(e.DeletedEntity, (de) => ({
      filter: e.op(de.deleted_at, '>', client_group.last_pulled_at),

      replicache_id: true,
    }))

    const entries_updated_since_last_pull = e.select(
      e.ReplicacheEntity,
      (t) => ({
        filter: e.op(t.updated_at, '>', client_group.last_pulled_at),

        replicache_id: true,
        created_at: true,
        updated_at: true,

        // For now, simply returning all properties of Todos
        ...e.is(e.Todo, {
          complete: true,
          content: true,
        }),
      }),
    )

    return e.select({
      client_group,
      entries_deleted_since_last_pull,
      entries_updated_since_last_pull,
      transaction_start_time: e.datetime_of_transaction(),
    })
  },
)
