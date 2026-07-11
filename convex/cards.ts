import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const cardType = v.union(v.literal("fix_sentence"), v.literal("choose"), v.literal("fill_blank"), v.literal("translate"), v.literal("note"));
const difficulty = v.union(v.literal("again"), v.literal("hard"), v.literal("good"), v.literal("easy"));
const DAY_MS = 86_400_000;

const priorityByDifficulty = {
  again: 8,
  hard: 4,
  easy: 1,
  good: 0.5,
} as const;

const intervalByDifficulty = {
  again: 0,
  hard: 1,
  easy: 7,
  good: 14,
} as const;

function priorityFor(difficultyValue?: keyof typeof priorityByDifficulty) {
  return difficultyValue ? priorityByDifficulty[difficultyValue] : 2;
}

function scoreCard(card: { priority?: number; lastReviewedAt?: number; difficulty?: keyof typeof priorityByDifficulty; createdAt?: number }, now: number) {
  const priority = card.priority ?? priorityFor(card.difficulty);
  const lastReviewedAt = card.lastReviewedAt ?? card.createdAt ?? 0;
  const ageDays = Math.max(0.01, (now - lastReviewedAt) / DAY_MS);
  const immediateQueueBoost = card.difficulty === "again" ? 10_000 : 0;
  return ageDays * priority + immediateQueueBoost;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cards = await ctx.db.query("reviewCards").collect();
    return cards
      .map((card) => ({
        ...card,
        priority: card.priority ?? priorityFor(card.difficulty),
        reviewScore: scoreCard(card, now),
      }))
      .sort((a, b) => {
        if (b.reviewScore !== a.reviewScore) return b.reviewScore - a.reviewScore;
        return (a.lastReviewedAt ?? a.createdAt) - (b.lastReviewedAt ?? b.createdAt);
      });
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
      priority: v.optional(v.number()),
      lastReviewedAt: v.optional(v.number()),
      reviewScore: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, { cards }) => {
    const now = Date.now();
    const existing = await ctx.db.query("reviewCards").collect();
    for (const card of existing) await ctx.db.delete(card._id);
    for (const card of cards) {
      const priority = card.priority ?? priorityFor(card.difficulty);
      const lastReviewedAt = card.lastReviewedAt;
      await ctx.db.insert("reviewCards", {
        prompt: card.prompt,
        answer: card.answer,
        cardType: card.cardType,
        dueDate: card.dueDate,
        difficulty: card.difficulty,
        intervalDays: card.intervalDays,
        priority,
        lastReviewedAt,
        reviewScore: card.reviewScore ?? scoreCard({ ...card, priority, lastReviewedAt, createdAt: now }, now),
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
    const now = Date.now();
    const priority = priorityByDifficulty[difficulty];
    const intervalDays = intervalByDifficulty[difficulty];
    const due = new Date(now + intervalDays * DAY_MS).toISOString().slice(0, 10);
    const reviewScore = difficulty === "again" ? 10_000 : Math.max(0.01, intervalDays) * priority;
    await ctx.db.patch(id, {
      difficulty,
      intervalDays,
      priority,
      lastReviewedAt: now,
      reviewScore,
      dueDate: due,
      updatedAt: now,
    });
    return { id, difficulty, priority, lastReviewedAt: now, reviewScore, dueDate: due };
  },
});
