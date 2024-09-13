module default {
  type ReplicacheClientGroup {
    required clientGroupID: str;
  }

  type ReplicacheClient {
    required clientID: str;
    required clientGroupID: str;
    required lastMutationID: int16;
    lastModified: datetime;
  }

  type Todo {
    required todoID: str;
    required content: str;
    required complete: bool;
    required clientGroupID: str;
  }
}
 