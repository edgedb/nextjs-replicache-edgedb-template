import { NextRequest } from "next/server";
import { PatchOperation, PullResponseOKV1 } from "replicache";

import { client } from "@/lib/edgedb";
import { ReplicacheClient, Todo, helper } from "@/dbschema/interfaces";
import { getTodosAndClients } from "@/dbschema/queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientGroupID } = body;
  const groupClient = client.withGlobals({
    currentGroupID: clientGroupID,
  });

  try {
    const { todos, clients } = await getTodosAndClients(groupClient);

    // Construct the patch
    const patch: PatchOperation[] = [{ op: "clear" } as PatchOperation].concat(
      todos.map((todo) => ({
        op: "put",
        key: todo.todoID,
        value: todo,
      }))
    );

    let lastMutationIDChanges: Record<string, number> = {};
    clients.forEach((client) => {
      lastMutationIDChanges[client.clientID] = client.lastMutationID;
    });

    // Create the pull response
    const response = {
      cookie: Date.now(), // Current server timestamp as an integer
      lastMutationIDChanges,
      patch,
    } satisfies PullResponseOKV1;

    return new Response(JSON.stringify(response), { status: 200 });
  } catch (error) {
    console.error("Error during pull request:", error);
    return new Response(null, {
      status: 500,
      statusText: "Failed to process pull request",
    });
  }
}
