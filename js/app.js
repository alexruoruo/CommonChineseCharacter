/* ============================================================
 * 识字大冒险 · 汪汪队与奥特曼(纯静态 H5,无任何依赖)
 * 数据:js/data.js(由 tools/build-data.py 生成,[字, 拼音, 笔画, 年级])
 *
 * 玩法:分 7 个年级闯关,每关先「学一学」再答题
 *   汪汪队狗狗轮流出题:🔊听音选字 / 🎵看拼音选字 / 🔍找相同 /
 *   👀火眼金睛 / 📖看字选音 / 🚤复习巡逻
 *   奥特曼元素:⚡能量条攒满放必杀技(回一颗心) /
 *   每章最后一关打 👾BOSS,赢了收集奥特曼伙伴卡
 *
 * 识字档案(区分"真认识"和"猜对")见 recordResult 一节
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  var D = window.HZ_DATA || [];                        // [字, 拼音, 笔画, 年级]
  var TOTAL = D.length;
  var LEVEL_SIZE = { 1: 5, 2: 6, 3: 6, 4: 7, 5: 7, 6: 8, 7: 8 };   // 每关新字数
  var CHAPTER_SIZE = 10;                               // 每章关卡数
  var GRADES = [1, 2, 3, 4, 5, 6, 7];
  var GRADE_NAMES = { 1: '一年级上册', 2: '一年级下册', 3: '二年级', 4: '三年级', 5: '四年级', 6: '五六年级', 7: '课外拓展' };
  var GRADE_EMOJI = { 1: '🐕', 2: '🦸', 3: '🚁', 4: '🚒', 5: '🏗️', 6: '♻️', 7: '🌌' };
  var CHAPTER_NAMES = {
    1: ['汪汪队总部', '冒险湾海滩', '瞭望塔', '农场救援', '雪山基地', '汪汪大庆典'],
    2: ['光之国前哨', '宇宙警备队', '怪兽星云', '陨石地带', '银河边境', '特训基地', '等离子火花塔', '光之继承者'],
    def: ['星辰平原', '极光峡谷', '彗星公路', '双子星港', '黑洞边缘', '超时空塔', '星云迷宫', '传说之巅']
  };
  var BOSSES = [
    { e: '👾', n: '捣蛋小怪兽' }, { e: '🦖', n: '抢字大恐龙' }, { e: '🐙', n: '墨水章鱼' },
    { e: '🦇', n: '迷眼蝙蝠王' }, { e: '🐲', n: '打嗝小金龙' }, { e: '🕷️', n: '结网大盗' },
    { e: '👹', n: '瞌睡大魔王' }, { e: '🦂', n: '毒尾蝎子' }
  ];
  var HEROES = ['迪迦', '赛罗', '泰罗', '泽塔', '盖亚', '戴拿', '欧布', '捷德',
    '银河', '维克特利', '梦比优斯', '雷欧', '艾斯', '杰克', '佐菲', '初代'];
  var HERO_EMOJI = '🦸';
  var PUPS = {                                          // 出题的汪汪队狗狗
    tts: { e: '🚒', n: '毛毛', line: '听一听!哪个字发这个音?' },
    c2p: { e: '♻️', n: '灰灰', line: '别扔别扔,这个字怎么读?' },
    pinyin: { e: '🐕', n: '阿奇', line: '阿奇队长下令:按拼音找字!' },
    match: { e: '🏗️', n: '小砾', line: '小砾找材料:找出一样的字!' },
    odd: { e: '🚁', n: '天天', line: '天天飞高高:找出不一样的!' },
    review: { e: '🚤', n: '路马', line: '路马复习巡逻:还记得它吗?' }
  };
  var PUP_INFO = [
    { e: '🐕', n: '阿奇', r: '拼音寻字小队长' }, { e: '🚒', n: '毛毛', r: '听音辨字消防犬' },
    { e: '🏗️', n: '小砾', r: '找相同工程犬' }, { e: '🚁', n: '天天', r: '火眼金睛飞行员' },
    { e: '♻️', n: '灰灰', r: '读一读环保犬' }, { e: '🚤', n: '路马', r: '复习巡逻水上警长' }
  ];

  /* ---------- 小工具 ---------- */
  function $(s) { return document.querySelector(s); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(arr) { return arr[rnd(arr.length)]; }
  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ---------- 进度存储(v3:分年级 + 伙伴 + 骨头) ---------- */
  function freshSave() {
    var unlocked = {};
    for (var i = 0; i < GRADES.length; i++) unlocked[GRADES[i]] = 0;
    return { grade: 1, unlocked: unlocked, stars: {}, bones: 0, heroes: [], chars: {}, sound: true, tts: true };
  }

  var Store = {
    key: 'hz-hero-v3',
    data: null,
    load: function () {
      try { this.data = JSON.parse(localStorage.getItem(this.key)); } catch (e) {}
      if (!this.data || typeof this.data.unlocked !== 'object') this.data = freshSave();
      var d = this.data;
      if (d.stars == null) d.stars = {};
      if (d.chars == null) d.chars = {};
      if (!Array.isArray(d.heroes)) d.heroes = [];
      if (typeof d.bones !== 'number') d.bones = 0;
      if (typeof d.grade !== 'number' || !GRADE_NAMES[d.grade]) d.grade = 1;
      if (typeof d.unlocked !== 'object') d.unlocked = {};
      for (var i = 0; i < GRADES.length; i++) {
        var g = GRADES[i];
        if (typeof d.unlocked[g] !== 'number') d.unlocked[g] = 0;
      }
      if (d.sound == null) d.sound = true;
      if (d.tts == null) d.tts = true;
    },
    save: function () { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
    reset: function () { this.data = freshSave(); this.save(); },
    totalStars: function () {
      var sum = 0, k;
      for (k in this.data.stars) sum += this.data.stars[k];
      return sum;
    },
    gradeStars: function (g) {
      var sum = 0, k, pre = g + '-';
      for (k in this.data.stars) if (k.indexOf(pre) === 0) sum += this.data.stars[k];
      return sum;
    }
  };

  /* ---------- 识字档案:区分"真认识"和"猜对" ----------
   * 每个字一条记录:seen 见过 / ok 一次答对次数 / strong 强题型答对次数
   *   streak 连续一次答对 / w 答错次数 / t 最近一次答题时间
   * 规则:只有"一次答对"(本题没错过、也不是错题重问)才算证据;
   *   tts 听音选字、c2p 看字选音是强题型(必须真知道读音);
   *   连续 2 次一次答对且至少 1 次强题型 → 认识了 */
  var STRONG_TYPES = { tts: 1, c2p: 1 };

  function statOf(ch) {
    var c = Store.data.chars;
    if (!c[ch]) c[ch] = { seen: 0, ok: 0, strong: 0, streak: 0, w: 0, t: 0 };
    return c[ch];
  }
  function isKnown(st) { return st.streak >= 2 && st.strong >= 1; }
  function knownCount() {
    var n = 0;
    for (var ch in Store.data.chars) if (isKnown(Store.data.chars[ch])) n++;
    return n;
  }

  /* ---------- 音效(WebAudio 合成,无需素材) ---------- */
  var Sfx = {
    ctx: null,
    ensure: function () {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone: function (freq, delay, dur, type, vol) {
      if (!Store.data || !Store.data.sound) return;
      var ctx = this.ensure();
      if (!ctx) return;
      var t = ctx.currentTime + delay;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    },
    tap: function () { this.tone(620, 0, 0.06, 'sine', 0.07); },
    correct: function () { this.tone(523.25, 0, 0.12, 'sine', 0.2); this.tone(783.99, 0.1, 0.18, 'sine', 0.2); },
    wrong: function () { this.tone(196, 0, 0.2, 'square', 0.06); },
    star: function (i) { this.tone(680 + i * 200, 0, 0.18, 'triangle', 0.22); },
    win: function () {
      var seq = [523.25, 659.25, 783.99, 1046.5];
      for (var i = 0; i < seq.length; i++) this.tone(seq[i], i * 0.13, 0.24, 'triangle', 0.2);
    },
    transform: function () {                            // 奥特曼变身(进关)
      var seq = [330, 415, 494, 660];
      for (var i = 0; i < seq.length; i++) this.tone(seq[i], i * 0.09, 0.16, 'square', 0.1);
    },
    zap: function () {                                  // 必杀技光束
      this.tone(1400, 0, 0.1, 'sawtooth', 0.22);
      this.tone(900, 0.07, 0.14, 'sawtooth', 0.18);
      this.tone(500, 0.14, 0.2, 'sawtooth', 0.14);
      this.tone(1800, 0.2, 0.35, 'square', 0.1);
    },
    boom: function () {                                 // BOSS 被打败
      this.tone(90, 0, 0.5, 'sawtooth', 0.28);
      this.tone(60, 0.05, 0.6, 'triangle', 0.24);
    }
  };

  /* ---------- 朗读(系统 TTS) ---------- */
  var Speech = {
    ok: !!window.speechSynthesis,
    voice: null,
    refresh: function () {
      if (!this.ok) return;
      var vs = window.speechSynthesis.getVoices() || [];
      this.voice = null;
      for (var i = 0; i < vs.length; i++) {
        if (/^zh[-_]CN/i.test(vs[i].lang)) { this.voice = vs[i]; return; }
      }
      for (i = 0; i < vs.length; i++) {
        if (/^zh/i.test(vs[i].lang)) { this.voice = vs[i]; return; }
      }
    },
    speak: function (text) {
      if (!this.ok || !Store.data.tts) return false;
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        if (!this.voice) this.refresh();
        if (this.voice) u.voice = this.voice;
        u.rate = 0.7;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
        return true;
      } catch (e) { return false; }
    }
  };
  if (Speech.ok) {
    Speech.refresh();
    window.speechSynthesis.onvoiceschanged = function () { Speech.refresh(); };
  }

  /* ---------- 索引(全局 + 分年级) ---------- */
  var byStroke = {}, byLetter = {}, charIdx = {}, byGrade = {}, charMeta = {};
  (function () {
    for (var i = 0; i < TOTAL; i++) {
      var ch = D[i][0], g = D[i][3];
      var s = D[i][2], l = D[i][1].charAt(0);
      (byStroke[s] = byStroke[s] || []).push(i);
      (byLetter[l] = byLetter[l] || []).push(i);
      charIdx[ch] = i;
      var list = byGrade[g] = byGrade[g] || [];
      charMeta[ch] = { i: i, g: g, lv: Math.floor(list.length / LEVEL_SIZE[g]) };
      list.push(i);
    }
  })();

  function levelIdxs(g, li) {
    var L = byGrade[g] || [], ls = LEVEL_SIZE[g];
    var start = li * ls, end = Math.min(start + ls, L.length), out = [];
    for (var i = start; i < end; i++) out.push(L[i]);
    return out;
  }
  function levelCount(g) { return Math.ceil((byGrade[g] || []).length / LEVEL_SIZE[g]); }
  function chapterCount(g) { return Math.ceil(levelCount(g) / CHAPTER_SIZE); }
  function chapterOf(li) { return Math.floor(li / CHAPTER_SIZE); }
  function chapterName(g, ci) {
    var names = CHAPTER_NAMES[g] || CHAPTER_NAMES.def;
    return names[ci % names.length];
  }
  function bossOf(g, li) { return BOSSES[chapterOf(li) % BOSSES.length]; }
  function isBossLevel(g, li) {
    return (li + 1) % CHAPTER_SIZE === 0 || li === levelCount(g) - 1;
  }
  function unlockedOf(g) { return Store.data.unlocked[g] || 0; }
  function gradeOpen(g) {                               // 前一年级闯过 2 章即解锁
    if (g === 1) return true;
    var need = Math.min(20, levelCount(g - 1));
    return unlockedOf(g - 1) >= need;
  }
  function setTheme(g) { $('#app').className = 'theme-g' + g; }

  /* ---------- 干扰项(按笔画相近取,拼音题优先同声母) ---------- */
  function distract(idx, n, soundWise) {
    var used = {}, out = [];
    used[idx] = 1;
    function fillFrom(pool) {
      if (!pool) return;
      var arr = shuffle(pool);
      for (var k = 0; k < arr.length && out.length < n; k++) {
        if (!used[arr[k]]) { out.push(arr[k]); used[arr[k]] = 1; }
      }
    }
    if (soundWise) fillFrom(byLetter[D[idx][1].charAt(0)]);
    if (out.length < n) {
      var s = D[idx][2];
      var deltas = [0, 1, -1, 2, -2, 3, -3, 5, -5, 8, -8, 12, -12];
      for (var d = 0; d < deltas.length && out.length < n; d++) fillFrom(byStroke[s + deltas[d]]);
    }
    while (out.length < n) {                       // 全局兜底
      var j = rnd(TOTAL);
      if (!used[j]) { out.push(j); used[j] = 1; }
    }
    return out;
  }

  function makeOptions(idx, n, soundWise) {
    var opts = [{ idx: idx, correct: true }];
    var ds = distract(idx, n - 1, soundWise);
    for (var i = 0; i < ds.length; i++) opts.push({ idx: ds[i], correct: false });
    return shuffle(opts);
  }

  function pinyinOptions(idx) {              // 看字选音:4 个不同读音,同声母优先
    var want = [D[idx][1]], used = {};
    used[D[idx][1]] = 1;
    function add(p) { if (!used[p] && want.length < 4) { used[p] = 1; want.push(p); } }
    var cand = shuffle(byLetter[D[idx][1].charAt(0)] || []);
    for (var k = 0; k < cand.length && want.length < 4; k++) add(D[cand[k]][1]);
    while (want.length < 4) add(D[rnd(TOTAL)][1]);
    return shuffle(want);
  }

  /* ---------- 出题 ---------- */
  function makeQ(type, idx, retry, review) {
    var q = { type: type, idx: idx, retry: !!retry, review: !!review };
    if (type === 'match') {
      q.options = makeOptions(idx, 6, false);
    } else if (type === 'pinyin') {
      q.options = makeOptions(idx, 4, true);
    } else if (type === 'tts') {
      q.options = makeOptions(idx, 4, false);
    } else if (type === 'c2p') {              // 看字选音
      q.pyOptions = pinyinOptions(idx);
    } else {                                   // odd:火眼金睛
      q.sea = distract(idx, 1, false)[0];
      q.oddPos = rnd(12);
    }
    return q;
  }

  function reviewTargets(g, li) {             // 复习题:优先补"快认识了"和错过的旧字
    var pool = [];
    for (var ch in Store.data.chars) {
      var st = Store.data.chars[ch], m = charMeta[ch];
      if (!m || isKnown(st) || !st.seen) continue;
      var before = m.g < g || (m.g === g && m.lv < li);   // 只复习更早学过的字
      if (!before) continue;
      pool.push(ch);
    }
    if (!pool.length) return [];
    pool.sort(function (a, b) {
      var A = Store.data.chars[a], B = Store.data.chars[b];
      return (A.streak - B.streak) || (B.w - A.w) || (A.t - B.t);
    });
    return pool.slice(0, Math.min(2, pool.length));
  }

  function makeQuestions(g, li) {
    var idxs = shuffle(levelIdxs(g, li));
    var slots = Speech.ok
      ? ['tts', 'c2p', 'pinyin', 'odd', 'tts', 'c2p', 'match', 'pinyin']
      : ['c2p', 'pinyin', 'match', 'odd', 'c2p', 'pinyin', 'match', 'odd'];
    var qs = [];
    for (var i = 0; i < idxs.length; i++) qs.push(makeQ(slots[i % slots.length], idxs[i]));
    var reviews = reviewTargets(g, li);
    for (var r = 0; r < reviews.length; r++) {
      var rtype = Speech.ok ? pick(['tts', 'c2p']) : pick(['c2p', 'pinyin']);
      qs.push(makeQ(rtype, charIdx[reviews[r]], false, true));
    }
    return qs;
  }

  /* ---------- 屏幕切换 ---------- */
  var screens = ['home', 'grade', 'map', 'book', 'dex', 'learn', 'play', 'result'];
  function showScreen(name) {
    if (Speech.ok) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    for (var i = 0; i < screens.length; i++) {
      var el = $('#screen-' + screens[i]);
      if (el) el.classList.toggle('active', screens[i] === name);
    }
  }

  /* ---------- 首页 ---------- */
  function nextTarget() {                     // 「继续」指向第一个没打完的年级
    var g0 = Store.data.grade;
    for (var k = 0; k < GRADES.length; k++) {
      var g = ((g0 - 1 + k) % GRADES.length) + 1;
      if (unlockedOf(g) < levelCount(g)) return { g: g, li: unlockedOf(g) };
    }
    return { g: g0, li: Math.max(0, levelCount(g0) - 1) };
  }

  function updateHome() {
    var stars = Store.totalStars();
    $('#home-stars').textContent = stars;
    $('#home-known').textContent = knownCount();
    $('#home-bones').textContent = Store.data.bones;
    var t = nextTarget();
    var started = Store.totalStars() > 0 || knownCount() > 0;
    $('#btn-continue').textContent = started
      ? '🚀 继续 · ' + GRADE_NAMES[t.g] + ' 第 ' + (t.li + 1) + ' 关'
      : '🚀 开始冒险';
    $('#home-tip').textContent = started
      ? '🦴 ' + Store.data.bones + ' 根骨头 · 🦸 ' + Store.data.heroes.length + ' 位奥特曼伙伴'
      : '一年级上册 ' + (byGrade[1] || []).length + ' 字起步,边打怪边识字!';
  }

  /* ---------- 选择年级 ---------- */
  function openGradeScreen() {
    var box = $('#grade-list');
    box.innerHTML = '';
    $('#grade-bones').textContent = Store.data.bones;
    for (var k = 0; k < GRADES.length; k++) {
      (function (g) {
        var lc = levelCount(g);
        var open = gradeOpen(g);
        var un = Math.min(unlockedOf(g), lc);
        var card = document.createElement('button');
        card.className = 'grade-card' + (open ? '' : ' locked');
        card.innerHTML =
          '<span class="g-emoji">' + GRADE_EMOJI[g] + '</span>' +
          '<span class="g-main">' +
            '<b class="g-name">' + GRADE_NAMES[g] + '</b>' +
            '<small class="g-info">' + (byGrade[g] || []).length + ' 个字 · ' + lc + ' 关' +
            (g === 1 ? '' : ' · 闯过前一年级 2 章解锁') + '</small>' +
            '<span class="g-bar"><i style="width:' + (lc ? un / lc * 100 : 0) + '%"></i></span>' +
          '</span>' +
          '<span class="g-side">' + (open
            ? '🏆 ' + Store.gradeStars(g) + (un < lc ? '<small>打到第 ' + (un + 1) + ' 关</small>' : '<small>已通关!</small>')
            : '🔒') + '</span>';
        card.addEventListener('click', function () {
          if (!open) { Sfx.wrong(); card.classList.add('shake'); setTimeout(function () { card.classList.remove('shake'); }, 500); return; }
          Sfx.tap();
          Store.data.grade = g; Store.save();
          openMap(g);
        });
        box.appendChild(card);
      })(GRADES[k]);
    }
    showScreen('grade');
  }

  /* ---------- 选关地图 ---------- */
  var curGrade = 1, curChapter = 0, currentLevel = 0;

  function renderChapterTabs() {
    var box = $('#chapter-tabs');
    box.innerHTML = '';
    for (var c = 0; c < chapterCount(curGrade); c++) {
      var tab = document.createElement('button');
      tab.className = 'chapter-tab';
      tab.textContent = c + 1;
      if (c * CHAPTER_SIZE > unlockedOf(curGrade)) tab.classList.add('locked');
      tab.addEventListener('click', (function (cc) {
        return function () { Sfx.tap(); selectChapter(cc); };
      })(c));
      box.appendChild(tab);
    }
  }

  function selectChapter(ci, scrollTab) {
    curChapter = ci;
    var tabs = $('#chapter-tabs').children;
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', i === ci);
    if (scrollTab && tabs[ci] && tabs[ci].scrollIntoView) {
      try { tabs[ci].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    }

    var grid = $('#level-grid');
    grid.innerHTML = '';
    var from = ci * CHAPTER_SIZE, to = Math.min(from + CHAPTER_SIZE, levelCount(curGrade));
    for (var l = from; l < to; l++) {
      var locked = l > unlockedOf(curGrade);
      var boss = isBossLevel(curGrade, l);
      var b = document.createElement('button');
      b.className = 'level-btn' + (locked ? ' locked' : '') + (l === unlockedOf(curGrade) ? ' current' : '') + (boss ? ' boss' : '');
      if (locked) {
        b.innerHTML = '<span class="lvl-num">🔒</span><span class="lvl-stars"></span>';
      } else {
        var stars = Store.data.stars[curGrade + '-' + l] || 0;
        var sHtml = '';
        for (var k2 = 0; k2 < 3; k2++) sHtml += '<span class="' + (k2 < stars ? '' : 's-off') + '">⭐</span>';
        b.innerHTML = '<span class="lvl-num">' + (boss ? '👾' : (l + 1)) + '</span><span class="lvl-stars">' + sHtml + '</span>';
      }
      b.addEventListener('click', (function (ll, lk) {
        return function () {
          if (lk) { Sfx.wrong(); return; }
          Sfx.tap();
          openLearn(curGrade, ll);
        };
      })(l, locked));
      grid.appendChild(b);
    }
    $('#chapter-hint').textContent = '第 ' + (ci + 1) + ' 章 · ' + chapterName(curGrade, ci) +
      ' · 第 ' + (from + 1) + '~' + to + ' 关' + ((from + CHAPTER_SIZE) <= levelCount(curGrade) ? ' · 章末是 👾BOSS 关' : '');
  }

  function openMap(g) {
    curGrade = g;
    setTheme(g);
    Store.data.grade = g; Store.save();
    $('#map-title').textContent = GRADE_NAMES[g] + ' · 选择关卡';
    $('#map-stars').textContent = Store.totalStars();
    renderChapterTabs();
    selectChapter(Math.min(chapterOf(unlockedOf(g)), chapterCount(g) - 1), true);
    showScreen('map');
  }

  /* ---------- 学一学 ---------- */
  function openLearn(g, li) {
    curGrade = g; currentLevel = li;
    setTheme(g);
    var pup = PUP_INFO[chapterOf(li) % PUP_INFO.length];
    $('#learn-title').textContent = GRADE_NAMES[g] + ' 第 ' + (li + 1) + ' 关 · 先学一学';
    $('#learn-tip').innerHTML = '<span class="pup-ava">' + pup.e + '</span> ' + pup.n + '带你认字!点一点字卡,听一听';
    var grid = $('#learn-grid');
    grid.innerHTML = '';
    var idxs = levelIdxs(g, li);
    for (var i = 0; i < idxs.length; i++) {
      (function (idx) {
        var st = statOf(D[idx][0]);
        st.seen = 1;                           // 记录"见过",供复习题挑选
        var card = document.createElement('button');
        card.className = 'learn-card';
        card.innerHTML = '<span class="learn-char">' + D[idx][0] + '</span>' +
          '<span class="learn-py">' + D[idx][1] + '</span>';
        card.addEventListener('click', function () {
          Sfx.tap();
          Speech.speak(D[idx][0]);
          card.classList.remove('pop');
          void card.offsetWidth;
          card.classList.add('pop');
        });
        grid.appendChild(card);
      })(idxs[i]);
    }
    Store.save();
    showScreen('learn');
  }

  /* ---------- 答题 ---------- */
  var state = null;

  function startPlay(g, li) {
    curGrade = g; currentLevel = li;
    setTheme(g);
    var boss = isBossLevel(g, li);
    state = {
      g: g, li: li, qs: makeQuestions(g, li), qi: 0, hearts: 3,
      locked: false, wrongs: 0, retries: {}, energy: 25, combo: 0,
      boss: boss ? { hp: 0, total: 0, data: bossOf(g, li) } : null
    };
    if (boss) {
      state.boss.total = state.qs.length;
      state.boss.hp = state.qs.length;
      $('#boss-emoji').textContent = state.boss.data.e;
      $('#boss-name').textContent = 'BOSS · ' + state.boss.data.n;
      $('#boss-banner').classList.remove('hidden');
      renderBossHp();
    } else {
      $('#boss-banner').classList.add('hidden');
    }
    $('#play-num').textContent = GRADE_NAMES[g] + ' 第 ' + (li + 1) + ' 关';
    renderHearts();
    renderEnergy();
    Sfx.transform();                           // 变身音效
    showScreen('play');
    renderQ();
  }

  function renderHearts() {
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += '<span class="' + (i < state.hearts ? '' : 'lost') + '">❤️</span>';
    }
    $('#hearts').innerHTML = html;
  }

  function renderEnergy() {
    $('#energy-fill').style.width = Math.min(100, state.energy) + '%';
    $('#energy-fill').classList.toggle('full', state.energy >= 100);
  }

  function renderBossHp() {
    var html = '';
    for (var i = 0; i < state.boss.total; i++) {
      html += '<i class="' + (i < state.boss.hp ? 'on' : '') + '"></i>';
    }
    $('#boss-hp').innerHTML = html;
  }

  function updateProgress() {
    var total = state.qs.length;
    var pct = Math.round(state.qi / total * 100);
    $('#progress-fill').style.width = pct + '%';
    $('#progress-text').textContent = Math.min(state.qi + 1, total) + '/' + total;
  }

  function bindAnswer(el, correct, q) {
    el.addEventListener('click', function () {
      if (!state || state.locked || el.classList.contains('dead')) return;
      if (correct) onCorrect(el, q);
      else onWrong(el, q);
    });
  }

  function recordResult(q, correct) {          // 记入识字档案
    var st = statOf(D[q.idx][0]);
    st.t = Date.now();
    if (correct) {
      if (!q.retry && state.wrongs === 0) {    // 一次答对才算证据
        st.streak++;
        st.ok++;
        if (STRONG_TYPES[q.type]) st.strong++;
      }
    } else {
      st.w++;
      st.streak = 0;
    }
    Store.save();
  }

  function showCombo() {
    if (state.combo < 2) return;
    var el = $('#combo-pop');
    el.textContent = '🔥 连击 x' + state.combo + (state.combo >= 5 ? ' 太厉害啦!' : '');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function onCorrect(el, q) {
    state.locked = true;
    el.classList.add('good');
    Sfx.correct();
    vibrate(25);
    Speech.speak(D[q.idx][0]);                 // 答对后朗读,加深记忆
    recordResult(q, true);
    state.combo++;
    showCombo();

    var wait = 800;
    var clean = !q.retry && state.wrongs === 0;
    state.energy += (clean ? 16 : 8) + (state.combo >= 5 ? 4 : 0);
    if (state.energy >= 100) {                 // 能量满:放必杀技!
      state.energy = 0;
      wait = 2350;
      setTimeout(fireFinisher, 550);
    }
    renderEnergy();

    if (state.boss) {                          // BOSS 关:打掉一格血
      state.boss.hp = Math.max(0, state.boss.hp - 1);
      renderBossHp();
      var bb = $('#boss-banner');
      bb.classList.remove('hit');
      void bb.offsetWidth;
      bb.classList.add('hit');
    }
    setTimeout(nextQ, wait);
  }

  function onWrong(el, q) {
    el.classList.add('dead');
    el.classList.add('shake');
    setTimeout(function () { el.classList.remove('shake'); }, 500);
    Sfx.wrong();
    vibrate([40, 60, 40]);
    state.combo = 0;
    state.hearts = Math.max(0, state.hearts - 1);
    renderHearts();
    state.wrongs++;
    recordResult(q, false);
    if (!q.retry && !state.retries[q.idx] && state.qs.length < 13) {
      state.retries[q.idx] = 1;                // 错题在本关末尾再问一次(不计证据)
      var t2 = STRONG_TYPES[q.type] ? q.type : (Speech.ok ? pick(['tts', 'c2p']) : 'c2p');
      state.qs.push(makeQ(t2, q.idx, true));
      if (state.boss) { state.boss.total++; renderBossHp(); }
    }
    if (state.wrongs >= 2) {                   // 错两次后高亮正确答案
      var hint = $('#opt-area [data-c="1"]');
      if (hint) hint.classList.add('pulse');
    }
  }

  /* ---------- 奥特曼必杀技 ---------- */
  function fireFinisher() {
    var beam = document.createElement('div');
    beam.className = 'beam';
    beam.innerHTML = '<i class="beam-flash"></i><i class="beam-band"></i>' +
      '<span class="beam-text">⚡ 必杀技 ⚡</span><span class="beam-hero">🦸</span>';
    $('#app').appendChild(beam);
    Sfx.zap();
    Speech.speak('必杀技!');
    vibrate([30, 50, 30, 50, 60]);
    if (state && state.hearts < 3) { state.hearts++; renderHearts(); }
    setTimeout(function () { if (beam.parentNode) beam.parentNode.removeChild(beam); }, 1500);
  }

  function buildTiles(oa, q, count) {
    for (var i = 0; i < count; i++) {
      var isOdd = q.type === 'odd' ? i === q.oddPos : false;
      var idx = q.type === 'odd' ? (isOdd ? q.idx : q.sea) : q.options[i].idx;
      var correct = q.type === 'odd' ? isOdd : q.options[i].correct;
      var b = document.createElement('button');
      b.className = 'opt-tile';
      b.textContent = D[idx][0];
      if (correct) b.dataset.c = '1';
      bindAnswer(b, correct, q);
      oa.appendChild(b);
    }
  }

  function pupHeader(q) {
    var p = PUPS[q.review ? 'review' : q.type];
    return '<div class="pup-line"><span class="pup-ava">' + p.e + '</span>' +
      '<b>' + p.n + ':</b> ' + p.line + '</div>';
  }

  function renderQ() {
    var q = state.qs[state.qi];
    if (q.type === 'tts' && (!Speech.ok || !Store.data.tts)) {  // 无语音时降级为看字选音
      q.type = 'c2p';
      if (!q.pyOptions) q.pyOptions = pinyinOptions(q.idx);
    }
    var qa = $('#q-area'), oa = $('#opt-area');
    qa.innerHTML = pupHeader(q);
    oa.innerHTML = '';
    state.locked = false;
    state.wrongs = 0;
    updateProgress();

    if (q.type === 'tts') {
      qa.innerHTML += '<div class="q-tag">🔊 听一听</div>' +
        '<button class="speaker">🔊</button>';
      oa.className = 'opt-area cols-4';
      buildTiles(oa, q, 4);
      var sp = qa.querySelector('.speaker');
      sp.addEventListener('click', function () {
        Speech.speak(D[q.idx][0]);
        sp.classList.add('replaying');
        setTimeout(function () { sp.classList.remove('replaying'); }, 700);
      });
      setTimeout(function () {
        if (state && state.qs[state.qi] === q) Speech.speak(D[q.idx][0]);
      }, 450);
    } else if (q.type === 'pinyin') {
      qa.innerHTML += '<div class="q-tag">🎵 看拼音</div>' +
        '<div class="pinyin-card">' + D[q.idx][1] + '</div>';
      oa.className = 'opt-area cols-4';
      buildTiles(oa, q, 4);
    } else if (q.type === 'c2p') {             // 看字选音
      qa.innerHTML += '<div class="q-tag">📖 读一读</div>' +
        '<div class="char-card">' + D[q.idx][0] + '</div>';
      oa.className = 'opt-area cols-4';
      for (var k = 0; k < q.pyOptions.length; k++) {
        var hit = q.pyOptions[k] === D[q.idx][1];
        var pb = document.createElement('button');
        pb.className = 'opt-tile py-tile';
        pb.textContent = q.pyOptions[k];
        if (hit) pb.dataset.c = '1';
        bindAnswer(pb, hit, q);
        oa.appendChild(pb);
      }
    } else if (q.type === 'match') {
      qa.innerHTML += '<div class="q-tag">🔍 找一找</div>' +
        '<div class="char-card">' + D[q.idx][0] + '</div>';
      oa.className = 'opt-area cols-6';
      buildTiles(oa, q, 6);
    } else {                                    // odd 火眼金睛
      qa.innerHTML += '<div class="q-tag">👀 火眼金睛</div>' +
        '<div class="q-instruction">找出不一样的那个字!</div>';
      oa.className = 'opt-area cols-12';
      buildTiles(oa, q, 12);
    }
  }

  function nextQ() {
    state.qi++;
    if (state.qi >= state.qs.length) finishLevel();
    else renderQ();
  }

  /* ---------- 结算 ---------- */
  function finishLevel() {
    var g = state.g, li = state.li;
    var boss = !!state.boss;
    var stars = state.hearts >= 3 ? 3 : state.hearts === 2 ? 2 : 1;
    var key = g + '-' + li;
    if (stars > (Store.data.stars[key] || 0)) Store.data.stars[key] = stars;
    Store.data.unlocked[g] = Math.max(unlockedOf(g), Math.min(li + 1, levelCount(g)));
    Store.data.grade = g;

    // 奖励:骨头 + BOSS 掉落奥特曼伙伴
    var bones = (stars === 3 ? 2 : 1) + (boss ? 2 : 0);
    Store.data.bones += bones;
    var newHero = null;
    if (boss && Store.data.heroes.length < HEROES.length) {
      newHero = HEROES[Store.data.heroes.length];
      Store.data.heroes.push(newHero);
    } else if (boss) {
      Store.data.bones += 5;                    // 伙伴集齐后 BOSS 多给 5 根骨头
    }
    Store.save();

    var conf = [
      { e: '🏆', t: '闯关成功!', m: '一次都没错,你是汉字小天才!' },
      { e: '😄', t: '真不错!', m: '就差一点点就满分啦,棒棒的!' },
      { e: '💪', t: '继续加油!', m: '多练一次,下次一定更棒!' }
    ][3 - stars];
    if (boss) conf = { e: '💥', t: 'BOSS 打败啦!', m: state.boss.data.e + ' ' + state.boss.data.n + '被你打跑了!' };
    $('#result-emoji').textContent = conf.e;
    $('#result-title').textContent = conf.t;
    $('#result-msg').textContent = conf.m;

    $('#result-bones').textContent = '🦴 奖励 ' + bones + ' 根骨头(共 ' + Store.data.bones + ')';

    var hr = $('#result-hero');
    if (newHero) {
      var hi = HEROES.indexOf(newHero);
      hr.classList.remove('hidden');
      $('#hero-card-big').textContent = HERO_EMOJI;
      $('#hero-card-big').style.background = 'linear-gradient(160deg,hsl(' + (hi * 47 % 360) + ',80%,62%),hsl(' + ((hi * 47 + 40) % 360) + ',75%,45%))';
      $('#hero-reveal-msg').innerHTML = '新伙伴 <b>' + newHero + '</b> 加入队伍啦!';
    } else {
      hr.classList.add('hidden');
    }

    var box = $('#big-stars');
    box.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var s = document.createElement('span');
      s.className = 'big-star ' + (i < stars ? 'on' : 'off');
      s.textContent = '⭐';
      box.appendChild(s);
      if (i < stars) {
        (function (el, k) {
          setTimeout(function () { el.classList.add('pop'); Sfx.star(k); }, 400 + k * 420);
        })(s, i);
      }
    }

    var grid = $('#learned-grid');
    grid.innerHTML = '';
    var idxs = levelIdxs(g, li);
    for (var j = 0; j < idxs.length; j++) {
      (function (idx) {
        var card = document.createElement('button');
        card.className = 'learned-card';
        card.innerHTML = '<span class="ch">' + D[idx][0] + '</span><span class="py">' + D[idx][1] + '</span>' +
          (Store.data.chars[D[idx][0]] && isKnown(Store.data.chars[D[idx][0]]) ? '<i class="ok-badge">✓</i>' : '');
        card.addEventListener('click', function () { Speech.speak(D[idx][0]); });
        grid.appendChild(card);
      })(idxs[j]);
    }

    var isLast = li >= levelCount(g) - 1;
    $('#btn-next').textContent = isLast ? '📚 去下一个年级' : '下一关 ➡️';
    showScreen('result');
    Sfx.win();
    if (boss) { Sfx.boom(); vibrate([60, 80, 60]); }
    if (stars >= 2 || boss) confetti();
    state = null;
  }

  /* ---------- 撒花 ---------- */
  function confetti() {
    var layer = $('#confetti');
    layer.innerHTML = '';
    var icons = ['🎉', '⭐', '⚡', '🌈', '🦴', '🦸', '✨', '💥'];
    for (var i = 0; i < 36; i++) {
      var s = document.createElement('span');
      s.className = 'confetti-bit';
      s.textContent = pick(icons);
      s.style.left = (Math.random() * 100) + '%';
      s.style.animationDelay = (Math.random() * 0.9) + 's';
      s.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      s.style.fontSize = (14 + Math.random() * 16) + 'px';
      layer.appendChild(s);
    }
    setTimeout(function () { layer.innerHTML = ''; }, 4600);
  }

  /* ---------- 识字本 ---------- */
  var bookFilter = 0;                          // 0=全部,否则年级号

  function openBook() {
    var known = [], growing = [], weak = [];
    for (var ch in Store.data.chars) {
      var st = Store.data.chars[ch];
      if (!st.seen && !st.ok && !st.w) continue;
      if (bookFilter && (!charMeta[ch] || charMeta[ch].g !== bookFilter)) continue;
      if (isKnown(st)) known.push(ch);
      else if (st.w > 0 && st.streak === 0) weak.push(ch);
      else growing.push(ch);
    }
    function byOrder(a, b) { return (charIdx[a] || 0) - (charIdx[b] || 0); }
    known.sort(byOrder); growing.sort(byOrder); weak.sort(byOrder);

    $('#book-known').textContent = known.length;
    $('#book-count').textContent = known.length;
    $('#book-total').textContent = TOTAL;
    $('#book-fill').style.width = (TOTAL ? known.length / TOTAL * 100 : 0) + '%';

    // 年级筛选(只显示有记录的年级)
    var chips = $('#book-chips');
    chips.innerHTML = '';
    var seenGrades = {};
    for (var c in Store.data.chars) {
      if (Store.data.chars[c].seen && charMeta[c]) seenGrades[charMeta[c].g] = 1;
    }
    var opts = [{ v: 0, t: '全部' }];
    for (var gi = 0; gi < GRADES.length; gi++) {
      if (seenGrades[GRADES[gi]]) opts.push({ v: GRADES[gi], t: GRADE_EMOJI[GRADES[gi]] + GRADE_NAMES[GRADES[gi]] });
    }
    for (var oi = 0; oi < opts.length; oi++) {
      (function (o) {
        var b = document.createElement('button');
        b.className = 'chip-btn' + (bookFilter === o.v ? ' on' : '');
        b.textContent = o.t;
        b.addEventListener('click', function () { Sfx.tap(); bookFilter = o.v; openBook(); });
        chips.appendChild(b);
      })(opts[oi]);
    }

    var secs = [
      { t: '✅ 认识了', list: known, cls: 'known', empty: '还没认识的字,先去闯几关吧!' },
      { t: '🌱 学习中', list: growing, cls: '', empty: '暂无' },
      { t: '🔁 要多练练', list: weak, cls: 'weak', empty: '暂无,很棒!' }
    ];
    var box = $('#book-lists');
    box.innerHTML = '';
    for (var s2 = 0; s2 < secs.length; s2++) {
      var sec = document.createElement('div');
      sec.className = 'bk-sec';
      sec.innerHTML = '<h4>' + secs[s2].t + ' <span class="cnt">(' + secs[s2].list.length + ')</span></h4>';
      var g2 = document.createElement('div');
      g2.className = 'bk-grid';
      for (var i2 = 0; i2 < secs[s2].list.length; i2++) {
        (function (ch2, cls) {
          var idx = charIdx[ch2] || 0;
          var c2 = document.createElement('button');
          c2.className = 'bk-card ' + cls;
          c2.innerHTML = '<span class="ch">' + ch2 + '</span><span class="py">' + D[idx][1] + '</span>';
          c2.addEventListener('click', function () { Speech.speak(ch2); });
          g2.appendChild(c2);
        })(secs[s2].list[i2], secs[s2].cls);
      }
      if (!secs[s2].list.length) {
        var e2 = document.createElement('p');
        e2.className = 'bk-empty';
        e2.textContent = secs[s2].empty;
        g2.appendChild(e2);
      }
      sec.appendChild(g2);
      box.appendChild(sec);
    }
    showScreen('book');
  }

  /* ---------- 伙伴图鉴 ---------- */
  function openDex() {
    $('#dex-bones').textContent = Store.data.bones;
    $('#dex-hero-cnt').textContent = '(' + Store.data.heroes.length + '/' + HEROES.length + ')';

    var hg = $('#dex-heroes');
    hg.innerHTML = '';
    for (var i = 0; i < HEROES.length; i++) {
      (function (i) {
        var earned = Store.data.heroes.indexOf(HEROES[i]) >= 0;
        var c = document.createElement('div');
        c.className = 'dex-card hero' + (earned ? ' earned' : '');
        if (earned) c.style.background = 'linear-gradient(160deg,hsl(' + (i * 47 % 360) + ',80%,62%),hsl(' + ((i * 47 + 40) % 360) + ',75%,45%))';
        c.innerHTML = '<span class="d-emoji">' + (earned ? HERO_EMOJI : '❓') + '</span>' +
          '<b class="d-name">' + (earned ? HEROES[i] : '???') + '</b>' +
          '<small class="d-role">' + (earned ? '伙伴' : '待解锁') + '</small>';
        if (earned) c.addEventListener('click', function () { Sfx.tap(); Speech.speak(HEROES[i] + ',变身!'); });
        hg.appendChild(c);
      })(i);
    }

    var pg = $('#dex-pups');
    pg.innerHTML = '';
    for (var p = 0; p < PUP_INFO.length; p++) {
      (function (p) {
        var c = document.createElement('div');
        c.className = 'dex-card pup';
        c.innerHTML = '<span class="d-emoji">' + PUP_INFO[p].e + '</span>' +
          '<b class="d-name">' + PUP_INFO[p].n + '</b>' +
          '<small class="d-role">' + PUP_INFO[p].r + '</small>';
        c.addEventListener('click', function () { Sfx.tap(); Speech.speak(PUP_INFO[p].n + '!没有困难的工作,只有勇敢的狗狗!'); });
        pg.appendChild(c);
      })(p);
    }
    showScreen('dex');
  }

  /* ---------- 弹窗 ---------- */
  function openModal(id) { $(id).classList.remove('hidden'); }
  function closeModal(id) { $(id).classList.add('hidden'); }

  /* ---------- 事件绑定 & 启动 ---------- */
  function init() {
    if (!TOTAL) {
      document.body.innerHTML = '<p style="padding:2em;text-align:center">数据文件 js/data.js 加载失败</p>';
      return;
    }

    Store.load();

    // 通用导航
    var homeBtns = document.querySelectorAll('[data-nav]');
    for (var i = 0; i < homeBtns.length; i++) {
      homeBtns[i].addEventListener('click', function () {
        Sfx.tap();
        updateHome();
        showScreen('home');
      });
    }

    $('#btn-continue').addEventListener('click', function () {
      Sfx.tap();
      var t = nextTarget();
      openLearn(t.g, t.li);
    });
    $('#btn-grade').addEventListener('click', function () { Sfx.tap(); openGradeScreen(); });
    $('#btn-dex').addEventListener('click', function () { Sfx.tap(); openDex(); });
    $('#btn-book').addEventListener('click', function () { Sfx.tap(); openBook(); });

    $('#btn-map-back').addEventListener('click', function () { Sfx.tap(); openGradeScreen(); });
    $('#btn-learn-back').addEventListener('click', function () { Sfx.tap(); openMap(curGrade); });
    $('#btn-result-map').addEventListener('click', function () { Sfx.tap(); openMap(curGrade); });

    $('#btn-start').addEventListener('click', function () { Sfx.tap(); startPlay(curGrade, currentLevel); });

    $('#btn-quit').addEventListener('click', function () {
      Sfx.tap();
      openModal('#modal-quit');
    });
    $('#btn-quit-no').addEventListener('click', function () { Sfx.tap(); closeModal('#modal-quit'); });
    $('#btn-quit-yes').addEventListener('click', function () {
      closeModal('#modal-quit');
      state = null;
      openMap(curGrade);
    });

    $('#btn-next').addEventListener('click', function () {
      Sfx.tap();
      if (currentLevel + 1 < levelCount(curGrade)) openLearn(curGrade, currentLevel + 1);
      else openGradeScreen();                   // 本年级通关 → 去选下一个年级
    });
    $('#btn-replay').addEventListener('click', function () { Sfx.tap(); startPlay(curGrade, currentLevel); });

    // 设置
    $('#btn-settings').addEventListener('click', function () {
      Sfx.tap();
      $('#chk-sound').checked = Store.data.sound;
      $('#chk-tts').checked = Store.data.tts;
      openModal('#modal-settings');
    });
    $('#btn-close-settings').addEventListener('click', function () { Sfx.tap(); closeModal('#modal-settings'); });
    $('#chk-sound').addEventListener('change', function () { Store.data.sound = this.checked; Store.save(); });
    $('#chk-tts').addEventListener('change', function () {
      Store.data.tts = this.checked;
      Store.save();
      if (!this.checked && Speech.ok) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    });

    // 清除进度(二次确认)
    var resetArmed = false, resetTimer = null;
    $('#btn-reset').addEventListener('click', function () {
      if (!resetArmed) {
        resetArmed = true;
        this.textContent = '⚠️ 再点一次确认清除';
        var btn = this;
        resetTimer = setTimeout(function () {
          resetArmed = false;
          btn.textContent = '🗑️ 清除闯关进度';
        }, 2600);
      } else {
        clearTimeout(resetTimer);
        resetArmed = false;
        Store.reset();
        bookFilter = 0;
        updateHome();
        this.textContent = '🗑️ 清除闯关进度';
        closeModal('#modal-settings');
        showScreen('home');
      }
    });

    // 首次触摸时激活音频上下文
    var unlock = function () { Sfx.ensure(); };
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('mousedown', unlock);

    updateHome();
    showScreen('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
