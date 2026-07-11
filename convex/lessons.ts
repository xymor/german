import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const status = v.union(v.literal("correct"), v.literal("minor"), v.literal("fix"), v.literal("unreviewed"));

const sentenceInput = v.object({
  original: v.string(),
  corrected: v.optional(v.string()),
  explanation: v.optional(v.string()),
  naturalAlternative: v.optional(v.string()),
  status,
  tags: v.optional(v.array(v.string())),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const lessons = await ctx.db.query("lessons").withIndex("by_date").order("desc").collect();
    return await Promise.all(
      lessons.map(async (lesson) => ({
        ...lesson,
        sentences: await ctx.db
          .query("sentences")
          .withIndex("by_lesson_order", (q) => q.eq("lessonId", lesson._id))
          .collect(),
      })),
    );
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const lesson = await ctx.db.query("lessons").withIndex("by_date", (q) => q.eq("date", date)).unique();
    if (!lesson) return null;
    const sentences = await ctx.db
      .query("sentences")
      .withIndex("by_lesson_order", (q) => q.eq("lessonId", lesson._id))
      .collect();
    return { ...lesson, sentences };
  },
});

export const upsert = mutation({
  args: {
    date: v.string(),
    title: v.string(),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    sentences: v.array(sentenceInput),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("lessons").withIndex("by_date", (q) => q.eq("date", args.date)).unique();
    let lessonId: Id<"lessons">;
    if (existing) {
      lessonId = existing._id;
      await ctx.db.patch(lessonId, {
        title: args.title,
        source: args.source,
        notes: args.notes,
        updatedAt: now,
      });
      const oldSentences = await ctx.db
        .query("sentences")
        .withIndex("by_lesson_order", (q) => q.eq("lessonId", lessonId))
        .collect();
      for (const sentence of oldSentences) {
        await ctx.db.delete(sentence._id);
      }
    } else {
      lessonId = await ctx.db.insert("lessons", {
        date: args.date,
        title: args.title,
        source: args.source,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let index = 0; index < args.sentences.length; index++) {
      const sentence = args.sentences[index];
      await ctx.db.insert("sentences", {
        lessonId,
        order: index + 1,
        original: sentence.original,
        corrected: sentence.corrected,
        explanation: sentence.explanation,
        naturalAlternative: sentence.naturalAlternative,
        status: sentence.status,
        tags: sentence.tags ?? [],
        createdAt: now,
        updatedAt: now,
      });
    }
    return { lessonId, sentenceCount: args.sentences.length };
  },
});
