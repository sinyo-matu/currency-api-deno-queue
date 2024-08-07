import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "@hono/hono/cors";
import { CurrencyDataDbClient } from "../currency-data-db/mod.ts";
import { CurrencyDataQueueClient } from "../currency-data-fetch-queue/client.ts";
import { swaggerUI } from "@hono/swagger-ui";
import "@std/dotenv/load";
import { route } from "./openapi.ts";

const app = new OpenAPIHono();

const currencyDbClient = new CurrencyDataDbClient(await Deno.openKv());
const currencyQueueClient = new CurrencyDataQueueClient(await Deno.openKv());

const CURRENCY_API_KEY = Deno.env.get("CURRENCY_API_KEY");
if (!CURRENCY_API_KEY) {
  throw new Error("CURRENCY_API_KEY is required");
}
currencyQueueClient.startConsumeFetchJob(currencyDbClient, CURRENCY_API_KEY);

const AUTH_HEADER = Deno.env.get("AUTH_HEADER");
const AUTH_TOKEN = Deno.env.get("AUTH_TOKEN");
if (!AUTH_HEADER || !AUTH_TOKEN) {
  throw new Error("AUTH_HEADER and AUTH_TOKEN are required");
}
function getDates(startDate: Date, stopDate: Date) {
  const localStartDate = new Date(startDate);
  const localStopDate = new Date(stopDate);
  const dateArray: Date[] = [];
  const currentDate = localStartDate;
  while (currentDate <= localStopDate) {
    dateArray.push(new Date(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return dateArray;
}
export function calculateAverageCurrency(
  currencyDatas: { pair1: number; pair2: number }[]
): number {
  const pair1Sum = currencyDatas.reduce((sum, h) => sum + h.pair1, 0);
  const pair2sum = currencyDatas.reduce((sum, h) => sum + h.pair2, 0);
  const pair1Average = pair1Sum / currencyDatas.length;
  const pair2Average = pair2sum / currencyDatas.length;

  return pair2Average / pair1Average;
}

app.use("/api/*", cors());

app.openapi(route, async (c) => {
  if (c.req.header(AUTH_HEADER) !== AUTH_TOKEN) {
    c.status(401);
    return c.text("Unauthorized");
  }
  const { start_date, end_date, pair1, pair2 } = c.req.queries();
  if (!start_date || !end_date || !pair1 || !pair2) {
    c.status(400);
    return c.text("Missing parameters");
  }
  const pair1Code = pair1[0];
  const pair2Code = pair2[0];
  const startDate = new Date(start_date[0]);
  const endDate = new Date(end_date[0]);
  console.log(`Start date: ${startDate.toISOString()}`);
  console.log(`End date: ${endDate.toISOString()}`);
  let need_fetch = false;
  const promises1 = getDates(startDate, endDate).map(async (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (
      !(await currencyDbClient.isCurrencyDataExist(
        year,
        month,
        pair1Code,
        pair2Code
      ))
    ) {
      console.log(`Data for ${year}-${month} is not found, fetching...`);
      await currencyQueueClient.enqueueFetchJob(
        year,
        month,
        pair1Code,
        pair2Code
      );
      need_fetch = true;
    }
  });
  await Promise.all(promises1);
  if (need_fetch) {
    c.status(202);
    return c.text("Data is being fetched");
  }
  const promises2 = getDates(startDate, endDate).map(async (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const [pair1, pair2] = await currencyDbClient.getCurrencyData(
      year,
      month,
      pair1Code,
      pair2Code
    );
    return {
      pair1: pair1.value,
      pair2: pair2.value,
    };
  });
  const currencyDatas = await Promise.all(promises2);
  if (currencyDatas.length === 0) {
    throw new Error("currencyDatas is empty");
  }
  console.log(`Fetched ${currencyDatas.length} currency histories`);
  return c.json({
    average_currency: calculateAverageCurrency(currencyDatas),
  });
});

app.doc("/doc-text", {
  openapi: "3.0.0",
  info: {
    version: "0.1.0",
    title: "Currency API",
  },
});
app.get("doc", swaggerUI({ url: "/doc-text" }));

app.onError((err, c) => {
  console.error(`${err}`);
  return c.text(err.toString());
});

app.notFound((c) => c.text("Not found", 404));

export function startServer() {
  Deno.serve(app.fetch);
}
