const CONVEX_SITE_URL = "https://dapper-owl-146.convex.site";

const fallbackLessons = [
  {
    date: "20260709",
    title: "Daily sentence practice",
    source: "Local fallback data",
    sentences: [
      { original:"Da du Vegetarier bist, was für Zutaten verwendest du?", corrected:"Da du Vegetarier bist, welche Zutaten verwendest du?", status:"minor", explanation:"Correct and understandable. ‘Welche Zutaten’ is a little cleaner than ‘was für Zutaten’ in this context.", tags:["naturalness"] },
      { original:"Ich glaube, ich habe diesen Level bis das Ende gespielt.", corrected:"Ich glaube, ich habe dieses Level bis zum Ende gespielt.", status:"fix", explanation:"‘Level’ is usually neuter: dieses Level. Use ‘bis zum Ende’, not ‘bis das Ende’. ", tags:["case","preposition"] }
    ]
  }
];

const fallbackCards = [
  { prompt:"Fix: Ich habe diesen Level bis das Ende gespielt.", answer:"Ich habe dieses Level bis zum Ende gespielt.", cardType:"fix_sentence", tags:["case","preposition"] },
  { prompt:"Choose: zu bauen or zubauen? — genügend Verbindungen ___", answer:"zu bauen. ‘zubauen’ means to build closed/blocked up.", cardType:"choose", tags:["verb prefix"] }
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
  ["sich hinlegen", "to lie down", "Oder möchtest du dich hinlegen?"]
];

let lessons = [];
let reviewCards = [];
let currentReview = null;
let reviewIndex = 0;

const lessonSelect = document.querySelector('#lessonSelect');
const sentenceCards = document.querySelector('#sentenceCards');
const lessonMeta = document.querySelector('#lessonMeta');
const vocabGrid = document.querySelector('#vocabGrid');
const reviewPrompt = document.querySelector('#reviewPrompt');
const reviewAnswer = document.querySelector('#reviewAnswer');
const dataStatus = document.querySelector('#dataStatus');
const addLessonForm = document.querySelector('#addLessonForm');
const statLessons = document.querySelector('#statLessons');
const statCards = document.querySelector('#statCards');
const statFocusTags = document.querySelector('#statFocusTags');
const focusTagCloud = document.querySelector('#focusTagCloud');

