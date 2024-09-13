CREATE MIGRATION m1abmicx5zv6iplrrmk5dypnwpszeuqeej7jghq5ejdfkm5llnhnzq
    ONTO initial
{
  CREATE TYPE default::ReplicacheClient {
      CREATE REQUIRED PROPERTY clientGroupID: std::str;
      CREATE REQUIRED PROPERTY clientID: std::str;
      CREATE PROPERTY lastModified: std::datetime;
      CREATE REQUIRED PROPERTY lastMutationID: std::int16;
  };
  CREATE TYPE default::ReplicacheClientGroup {
      CREATE REQUIRED PROPERTY clientGroupID: std::str;
  };
  CREATE TYPE default::Todo {
      CREATE REQUIRED PROPERTY clientGroupID: std::str;
      CREATE REQUIRED PROPERTY complete: std::bool;
      CREATE REQUIRED PROPERTY content: std::str;
      CREATE REQUIRED PROPERTY todoID: std::str;
  };
};
