import type { Todo } from '@/dbschema/interfaces'
import { WriteTransaction, type ReadonlyJSONObject } from 'replicache'
import type { CreateTodoArgs, UpdateTodoArgs } from './mutation.types'

export type M = typeof MUTATORS_CLIENT

/**
 * Mutators that are executed on the client to modify state in the front-end cache.
 *
 * Mutations will be sent to the server via the push endpoint, and may be processed differently from the client.
 * The result of these client mutators are **_speculative_**, and will be discarded in favor of the server's **_canonical_** mutations.
 *
 * See Replicache docs for more information: https://doc.replicache.dev/byob/local-mutations
 */
export const MUTATORS_CLIENT = {
  updateTodo: async (tx: WriteTransaction, update: UpdateTodoArgs) => {
    const prev = (await tx.get(update.replicache_id)) as unknown as Todo
    const next = {
      ...prev,
      ...update,
      complete: update.complete ?? prev.complete,
      content: update.content ?? prev.content,
    } satisfies Todo
    await tx.set(next.replicache_id, next as unknown as ReadonlyJSONObject)
  },

  deleteTodo: async (
    tx: WriteTransaction,
    { replicache_id }: { replicache_id: string },
  ) => {
    await tx.del(replicache_id)
  },

  createTodo: async (tx: WriteTransaction, todo: CreateTodoArgs) => {
    await tx.set(todo.replicache_id, {
      ...todo,
      created_at: todo.created_at as string,
    })
  },
}
