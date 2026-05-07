/* ─── STATE ──────────────────────────────────────────────────── */
let habits       = [];
let selectedEmoji = '⭐';
let selectedColor = '#EAF3DE';
let totalXP      = 0;
let currentTab   = 'today';

const EMOJIS = ['🏃','📚','💧','🧘','🎯','🏋','🎵','✍','🌿','😴','🥗','💪','🧠','🏊','📝','🧹','🚴','🐾','🌞','🫁'];
const COLORS  = ['#EAF3DE','#EEEDFE','#E1F5EE','#FAEEDA','#FAECE7','#E6F1FB'];

const BADGES = [
  { icon:'🔥', name:'أسبوع كامل',    desc:'7 أيام متتالية',         unlocked:true  },
  { icon:'💎', name:'ثابت كالصخرة', desc:'30 يوم متواصل',           unlocked:false },
  { icon:'🌅', name:'باكر الصحيان', desc:'10 عادات صباحية',         unlocked:true  },
  { icon:'📚', name:'القارئ المداوم',desc:'قرأت 30 مرة',            unlocked:true  },
  { icon:'🏆', name:'بطل الشهر',     desc:'100% إنجاز شهر كامل',   unlocked:false },
  { icon:'⚡', name:'سرعة البرق',    desc:'كل العادات في ساعة',      unlocked:false },
  { icon:'🌟', name:'نجم مكتمل',     desc:'وصلت Level 10',          unlocked:false },
  { icon:'🎯', name:'مئة في المئة',  desc:'100% لأسبوع كامل',       unlocked:false },
];

const MOOD_INSIGHTS = {
  '😔': 'لما مزاجك وحش بتكمل 40% فقط — ابدأ بأسهل عادة عندك.',
  '😐': 'في أيام المزاج العادي معدلك 70% — خطوة خطوة!',
  '🙂': 'مزاجك كويس = أداء أحسن! معدلك 82% في الأيام دي.',
  '😊': 'رائع! في الأيام دي معدلك 91%. كمّل!',
  '🤩': 'أيام العظمة! معدلك 98%. هتكمل كل حاجة النهارده 🏆',
};

/* ─── INIT ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setTodayDate();
  buildEmojiPicker();
  buildColorPicker();
  await loadHabits();
  await loadStats();
  await loadTodayMood();
  renderBadges();
});

/* ─── DATE ────────────────────────────────────────────────────── */
function setTodayDate() {
  const opts = { weekday:'long', day:'numeric', month:'long', year:'numeric' };
  document.getElementById('today-date').textContent =
    new Date().toLocaleDateString('ar-EG', opts);
}

/* ─── TAB SWITCH ──────────────────────────────────────────────── */
function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');

  if (tab === 'progress') { loadHeatmap(); loadWeekly(); loadStats(); }
  if (tab === 'coach')    { renderCoach(); }
}

/* ─── HABITS ──────────────────────────────────────────────────── */
async function loadHabits() {
  const list = document.getElementById('habits-list');
  list.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="margin-top:8px"></div>';
  const res = await fetch('/api/habits');
  habits = await res.json();
  renderHabits();
  updateXPBar();
}

