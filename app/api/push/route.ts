import { NextRequest } from 'next/server';
import { client } from '../../../lib/edgedb';
import { PushRequestV1 } from 'replicache';
import { ReplicacheClient, ReplicacheClientGroup } from "../../../dbschema/interfaces"

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientGroupID, mutations } = body as PushRequestV1;

  const clientWithGlobals = client.withGlobals({ currentGroupID: clientGroupID });

  try {
    await clientWithGlobals.transaction(async tx => {
      // Ensure the ReplicacheClientGroup exists or create/update it
      let clientGroup = await tx.querySingle<ReplicacheClientGroup>(`
        SELECT ReplicacheClientGroup { clientGroupID }
        FILTER .clientGroupID = <str>$clientGroupID
        LIMIT 1
      `, { clientGroupID });

      if (!clientGroup) {
        // Insert new client group if it doesn't exist
        await tx.query(`
          INSERT ReplicacheClientGroup { 
            clientGroupID := <str>$clientGroupID
          }
        `, { clientGroupID });
      }

      for (const mutation of mutations) {
        const args = mutation.args as { id: string, todoID: string, content: string, complete: boolean } || {};

        const replicacheClient = await tx.querySingle<ReplicacheClient>(`
          SELECT ReplicacheClient { id, clientID, lastMutationID }
          FILTER .clientID = <str>$clientID
          LIMIT 1
        `, { clientID: mutation.clientID });

        if (replicacheClient && replicacheClient.clientID !== mutation.clientID) {
          continue; // Skip mutation if client ID doesn't match
        }

        const lastMutationID = replicacheClient?.lastMutationID ?? -1;
        if (mutation.id <= lastMutationID) {
          continue; // Skip mutation if it has already been processed
        }

        // Execute business logic for each mutation
        switch (mutation.name) {
          case 'createTodo':
            await tx.query(`
              INSERT Todo { 
                content := <str>$title,
                complete := <bool>$complete,
                todoID := <str>$id,
                clientGroup := (SELECT ReplicacheClientGroup FILTER .clientGroupID = <str>$clientGroupID)
              }
            `, {
              title: args.content,
              complete: false,
              id: args.todoID,
              clientGroupID,
            });
            break;
          case 'updateTodo':
            await tx.query(`
              UPDATE Todo
              FILTER .todoID = <str>$todoID
              SET {
                content := <str>$content,
                complete := <bool>$complete
              }
            `, {
              todoID: args.todoID,
              content: args.content,
              complete: args.complete,
            });
            break;

          case 'deleteTodo':
            await tx.query(`
              DELETE Todo
              FILTER .todoID = <str>$todoID
            `, { todoID: mutation.args });
            break;
        }

        if (!replicacheClient) {
          // Insert new client if it doesn't exist
          await tx.query(`
            INSERT ReplicacheClient { 
              clientID := <str>$clientID,
              lastMutationID := <int64>$mutation,
              clientGroup := (SELECT ReplicacheClientGroup { clientGroupID } FILTER .clientGroupID = <str>$clientGroupID)
            }
          `, { clientID: mutation.clientID, mutation: mutation.id, clientGroupID });
        } else {
          // Update the lastMutationID for the Replicache client
          await tx.query(`
            UPDATE ReplicacheClient
            FILTER .clientID = <str>$clientID
            SET { lastMutationID := <int64>$mutation }
            `, {
            mutation: mutation.id,
            clientID: mutation.clientID
          });
        }
      }
    });

    return new Response(
      JSON.stringify({ lastMutationID: mutations[mutations.length - 1].id })
      , { status: 200 });
  } catch (error) {
    console.error('Transaction error:', error);
    return new Response(null, { status: 500, statusText: 'Failed to process mutations' });
  }
}
