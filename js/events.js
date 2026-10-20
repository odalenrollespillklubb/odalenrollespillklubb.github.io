// Arrangementskalender. Dataene redigeres i et Google Regneark som er publisert
// som CSV (Fil → Del → Publiser på nettet → «Kommaseparerte verdier»).
// Hele dokumentet er publisert; hver fane hentes med sin egen gid.
const SHEET_PUB_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjQkeMS-W0uq29npQ_SWRAC4Aw79gKlq9v9W3gzwy-vHXsaRkfz9Lby-yEUC00MOXdOYkKUh9xBxQN/pub';
const sheetCsv = gid => `${SHEET_PUB_URL}?gid=${gid}&single=true&output=csv`;
const SHEET_CSV = {
  arrangementer: sheetCsv('747526723'),
  typer: sheetCsv('1587435132'),
  steder: sheetCsv('2039672845'),
};

// Testing på egen maskin: ?testdata leser kopiene i temp/ (lastes ikke opp til GitHub),
// og ?idag=2027-06-12 (eller 2026-11-07T12:00) later som om det er en annen dag.
const params = new URLSearchParams(location.search);
const CSV_SOURCES = params.has('testdata')
  ? { arrangementer: 'temp/test-arrangementer.csv', typer: 'temp/test-typer.csv', steder: 'temp/test-steder.csv' }
  : SHEET_CSV;

const FACEBOOK_URL = 'https://www.facebook.com/OdalRollespillklubb';
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

// Fargenavnene som kan skrives i fanen «Typer» -> CSS-klassen event--<navn>
const COLOR_NAMES = {
  'blå': 'blue', 'blue': 'blue',
  'rød': 'red', 'red': 'red',
  'gul': 'yellow', 'yellow': 'yellow',
  'grønn': 'green', 'green': 'green',
  'lilla': 'purple', 'purple': 'purple',
  'oransje': 'orange', 'orange': 'orange',
  'grå': 'gray', 'gray': 'gray', 'grey': 'gray',
};

/* ---------- CSV ---------- */

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Turns CSV rows into objects keyed by lower-case header, skipping empty rows.
// Each object remembers its spreadsheet row number for error messages.
function csvToRecords(text) {
  const [headerRow, ...rows] = parseCsv(text);
  if (!headerRow) return [];
  const headers = headerRow.map(h => h.trim().toLowerCase());

  return rows
    .map((cells, i) => {
      const record = { rowNumber: i + 2 };
      headers.forEach((h, col) => { record[h] = (cells[col] || '').trim(); });
      return record;
    })
    .filter(record => headers.some(h => record[h]));
}

/* ---------- Dates ---------- */

function parseDate(text) {
  let m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return { y: +m[3], m: +m[2], d: +m[1] };
  m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  return null;
}

