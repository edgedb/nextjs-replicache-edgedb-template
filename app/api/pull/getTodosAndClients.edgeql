select {
  todos := (select Todo {*}),
  clients := (select ReplicacheClient {*})
}