const KEY = 'habits_v1';
const EMOJIS = ['📚', '🏃', '💧', '🧘', '🥗', '😴', '💪', '🎸', '🧹', '💊', '✍️', '🚭', '🌱', '💻', '🙏', '🚶'];
const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899', '#eab308', '#14b8a6', '#ef4444'];
const $ = (s) => document.querySelector(s);

// ---------- Даты ----------
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayISO = () => iso(new Date());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// ---------- Данные ----------
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d) return d;
  } catch { /* ignore */ }
  return demo();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ } }

function demo() {
  const habits = [
    { id: 'h1', name: 'Читать 20 минут', emoji: '📚', color: '#a855f7', done: [] },
    { id: 'h2', name: 'Выпить 2 л воды', emoji: '💧', color: '#3b82f6', done: [] },
    { id: 'h3', name: 'Зарядка', emoji: '💪', color: '#f97316', done: [] },
    { id: 'h4', name: 'Лечь до 23:00', emoji: '😴', color: '#14b8a6', done: [] },
  ];
  const rates = [0.75, 0.85, 0.55, 0.45];
  const start = new Date();
  for (let i = 1; i < 150; i++) {
    const day = iso(addDays(start, -i));
    habits.forEach((h, k) => { if (Math.random() < rates[k] + (i < 14 ? 0.15 : 0)) h.done.push(day); });
  }
  return { habits };
}

let data = load();
let selected = todayISO();
let editingId = null;

const isDone = (h, day) => h.done.includes(day);
function toggle(h, day) {
  if (isDone(h, day)) h.done = h.done.filter((d) => d !== day);
  else h.done.push(day);
  save();
}

/** Текущая серия: сколько дней подряд до сегодня (если сегодня не отмечено — считаем со вчера). */
function streak(h) {
  const set = new Set(h.done);
  let d = new Date();
  if (!set.has(iso(d))) d = addDays(d, -1);
  let n = 0;
  while (set.has(iso(d))) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak(h) {
  const days = [...h.done].sort();
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const day of days) {
    cur = prev && iso(addDays(parse(prev), 1)) === day ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = day;
  }
  return best;
}
const rate30 = (h) => {
  const set = new Set(h.done);
  let n = 0;
  for (let i = 0; i < 30; i++) if (set.has(iso(addDays(new Date(), -i)))) n++;
  return Math.round((n / 30) * 100);
};

// ---------- Отрисовка ----------
function renderHeader() {
  const s = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#today').textContent = s[0].toUpperCase() + s.slice(1);
  const total = data.habits.length;
  const done = data.habits.filter((h) => isDone(h, selected)).length;
  $('#ringText').textContent = `${done}/${total}`;
  const len = 2 * Math.PI * 19;
  $('#ringFill').style.strokeDasharray = len;
  $('#ringFill').style.strokeDashoffset = total ? len * (1 - done / total) : len;
}

function renderWeek() {
  const today = new Date();
  $('#week').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    const day = iso(d);
    const done = data.habits.filter((h) => isDone(h, day)).length;
    const full = data.habits.length && done === data.habits.length;
    return `<button class="day ${day === selected ? 'is-active' : ''} ${full ? 'is-full' : ''}" data-day="${day}">
      <small>${d.toLocaleDateString('ru-RU', { weekday: 'short' })}</small>
      <b>${d.getDate()}</b>
      <i style="--p:${data.habits.length ? done / data.habits.length : 0}"></i>
    </button>`;
  }).join('');
}

function renderList() {
  if (!data.habits.length) {
    $('#list').innerHTML = '<div class="empty">🌱<p>Добавьте первую привычку — начните с малого.</p></div>';
    return;
  }
  $('#list').innerHTML = data.habits.map((h) => {
    const done = isDone(h, selected);
    const s = streak(h);
    return `<article class="habit ${done ? 'is-done' : ''}" style="--c:${h.color}">
      <button class="habit__check" data-toggle="${h.id}" aria-pressed="${done}" aria-label="Отметить «${h.name}»">${done ? '✓' : h.emoji}</button>
      <button class="habit__info" data-edit="${h.id}">
        <b>${escapeHTML(h.name)}</b>
        <span>${s ? `🔥 ${s} ${plural(s, 'день', 'дня', 'дней')} подряд` : 'Серия не начата'} · ${rate30(h)}% за месяц · рекорд ${bestStreak(h)}</span>
      </button>
    </article>`;
  }).join('');
}

