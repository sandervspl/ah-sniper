import fetch from 'node-fetch';
import lowdb from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import * as i from './types';
import { toTwoDigits } from './utils';


// Database setup
const adapter = new FileSync('./db.json');
const db = lowdb(adapter) as lowdb.LowdbSync<i.DB>;

db
  .defaults({
    items: [],
  })
  .write();


export default async function fetchItemPrices() {
  // eslint-disable-next-line
  console.log(`[${(new Date()).toLocaleString()}] Checking all items...`);


  const itemIdsResult = await fetch(`${process.env.CMS_URL}/items`);
  const itemIds = await itemIdsResult.json() as i.CMS.Item[];
  const itemIdsStr = itemIds
    .map((item) => item.enabled && item.itemID)
    .filter(Boolean)
    .join('+');

  const HOST = process.env.NODE_ENV === 'production' ? process.env.API_URL : 'http://localhost:8080';

  const result = await fetch(
    `${HOST}/item/multi/${process.env.SERVER}/${process.env.FACTION}/${itemIdsStr}`
  );
  const itemPrices = await result.json() as Record<string, i.ItemPrice>;

  for (const itemSlug in itemPrices) {
    const item = itemPrices[itemSlug];


    // Only check if item is on AH
    if (item.quantity === 0) {
      continue;
    }


    // Convert the g/s/c value to a single digit for easy compare
    const mb = item.minimumBuyout;
    const mv = item.marketValue;

    if (!mb || !mv) {
      continue;
    }

    const buyoutVal = mb && Number(mb.gold + toTwoDigits(mb.silver) + toTwoDigits(mb.copper));
    const marketVal = mv && Number(mv.gold + toTwoDigits(mv.silver) + toTwoDigits(mv.copper));

    // Check if we need to fetch this item
    const MIN_TIME_DIFF = Number(process.env.DB_INVALIDATE_MINUTES) * 60000;
    const THRESHOLD = Number(process.env.PRICE_THRESHOLD);
    const now = Date.now();
    const dbValue = db.get('items')
      .find({ id: item.id })
      .value();

    if (dbValue) {
      // Wait with sending another notification
      if (now - dbValue.updatedAt < MIN_TIME_DIFF) {
        continue;
      }

      // We've already sent a notification for this price
      if (dbValue.buyoutVal === buyoutVal) {
        continue;
      }

      // Prevent spam when value is slightly less than what we found before
      if ((buyoutVal / dbValue.buyoutVal) * 100 > THRESHOLD) {
        continue;
      }
    }


    // If difference of minimum buyout is substantial then we notify users
    const percDiffMarket = (buyoutVal / marketVal) * 100;

    if (percDiffMarket <= THRESHOLD) {
      function genPriceString(price: i.PriceCoins) {
        const { gold,silver,copper } = price;
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

        return value;
      }


      /* eslint-disable */
      // console.log(`Snipe!`);
      // console.log({ [itemSlug]: item });
      /* eslint-enable */

      fetch(`https://maker.ifttt.com/trigger/ahsnipe2/with/key/${process.env.IFTTT_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value1: `${item.name.full} is on AH for ${genPriceString(mb)} (market: ${genPriceString(mv)})`,
          value2: item.url,
          value3: item.icon,
        }),
      })
        .then(() => {
          // Update
          if (dbValue) {
            db.get('items')
              .find({ id: item.id })
              .assign({
                updatedAt: Date.now(),
                marketVal,
                buyoutVal,
              })
              .write();
          } else {
            // Insert
            db.get('items')
              .push({
                id: item.id,
                name: itemSlug,
                updatedAt: Date.now(),
                marketVal,
                buyoutVal,
              })
              .write();
          }

          // eslint-disable-next-line
          console.log(`[${(new Date()).toLocaleString()}] Checked all items.`);

          setTimeout(fetchItemPrices, Number(process.env.FETCH_INTERVAL_SECONDS) * 1000);
        });
    }
  }
}
