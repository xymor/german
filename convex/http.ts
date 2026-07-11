import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

for (const path of ["/lessons", "/lessons/import", "/lessons/review-queue", "/lessons/review", "/cards", "/cards/rate"]) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders })),
  });
}

http.route({
  path: "/lessons",
  method: "GET",
  handler: httpAction(async (ctx) => jsonResponse(await ctx.runQuery(api.lessons.list, {}))),
});

http.route({
  path: "/lessons/review-queue",
  method: "GET",
  handler: httpAction(async (ctx) => jsonResponse(await ctx.runQuery(api.lessons.reviewQueue, {}))),
});

http.route({
  path: "/lessons",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.lessons.upsert, body);
      return jsonResponse(result, 201);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }),
});

http.route({
  path: "/lessons/import",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.lessons.importJsonLessons, body);
      return jsonResponse(result, 201);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }),
});

http.route({
  path: "/lessons/review",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.lessons.markReviewed, body);
      return jsonResponse(result, 200);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }),
});

http.route({
  path: "/cards",
  method: "GET",
  handler: httpAction(async (ctx) => jsonResponse(await ctx.runQuery(api.cards.list, {}))),
});

http.route({
  path: "/cards",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.cards.upsertMany, body);
      return jsonResponse(result, 201);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }),
});

http.route({
  path: "/cards/rate",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const result = await ctx.runMutation(api.cards.rate, body);
      return jsonResponse(result, 200);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
  }),
});

export default http;
