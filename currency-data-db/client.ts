import { z } from "zod";
import {
  CurrencyCodeSchema,
  CurrencyMonthSchema,
  CurrencyPair,
  CurrencyPairSchema,
  CurrencyYearSchema,
} from "../currency-data-type/mod.ts";

const InsertCurrencyDataSchema = z.object({
  year: CurrencyYearSchema,
  month: CurrencyMonthSchema,
  pair1: CurrencyPairSchema,
  pair2: CurrencyPairSchema,
});

const GetCurrencyDataSchema = z.object({
  year: CurrencyYearSchema,
  month: CurrencyMonthSchema,
  code1: CurrencyCodeSchema,
  code2: CurrencyCodeSchema,
});

export class CurrencyDataDbClient {
  private kvClient: Deno.Kv;

  constructor(kv: Deno.Kv) {
    this.kvClient = kv;
  }

  async insertCurrencyData(
    year: number,
    month: number,
    pair1: CurrencyPair,
    pair2: CurrencyPair
  ): Promise<void> {
    const parsedInput = InsertCurrencyDataSchema.parse({
      year,
      month,
      pair1,
      pair2,
    });
    const date = this._convertYearMonthToDate(
      parsedInput.year,
      parsedInput.month
    );
    const kvKey = ["currency-data", date, pair1.code, pair2.code];
    const kvValue = `${parsedInput.pair1.value}:${parsedInput.pair2.value}`;
    await this.kvClient.set(kvKey, kvValue);
  }

  async getCurrencyData(
    year: number,
    month: number,
    code1: string,
    code2: string
  ): Promise<CurrencyPair[]> {
    const parsedInput = GetCurrencyDataSchema.parse({
      year,
      month,
      code1,
      code2,
    });
    const date = this._convertYearMonthToDate(
      parsedInput.year,
      parsedInput.month
    );
    const kvKey = ["currency-data", date, parsedInput.code1, parsedInput.code2];
    const kvValue = await this.kvClient.get<string>(kvKey);
    if (!kvValue.value) {
      throw new Error("No data found");
    }
    const [value1, value2] = kvValue.value.split(":").map(Number);
    return [
      { code: code1, value: value1 },
      { code: code2, value: value2 },
    ];
  }

  async isCurrencyDataExist(
    year: number,
    month: number,
    code1: string,
    code2: string
  ): Promise<boolean> {
    const parsedInput = GetCurrencyDataSchema.parse({
      year,
      month,
      code1,
      code2,
    });
    const date = this._convertYearMonthToDate(
      parsedInput.year,
      parsedInput.month
    );
    const kvKey = ["currency-data", date, parsedInput.code1, parsedInput.code2];
    const kvValue = await this.kvClient.get<string>(kvKey);
    return !!kvValue.value;
  }

  _convertYearMonthToDate(year: number, month: number): string {
    return new Date(year, month - 1, 1).toISOString().split("T")[0];
  }
}
