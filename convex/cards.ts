import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const cardType = v.union(v.literal("fix_sentence"), v.literal("choose"), v.literal("fill_blank"), v.literal("translate"), v.literal("note"));
const difficulty = v.union(v.literal("again"), v.literal("hard"), v.literal("good"), v.literal("easy"));

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("reviewCards").withIndex("by_due_date").collect();
  },
});

export const upsertMany = mutation({
  args: {
    cards: v.array(v.object({
      prompt: v.string(),
      answer: v.string(),
      cardType,
      dueDate: v.optional(v.string()),
      difficulty: v.optional(difficulty),
      intervalDays: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, { cards }) => {
    const now = Date.now();
    const existing = await ctx.db.query("reviewCards").collect();
    for (const card of existing) await ctx.db.delete(card._id);
    for (const card of cards) {
      await ctx.db.insert("reviewCards", {
        prompt: card.prompt,
        answer: card.answer,
        cardType: card.cardType,
        dueDate: card.dueDate,
        difficulty: card.difficulty,
        intervalDays: card.intervalDays,
        tags: card.tags ?? [],
        createdAt: now,
        updatedAt: now,
      });
    }
    return { cardCount: cards.length };
  },
});

export const rate = mutation({
  args: { id: v.id("reviewCards"), difficulty },
  handler: async (ctx, { id, difficulty }) => {
    const intervals = { again: 0, hard: 1, good: 3, easy: 7 } as const;
    const due = new Date(Date.now() + intervals[difficulty] * 86400000).toISOString().slice(0, 10);
    await ctx.db.patch(id, { difficulty, intervalDays: intervals[difficulty], dueDate: due, updatedAt: Date.now() });
    return { id, difficulty, dueDate: due };
  },
});
