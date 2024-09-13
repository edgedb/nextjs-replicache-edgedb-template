import { NextRequest } from 'next/server';
import { client } from '../../../lib/edgedb';
import { ReplicacheClient, Todo } from '@/dbschema/interfaces';
import { PullResponse } from 'replicache';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientGroupID } = body;

  try {
    return await client.transaction(async tx => {
      // Fetch all todos related to the client group
      const todos = await tx.query<Todo>(`
        SELECT Todo {
          todoID,
          content,
          complete
        }
        FILTER .clientGroupID = <str>$clientGroupID
      `, { clientGroupID });

      // Fetch the last mutation ID for each client in the group
      const clients = await tx.query<ReplicacheClient>(`
        SELECT ReplicacheClient { clientID, lastMutationID }
        FILTER .clientGroupID = <str>$clientGroupID
      `, { clientGroupID });

      // Construct the patch
      const patch = [{ op: 'clear' }].concat(todos.map(todo => ({
        op: 'put',
        key: todo.todoID,
        value: todo
      })));

      let lastMutationIDChanges: Record<string, number> = {};
      clients.forEach(client => {
        lastMutationIDChanges[client.clientID] = client.lastMutationID;
      });

      // Create the pull response
      const response = {
        cookie: Date.now(),  // Current server timestamp as an integer
        lastMutationIDChanges,
        patch
      } as PullResponse;

      return new Response(JSON.stringify(response), { status: 200 });
    });
  } catch (error) {
    console.error('Error during pull request:', error);
    return new Response(null, { status: 500, statusText: 'Failed to process pull request' });
  }
}
