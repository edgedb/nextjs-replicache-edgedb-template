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

    

    # @TODO: figure out access policy limiting inserting new clients
    # ERROR: ⨯ CardinalityViolationError: required link 'client_group' of object type 'default::ReplicacheClient' is hidden by access policy
    
    # access policy allow_insert allow insert;
    # access policy allow_select_update allow select, update using (
    #   global current_group_id ?= .client_group_id
    # );

    index on ((.client_group_id, .last_pulled_at));
  }

  type ReplicacheClient {
    required client_id: str {
      constraint exclusive;
    };
    required client_group: ReplicacheClientGroup {
      on target delete delete source;
    };
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
    updated_at: datetime {
      rewrite insert, update using (datetime_of_statement());
    };
  }

  # Tombstone to sync deleted objects to Replicache in the `/pull` endpoint.
  type DeletedReplicacheObject {
    required replicache_id: str;
    required deleted_at: datetime {
      default := datetime_of_transaction();
      readonly := true;
    };

    index on ((.replicache_id, .deleted_at));
  }

  abstract type ReplicacheObject extending WithTimestamps {
    required replicache_id: str {
      constraint exclusive;

      annotation description := 'The key/id of the object in the Replicache client, generated in the front-end with nanoid via the `generate_replicache_id` function.';
    };

    # Allows detecting which entities were deleted, so we can update the Replicache state in the /pull endpoint.
    trigger register_deletion after delete for each do (
      insert DeletedReplicacheObject {
        replicache_id := __old__.replicache_id,
      }
    );

    index on ((.replicache_id, .updated_at));
  }

  type Todo extending ReplicacheObject {
    required content: str;
    required complete: bool;
    required client_group: ReplicacheClientGroup;

    access policy allow_insert allow insert;
    
    access policy allow_select_update allow select, update, delete using (
      global current_group ?= .client_group
    );
  }
}
 