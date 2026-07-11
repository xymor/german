import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const DAY_MS = 86_400_000;
const DEFAULT_LESSON_PRIORITY = 1;

const status = v.union(v.literal("correct"), v.literal("minor"), v.literal("fix"), v.literal("unreviewed"));

const sentenceInput = v.object({
  original: v.string(),
  corrected: v.optional(v.string()),
  explanation: v.optional(v.string()),
  naturalAlternative: v.optional(v.string()),
  status,
  tags: v.optional(v.array(v.string())),
});

const jsonLessonInput = v.object({
  slug: v.string(),
  order: v.number(),
  title: v.string(),
  sourceMarkdownFile: v.string(),
  jsonPath: v.string(),
  jsonUrl: v.optional(v.string()),
  contentHash: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
});

function lessonScore(lesson: { priority?: number; lastReviewedAt?: number; createdAt?: number }, now: number) {
  const priority = lesson.priority ?? DEFAULT_LESSON_PRIORITY;
  const lastReviewedAt = lesson.lastReviewedAt ?? lesson.createdAt ?? 0;
  const ageDays = Math.max(0.01, (now - lastReviewedAt) / DAY_MS);
  return ageDays * priority;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const lessons = await ctx.db.query("lessons").collect();
    const enriched = lessons
      .map((lesson) => ({
        ...lesson,
        priority: lesson.priority ?? DEFAULT_LESSON_PRIORITY,
        refreshCount: lesson.refreshCount ?? 0,
        reviewScore: lessonScore(lesson, now),
      }))
      .sort((a, b) => {
        if ((a.order ?? 999) !== (b.order ?? 999)) return (a.order ?? 999) - (b.order ?? 999);
        return String(b.date).localeCompare(String(a.date));
      });
    return await Promise.all(
      enriched.map(async (lesson) => ({
        ...lesson,
        sentences: await ctx.db
          .query("sentences")
          .withIndex("by_lesson_order", (q) => q.eq("lessonId", lesson._id))
          .collect(),
      })),
    );
  },
});

export const reviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const lessons = await ctx.db.query("lessons").collect();
    return lessons
      .map((lesson) => ({
        ...lesson,
        priority: lesson.priority ?? DEFAULT_LESSON_PRIORITY,
        refreshCount: lesson.refreshCount ?? 0,
        reviewScore: lessonScore(lesson, now),
      }))
      .sort((a, b) => {
        if (b.reviewScore !== a.reviewScore) return b.reviewScore - a.reviewScore;
        return (a.lastReviewedAt ?? a.createdAt) - (b.lastReviewedAt ?? b.createdAt);
      });
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
        priority: DEFAULT_LESSON_PRIORITY,
        refreshCount: 0,
        tags: [],
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

export const importJsonLessons = mutation({
  args: { lessons: v.array(jsonLessonInput) },
  handler: async (ctx, { lessons }) => {
    const now = Date.now();
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const lesson of lessons) {
      seen.add(lesson.slug);
      const existing = await ctx.db.query("lessons").withIndex("by_slug", (q) => q.eq("slug", lesson.slug)).unique();
      const patch = {
        date: lesson.slug,
        slug: lesson.slug,
        order: lesson.order,
        title: lesson.title,
        source: "GitHub JSON lesson archive",
        sourceMarkdownFile: lesson.sourceMarkdownFile,
        jsonPath: lesson.jsonPath,
        jsonUrl: lesson.jsonUrl,
        contentHash: lesson.contentHash,
        tags: lesson.tags ?? [],
        priority: existing?.priority ?? DEFAULT_LESSON_PRIORITY,
        refreshCount: existing?.refreshCount ?? 0,
        lastReviewedAt: existing?.lastReviewedAt,
        reviewScore: existing ? lessonScore(existing, now) : 0.01 * DEFAULT_LESSON_PRIORITY,
        notes: "Imported from daily Markdown lesson files as GitHub JSON.",
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        updated += 1;
      } else {
        await ctx.db.insert("lessons", { ...patch, createdAt: now });
        created += 1;
      }
    }

    // Delete obsolete JSON-backed lessons that disappeared from the archive, but keep manually-added dated lessons.
    const existingJsonLessons = await ctx.db.query("lessons").collect();
    let removed = 0;
    for (const lesson of existingJsonLessons) {
      if (lesson.source === "GitHub JSON lesson archive" && lesson.slug && !seen.has(lesson.slug)) {
        await ctx.db.delete(lesson._id);
        removed += 1;
      }
    }

    return { imported: lessons.length, created, updated, removed };
  },
});

export const markReviewed = mutation({
  args: { id: v.id("lessons") },
  handler: async (ctx, { id }) => {
    const lesson = await ctx.db.get(id);
    if (!lesson) throw new Error("Lesson not found");
    const now = Date.now();
    const priority = Math.max(0.5, (lesson.priority ?? DEFAULT_LESSON_PRIORITY) * 0.75);
    await ctx.db.patch(id, {
      priority,
      lastReviewedAt: now,
      refreshCount: (lesson.refreshCount ?? 0) + 1,
      reviewScore: 0.01 * priority,
      updatedAt: now,
    });
    return { id, priority, lastReviewedAt: now, refreshCount: (lesson.refreshCount ?? 0) + 1 };
  },
});