// "07.2027-08.2027" -> unknown date somewhere in that period
function parseMonthRange(text) {
  const m = text.match(/^(\d{1,2})\.(\d{4})\s*[-–]\s*(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return { from: { y: +m[2], m: +m[1] }, to: { y: +m[4], m: +m[3] } };
}

// "17:00" / "17.00" / "20:00++" -> { h, min, openEnd }
function parseTime(text) {
  const m = text.match(/^(\d{1,2})[:.](\d{2})\s*(\+*)$/);
  if (!m) return null;
  return { h: +m[1], min: +m[2], openEnd: m[3].length > 0 };
}

function isValidDay({ y, m, d }) {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function pad(n) { return String(n).padStart(2, '0'); }

function getNow() {
  const override = params.get('idag');
  if (override) {
    const m = override.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 12), +(m[5] || 0));
  }
  return new Date();
}

/* ---------- Building events ---------- */

function slugify(text) {
  return text.toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arrangement';
}

function buildEvent(record, typeColors, placeAddresses) {
  const title = record['hva'] || record['type'];
  if (!title) throw new Error('mangler «Hva»');

  const typeName = record['type'] || '';
  const event = {
    title,
    typeName,
    color: typeColors.get(typeName.toLowerCase()) || 'gray',
    age: record['aldersgrense'] || '',
    responsible: record['ansvarlig'] || record['vakt'] || '',
    place: record['sted'] || '',
    address: placeAddresses.get((record['sted'] || '').toLowerCase()) || '',
    fromText: record['fra'] || '',
    toText: record['til'] || '',
  };

  const dateText = record['dato'] || '';
  const day = parseDate(dateText);

  if (day && isValidDay(day)) {
    const from = parseTime(event.fromText);
    const to = parseTime(event.toText);
    if (event.fromText && !from) throw new Error(`ugyldig klokkeslett i «Fra»: «${event.fromText}»`);
    if (event.toText && !to) throw new Error(`ugyldig klokkeslett i «Til»: «${event.toText}»`);

    event.day = day;
    event.from = from;
    event.to = to;
    event.start = new Date(day.y, day.m - 1, day.d, from ? from.h : 0, from ? from.min : 0);
    // Open end ("20:00++"), or no end time: over at midnight
    event.end = (to && !to.openEnd)
      ? new Date(day.y, day.m - 1, day.d, to.h, to.min)
      : new Date(day.y, day.m - 1, day.d, 23, 59, 59);
    if (event.end < event.start) event.end.setDate(event.end.getDate() + 1);
    event.id = `arr-${day.y}${pad(day.m)}${pad(day.d)}-${slugify(title)}`;
    return event;
  }

  const range = parseMonthRange(dateText);
  if (range) {
    event.unknownDate = true;
    event.range = range;
    event.start = new Date(range.from.y, range.from.m - 1, 1);
    event.end = new Date(range.to.y, range.to.m, 0, 23, 59, 59);
    event.id = `arr-${range.from.y}${pad(range.from.m)}-${slugify(title)}`;
    return event;
  }

  throw new Error(dateText ? `ugyldig dato: «${dateText}»` : 'mangler dato');
}

function rangeLabel(range) {
  const from = MONTHS[range.from.m - 1];
  const to = MONTHS[range.to.m - 1];
  if (range.from.y === range.to.y && range.from.m === range.to.m) return `${from} ${range.to.y}`;
  if (range.from.y === range.to.y) return `${from}–${to} ${range.to.y}`;
  return `${from} ${range.from.y}–${to} ${range.to.y}`;
}

function timeLabel(event) {
  if (!event.fromText) return '';
  return event.toText ? `${event.fromText}–${event.toText}` : event.fromText;
}

function mapsUrl(address) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}

/* ---------- Calendar export (.ics + Google) ---------- */

function icsLocal(day, time) {
  return `${day.y}${pad(day.m)}${pad(day.d)}T${pad(time.h)}${pad(time.min)}00`;
}

// Calendar end: the written end time (even for "20:00++"), else 3 hours after start
function calendarEnd(event) {
  if (event.to) {
    const end = { ...event.day };
    if (event.to.h * 60 + event.to.min <= event.from.h * 60 + event.from.min) {
      const next = new Date(end.y, end.m - 1, end.d + 1);
      return { day: { y: next.getFullYear(), m: next.getMonth() + 1, d: next.getDate() }, time: event.to };
    }
    return { day: end, time: event.to };
  }
  const end = new Date(event.start.getTime() + 3 * 3600000);
  return {
    day: { y: end.getFullYear(), m: end.getMonth() + 1, d: end.getDate() },
    time: { h: end.getHours(), min: end.getMinutes() },
  };
}

function nextDay(day) {
  const d = new Date(day.y, day.m - 1, day.d + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function eventDescription(event) {
  const lines = [];
  if (event.typeName) lines.push(`Type: ${event.typeName}`);
  if (event.age) lines.push(`Aldersgrense: ${event.age}`);
  if (event.responsible) lines.push(`Ansvarlig: ${event.responsible}`);
  if (event.to && event.to.openEnd) lines.push(`Sluttid: ${event.toText} (kan vare lenger)`);
  lines.push('Odal Rollespillklubb');
  return lines.join('\n');
}

function eventLocation(event) {
  return event.address && event.address !== event.place ? `${event.place}, ${event.address}` : event.place;
}

function googleCalendarUrl(event) {
  let dates;
  if (event.from) {
    const end = calendarEnd(event);
    dates = `${icsLocal(event.day, event.from)}/${icsLocal(end.day, end.time)}`;
  } else {
    dates = `${event.day.y}${pad(event.day.m)}${pad(event.day.d)}/${nextDay(event.day)}`;
  }
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    ctz: 'Europe/Oslo',
    details: eventDescription(event),
    location: eventLocation(event),
  });
  return 'https://calendar.google.com/calendar/render?' + query.toString();
}

