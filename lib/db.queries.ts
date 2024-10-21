import e from '@/dbschema/edgeql'

export const fetch_client_group_query = e.params(
  {
    client_group_id: e.str,
  },
  (params) => {
    const stored_client_group = e.select(e.ReplicacheClientGroup, (rg) => ({
      filter_single: e.op(rg.client_group_id, '=', params.client_group_id),

      client_group_id: true,
      last_pulled_at: true,
      clients: {
        client_id: true,
        last_mutation_id: true,
      },
      is_stored: e.bool(true),
    }))

    // In case the client group doesn't exist, create a default with current timestamp and no clients
    const default_client_group = e.select({
      client_group_id: params.client_group_id,
      last_pulled_at: e.datetime_of_transaction(),
      clients: [],
      is_stored: e.bool(false),
    })
    const client_group = e.op(stored_client_group, '??', default_client_group)

    return client_group
  },
)

export const data_since_last_pull_query = e.params(
  {
    client_group_id: e.str,
  },
  (params) => {
    const stored_client_group = e.select(e.ReplicacheClientGroup, (rg) => ({
      filter_single: e.op(rg.client_group_id, '=', params.client_group_id),

      client_group_id: true,
      last_pulled_at: true,
      clients: {
        client_id: true,
        last_mutation_id: true,
      },
      is_stored: e.bool(true),
    }))
    // In case the client group doesn't exist, create a default with current timestamp and no clients
    const default_client_group = e.select({
      client_group_id: params.client_group_id,
      last_pulled_at: e.datetime_of_transaction(),
      clients: [],
      is_stored: e.bool(false),
    })
    const client_group = e.op(stored_client_group, '??', default_client_group)

    const entries_deleted_since_last_pull = e.select(e.DeletedEntity, (de) => ({
      filter: e.op(de.deleted_at, '>', client_group.last_pulled_at),

      replicache_id: true,
    }))

    const entries_updated_since_last_pull = e.select(
      e.ReplicacheEntity,
      (t) => ({
        filter: e.op(t.updated_at, '>', client_group.last_pulled_at),

        replicache_id: true,

        // For now, simply returning all properties of Todos
        ...e.is(e.Todo, { ['*']: true }),
      }),
    )

    return e.select({
      client_group,
      entries_deleted_since_last_pull,
      entries_updated_since_last_pull,
    })
  },
)
