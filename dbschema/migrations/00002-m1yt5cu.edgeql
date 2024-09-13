CREATE MIGRATION m1qxzjd7bmj5oob4fkfnmhmwgfwfgeudnontduuxdyclmqwybx7cca
    ONTO m1abmicx5zv6iplrrmk5dypnwpszeuqeej7jghq5ejdfkm5llnhnzq
{
  ALTER TYPE default::ReplicacheClient {
      CREATE REQUIRED LINK clientGroup: default::ReplicacheClientGroup {
          SET REQUIRED USING (std::assert_single((SELECT
              default::ReplicacheClientGroup
          FILTER
              (default::ReplicacheClientGroup.clientGroupID = .clientGroupID)
          )));
      };
  };
  ALTER TYPE default::ReplicacheClient {
      DROP PROPERTY clientGroupID;
      ALTER PROPERTY clientID {
          CREATE CONSTRAINT std::exclusive;
      };
      DROP PROPERTY lastModified;
  };
  ALTER TYPE default::ReplicacheClientGroup {
      CREATE MULTI LINK clients := (.<clientGroup[IS default::ReplicacheClient]);
      ALTER PROPERTY clientGroupID {
          CREATE CONSTRAINT std::exclusive;
      };
  };
  ALTER TYPE default::Todo {
      CREATE REQUIRED LINK clientGroup: default::ReplicacheClientGroup {
          SET REQUIRED USING (std::assert_single((SELECT
              default::ReplicacheClientGroup
          FILTER
              (default::ReplicacheClientGroup.clientGroupID = .clientGroupID)
          )));
      };
  };
  ALTER TYPE default::Todo {
      DROP PROPERTY clientGroupID;
  };
};
