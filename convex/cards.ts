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

const lessonPriorityMultiplier = {
  again: 1.75,
  hard: 1.35,
  easy: 0.9,
  good: 0.75,
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

function lessonScore(lesson: { priority?: number; lastReviewedAt?: number; createdAt?: number }, now: number) {
  const priority = lesson.priority ?? 1;
  const lastReviewedAt = lesson.lastReviewedAt ?? lesson.createdAt ?? 0;
  const ageDays = Math.max(0.01, (now - lastReviewedAt) / DAY_MS);
  return ageDays * priority;
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
      lessonSlug: v.optional(v.string()),
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
      const linkedLesson = card.lessonSlug
        ? await ctx.db.query("lessons").withIndex("by_slug", (q) => q.eq("slug", card.lessonSlug)).unique()
        : null;
      await ctx.db.insert("reviewCards", {
        prompt: card.prompt,
        answer: card.answer,
        cardType: card.cardType,
        lessonId: linkedLesson?._id,
        lessonSlug: card.lessonSlug,
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

export const relinkToLessons = mutation({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("reviewCards").collect();
    const lessons = await ctx.db.query("lessons").collect();
    let linked = 0;
    for (const card of cards) {
      if (!card.lessonSlug) continue;
      const lesson = lessons.find((candidate) => candidate.slug === card.lessonSlug);
      if (!lesson) continue;
      await ctx.db.patch(card._id, { lessonId: lesson._id, updatedAt: Date.now() });
      linked += 1;
    }
    return { linked };
  },
});

export const rate = mutation({
  args: { id: v.id("reviewCards"), difficulty },
  handler: async (ctx, { id, difficulty }) => {
    const now = Date.now();
    const card = await ctx.db.get(id);
    if (!card) throw new Error("Card not found");

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

    let lessonUpdate = null;
    const lesson = card.lessonId
      ? await ctx.db.get(card.lessonId)
      : card.lessonSlug
        ? await ctx.db.query("lessons").withIndex("by_slug", (q) => q.eq("slug", card.lessonSlug)).unique()
        : null;

    if (lesson) {
      const oldPriority = lesson.priority ?? 1;
      const adjustedPriority = Math.max(0.5, Math.min(20, oldPriority * lessonPriorityMultiplier[difficulty]));
      const patch = {
        priority: adjustedPriority,
        reviewScore: lessonScore({ ...lesson, priority: adjustedPriority }, now),
        updatedAt: now,
      };
      await ctx.db.patch(lesson._id, patch);
      lessonUpdate = { id: lesson._id, slug: lesson.slug, oldPriority, priority: adjustedPriority };
    }

    return { id, difficulty, priority, lastReviewedAt: now, reviewScore, dueDate: due, lessonUpdate };
  },
});
