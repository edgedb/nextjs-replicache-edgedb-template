module default {
  global currentGroupID: str;
  global currentGroup := (
    select ReplicacheClientGroup
    filter .clientGroupID = global currentGroupID
  );

  type ReplicacheClientGroup {
    required clientGroupID: str {
      constraint exclusive;
    };

    multi clients := .<clientGroup[is ReplicacheClient];
    multi todos := .<clientGroup[is Todo];

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update using (
      global currentGroupID ?= .clientGroupID
    );
  }

  type ReplicacheClient {
    required clientID: str {
      constraint exclusive;
    };
    required clientGroup: ReplicacheClientGroup;
    required lastMutationID: int16;

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update using (
      global currentGroup ?= .clientGroup
    );
  }

  type Todo {
    required todoID: str;
    required content: str;
    required complete: bool;
    required clientGroup: ReplicacheClientGroup;

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update, delete using (
      global currentGroup ?= .clientGroup
    );
  }
}
 