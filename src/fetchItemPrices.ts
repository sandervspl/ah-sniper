import fetch from 'node-fetch';
import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import * as i from './types';
import { toTwoDigits } from './utils';


// Database setup
const adapter = new FileSync('src/db.json');
const db = lowdb(adapter) as lowdb.LowdbSync<i.DB>;

// Add upsert function
db._.mixin({
  upsert: function (collection, obj, key) {
    key = key || 'id';
    for (var i = 0; i < collection.length; i++) {
      var el = collection[i];
      if (el[key] === obj[key]) {
        collection[i] = obj;
        return collection;
      }
    };
    collection.push(obj);
  },
});

db
  .defaults({
    items: [],
  })
  .write();


export default async function fetchItemPrices() {
  const itemIds = process.env.ITEM_IDS.trim().replace(' ', '').split(',').join('+');
  const HOST = process.env.NODE_ENV === 'production' ? 'https://api.ahdwf.nl' : 'http://localhost:8080';

  const result = await fetch(
    `${HOST}/item/multi/${process.env.SERVER}/${process.env.FACTION}/${itemIds}`
  );
  const data = await result.json() as Record<string, i.ItemPrice>;

  for (const name in data) {
    const item = data[name];


    // Convert the g/s/c value to a single digit for easy compare
    const buyoutVal = Number(item.minimumBuyout.gold + toTwoDigits(item.minimumBuyout.silver) + toTwoDigits(item.minimumBuyout.copper));
    const marketVal = Number(item.marketValue.gold + toTwoDigits(item.marketValue.silver) + toTwoDigits(item.marketValue.copper));


    // Check if we need to fetch this item
    const MIN_DIFF = 9e5; // 15 minutes
    const now = Date.now();
    const dbValue = db.get('items').find({ name }).value();

    if (dbValue) {
      // Wait with sending another notification
      if (now - dbValue.updatedAt < MIN_DIFF) {
        continue;
      }

      // We've already sent a notification for this price
      if (dbValue.buyoutVal === buyoutVal) {
        continue;
      }
    }


    // If difference of minimum buyout is substantial then we notify users
    const percDiff = (marketVal / buyoutVal) * 100;

    if (percDiff <= Number(process.env.THRESHOLD)) {
      const { gold,silver,copper } = item.minimumBuyout;
      let value = '';

      if (gold && gold > 0) {
        value += `${gold}g`;
      }
      if (silver && silver > 0) {
        value += ` ${silver}g`;
      }
      if (copper && copper > 0) {
        value += ` ${copper}g`;
      }

      fetch('https://maker.ifttt.com/trigger/ahsnipe/with/key/clMtNJhSqX6U7WajYDsH1I', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value1: name,
          value2: value,
          value3: item.lastUpdated,
        }),
      })
        .then(() => {
          db.get('items')
            .push({
              name,
              updatedAt: Date.now(),
              marketVal,
              buyoutVal,
            })
            .write();
        });
    }
  }

  // eslint-disable-next-line
  console.log(`[${(new Date()).toLocaleString()}] Checked all items.`);
}
