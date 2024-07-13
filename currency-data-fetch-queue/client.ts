import { z } from "zod";
import { fetchCurrencyData } from "../currency-data-api/mod.ts";
import { CurrencyDataDbClient } from "../currency-data-db/mod.ts";
import {
  CurrencyCodeSchema,
  CurrencyDaySchema,
  CurrencyMonthSchema,
  CurrencyYearSchema,
} from "../currency-data-type/mod.ts";

const FetchJobSchema = z.object({
  year: CurrencyYearSchema,
  month: CurrencyMonthSchema,
  pair1Code: CurrencyCodeSchema,
  pair2Code: CurrencyCodeSchema,
  day: CurrencyDaySchema.optional(),
});
type FetchJob = z.infer<typeof FetchJobSchema>;

export class CurrencyDataQueueClient {
  private readonly _queueClient: Deno.Kv;
  private readonly _queueKey: string = "currency-data-fetch-queue";
  constructor(kvClient: Deno.Kv) {
    this._queueClient = kvClient;
  }

  async enqueueFetchJob(
    year: number,
    month: number,
    pair1Code: string,
    pair2Code: string,
    day?: number
  ): Promise<void> {
    const fetchJob = FetchJobSchema.parse({
      year,
      month,
      pair1Code,
      pair2Code,
      day,
    });
    const message = {
      queueKey: this._getQueueKey(),
      payload: JSON.stringify(fetchJob),
    };

    const res = await this._queueClient.enqueue(message);
    if (!res.ok) {
      throw new Error("Failed to enqueue message");
    }
  }
  startConsumeFetchJob(
    currencyDataDb: CurrencyDataDbClient,
    currencyApiApiKey: string
  ) {
    this._queueClient.listenQueue((msg) => {
      if (msg.queueKey === this._getQueueKey()) {
        this._fetchJobHandler(
          FetchJobSchema.parse(JSON.parse(msg.payload)),
          currencyApiApiKey,
          currencyDataDb
        );
      }
    });
  }

  private async _fetchJobHandler(
    fetchJob: FetchJob,
    currencyApiApiKey: string,
    currencyDb: CurrencyDataDbClient
  ) {
    const { year, month, pair1Code, pair2Code, day } = fetchJob;
    if (
      await currencyDb.isCurrencyDataExist(year, month, pair1Code, pair2Code)
    ) {
      console.log(
        `Currency data for ${pair1Code} and ${pair2Code} for ${year}-${month} already exists, skipping fetch`
      );
      return;
    }
    console.log(
      `Fetching currency data for ${pair1Code} and ${pair2Code} for ${year}-${month}`
    );
    const [currencyPair1, currencyPair2] = await fetchCurrencyData(
      year,
      month,
      pair1Code,
      pair2Code,
      currencyApiApiKey,
      day
    );
    await currencyDb.insertCurrencyData(
      year,
      month,
      currencyPair1,
      currencyPair2
    );
  }

  private _getQueueKey(): string {
    return this._queueKey;
  }
}