function icsEscape(text) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function icsFold(line) {
  const parts = [];
  while (line.length > 70) { parts.push(line.slice(0, 70)); line = ' ' + line.slice(70); }
  parts.push(line);
  return parts.join('\r\n');
}

const ICS_TIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Oslo',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
  'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
  'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

function icsEvent(event, stamp) {
  const lines = ['BEGIN:VEVENT', `UID:${event.id}@odalrollespill.no`, `DTSTAMP:${stamp}`];
  if (event.from) {
    const end = calendarEnd(event);
    lines.push(`DTSTART;TZID=Europe/Oslo:${icsLocal(event.day, event.from)}`);
    lines.push(`DTEND;TZID=Europe/Oslo:${icsLocal(end.day, end.time)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${event.day.y}${pad(event.day.m)}${pad(event.day.d)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay(event.day)}`);
  }
  lines.push(`SUMMARY:${icsEscape(event.title)}`);
  if (event.place) lines.push(`LOCATION:${icsEscape(eventLocation(event))}`);
  lines.push(`DESCRIPTION:${icsEscape(eventDescription(event))}`);
  lines.push('END:VEVENT');
  return lines;
}

function downloadIcs(events, filename) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Odal Rollespillklubb//Kalender//NO',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Odal Rollespillklubb',
    ...ICS_TIMEZONE,
    ...events.flatMap(event => icsEvent(event, stamp)),
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.map(icsFold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Rendering ---------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderAddToCalendar(event) {
  const wrap = el('div', 'add-to-cal');
  const button = el('button', 'add-to-cal-btn', 'Legg til i kalender');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');

  const menu = el('div', 'add-to-cal-menu');
  menu.hidden = true;

  const google = el('a', '', 'Google Kalender');
  google.href = googleCalendarUrl(event);
  google.target = '_blank';
  google.rel = 'noopener';

  const ics = el('button', '', 'Apple / Outlook (.ics)');
  ics.type = 'button';
  ics.addEventListener('click', () => {
    downloadIcs([event], `${event.id}.ics`);
    closeCalendarMenus();
  });

  menu.append(google, ics);
  button.addEventListener('click', e => {
    e.stopPropagation();
    const open = menu.hidden;
    closeCalendarMenus();
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });

  wrap.append(button, menu);
  return wrap;
}

function closeCalendarMenus() {
  document.querySelectorAll('.add-to-cal-menu').forEach(menu => { menu.hidden = true; });
  document.querySelectorAll('.add-to-cal-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
}

document.addEventListener('click', e => {
  if (!e.target.closest('.add-to-cal')) closeCalendarMenus();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeCalendarMenus();
});

function renderPlace(event) {
  if (!event.place) return null;
  if (!event.address) return el('span', 'event-place', event.place);
  const link = el('a', 'event-place event-place--link', event.place);
  link.href = mapsUrl(event.address);
  link.target = '_blank';
  link.rel = 'noopener';
  link.title = `Vis ${event.place} på kart`;
  return link;
}

function renderEvent(event, { past }) {
  const article = el('article', `event event--${event.color}`);
  if (!past) article.id = event.id;

  const date = el('div', 'event-date');
  if (event.unknownDate) {
    date.append(el('span', 'event-weekday', 'Dato'), el('span', 'event-day', '?'), el('span', 'event-month', 'kommer'));
  } else {
    date.append(
      el('span', 'event-weekday', WEEKDAYS[event.start.getDay()]),
      el('span', 'event-day', String(event.day.d)),
      el('span', 'event-month', MONTHS[event.day.m - 1].slice(0, 3)),
    );
  }

  const main = el('div', 'event-main');
  if (event.typeName && event.typeName.toLowerCase() !== event.title.toLowerCase()) {
    main.append(el('span', 'event-type', event.typeName));
  }
  main.append(el('h4', 'event-title', event.title));

  const meta = el('p', 'event-meta');
  if (event.unknownDate) meta.append(el('span', '', `Dato kommer (${rangeLabel(event.range)})`));
  const time = timeLabel(event);
  if (time) meta.append(el('span', 'event-time', time));
  if (!event.unknownDate) meta.append(el('span', 'event-week', `uke ${isoWeek(event.start)}`));
  if (event.age) meta.append(el('span', /18/.test(event.age) ? 'event-age event-age--adult' : 'event-age', event.age));
  main.append(meta);
  if (event.responsible) main.append(el('p', 'event-responsible', `Ansvarlig: ${event.responsible}`));

  const side = el('div', 'event-side');
  const place = renderPlace(event);
  if (place) side.append(place);
  if (!past && !event.unknownDate) side.append(renderAddToCalendar(event));

  article.append(date, main, side);
  return article;
}

function monthKey(event) {
  return event.start.getFullYear() * 12 + event.start.getMonth();
}

function renderList(container, events, options) {
  container.textContent = '';
  let currentMonth = null;
  events.forEach(event => {
    const key = monthKey(event);
    if (key !== currentMonth) {
      currentMonth = key;
      const name = MONTHS[event.start.getMonth()];
      container.append(el('h3', 'event-month-heading', `${name[0].toUpperCase()}${name.slice(1)} ${event.start.getFullYear()}`));
    }
    container.append(renderEvent(event, options));
  });
}

// Shows only the first few events and lets the rest scroll inside the box,
// with a peek of the next one so it's clear there is more.
const VISIBLE_EVENTS = 4;
const PEEK_HEIGHT = 48;

function limitListHeight(list) {
  const events = list.querySelectorAll('.event');
  list.style.maxHeight = '';
  list.classList.toggle('event-list--scroll', events.length > VISIBLE_EVENTS);
  if (events.length <= VISIBLE_EVENTS || list.hidden) return;

  const last = events[VISIBLE_EVENTS - 1];
  list.style.maxHeight = `${last.offsetTop + last.offsetHeight + PEEK_HEIGHT}px`;
}

function renderLegend(container, typeRecords) {
  container.textContent = '';
  typeRecords.forEach(({ name, color }) => {
    const item = el('li', `event-legend-item event--${color}`, name);
    container.append(item);
  });
  container.hidden = typeRecords.length === 0;
}

function relativeDayLabel(event, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((new Date(event.day.y, event.day.m - 1, event.day.d) - today) / 86400000);
  if (days === 0) return 'i dag';
  if (days === 1) return 'i morgen';
  return '';
}

function renderNextEvent(container, event, now) {
  container.textContent = '';
  if (!event) {
    container.append(el('p', 'next-event-label', 'Neste hendelse:'));
    const empty = el('p', 'next-event-empty', 'Ingen planlagte arrangementer akkurat nå. Følg med på ');
    const fb = el('a', '', 'Facebook');
    fb.href = FACEBOOK_URL;
    fb.target = '_blank';
    fb.rel = 'noopener';
    empty.append(fb, document.createTextNode(' eller Discord!'));
    container.append(empty);
    container.hidden = false;
    return;
  }

  const ongoing = event.start <= now;
  container.append(el('p', 'next-event-label', ongoing ? 'Pågår nå:' : 'Neste hendelse:'));

  const card = el('a', `next-event-card event--${event.color}`);
  card.href = '#kalender';
  card.append(el('span', 'next-event-title', event.title));

  const relative = ongoing ? '' : relativeDayLabel(event, now);
  const when = `${relative ? relative + ', ' : ''}${WEEKDAYS[event.start.getDay()]} ${event.day.d}. ${MONTHS[event.day.m - 1]}`;
  const time = timeLabel(event);
  card.append(el('span', 'next-event-when', time ? `${when} · ${time}` : when));

  const where = [event.place, event.age].filter(Boolean).join(' · ');
  if (where) card.append(el('span', 'next-event-where', where));
  card.append(el('span', 'next-event-more', 'Se kalenderen →'));

  container.append(card);
  container.hidden = false;
}

function showCalendarError(list) {
  list.textContent = '';
  const message = el('p', 'event-status', 'Kalenderen kunne ikke lastes akkurat nå. Se ');
  const fb = el('a', '', 'Facebook-siden vår');
  fb.href = FACEBOOK_URL;
  fb.target = '_blank';
  fb.rel = 'noopener';
  message.append(fb, document.createTextNode(' for kommende arrangementer.'));
  list.append(message);
}

/* ---------- Loading ---------- */

async function fetchCsv(url) {
  if (!url) throw new Error('mangler lenke til regnearket (se toppen av js/events.js)');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return csvToRecords(await response.text());
}

async function initEvents() {
  const list = document.getElementById('event-list');
  const pastList = document.getElementById('past-event-list');
  const pastToggle = document.getElementById('toggle-past-events');
  const downloadAll = document.getElementById('download-all-events');
  const legend = document.getElementById('event-legend');
  const nextEvent = document.getElementById('next-event');
  if (!list) return;

  const [eventResult, typeResult, placeResult] = await Promise.allSettled([
    fetchCsv(CSV_SOURCES.arrangementer),
    fetchCsv(CSV_SOURCES.typer),
    fetchCsv(CSV_SOURCES.steder),
  ]);

  if (eventResult.status === 'rejected') {
    console.warn('Kalender:', eventResult.reason.message);
    showCalendarError(list);
    return;
  }
  [typeResult, placeResult].forEach(result => {
    if (result.status === 'rejected') console.warn('Kalender:', result.reason.message);
  });

  const typeRecords = (typeResult.value || [])
    .filter(r => r['type'])
    .map(r => ({ name: r['type'], color: COLOR_NAMES[(r['farge'] || '').toLowerCase()] || 'gray' }));
  const typeColors = new Map(typeRecords.map(t => [t.name.toLowerCase(), t.color]));
  const placeAddresses = new Map((placeResult.value || [])
    .filter(r => r['sted'] && r['adresse'])
    .map(r => [r['sted'].toLowerCase(), r['adresse']]));

  const events = [];
  const usedIds = new Set();
  eventResult.value.forEach(record => {
    try {
      const event = buildEvent(record, typeColors, placeAddresses);
      let id = event.id;
      for (let n = 2; usedIds.has(id); n++) id = `${event.id}-${n}`;
      event.id = id;
      usedIds.add(id);
      events.push(event);
    } catch (err) {
      console.warn(`Kalender: rad ${record.rowNumber} i regnearket ble hoppet over (${err.message}).`);
    }
  });
  events.sort((a, b) => a.start - b.start);

  const now = getNow();
  const upcoming = events.filter(e => e.end >= now);
  const past = events.filter(e => e.end < now).reverse();

  renderLegend(legend, typeRecords);
  renderNextEvent(nextEvent, upcoming.find(e => !e.unknownDate), now);

  if (upcoming.length) {
    renderList(list, upcoming, { past: false });
    limitListHeight(list);
  } else {
    list.textContent = '';
    list.append(el('p', 'event-status', 'Ingen kommende arrangementer er lagt inn ennå.'));
  }

  const downloadable = upcoming.filter(e => !e.unknownDate);
  downloadAll.hidden = downloadable.length === 0;
  downloadAll.addEventListener('click', () => downloadIcs(downloadable, 'odal-rollespillklubb.ics'));

  if (past.length) {
    renderList(pastList, past, { past: true });
    pastToggle.hidden = false;
    pastToggle.addEventListener('click', () => {
      const show = pastList.hidden;
      pastList.hidden = !show;
      limitListHeight(pastList);
      pastToggle.setAttribute('aria-expanded', String(show));
      pastToggle.textContent = show ? 'Skjul tidligere arrangementer' : `Vis tidligere arrangementer (${past.length})`;
    });
    pastToggle.textContent = `Vis tidligere arrangementer (${past.length})`;
  }

  // Event heights change with the layout, so re-measure the boxes
  window.addEventListener('resize', () => {
    limitListHeight(list);
    limitListHeight(pastList);
  });
  document.fonts?.ready.then(() => limitListHeight(list));
}

initEvents();
