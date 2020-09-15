import { AddressInfo } from 'net';
import dotenv from 'dotenv';
import express from 'express';
// import { CronJob } from 'cron';
import fetch from 'node-fetch';

import { PORT_DEFAULT } from 'config';
// import db from './db';


type PriceCoins = {
  gold: number;
  silver: number;
  copper: number;
}

export type ItemPrice = {
  url: string;
  name: {
    slug: string;
    full: string;
  };
  icon: string;
  lastUpdated: string;
  marketValue: PriceCoins;
  historicalValue: PriceCoins;
  minimumBuyout: PriceCoins;
  amount: number;
}


dotenv.config();

const app = express();

const listener = app.listen(Number(process.env.PORT) || PORT_DEFAULT, () => {
  // new CronJob('*/3 * * * * *', fetchItemPrices, undefined, true, 'Europe/Amsterdam');
  fetchItemPrices();

  // eslint-disable-next-line
  console.log(`Server started on port ${(listener.address() as AddressInfo).port}`);
});


async function fetchItemPrices() {
  const itemIds = process.env.ITEM_IDS.trim().replace(' ', '').split(',').join('+');

  const result = await fetch(
    // `https://api.ahdwf.nl/item/multi/${process.env.SERVER}/${process.env.FACTION}/${itemIds}`
    `http://localhost:8080/item/multi/${process.env.SERVER}/${process.env.FACTION}/${itemIds}`
  );
  const data = await result.json() as Record<string, ItemPrice>;

  for (const name in data) {
    const item = data[name];

    // const MIN_DIFF = 9e5; // 15 minutes
    // const now = Date.now();
    // const dbValue = db.get('items').find({ name }).value();

    // if (dbValue) {
    //   // Wait with sending another notification
    //   if (now - dbValue.updatedAt < MIN_DIFF) {
    //     continue;
    //   }

    //   // We've already sent a notification for this price
    //   if (dbValue.values.minimumBuyout.gold === item.minimumBuyout.gold) {
    //     continue;
    //   }
    // }


    // Convert the g/s/c value to a single digit for easy compare
    function toTwoDigits(num: number | undefined) {
      if (!num) {
        return '00';
      }

      const numLength = String(num).length;

      if (numLength === 1) {
        return num + '0';
      }

      return String(num);
    }

    const buyoutVal = Number(item.minimumBuyout.gold + toTwoDigits(item.minimumBuyout.silver) + toTwoDigits(item.minimumBuyout.copper));
    const marketVal = Number(item.marketValue.gold + toTwoDigits(item.marketValue.silver) + toTwoDigits(item.marketValue.copper));


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
          // db.get('items')
          //   .push({
          //     name,
          //     updatedAt: Date.now(),
          //     values: item,
          //   })
          //   .write();
        });
    }
  }

  // eslint-disable-next-line
  console.log(`[${(new Date()).toLocaleString()}] Checked all items.`);
}
