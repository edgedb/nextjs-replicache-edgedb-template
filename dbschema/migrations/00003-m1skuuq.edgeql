CREATE MIGRATION m1skuuq4yeuv4z2bspwvrjoiuvrieqvohkoonta56a3ej22x6d2l3a
    ONTO m1qxzjd7bmj5oob4fkfnmhmwgfwfgeudnontduuxdyclmqwybx7cca
{
  ALTER TYPE default::ReplicacheClientGroup {
      CREATE MULTI LINK todos := (.<clientGroup[IS default::Todo]);
  };
};
