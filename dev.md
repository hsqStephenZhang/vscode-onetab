# notes on dev

## K/V design

1. "branch:ids" -> `["main", "master", ...]`. list all the branches.
2. "branch:groups" -> `["gid1", "gid2", ...]`. list the group ids in the state of the branch.
3. "group:data:gid1" -> `[...]`. list the data in the group including the tabs