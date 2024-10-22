CREATE MIGRATION m1s5z63myvd3bmbu4l36yk455ecax3rgzalk5h4ensf5knv6l7qxzq
    ONTO initial
{
  CREATE GLOBAL default::current_group_id -> std::str;
  CREATE TYPE default::ReplicacheClientGroup {
      CREATE REQUIRED PROPERTY client_group_id: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY last_pulled_at: std::datetime {
          SET default := (std::datetime_of_transaction());
      };
      CREATE INDEX ON ((.client_group_id, .last_pulled_at));
  };
  CREATE TYPE default::ReplicacheClient {
      CREATE REQUIRED LINK client_group: default::ReplicacheClientGroup {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE ACCESS POLICY allow_insert
          ALLOW INSERT ;
      CREATE REQUIRED PROPERTY client_id: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE REQUIRED PROPERTY last_mutation_id: std::int32;
  };
  ALTER TYPE default::ReplicacheClientGroup {
      CREATE MULTI LINK clients := (.<client_group[IS default::ReplicacheClient]);
  };
  CREATE ABSTRACT TYPE default::WithTimestamps {
      CREATE REQUIRED PROPERTY created_at: std::datetime {
          SET default := (std::datetime_of_transaction());
          SET readonly := true;
      };
      CREATE PROPERTY updated_at: std::datetime {
          CREATE REWRITE
              INSERT 
              USING (std::datetime_of_statement());
          CREATE REWRITE
              UPDATE 
              USING (std::datetime_of_statement());
      };
  };
  CREATE ABSTRACT TYPE default::ReplicacheObject EXTENDING default::WithTimestamps {
      CREATE REQUIRED PROPERTY replicache_id: std::str {
          CREATE CONSTRAINT std::exclusive;
          CREATE ANNOTATION std::description := 'The key/id of the object in the Replicache client, generated in the front-end with nanoid via the `generate_replicache_id` function.';
      };
      CREATE INDEX ON ((.replicache_id, .updated_at));
  };
  CREATE TYPE default::Todo EXTENDING default::ReplicacheObject {
      CREATE REQUIRED LINK client_group: default::ReplicacheClientGroup;
      CREATE ACCESS POLICY allow_insert
          ALLOW INSERT ;
      CREATE REQUIRED PROPERTY complete: std::bool;
      CREATE REQUIRED PROPERTY content: std::str;
  };
  ALTER TYPE default::ReplicacheClientGroup {
      CREATE MULTI LINK todos := (.<client_group[IS default::Todo]);
  };
  CREATE GLOBAL default::current_group := (SELECT
      default::ReplicacheClientGroup
  FILTER
      (.client_group_id = GLOBAL default::current_group_id)
  );
  ALTER TYPE default::ReplicacheClient {
      CREATE ACCESS POLICY allow_select_update
          ALLOW SELECT, UPDATE USING ((GLOBAL default::current_group ?= .client_group));
  };
  ALTER TYPE default::Todo {
      CREATE ACCESS POLICY allow_select_update
          ALLOW SELECT, UPDATE, DELETE USING ((GLOBAL default::current_group ?= .client_group));
  };
  CREATE TYPE default::DeletedReplicacheObject {
      CREATE REQUIRED PROPERTY deleted_at: std::datetime {
          SET default := (std::datetime_of_transaction());
          SET readonly := true;
      };
      CREATE REQUIRED PROPERTY replicache_id: std::str;
      CREATE INDEX ON ((.replicache_id, .deleted_at));
  };
  ALTER TYPE default::ReplicacheObject {
      CREATE TRIGGER register_deletion
          AFTER DELETE 
          FOR EACH DO (INSERT
              default::DeletedReplicacheObject
              {
                  replicache_id := __old__.replicache_id
              });
  };
};
