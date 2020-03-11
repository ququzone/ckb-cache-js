ckb-cache-js
============

> A embeddable CKB live cells cache.

## Install

```
npm -i ckb-cache-js
```

## Usage

### bootstrap

```
const CKB = require("@nervosnetwork/ckb-sdk-core").default;
const { DefaultCacheService, initConnection } = require("ckb-cache-js");

let cache;
const start = async (nodeUrl = "http://localhost:8114") => {
  await initConnection({
    "type": "sqlite",
    "database": "database.sqlite",
    "synchronize": true,
    "logging": false,
    "entities": [
      "node_modules/ckb-cache-js/lib/database/entity/*.js"
    ]
  });

  const ckb = new CKB(nodeUrl);
  cache = new DefaultCacheService(ckb);
  cache.start();
};
start();
```

### query

```
const BN = require("bn.js");
const { QueryBuilder } = require("ckb-cache-js");

// query by lockhash
const allByLockhash = await cache.findCells(
  QueryBuilder.create()
    .setLockHash(account.lock)
    .build()
);

// query by capacity
const byCapacity = await cache.findCells(
  QueryBuilder.create()
    .setLockHash("0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26")
    .setTypeCodeHash("null")
    .setData("0x")
    .setCapacity("10000000000")
    .build()
);

// query by udt
const byUdt = await cache.findCells(
  QueryBuilder.create()
    .setLockHash("0x6a242b57227484e904b4e08ba96f19a623c367dcbd18675ec6f2a71a0ff4ec26")
    .setTypeHash("0xcc77c4deac05d68ab5b26828f0bf4565a8d73113d7bb7e92b8362b8a74e58e58")
    .setCapacityFetcher((cell: Cell) => {
      return new BN(Buffer.from(cell.data.slice(2), "hex"), 16, "le")
    })
    .build()
);
```
