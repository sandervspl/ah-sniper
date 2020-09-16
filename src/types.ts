export type PriceCoins = {
  gold: number;
  silver: number;
  copper: number;
}

export type ItemPrice = {
  id: number;
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

export type DB = {
  items: {
    id: number;
    name: string;
    updatedAt: number;
    marketVal: number;
    buyoutVal: number;
  }[];
}
