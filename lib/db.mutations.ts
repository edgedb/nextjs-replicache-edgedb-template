import e from '@/dbschema/edgeql'

export const modify_clients_mutation = e.params(
  {
    client_group_id: e.str,
    new: e.array(
      e.tuple({
        client_id: e.str,
        last_mutation_id_in_request: e.int64,
        last_mutation_id_in_db: e.int64,
      }),
    ),
    in_db: e.array(
      e.tuple({
        client_id: e.str,
        last_mutation_id_in_request: e.int64,
        last_mutation_id_in_db: e.int64,
      }),
    ),
  },
  (params) => {
    const client_group = e.select(e.ReplicacheClientGroup, (rg) => ({
      filter_single: e.op(rg.client_group_id, '=', params.client_group_id),
    }))

    return e.select({
      new: e.for(e.array_unpack(params.new), (client) =>
        e.insert(e.ReplicacheClient, {
          client_group,
          client_id: client.client_id,
          last_mutation_id: client.last_mutation_id_in_request,
        }),
      ),
      in_server: e.assert_distinct(
        e.for(e.array_unpack(params.in_db), (client) =>
          e.update(e.ReplicacheClient, (c) => ({
            filter_single: e.op(c.client_id, '=', client.client_id),
            set: {
              last_mutation_id: client.last_mutation_id_in_request,
            },
          })),
        ),
      ),
    })
  },
)

export const create_todo_mutation = e.params(
  {
    complete: e.bool,
    content: e.str,
    replicache_id: e.str,
    client_group_id: e.str,
  },
  (params) => {
    return e.insert(e.Todo, {
      complete: params.complete,
      content: params.content,
      replicache_id: params.replicache_id,
      client_group: e.select(e.ReplicacheClientGroup, (rg) => ({
        filter_single: e.op(rg.client_group_id, '=', params.client_group_id),
      })),
    })
  },
)

export const delete_todo_mutation = e.params(
  {
    replicache_id: e.str,
  },
  (params) => {
    return e.delete(e.Todo, (t) => ({
      filter_single: e.op(t.replicache_id, '=', params.replicache_id),
    }))
  },
)

export const update_todo_mutation = e.params(
  {
    complete: e.bool,
    replicache_id: e.str,
  },
  (params) => {
    return e.update(e.Todo, (t) => ({
      filter_single: e.op(t.replicache_id, '=', params.replicache_id),
      set: {
        complete: params.complete,
      },
    }))
  },
)

export const create_client_group_mutation = e.params(
  {
    client_group_id: e.str,
  },
  (params) =>
    e.insert(e.ReplicacheClientGroup, {
      client_group_id: params.client_group_id,
      last_pulled_at: e.datetime_of_transaction(),
    }),
)

export const update_client_group_mutation = e.params(
  {
    client_group_id: e.str,
  },
  (params) =>
    e.update(e.ReplicacheClientGroup, (group) => ({
      filter_single: e.op(group.client_group_id, '=', params.client_group_id),

      set: {
        last_pulled_at: e.datetime_of_transaction(),
      },
    })),
)
