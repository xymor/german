import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  lessons: defineTable({
    date: v.string(),
    title: v.string(),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_date", ["date"]),

  sentences: defineTable({
    lessonId: v.id("lessons"),
    order: v.number(),
    original: v.string(),
    corrected: v.optional(v.string()),
    explanation: v.optional(v.string()),
    naturalAlternative: v.optional(v.string()),
    status: v.union(v.literal("correct"), v.literal("minor"), v.literal("fix"), v.literal("unreviewed")),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_lesson_order", ["lessonId", "order"]),

  reviewCards: defineTable({
    sourceSentenceId: v.optional(v.id("sentences")),
    lessonId: v.optional(v.id("lessons")),
    prompt: v.string(),
    answer: v.string(),
    cardType: v.union(v.literal("fix_sentence"), v.literal("choose"), v.literal("fill_blank"), v.literal("translate"), v.literal("note")),
    dueDate: v.optional(v.string()),
    difficulty: v.optional(v.union(v.literal("again"), v.literal("hard"), v.literal("good"), v.literal("easy"))),
    intervalDays: v.optional(v.number()),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_due_date", ["dueDate"]),
});