function renderHabits() {
  const list   = document.getElementById('habits-list');
  const doneNow = habits.filter(h => h.done).length;
  document.getElementById('done-today').textContent = doneNow;

  if (!habits.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <p>مفيش عادات لسه — ابدأ بإضافة أول عادة!</p>
      </div>`;
    return;
  }

  list.innerHTML = habits.map(h => `
    <div class="habit-card ${h.done ? 'done' : ''}" id="habit-${h.id}">
      <div class="habit-icon" style="background:${h.color}">${h.icon}</div>
      <div class="habit-info" onclick="toggleHabit(${h.id})">
        <div class="habit-name">${h.name}</div>
        <div class="habit-meta">${h.time_of_day} · <span class="habit-streak">🔥 ${h.streak} يوم</span></div>
      </div>
      <button class="habit-delete" onclick="deleteHabit(${h.id})" title="حذف">✕</button>
      <div class="habit-check" onclick="toggleHabit(${h.id})">
        ${h.done ? '✓' : ''}
      </div>
    </div>
  `).join('');
}

async function toggleHabit(id) {
  const res  = await fetch(`/api/complete/${id}`, { method: 'POST' });
  const data = await res.json();
  const h    = habits.find(x => x.id === id);
  if (!h) return;
  h.done   = data.done;
  h.streak = data.streak;
  totalXP  = data.xp;
  renderHabits();
  updateXPBar();
  showToast(data.done ? `+10 XP! ${h.icon} أحسنت!` : `${h.icon} تم إلغاء الإكمال`);
}

async function deleteHabit(id) {
  await fetch(`/api/habits/${id}`, { method: 'DELETE' });
  habits = habits.filter(h => h.id !== id);
  renderHabits();
  showToast('تم حذف العادة');
}

/* ─── XP BAR ─────────────────────────────────────────────────── */
function updateXPBar() {
  const level   = Math.floor(totalXP / 100) + 1;
  const xpInLvl = totalXP % 100;
  const pct     = xpInLvl;
  document.getElementById('xp-fill').style.width = pct + '%';
  document.getElementById('xp-label-text').textContent = totalXP + ' XP مجمّعة';
  document.getElementById('xp-next').textContent = 'الهدف: ' + (level * 100) + ' XP';

  const avatars = ['🌱','🌿','🌳','⭐','🌟','💫','🏆','💎','👑','🦋'];
  const labels  = ['مبتدئ','منتظم','ثابت','متميز','محترف','بطل','أسطورة'];
  document.getElementById('level-avatar').textContent = avatars[Math.min(level-1, avatars.length-1)];
  document.getElementById('level-label').textContent  = 'Level ' + level + ' — ' + (labels[Math.min(level-1, labels.length-1)]);
}

/* ─── ADD HABIT ───────────────────────────────────────────────── */
function toggleAddForm() {
  const form = document.getElementById('add-form');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function buildEmojiPicker() {
  document.getElementById('emoji-picker').innerHTML = EMOJIS.map(e =>
    `<div class="emoji-opt ${e===selectedEmoji?'selected':''}" onclick="pickEmoji('${e}')">${e}</div>`
  ).join('');
}

function pickEmoji(e) {
  selectedEmoji = e;
  buildEmojiPicker();
}

function buildColorPicker() {
  document.getElementById('color-picker').innerHTML = COLORS.map(c =>
    `<div class="color-opt ${c===selectedColor?'selected':''}" style="background:${c}" onclick="pickColor('${c}')"></div>`
  ).join('');
}

function pickColor(c) {
  selectedColor = c;
  buildColorPicker();
}

async function addHabit() {
  const name = document.getElementById('habit-name-input').value.trim();
  const time = document.getElementById('habit-time-input').value;
  if (!name) { showToast('اكتب اسم العادة الأول!'); return; }

  const res  = await fetch('/api/habits', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, icon: selectedEmoji, time_of_day: time, color: selectedColor }),
  });
  const h = await res.json();
  habits.push(h);
  document.getElementById('habit-name-input').value = '';
  document.getElementById('add-form').style.display = 'none';
  renderHabits();
  showToast('تمت الإضافة! 🎯');
}

/* ─── STATS ───────────────────────────────────────────────────── */
async function loadStats() {
  const res  = await fetch('/api/stats');
  const data = await res.json();
  totalXP = data.xp;
  document.getElementById('stat-streak').textContent = data.best_streak;
  document.getElementById('stat-rate').textContent   = data.rate + '%';
  document.getElementById('stat-xp').textContent     = data.xp;
  document.getElementById('stat-month').textContent  = data.month_days;
  document.getElementById('best-streak-val').textContent = '🔥 ' + data.best_streak;
  updateXPBar();
}

/* ─── HEATMAP ─────────────────────────────────────────────────── */
async function loadHeatmap() {
  const res  = await fetch('/api/heatmap');
  const data = await res.json();     // { "2025-01-05": 3, ... }
  const habitCount = habits.length || 1;

  const grid = document.getElementById('heatmap');
  grid.innerHTML = '';

  const today = new Date();
  for (let w = 12; w >= 0; w--) {
    const col = document.createElement('div');
    col.className = 'heatmap-col';
    for (let d = 6; d >= 0; d--) {
      const dt   = new Date(today);
      dt.setDate(today.getDate() - (w * 7 + d));
      const key  = dt.toISOString().slice(0, 10);
      const cnt  = data[key] || 0;
      const lvl  = cnt === 0 ? 0 : cnt < 2 ? 1 : cnt < habitCount*0.5 ? 2 : cnt < habitCount ? 3 : 4;
      const cell = document.createElement('div');
      cell.className = 'heat-cell heat-' + lvl;
      cell.title     = key + ': ' + cnt + ' عادة';
      col.appendChild(cell);
    }
    grid.appendChild(col);
  }
}

/* ─── WEEKLY CHART ────────────────────────────────────────────── */
async function loadWeekly() {
  const res  = await fetch('/api/weekly');
  const data = await res.json();
  const maxV = Math.max(...data.map(d => d.count), 1);
  const days = ['أحد','اثن','ثلا','أرب','خمس','جمع','سبت'];

  const chart = document.getElementById('week-chart');
  chart.innerHTML = data.map(item => {
    const dt  = new Date(item.date);
    const lbl = days[dt.getDay()];
    const h   = Math.round((item.count / maxV) * 80) + 10;
    const col = item.count === 0 ? '#D3D1C7' : item.count < maxV * 0.5 ? '#FAC775' : '#639922';
    return `<div class="bar-day">
      <div class="bar-fill" style="height:${h}px;background:${col}"></div>
      <div class="bar-lbl">${lbl}</div>
    </div>`;
  }).join('');
}

/* ─── MOOD ────────────────────────────────────────────────────── */
async function loadTodayMood() {
  const res  = await fetch('/api/mood/today');
  const data = await res.json();
  if (data.emoji) {
    document.querySelectorAll('.mood-btn').forEach(btn => {
      if (btn.querySelector('span').textContent === data.emoji) {
        btn.classList.add('selected');
        showMoodInsight(data.emoji);
      }
    });
  }
}

async function setMood(btn, emoji, label) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  showMoodInsight(emoji);
  await fetch('/api/mood', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ emoji, label }),
  });
  showToast('تم تسجيل مزاجك ' + emoji);
}

function showMoodInsight(emoji) {
  const el = document.getElementById('mood-insight');
  el.textContent = MOOD_INSIGHTS[emoji] || '';
  el.style.display = 'block';
}

/* ─── AI COACH ────────────────────────────────────────────────── */
function renderCoach() {
  const done     = habits.filter(h => h.done).length;
  const total    = habits.length;
  const pct      = total ? Math.round((done / total) * 100) : 0;
  const topStreak = Math.max(...habits.map(h => h.streak), 0);

  let bubble = '';
  if (pct === 100) bubble = `برافو! أكملت كل عاداتك النهارده. أنت في أفضل حالاتك! 🎉`;
  else if (pct > 60) bubble = `أداء ممتاز! أكملت ${done} من ${total} عادات (${pct}%). متبقى القليل 💪`;
  else bubble = `لسه في وقت كافي! أكملت ${done} من ${total} عادات. يلا نكملها 🚀`;

  document.getElementById('ai-bubble').textContent = bubble;

  const insights = [
    { icon:'📈', text: topStreak > 5
        ? `أقوى streak عندك ${topStreak} يوم — ده رقم ممتاز! استمر ومتكسرهوش.`
        : 'حاول تحافظ على streak يومي — الاتساق هو السر.' },
    { icon:'⏰', text:'أداؤك في الصباح أعلى بكتير من المساء. حط عاداتك المهمة صباحاً.' },
    { icon:'🎯', text: pct < 80
        ? 'لو أكملت باقي العادات النهارده هتحسن معدلك للأسبوع كله.'
        : 'معدلك عالي جداً! هتوصل لـ badge جديد قريباً.' },
  ];

  document.getElementById('ai-insights').innerHTML = insights.map(i =>
    `<div class="ai-insight"><span class="ins-icon">${i.icon}</span><span>${i.text}</span></div>`
  ).join('');

  const pred = Math.min(97, 55 + pct * 0.4 + topStreak * 0.5);
  const predR = Math.round(pred);
  document.getElementById('predict-pct').textContent  = predR + '%';
  document.getElementById('predict-fill').style.width = predR + '%';
  document.getElementById('predict-fill').style.background = predR > 70 ? '#3B6D11' : '#BA7517';
  document.getElementById('predict-label').textContent = predR > 70 ? 'على المسار ✓' : 'يحتاج جهد ⚠';
  document.getElementById('predict-label').style.color = predR > 70 ? '#3B6D11' : '#BA7517';
}

/* ─── BADGES ──────────────────────────────────────────────────── */
function renderBadges() {
  const unlocked = BADGES.filter(b => b.unlocked).length;
  document.getElementById('badges-unlocked').textContent = unlocked;
  document.getElementById('badges-fill').style.width = ((unlocked / BADGES.length) * 100) + '%';

  document.getElementById('badges-list').innerHTML = BADGES.map(b => `
    <div class="badge-card ${b.unlocked ? '' : 'locked'}">
      <div class="badge-icon">${b.icon}</div>
      <div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.unlocked ? b.desc : '🔒 ' + b.desc}</div>
      </div>
    </div>
  `).join('');
}

/* ─── TOAST ───────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
