import { WriteTransaction } from "replicache";
import { Todo, Update } from "./types";

export type M = typeof mutators;

export const mutators = {
  updateTodo: async (tx: WriteTransaction, update: Update) => {
    const prev = await tx.get<Todo>(update.todoID);
    const next = { ...prev, ...update, complete: update.complete };
    await tx.set(next.todoID, next);
  },

  deleteTodo: async (tx: WriteTransaction, id: string) => {
    await tx.del(id);
  },

  createTodo: async (tx: WriteTransaction, todo: Todo) => {
    await tx.set(todo.todoID, todo);
  },
};
