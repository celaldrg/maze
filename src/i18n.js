/**
 * English and Turkish interface strings, plus pure lookup helpers.
 * Strings may contain `{name}` placeholders that `translate` fills in.
 * @module i18n
 */

/** Supported languages; the first one is the default. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Language used on a first visit. */
export const DEFAULT_LANGUAGE = 'en';

/** Every string by language and key. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    title: 'Maze',
    tagline: 'Find the glowing exit',
    restart: 'Restart',
    switchLanguage: 'TR: switch to Turkish',
    level: 'Level',
    levelOf: 'Level {n}/{count}',
    levelOption: 'Level {n} · {size}',
    time: 'Time',
    best: 'Best',
    noBest: '—',
    assisted: 'Assisted',
    assistedHint: 'The solution was shown, so this maze cannot set a best time.',
    newMaze: 'New maze',
    showSolution: 'Show solution',
    hideSolution: 'Hide solution',
    algorithm: 'Algorithm',
    'algorithm.backtracker': 'Backtracker',
    'algorithm.prim': 'Prim',
    'algorithm.kruskal': 'Kruskal',
    'about.backtracker': 'Depth-first search: long, winding corridors and few junctions.',
    'about.prim': 'Grows outward from one cell: lots of short dead ends.',
    'about.kruskal': 'Joins random walls with union-find: evenly branched.',
    board: 'Maze board. Reach the glowing exit in the bottom-right corner.',
    startHint: 'Reach the glowing exit ↘',
    pad: 'Direction pad',
    up: 'Up',
    right: 'Right',
    down: 'Down',
    left: 'Left',
    helpMoveKeys: 'Arrows / WASD',
    helpMove: 'Move one cell',
    helpHoldKey: 'Hold',
    helpHold: 'Run to the next junction',
    helpSwipeKey: 'Swipe',
    helpSwipe: 'Dash on touch screens',
    winTitle: 'Maze solved!',
    winStats: '{time} · {moves}',
    movesOne: '{count} move',
    movesMany: '{count} moves',
    winNewBest: 'New best time!',
    winBest: 'Best: {time}',
    winAssisted: 'The solution was shown, so this time is not recorded.',
    nextLevel: 'Next level',
    license: 'MIT',
    source: 'Source on GitHub',
  }),
  tr: Object.freeze({
    title: 'Labirent',
    tagline: 'Parlayan çıkışı bul',
    restart: 'Yeniden başlat',
    switchLanguage: 'EN: İngilizceye geç',
    level: 'Seviye',
    levelOf: 'Seviye {n}/{count}',
    levelOption: 'Seviye {n} · {size}',
    time: 'Süre',
    best: 'En iyi',
    noBest: '—',
    assisted: 'Yardımlı',
    assistedHint: 'Çözüm gösterildi; bu labirentte en iyi süre kaydedilmez.',
    newMaze: 'Yeni labirent',
    showSolution: 'Çözümü göster',
    hideSolution: 'Çözümü gizle',
    algorithm: 'Algoritma',
    'algorithm.backtracker': 'Geri izleme',
    'algorithm.prim': 'Prim',
    'algorithm.kruskal': 'Kruskal',
    'about.backtracker': 'Derinlik öncelikli arama: uzun, kıvrımlı koridorlar ve az kavşak.',
    'about.prim': 'Tek bir hücreden dışa doğru büyür: bol sayıda kısa çıkmaz.',
    'about.kruskal': 'Rastgele duvarları union-find ile birleştirir: dengeli dallanır.',
    board: 'Labirent tahtası. Sağ alt köşedeki parlayan çıkışa ulaş.',
    startHint: 'Parlayan çıkışa ulaş ↘',
    pad: 'Yön tuşları',
    up: 'Yukarı',
    right: 'Sağ',
    down: 'Aşağı',
    left: 'Sol',
    helpMoveKeys: 'Ok tuşları / WASD',
    helpMove: 'Bir hücre ilerle',
    helpHoldKey: 'Basılı tut',
    helpHold: 'Sonraki kavşağa koş',
    helpSwipeKey: 'Kaydır',
    helpSwipe: 'Dokunmatik ekranda hızlı geçiş',
    winTitle: 'Labirent çözüldü!',
    winStats: '{time} · {moves}',
    movesOne: '{count} hamle',
    movesMany: '{count} hamle',
    winNewBest: 'Yeni en iyi süre!',
    winBest: 'En iyi: {time}',
    winAssisted: 'Çözüm gösterildi; bu süre kaydedilmedi.',
    nextLevel: 'Sonraki seviye',
    license: 'MIT',
    source: 'Kaynak kodu GitHub’da',
  }),
});

/**
 * Is the value a supported language code?
 * @param {unknown} value
 * @returns {boolean}
 */
export function isLanguage(value) {
  return typeof value === 'string' && LANGUAGES.includes(value);
}

/**
 * The language the toggle button switches to.
 * @param {string} lang
 * @returns {string}
 */
export function otherLanguage(lang) {
  return lang === 'tr' ? 'en' : 'tr';
}

/**
 * Look up a string and fill in its `{name}` placeholders. Unknown languages
 * fall back to English, unknown keys to the key itself, and placeholders
 * without a value are left as they are.
 * @param {string} lang
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function translate(lang, key, params = {}) {
  const table = STRINGS[isLanguage(lang) ? lang : DEFAULT_LANGUAGE];
  const template = Object.hasOwn(table, key) ? table[key] : key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}
