import { CurrencyDataDbClient } from "./currency-data-db/mod.ts";
import { CurrencyDataQueueClient } from "./currency-data-fetch-queue/client.ts";
import "@std/dotenv/load";

const CURRENCY_API_KEY = Deno.env.get("CURRENCY_API_KEY");
if (!CURRENCY_API_KEY) {
  throw new Error("CURRENCY_API_KEY is required");
}

const kv = await Deno.openKv();

const currencyDataDb = new CurrencyDataDbClient(kv);

const queueClient = new CurrencyDataQueueClient(kv);

queueClient.startConsumeFetchJob(currencyDataDb, CURRENCY_API_KEY);
