import { z } from "zod";
import { CurrencyDaySchema, CurrencyPair } from "../currency-data-type/mod.ts";
import { CurrencyYearSchema } from "../currency-data-type/mod.ts";
import { CurrencyMonthSchema } from "../currency-data-type/mod.ts";
import { CurrencyCodeSchema } from "../currency-data-type/mod.ts";

const MetaSchema = z.object({
  last_updated_at: z.string(),
});

const CurrencyAPIDataSchema = z.object({
  code: z.string(),
  value: z.number(),
});

const DataSchema = z.record(CurrencyCodeSchema, CurrencyAPIDataSchema);

const CurrencyApiResponseBodySchema = z.object({
  meta: MetaSchema,
  data: DataSchema,
});

const FetchCurrencyDataSchema = z.object({
  year: CurrencyYearSchema,
  month: CurrencyMonthSchema,
  pair1Code: CurrencyCodeSchema,
  pair2Code: CurrencyCodeSchema,
  currencyApiApiKey: z.string(),
  day: CurrencyDaySchema.optional().default(1),
});

export async function fetchCurrencyData(
  year: number,
  month: number,
  pair1Code: string,
  pair2Code: string,
  currencyApiApiKey: string,
  day?: number
): Promise<CurrencyPair[]> {
  const parsedInput = FetchCurrencyDataSchema.parse({
    year,
    month,
    pair1Code,
    pair2Code,
    currencyApiApiKey,
    day,
  });
  const url = `https://api.currencyapi.com/v3/historical?apikey=${parsedInput.currencyApiApiKey}&currencies=${parsedInput.pair1Code}%2C${parsedInput.pair2Code}&date=${parsedInput.year}-${parsedInput.month}-${parsedInput.day}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `error:${
        response.statusText
      },Failed to fetch currency data: ${await response.text()} this key is : ${currencyApiApiKey}`
    );
  }
  const parsed = await CurrencyApiResponseBodySchema.parseAsync(
    await response.json()
  );
  const pair1Value = parsed.data[parsedInput.pair1Code]?.value;
  if (!pair1Value) {
    throw new Error(
      `Currency ${parsedInput.pair1Code} not found in response data`
    );
  }
  const pair2Value = parsed.data[parsedInput.pair2Code]?.value;
  if (!pair2Value) {
    throw new Error(
      `Currency ${parsedInput.pair2Code} not found in response data`
    );
  }
  return [
    { code: parsedInput.pair1Code, value: pair1Value },
    { code: parsedInput.pair2Code, value: pair2Value },
  ];
}
