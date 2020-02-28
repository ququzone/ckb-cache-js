import { createConnection, getConnection } from "typeorm";

export const initConnection = async (options: any) => {
  // try to close connection, if not exist, will throw ConnectionNotFoundError when call getConnection()
  try {
    await getConnection().close();
  } catch (err) {
    // do nothing
  }

  try {
    await createConnection(options);
    await getConnection().manager.query("PRAGMA busy_timeout = 3000;");
    await getConnection().manager.query("PRAGMA temp_store = MEMORY;");
  } catch (err) {
    console.error(err.message);
  }
};

export default initConnection;