import fetch from 'node-fetch';
import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import * as i from './types';
import { toTwoDigits } from './utils';


// Database setup
const adapter = new FileSync('./db.json');
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
  const HOST = process.env.NODE_ENV === 'production' ? 'https://api.ahdfw.nl' : 'http://localhost:8080';

  // eslint-disable-next-line
  console.log(`[${(new Date()).toLocaleString()}] Checking all items...`);

  const result = await fetch(
    `${HOST}/item/multi/${process.env.SERVER}/${process.env.FACTION}/${itemIds}`
  );
  const itemPrices = await result.json() as Record<string, i.ItemPrice>;

  for (const itemSlug in itemPrices) {
    const item = itemPrices[itemSlug];


    // Convert the g/s/c value to a single digit for easy compare
    const buyoutVal = Number(item.minimumBuyout.gold + toTwoDigits(item.minimumBuyout.silver) + toTwoDigits(item.minimumBuyout.copper));
    const marketVal = Number(item.marketValue.gold + toTwoDigits(item.marketValue.silver) + toTwoDigits(item.marketValue.copper));


    // Check if we need to fetch this item
    const MIN_DIFF = Number(process.env.DB_INVALIDATE_MINUTES) * 6e4;
    const now = Date.now();
    const dbValue = db.get('items').find({ name: itemSlug }).value();

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
    const percDiff = (buyoutVal / marketVal) * 100;

    if (percDiff <= Number(process.env.PRICE_THRESHOLD)) {
      const { gold,silver,copper } = item.minimumBuyout;
      let value = '';

      if (gold && gold > 0) {
        value += `${gold}g`;
      }
      if (silver && silver > 0) {
        value += ` ${silver}s`;
      }
      if (copper && copper > 0) {
        value += ` ${copper}c`;
      }

      /* eslint-disable */
      console.log(`Snipe!`);
      console.log({ [itemSlug]: item });
      /* eslint-enable */

      fetch(`https://maker.ifttt.com/trigger/ahsnipe2/with/key/${process.env.IFTTT_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value1: item.name.full,
          value2: value,
          value3: item.icon,
        }),
      })
        .then(() => {
          db.get('items')
            .push({
              name: itemSlug,
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
