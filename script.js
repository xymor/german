const lessons = [
  {
    date: "20260709",
    title: "Daily sentence practice",
    source: "Saved from Telegram → Notion German/Lições",
    sentences: [
      {o:"Da du Vegetarier bist, was für Zutaten verwendest du?", c:"Da du Vegetarier bist, welche Zutaten verwendest du?", s:"minor", e:"Correct and understandable. ‘Welche Zutaten’ is a little cleaner than ‘was für Zutaten’ in this context.", tags:["naturalness"]},
      {o:"Wir müssen uns bemühen, das Projekt heute zu beenden.", c:"Wir müssen uns bemühen, das Projekt heute zu beenden.", s:"correct", e:"Good use of ‘sich bemühen’ + infinitive clause.", tags:["verb pattern"]},
      {o:"Die Serie ist gestern zu Ende gegangen.", c:"Die Serie ist gestern zu Ende gegangen.", s:"correct", e:"Natural way to say a show/series ended.", tags:["natural phrasing"]},
      {o:"Kohlenstoff verwandelt sich in Pflanzen.", c:"Kohlenstoff wird von Pflanzen aufgenommen.", s:"fix", e:"The original is grammatically possible but scientifically/naturally odd. Use passive or ‘umgewandelt’ depending on meaning.", tags:["word choice"]},
      {o:"Ich glaube, ich habe diesen Level bis das Ende gespielt.", c:"Ich glaube, ich habe dieses Level bis zum Ende gespielt.", s:"fix", e:"‘Level’ is usually neuter: dieses Level. Use ‘bis zum Ende’, not ‘bis das Ende’. ", tags:["case","preposition"]},
      {o:"Das macht mir Angst, weil es im All viel Gefahr gibt.", c:"Das macht mir Angst, weil es im All viele Gefahren gibt.", s:"fix", e:"More natural plural: ‘viele Gefahren’. ‘Gefahr’ as singular is abstract, but countable dangers use plural.", tags:["plural","naturalness"]},
      {o:"Wenn du vergisst, genügend Verbindungen zubauen, passieren lustige Dinge.", c:"Wenn du vergisst, genügend Verbindungen zu bauen, passieren lustige Dinge.", s:"fix", e:"Separate infinitive marker: ‘zu bauen’, not ‘zubauen’ here. ‘zubauen’ exists but means to build something closed/blocked up.", tags:["spelling","verb prefix"]}
    ]
  },
  {
    date: "20260707",
    title: "Correction practice",
    source: "Saved from Telegram → Notion German/Lições",
    sentences: [
      {o:"Die Serie endet heute.", c:"Die Serie endet heute.", s:"correct", e:"Correct.", tags:["present tense"]},
      {o:"Die Serie ist gestern beendet worden.", c:"Die Serie ist gestern zu Ende gegangen.", s:"minor", e:"The passive is grammatical, but ‘zu Ende gegangen’ is more natural for a series ending.", tags:["naturalness"]},
      {o:"Ich habe mich nicht daran erinnert.", c:"Ich konnte mich nicht daran erinnern.", s:"minor", e:"Both work. The modal version is often more idiomatic for ‘I couldn’t remember’. ", tags:["modal verb"]},
      {o:"Ich konnte die Gelegenheit nicht erhgre.", c:"Ich konnte die Gelegenheit nicht ergreifen.", s:"fix", e:"Spelling: ‘ergreifen’. Common phrase: eine Gelegenheit ergreifen.", tags:["spelling","collocation"]},
      {o:"man braucht weder muhe noch Intelligenz.", c:"Man braucht weder Mühe noch Intelligenz.", s:"fix", e:"Capitalize sentence start and noun: Man, Mühe. Remember the umlaut.", tags:["capitalization","spelling"]},
      {o:"Mithilfe dieser Software lassen sich Tabellen erstellen.", c:"Mithilfe dieser Software lassen sich Tabellen erstellen.", s:"correct", e:"Good ‘lassen sich’ construction for possibility/passive meaning.", tags:["lassen sich"]}
    ]
  }
];

const vocab = [
  ["sich bemühen", "to make an effort", "Wir müssen uns bemühen, das Projekt zu beenden."],
  ["verehren", "to worship / revere", "Sie kommen hierher, um das Kreuz zu verehren."],
  ["verwenden", "to use", "Welche Zutaten verwendest du?"],
  ["regulieren", "to regulate", "Regeln können den Handel regulieren."],
  ["sich entwickeln", "to develop", "Daraus entwickelt sich ein Teufelskreis."],
  ["mieten", "to rent", "Wir möchten einen Server mieten."],
  ["verpassen", "to miss", "Ich darf diese Gelegenheit nicht verpassen."],
  ["sich hinsetzen", "to sit down", "Möchtest du dich hinsetzen?"],
  ["sich hinlegen", "to lie down", "Oder möchtest du dich hinlegen?"],
];

const reviewCards = [
  {p:"Fix: Ich habe diesen Level bis das Ende gespielt.", a:"Ich habe dieses Level bis zum Ende gespielt."},
  {p:"Choose: zu bauen or zubauen? — genügend Verbindungen ___", a:"zu bauen. ‘zubauen’ means to build closed/blocked up."},
  {p:"Make it natural: Kohlenstoff verwandelt sich in Pflanzen.", a:"Kohlenstoff wird von Pflanzen aufgenommen / in Pflanzenmaterial umgewandelt."},
  {p:"Correct spelling: erhgre", a:"ergreifen — eine Gelegenheit ergreifen."},
  {p:"Correct: man braucht weder muhe noch Geld.", a:"Man braucht weder Mühe noch Geld."}
];

const lessonSelect = document.querySelector('#lessonSelect');
const sentenceCards = document.querySelector('#sentenceCards');
const lessonMeta = document.querySelector('#lessonMeta');
const vocabGrid = document.querySelector('#vocabGrid');
const reviewPrompt = document.querySelector('#reviewPrompt');
const reviewAnswer = document.querySelector('#reviewAnswer');

function statusLabel(status) {
  return status === 'correct' ? 'correct' : status === 'minor' ? 'minor issue' : 'needs correction';
}

function renderLesson(index = 0) {
  const lesson = lessons[index];
  lessonMeta.textContent = `${lesson.date} · ${lesson.title} · ${lesson.sentences.length} highlighted cards · ${lesson.source}`;
  sentenceCards.innerHTML = lesson.sentences.map((item, i) => `
    <article class="sentence-card">
      <div class="top"><strong>#${i + 1}</strong><span class="status ${item.s}">${statusLabel(item.s)}</span></div>
      <p class="original">${item.o}</p>
      <p class="corrected"><strong>Correction:</strong><br>${item.c}</p>
      <p class="explanation">${item.e}</p>
      <div class="tag-cloud">${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </article>
  `).join('');
}

function renderVocab() {
  vocabGrid.innerHTML = vocab.map(([de, en, ex]) => `
    <article class="vocab"><strong>${de}</strong><span>${en}</span><em>${ex}</em></article>
  `).join('');
}

function renderReview() {
  const card = reviewCards[Math.floor(Math.random() * reviewCards.length)];
  reviewPrompt.textContent = card.p;
  reviewAnswer.textContent = card.a;
}

lessons.forEach((lesson, index) => {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = lesson.date;
  lessonSelect.appendChild(option);
});
lessonSelect.addEventListener('change', e => renderLesson(Number(e.target.value)));
document.querySelector('#newReview').addEventListener('click', renderReview);
renderLesson(0);
renderVocab();
renderReview();
