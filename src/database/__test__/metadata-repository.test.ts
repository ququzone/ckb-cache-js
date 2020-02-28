import initConnection from "..";
import MetadataRepository from "../metadata-repository";

beforeAll(async () => {
  await initConnection({
    "type": "sqlite",
    "database": "database.sqlite",
    "synchronize": true,
    "logging": false,
    "entities": [
       "src/database/entity/**/*.ts"
    ],
    "migrations": [
       "src/database/migration/**/*.ts"
    ],
    "subscribers": [
       "src/database/subscriber/**/*.ts"
    ],
    "cli": {
       "entitiesDir": "src/database/entity",
       "migrationsDir": "src/database/migration",
       "subscribersDir": "src/database/subscriber"
    }
  });
});

test("test find current block", async ()=> {
  const repository = new MetadataRepository();
  const currentBlock = await repository.findCurrentBlock();
  expect(currentBlock).not.toBeNull();
});

test("test update current block", async ()=> {
  const repository = new MetadataRepository();
  await repository.updateCurrentBlock("100");
});