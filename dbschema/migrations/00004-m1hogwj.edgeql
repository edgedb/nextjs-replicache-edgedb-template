CREATE MIGRATION m1hogwjzk4i2pjdemrk5xet6jlr23e27c3jtd2zkso7w3vmozd63pa
    ONTO m1skuuq4yeuv4z2bspwvrjoiuvrieqvohkoonta56a3ej22x6d2l3a
{
  CREATE GLOBAL default::currentGroupID -> std::str;
  CREATE GLOBAL default::currentGroup := (SELECT
      default::ReplicacheClientGroup
  FILTER
      (.clientGroupID = GLOBAL default::currentGroupID)
  );
  ALTER TYPE default::ReplicacheClient {
      CREATE ACCESS POLICY allow_select_update
          ALLOW SELECT, UPDATE USING ((GLOBAL default::currentGroup ?= .clientGroup));
      CREATE ACCESS POLICY allow_insert
          ALLOW INSERT ;
  };
  ALTER TYPE default::Todo {
      CREATE ACCESS POLICY allow_select_update
          ALLOW SELECT, UPDATE, DELETE USING ((GLOBAL default::currentGroup ?= .clientGroup));
      CREATE ACCESS POLICY allow_insert
          ALLOW INSERT ;
  };
  ALTER TYPE default::ReplicacheClientGroup {
      CREATE ACCESS POLICY allow_select_update
          ALLOW SELECT, UPDATE USING ((GLOBAL default::currentGroupID ?= .clientGroupID));
      CREATE ACCESS POLICY allow_insert
          ALLOW INSERT ;
  };
};
