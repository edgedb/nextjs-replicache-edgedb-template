module default {
  global current_group_id: str;
  global current_group := (
    select ReplicacheClientGroup
    filter .client_group_id = global current_group_id
  );
  
  type ReplicacheClientGroup {
    required client_group_id: str {
      constraint exclusive;
    };

    required cvr_version: int64 {
      default := 0;
    };
    
    # { [client_id (str)]: mutation_id (int64) }
    last_mutation_ids: json;
    entity_versions: json;

    multi clients := .<client_group[is ReplicacheClient];
    multi todos := .<client_group[is Todo];

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update using (
      global current_group_id ?= .client_group_id
    );
  }

  type ReplicacheClient {
    required client_id: str {
      constraint exclusive;
    };
    required client_group: ReplicacheClientGroup;
    required last_mutation_id: int32;

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update using (
      global current_group ?= .client_group
    );
  }

  abstract type WithTimestamps {
    created_at: datetime {
      default := datetime_of_transaction();
      readonly := true;
    };
    updated_at: datetime {
      rewrite insert, update using (datetime_of_statement());
    };
  }

  abstract type ReplicacheEntity {
    required replicache_id: str {
      annotation description := 'The ID of the entity in the Replicache system, generated in the front-end with nanoid.';
    };
    version: int32 {
      default := 0;
      rewrite update using ( .version + 1);
    };
  }

  type Todo extending WithTimestamps, ReplicacheEntity {
    required content: str;
    required complete: bool;
    required client_group: ReplicacheClientGroup;

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update, delete using (
      global current_group ?= .client_group
    );
  }
}
 