import { z } from 'zod'
import { BaseReplicacheMutation } from './replicache.types'

const datelike = z.union([z.string(), z.date()])

export const CreateTodoArgs = z.object({
  created_at: datelike.pipe(z.coerce.date()),
  complete: z.boolean(),
  content: z.string(),
  replicache_id: z.string(),
})

export type CreateTodoArgs = z.input<typeof CreateTodoArgs>

const CreateTodoMutation = BaseReplicacheMutation.extend({
  name: z.literal('createTodo'),
  args: CreateTodoArgs,
})

export const UpdateTodoArgs = z.object({
  replicache_id: z.string(),
  complete: z.boolean().optional(),
  content: z.string().optional(),
})

export type UpdateTodoArgs = z.infer<typeof UpdateTodoArgs>

const UpdateTodoMutation = BaseReplicacheMutation.extend({
  name: z.literal('updateTodo'),
  args: UpdateTodoArgs,
})

const DeleteTodoMutation = BaseReplicacheMutation.extend({
  name: z.literal('deleteTodo'),
  args: z.object({
    replicache_id: z.string(),
  }),
})

export const Mutation = z.discriminatedUnion('name', [
  CreateTodoMutation,
  UpdateTodoMutation,
  DeleteTodoMutation,
])
