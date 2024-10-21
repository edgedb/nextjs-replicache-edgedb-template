import { WriteTransaction, type ReadonlyJSONObject } from 'replicache'
import { TodoUpdate } from './types'
import type { Todo } from '@/dbschema/interfaces'

export type M = typeof mutators

export const mutators = {
  updateTodo: async (tx: WriteTransaction, update: TodoUpdate) => {
    const prev = (await tx.get(update.replicache_id)) as unknown as Todo
    const next = {
      ...prev,
      ...update,
      complete: update.complete,
    } satisfies Todo
    await tx.set(next.replicache_id, next as unknown as ReadonlyJSONObject)
  },

  deleteTodo: async (tx: WriteTransaction, id: string) => {
    await tx.del(id)
  },

  createTodo: async (
    tx: WriteTransaction,
    todo: Pick<Todo, 'complete' | 'content' | 'replicache_id'>,
  ) => {
    await tx.set(todo.replicache_id, todo)
  },
}
