import { z } from "@hono/zod-openapi";
import { createRoute } from "@hono/zod-openapi";

const QuerySchema = z.object({
  start_date: z.string().openapi({
    param: {
      name: "start_date",
      in: "query",
      description:
        "start date of a duration that you want to calculate the average currency",
    },
    example: "2021-01-01",
  }),
  end_date: z.string().openapi({
    param: {
      name: "end_date",
      in: "query",
      description:
        "end date of a duration that you want to calculate the average currency",
    },
    example: "2022-01-01",
  }),
  pair1: z.string().openapi({
    param: {
      name: "pair1",
      in: "query",
      description: "currency pair 1",
    },
    example: "CNY",
  }),
  pair2: z.string().openapi({
    param: {
      name: "pair2",
      in: "query",
      description: "currency pair 2",
    },
    example: "JPY",
  }),
});

const ResponseSchema200 = z.object({
  average_currency: z.number().openapi({
    example: 20.1,
    description: "Average currency",
  }),
});
const ResponseSchema202 = z.string().openapi({
  example: "fetching data",
  description: "response when data is being fetched",
});

const AuthTokenSchema = z.object({
  "X-Api-Key": z.string().openapi({
    param: {
      name: "X-Api-Key",
      in: "header",
      description: "API key",
    },
    example: "aBc%123",
  }),
});

export const route = createRoute({
  tags: ["currency"],
  method: "get",
  path: "/api/average_currency",
  request: {
    query: QuerySchema,
    headers: AuthTokenSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema200,
        },
      },
      description: "the average currency",
    },
    202: {
      content: {
        "text/plain": {
          schema: ResponseSchema202,
        },
      },
      description: "response when data is being fetched",
    },
  },
});
