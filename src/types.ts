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
  quantity: number;
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

// eslint-disable-next-line
export namespace CMS {
  export type Item = {
    id: number;
    name: string;
    itemID: number;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }
}
