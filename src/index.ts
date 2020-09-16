import { AddressInfo } from 'net';
import dotenv from 'dotenv';
import express from 'express';
import { CronJob } from 'cron';

import { PORT_DEFAULT } from 'config';
import fetchItemPrices from './fetchItemPrices';

dotenv.config();


// Server setup
const app = express();

const listener = app.listen(Number(process.env.PORT) || PORT_DEFAULT, () => {
  // Fetch new prices every x seconds
  new CronJob('*/30 * * * * *', fetchItemPrices, undefined, true, 'Europe/Amsterdam');

  // eslint-disable-next-line
  console.log(`Server started on port ${(listener.address() as AddressInfo).port}`);
});
