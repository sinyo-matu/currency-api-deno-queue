import { z } from "zod";

export const CurrencyCodeSchema = z.string().length(3);
export const CurrencyValueSchema = z.number().positive().gt(0);

export const CurrencyPairSchema = z.object({
  code: CurrencyCodeSchema,
  value: CurrencyValueSchema,
});

export type CurrencyPair = z.infer<typeof CurrencyPairSchema>;

export const CurrencyYearSchema = z.number().int().positive().gte(1000);
export const CurrencyMonthSchema = z.number().int().lte(12).positive();
export const CurrencyDaySchema = z.number().int().lte(31).positive();
