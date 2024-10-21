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
    required last_pulled_at: datetime {
      default := datetime_of_transaction();
    };

    multi clients := .<client_group[is ReplicacheClient];
    # last_mutation_ids - map of client_id to mutation_id, based on clients
    # last_mutation_ids := .clients
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
    required created_at: datetime {
      default := datetime_of_transaction();
      readonly := true;
    };
    required updated_at: datetime {
      rewrite insert, update using (datetime_of_statement());
    };
  }

  type DeletedEntity {
    required replicache_id: str;
    required deleted_at: datetime {
      default := datetime_of_transaction();
      readonly := true;
    };
  }

  abstract type ReplicacheEntity extending WithTimestamps {
    required replicache_id: str {
      annotation description := 'The ID of the entity in the Replicache system, generated in the front-end with nanoid.';
    };

    # Allows detecting which entities were deleted, so we can update the Replicache state in the /pull endpoint.
    trigger register_deletion after delete for each do (
      insert DeletedEntity {
        replicache_id := __old__.replicache_id,
      }
    );
  }

  type Todo extending ReplicacheEntity {
    required content: str;
    required complete: bool;
    required client_group: ReplicacheClientGroup;

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update, delete using (
      global current_group ?= .client_group
    );
  }
}
 