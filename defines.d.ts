declare namespace NodeJS {
  export interface ProcessEnv {
    ITEM_IDS: string;
    SERVER: string;
    FACTION: string;
    PRICE_THRESHOLD: string;
    FETCH_INTERVAL_SECONDS: string;
    DB_INVALIDATE_MINUTES: string;
  }
}
