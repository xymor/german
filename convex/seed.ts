import { mutation } from "./_generated/server";

const lessons = [
  {
    date: "20260709",
    title: "Daily sentence practice",
    source: "Telegram → Notion German/Lições",
    notes: "Seed lesson imported from the static site prototype.",
    sentences: [
      { original: "Da du Vegetarier bist, was für Zutaten verwendest du?", corrected: "Da du Vegetarier bist, welche Zutaten verwendest du?", status: "minor", explanation: "Correct and understandable. ‘Welche Zutaten’ is a little cleaner than ‘was für Zutaten’ in this context.", tags: ["naturalness"] },
      { original: "Wir müssen uns bemühen, das Projekt heute zu beenden.", corrected: "Wir müssen uns bemühen, das Projekt heute zu beenden.", status: "correct", explanation: "Good use of ‘sich bemühen’ + infinitive clause.", tags: ["verb pattern"] },
      { original: "Die Serie ist gestern zu Ende gegangen.", corrected: "Die Serie ist gestern zu Ende gegangen.", status: "correct", explanation: "Natural way to say a show/series ended.", tags: ["natural phrasing"] },
      { original: "Kohlenstoff verwandelt sich in Pflanzen.", corrected: "Kohlenstoff wird von Pflanzen aufgenommen.", status: "fix", explanation: "The original is grammatically possible but scientifically/naturally odd. Use passive or ‘umgewandelt’ depending on meaning.", tags: ["word choice"] },
      { original: "Ich glaube, ich habe diesen Level bis das Ende gespielt.", corrected: "Ich glaube, ich habe dieses Level bis zum Ende gespielt.", status: "fix", explanation: "‘Level’ is usually neuter: dieses Level. Use ‘bis zum Ende’, not ‘bis das Ende’.", tags: ["case", "preposition"] },
      { original: "Das macht mir Angst, weil es im All viel Gefahr gibt.", corrected: "Das macht mir Angst, weil es im All viele Gefahren gibt.", status: "fix", explanation: "More natural plural: ‘viele Gefahren’. Countable dangers use plural.", tags: ["plural", "naturalness"] },
      { original: "Wenn du vergisst, genügend Verbindungen zubauen, passieren lustige Dinge.", corrected: "Wenn du vergisst, genügend Verbindungen zu bauen, passieren lustige Dinge.", status: "fix", explanation: "Separate infinitive marker: ‘zu bauen’, not ‘zubauen’ here.", tags: ["spelling", "verb prefix"] },
    ],
  },
  {
    date: "20260707",
    title: "Correction practice",
    source: "Telegram → Notion German/Lições",
    notes: "Earlier correction practice imported from the static site prototype.",
    sentences: [
      { original: "Die Serie endet heute.", corrected: "Die Serie endet heute.", status: "correct", explanation: "Correct.", tags: ["present tense"] },
      { original: "Die Serie ist gestern beendet worden.", corrected: "Die Serie ist gestern zu Ende gegangen.", status: "minor", explanation: "The passive is grammatical, but ‘zu Ende gegangen’ is more natural for a series ending.", tags: ["naturalness"] },
      { original: "Ich habe mich nicht daran erinnert.", corrected: "Ich konnte mich nicht daran erinnern.", status: "minor", explanation: "Both work. The modal version is often more idiomatic for ‘I couldn’t remember’.", tags: ["modal verb"] },
      { original: "Ich konnte die Gelegenheit nicht erhgre.", corrected: "Ich konnte die Gelegenheit nicht ergreifen.", status: "fix", explanation: "Spelling: ‘ergreifen’. Common phrase: eine Gelegenheit ergreifen.", tags: ["spelling", "collocation"] },
      { original: "man braucht weder muhe noch Intelligenz.", corrected: "Man braucht weder Mühe noch Intelligenz.", status: "fix", explanation: "Capitalize sentence start and noun: Man, Mühe. Remember the umlaut.", tags: ["capitalization", "spelling"] },
      { original: "Mithilfe dieser Software lassen sich Tabellen erstellen.", corrected: "Mithilfe dieser Software lassen sich Tabellen erstellen.", status: "correct", explanation: "Good ‘lassen sich’ construction for possibility/passive meaning.", tags: ["lassen sich"] },
    ],
  },
] as const;

const cards = [
  { prompt: "Fix: Ich habe diesen Level bis das Ende gespielt.", answer: "Ich habe dieses Level bis zum Ende gespielt.", cardType: "fix_sentence", tags: ["case", "preposition"] },
  { prompt: "Choose: zu bauen or zubauen? — genügend Verbindungen ___", answer: "zu bauen. ‘zubauen’ means to build closed/blocked up.", cardType: "choose", tags: ["verb prefix"] },
  { prompt: "Make it natural: Kohlenstoff verwandelt sich in Pflanzen.", answer: "Kohlenstoff wird von Pflanzen aufgenommen / in Pflanzenmaterial umgewandelt.", cardType: "fix_sentence", tags: ["word choice"] },
  { prompt: "Correct spelling: erhgre", answer: "ergreifen — eine Gelegenheit ergreifen.", cardType: "note", tags: ["spelling"] },
  { prompt: "Correct: man braucht weder muhe noch Geld.", answer: "Man braucht weder Mühe noch Geld.", cardType: "fix_sentence", tags: ["capitalization", "spelling"] },
] as const;

export const initialData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const lesson of await ctx.db.query("lessons").collect()) await ctx.db.delete(lesson._id);
    for (const sentence of await ctx.db.query("sentences").collect()) await ctx.db.delete(sentence._id);
    for (const card of await ctx.db.query("reviewCards").collect()) await ctx.db.delete(card._id);

    for (const lesson of lessons) {
      const lessonId = await ctx.db.insert("lessons", { date: lesson.date, title: lesson.title, source: lesson.source, notes: lesson.notes, createdAt: now, updatedAt: now });
      for (let i = 0; i < lesson.sentences.length; i++) {
        const sentence = lesson.sentences[i];
        await ctx.db.insert("sentences", { lessonId, order: i + 1, original: sentence.original, corrected: sentence.corrected, explanation: sentence.explanation, status: sentence.status, tags: [...sentence.tags], createdAt: now, updatedAt: now });
      }
    }
    for (const card of cards) {
      await ctx.db.insert("reviewCards", { prompt: card.prompt, answer: card.answer, cardType: card.cardType, tags: [...card.tags], createdAt: now, updatedAt: now });
    }
    return { lessonCount: lessons.length, cardCount: cards.length };
  },
});
