import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import { ItemPrice } from '.';


type DB = {
  items: {
    name: string;
    updatedAt: number;
    values: ItemPrice;
  }[];
}


const adapter = new FileSync('src/db.json');
const db = lowdb(adapter) as lowdb.LowdbSync<DB>;

db
  .defaults({
    items: {},
  })
  .write();

export default db;