function renderHeat() {
  const sel = $('#heatSelect');
  const value = sel.value || 'all';
  sel.innerHTML = `<option value="all">Все привычки</option>${data.habits.map((h) => `<option value="${h.id}">${h.emoji} ${escapeHTML(h.name)}</option>`).join('')}`;
  sel.value = [...sel.options].some((o) => o.value === value) ? value : 'all';
  const list = sel.value === 'all' ? data.habits : data.habits.filter((h) => h.id === sel.value);
  const color = list.length === 1 ? list[0].color : '#22c55e';

  // 26 недель, колонки — недели (пн..вс)
  const today = new Date();
  const shift = (today.getDay() + 6) % 7; // 0 = понедельник
  const start = addDays(today, -(25 * 7 + shift));
  const cells = [];
  for (let i = 0; i < 26 * 7; i++) {
    const d = addDays(start, i);
    if (d > today) { cells.push('<i class="is-future"></i>'); continue; }
    const day = iso(d);
    const n = list.filter((h) => isDone(h, day)).length;
    const level = list.length ? Math.ceil((n / list.length) * 4) : 0;
    cells.push(`<i class="l${level}" style="--c:${color}" title="${d.toLocaleDateString('ru-RU')}: ${n}/${list.length}"></i>`);
  }
  $('#heat').innerHTML = cells.join('');
  $('#heat').style.setProperty('--c', color);
  document.querySelector('.heat-legend').style.setProperty('--c', color);
}

function render() { renderHeader(); renderWeek(); renderList(); renderHeat(); }

const plural = (n, one, few, many) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};
const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Форма ----------
const form = $('#form');
let pick = { emoji: EMOJIS[0], color: COLORS[0] };

function renderPickers() {
  $('#emojis').innerHTML = EMOJIS.map((e) => `<button type="button" class="${e === pick.emoji ? 'is-active' : ''}" data-emoji="${e}">${e}</button>`).join('');
  $('#colors').innerHTML = COLORS.map((c) => `<button type="button" class="${c === pick.color ? 'is-active' : ''}" data-color="${c}" style="--c:${c}" aria-label="Цвет ${c}"></button>`).join('');
}

function openForm(h = null) {
  editingId = h?.id ?? null;
  pick = { emoji: h?.emoji ?? EMOJIS[Math.floor(Math.random() * EMOJIS.length)], color: h?.color ?? COLORS[data.habits.length % COLORS.length] };
  form.name.value = h?.name ?? '';
  $('#formTitle').textContent = h ? 'Изменить привычку' : 'Новая привычка';
  $('#deleteBtn').hidden = !h;
  renderPickers();
  $('#sheet').hidden = false;
  setTimeout(() => form.name.focus(), 50);
}
const closeForm = () => { $('#sheet').hidden = true; };

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  if (!name) return;
  if (editingId) Object.assign(data.habits.find((h) => h.id === editingId), { name, ...pick });
  else data.habits.push({ id: `h${Date.now()}`, name, ...pick, done: [] });
  save();
  closeForm();
  render();
});

$('#emojis').addEventListener('click', (e) => { const b = e.target.closest('[data-emoji]'); if (b) { pick.emoji = b.dataset.emoji; renderPickers(); } });
$('#colors').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (b) { pick.color = b.dataset.color; renderPickers(); } });
$('#cancelBtn').onclick = closeForm;
$('#deleteBtn').onclick = () => {
  const h = data.habits.find((x) => x.id === editingId);
  if (h && confirm(`Удалить «${h.name}» и всю историю?`)) {
    data.habits = data.habits.filter((x) => x.id !== editingId);
    save();
    closeForm();
    render();
  }
};
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeForm(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeForm(); });

// ---------- События ----------
$('#addBtn').onclick = () => openForm();
$('#week').addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) { selected = b.dataset.day; render(); } });
$('#list').addEventListener('click', (e) => {
  const t = e.target.closest('[data-toggle]');
  if (t) {
    const h = data.habits.find((x) => x.id === t.dataset.toggle);
    toggle(h, selected);
    render();
    if (isDone(h, selected)) document.querySelector(`[data-toggle="${h.id}"]`).classList.add('pop');
    return;
  }
  const ed = e.target.closest('[data-edit]');
  if (ed) openForm(data.habits.find((x) => x.id === ed.dataset.edit));
});
$('#heatSelect').addEventListener('change', renderHeat);

render();