async function convexFetch(path, options = {}) {
  const response = await fetch(`${CONVEX_SITE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error || `Convex request failed: ${response.status}`);
  return data;
}

async function loadData() {
  try {
    dataStatus.textContent = 'Loading lessons and cards from Convex…';
    const [loadedLessons, loadedCards] = await Promise.all([
      convexFetch('/lessons'),
      convexFetch('/cards'),
    ]);
    lessons = loadedLessons.length ? loadedLessons : fallbackLessons;
    reviewCards = loadedCards.length ? loadedCards : fallbackCards;
    dataStatus.textContent = `Connected to Convex · ${lessons.length} lessons · ${reviewCards.length} review cards`;
  } catch (error) {
    lessons = fallbackLessons;
    reviewCards = fallbackCards;
    dataStatus.textContent = `Convex unavailable; showing local fallback data. ${error.message}`;
  }
  renderDashboardStats();
  renderLessonOptions();
  renderLesson(0);
  reviewIndex = 0;
  renderReview();
}

function renderDashboardStats() {
  const focusTags = getFocusTags();
  statLessons.textContent = String(lessons.length);
  statCards.textContent = String(reviewCards.length);
  statFocusTags.textContent = String(focusTags.length);
  focusTagCloud.innerHTML = focusTags.slice(0, 12).map(({ tag, count }) => `
    <span>${escapeHtml(tag)} <small>${count}</small></span>
  `).join('') || '<span>No focus tags yet</span>';
}

function getFocusTags() {
  const counts = new Map();
  const addTag = (tag, weight = 1) => {
    const normalized = String(tag || '').trim().toLowerCase();
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) || 0) + weight);
  };
  lessons.forEach(lesson => (lesson.tags || []).forEach(tag => addTag(tag, 1)));
  reviewCards.forEach(card => (card.tags || []).forEach(tag => addTag(tag, Number(card.priority || 1))));
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count: Math.round(count * 10) / 10 }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function statusLabel(status) {
  return status === 'correct' ? 'correct' : status === 'minor' ? 'minor issue' : status === 'fix' ? 'needs correction' : 'unreviewed';
}

function statusClass(status) {
  return status === 'correct' ? 'correct' : status === 'minor' ? 'minor' : status === 'fix' ? 'fix' : 'unreviewed';
}

function renderLessonOptions() {
  lessonSelect.innerHTML = '';
  lessons.forEach((lesson, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = lesson.order ? `${lesson.order}. ${lesson.title}` : (lesson.date || lesson.title);
    lessonSelect.appendChild(option);
  });
}

async function renderLesson(index = 0) {
  const lesson = lessons[index];
  if (!lesson) {
    lessonMeta.textContent = 'No lessons yet.';
    sentenceCards.innerHTML = '';
    return;
  }
  const sortedSentences = [...(lesson.sentences || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const priority = Number(lesson.priority ?? 1).toFixed(2);
  lessonMeta.textContent = `${lesson.order ? `#${lesson.order} · ` : ''}${lesson.title} · priority ${priority} · ${lesson.source || 'Convex'}`;
  if (sortedSentences.length) {
    sentenceCards.innerHTML = sortedSentences.map((item, i) => `
      <article class="sentence-card">
        <div class="top"><strong>#${item.order || i + 1}</strong><span class="status ${statusClass(item.status)}">${statusLabel(item.status)}</span></div>
        <p class="original">${escapeHtml(item.original)}</p>
        <p class="corrected"><strong>Correction:</strong><br>${escapeHtml(item.corrected || 'Awaiting correction')}</p>
        <p class="explanation">${escapeHtml(item.explanation || 'No explanation yet.')}</p>
        <div class="tag-cloud">${(item.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      </article>
    `).join('');
    return;
  }
  if (lesson.jsonPath) {
    sentenceCards.innerHTML = '<article class="sentence-card"><p class="muted">Loading lesson JSON from GitHub Pages…</p></article>';
    try {
      const response = await fetch(lesson.jsonPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      sentenceCards.innerHTML = `
        <article class="lesson-article sentence-card wide">
          <header class="lesson-article__header">
            <div>
              <span class="eyebrow">Structured lesson</span>
              <h3>${escapeHtml(data.title || lesson.title)}</h3>
              <p class="lesson-source">${escapeHtml(lesson.jsonPath)}</p>
            </div>
            <span class="status correct">JSON lesson</span>
          </header>
          <div class="lesson-tags">${(data.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
          <div class="lesson-content">${markdownToLessonHtml(data.markdown || '')}</div>
        </article>`;
    } catch (error) {
      sentenceCards.innerHTML = `<article class="sentence-card"><p class="explanation">Could not load ${escapeHtml(lesson.jsonPath)}: ${escapeHtml(error.message)}</p></article>`;
    }
    return;
  }
  sentenceCards.innerHTML = '<article class="sentence-card"><p class="muted">No lesson body or sentence cards available.</p></article>';
}

function renderVocab() {
  vocabGrid.innerHTML = vocab.map(([de, en, ex]) => `
    <article class="vocab"><strong>${escapeHtml(de)}</strong><span>${escapeHtml(en)}</span><em>${escapeHtml(ex)}</em></article>
  `).join('');
}

function renderReview(offset = 0) {
  if (!reviewCards.length) {
    reviewPrompt.textContent = 'No review cards yet.';
    reviewAnswer.textContent = '';
    currentReview = null;
    reviewIndex = 0;
    return;
  }
  reviewIndex = (reviewIndex + offset + reviewCards.length) % reviewCards.length;
  currentReview = reviewCards[reviewIndex];
  const priority = Number(currentReview.priority ?? 2);
  const score = Number(currentReview.reviewScore ?? 0);
  reviewPrompt.textContent = currentReview.prompt;
  reviewAnswer.textContent = currentReview.answer;
  dataStatus.textContent = `${dataStatus.textContent.replace(/ · Showing.*/, '')} · Showing priority ${priority.toFixed(1)} / score ${score.toFixed(2)}`;
}

async function rateCurrentCard(difficulty) {
  if (!currentReview?._id) {
    dataStatus.textContent = 'This fallback card is not stored in Convex.';
    return;
  }
  try {
    const result = await convexFetch('/cards/rate', {
      method: 'POST',
      body: JSON.stringify({ id: currentReview._id, difficulty }),
    });
    dataStatus.textContent = `Card rated ${difficulty}; next due ${result.dueDate}.`;
    await loadData();
  } catch (error) {
    dataStatus.textContent = `Could not rate card: ${error.message}`;
  }
}

function parseSentences(raw) {
  return raw.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+[.)]\s*/, ''))
    .map(original => ({ original, status: 'unreviewed', tags: [] }));
}

async function handleAddLesson(event) {
  event.preventDefault();
  const form = new FormData(addLessonForm);
  const date = String(form.get('date') || '').trim();
  const title = String(form.get('title') || 'Daily practice').trim();
  const raw = String(form.get('sentences') || '').trim();
  const sentences = parseSentences(raw);
  if (!/^\d{8}$/.test(date) || !sentences.length) {
    dataStatus.textContent = 'Use date format YYYYMMDD and add at least one sentence.';
    return;
  }
  try {
    dataStatus.textContent = 'Saving lesson to Convex…';
    await convexFetch('/lessons', {
      method: 'POST',
      body: JSON.stringify({ date, title, source: 'GitHub Pages form', sentences }),
    });
    addLessonForm.reset();
    dataStatus.textContent = 'Lesson saved to Convex.';
    await loadData();
  } catch (error) {
    dataStatus.textContent = `Could not save lesson: ${error.message}`;
  }
}

function markdownToLessonHtml(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 5);
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const { tableHtml, nextIndex } = renderMarkdownTable(lines, index);
      html.push(tableHtml);
      index = nextIndex;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(`<li>${formatInline(lines[index].trim().replace(/^[-*]\s+/, ''))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(`<li>${formatInline(lines[index].trim().replace(/^\d+[.)]\s+/, ''))}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quotes = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quotes.push(formatInline(lines[index].trim().replace(/^>\s?/, '')));
        index += 1;
      }
      html.push(`<blockquote>${quotes.join('<br>')}</blockquote>`);
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+[.)]\s+/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index].trim()) &&
      !isMarkdownTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${formatInline(paragraph.join(' '))}</p>`);
  }

  return html.join('');
}

function isMarkdownTableStart(lines, index) {
  return Boolean(
    lines[index]?.includes('|') &&
    lines[index + 1] &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function renderMarkdownTable(lines, startIndex) {
  const headerCells = splitTableRow(lines[startIndex]);
  let index = startIndex + 2;
  const rows = [];
  while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
    rows.push(splitTableRow(lines[index]));
    index += 1;
  }
  const thead = `<thead><tr>${headerCells.map(cell => `<th>${formatInline(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(row => `<tr>${headerCells.map((_, cellIndex) => `<td>${formatInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return { tableHtml: `<div class="lesson-table-wrap"><table>${thead}${tbody}</table></div>`, nextIndex: index };
}

function splitTableRow(row) {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

lessonSelect.addEventListener('change', e => renderLesson(Number(e.target.value)));
document.querySelector('#newReview').addEventListener('click', () => renderReview(1));
document.querySelectorAll('[data-rate]').forEach(button => button.addEventListener('click', () => rateCurrentCard(button.dataset.rate)));
addLessonForm.addEventListener('submit', handleAddLesson);
renderVocab();
loadData();
