(() => {
  const rateEl = document.getElementById('rate');
  const hoursEl = document.getElementById('hours');
  const baseWageEl = document.getElementById('baseWage');
  const extrasListEl = document.getElementById('extrasList');
  const extraForm = document.getElementById('extraForm');
  const extraLabelEl = document.getElementById('extraLabel');
  const extraAmountEl = document.getElementById('extraAmount');
  const daysListEl = document.getElementById('daysList');
  const dayForm = document.getElementById('dayForm');
  const dayDateEl = document.getElementById('dayDate');
  const dayHoursIntEl = document.getElementById('dayHoursInt');
  const dayMinutesEl = document.getElementById('dayMinutes');
  const workedHoursEl = document.getElementById('workedHours');
  const remainingHoursEl = document.getElementById('remainingHours');
  const avgPerWorkdayEl = document.getElementById('avgPerWorkday');
  const progressFillEl = document.getElementById('progressFill');
  const paceNoteEl = document.getElementById('paceNote');
  const totalAmountEl = document.getElementById('totalAmount');
  const targetLabelEl = document.getElementById('targetLabel');
  const targetAmountEl = document.getElementById('targetAmount');
  const monthLabelEl = document.getElementById('monthLabel');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const offlineNote = document.getElementById('offlineNote');
  const themeToggle = document.getElementById('themeToggle');

  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const weekdayShort = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const money = (n) => (Number.isFinite(n) ? n : 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const hoursFmt = (n) => (Number.isFinite(n) ? n : 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' h';
  const hmFmt = (decimalHours) => {
    const totalMinutes = Math.round((Number.isFinite(decimalHours) ? decimalHours : 0) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m === 0 ? `${h} Std` : `${h} Std ${m} Min`;
  };
  const storeKey = (d) => `lohnrechner:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const pad2 = (n) => String(n).padStart(2, '0');
  const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const parseDateKey = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  let current = new Date();
  current.setDate(1);

  function loadMonth(date) {
    const raw = localStorage.getItem(storeKey(date));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.days)) parsed.days = [];
        return parsed;
      } catch { /* fall through */ }
    }
    return { rate: '', hours: '', extras: [], days: [] };
  }

  function saveMonth(date, data) {
    localStorage.setItem(storeKey(date), JSON.stringify(data));
  }

  let data = loadMonth(current);

  function renderMonthLabel() {
    monthLabelEl.textContent = `${monthNames[current.getMonth()]} ${current.getFullYear()}`;
  }

  function renderExtras() {
    extrasListEl.innerHTML = '';
    data.extras.forEach((extra, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="extra-dot"></span>
        <span class="extra-name"></span>
        <span class="extra-amount tabular"></span>
        <button class="remove" aria-label="Eintrag entfernen">×</button>
      `;
      li.querySelector('.extra-name').textContent = extra.label;
      li.querySelector('.extra-amount').textContent = money(extra.amount);
      li.querySelector('.remove').addEventListener('click', () => {
        data.extras.splice(i, 1);
        saveMonth(current, data);
        renderExtras();
        renderTotals();
      });
      extrasListEl.appendChild(li);
    });
  }

  function renderDays() {
    daysListEl.innerHTML = '';
    const sorted = data.days
      .map((d, i) => ({ ...d, i }))
      .sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((entry) => {
      const dateObj = parseDateKey(entry.date);
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="day-weekday${isWeekend ? ' is-weekend' : ''}"></span>
        <span class="extra-name"></span>
        <span class="extra-amount tabular"></span>
        <button class="remove" aria-label="Eintrag entfernen">×</button>
      `;
      li.querySelector('.day-weekday').textContent = weekdayShort[dow];
      li.querySelector('.extra-name').textContent = `${pad2(dateObj.getDate())}.${pad2(dateObj.getMonth() + 1)}.${isWeekend ? ' (Ausnahme)' : ''}`;
      li.querySelector('.extra-amount').textContent = hmFmt(entry.hours);
      li.querySelector('.remove').addEventListener('click', () => {
        data.days.splice(entry.i, 1);
        saveMonth(current, data);
        renderDays();
        renderTotals();
      });
      daysListEl.appendChild(li);
    });
  }

  function countWorkdaysInclusive(from, to) {
    if (from > to) return 0;
    let count = 0;
    const cursor = new Date(from);
    while (cursor <= to) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }

  let lastTotal = null;

  function renderTotals() {
    const rate = parseFloat(rateEl.value.replace(',', '.')) || 0;
    const targetHours = parseFloat(hoursEl.value.replace(',', '.')) || 0;
    const workedHours = data.days.reduce((sum, d) => sum + (Number(d.hours) || 0), 0);
    const base = rate * workedHours;
    const extrasSum = data.extras.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const total = base + extrasSum;

    baseWageEl.textContent = money(base);
    totalAmountEl.textContent = money(total);
    if (lastTotal !== null && lastTotal !== total) {
      totalAmountEl.classList.remove('bump');
      void totalAmountEl.offsetWidth;
      totalAmountEl.classList.add('bump');
    }
    lastTotal = total;

    if (targetHours > 0) {
      const expectedTotal = (rate * targetHours) + extrasSum;
      targetLabelEl.textContent = `Bei Zielerreichung (${hoursFmt(targetHours)})`;
      targetAmountEl.textContent = money(expectedTotal);
    } else {
      targetLabelEl.textContent = 'Bei Zielerreichung';
      targetAmountEl.textContent = '–';
    }

    workedHoursEl.textContent = hoursFmt(workedHours);
    const remaining = Math.max(0, targetHours - workedHours);
    remainingHoursEl.textContent = hoursFmt(remaining);
    const pct = targetHours > 0 ? Math.min(100, (workedHours / targetHours) * 100) : 0;
    progressFillEl.style.width = `${pct}%`;

    const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const totalWorkdaysInMonth = countWorkdaysInclusive(monthStart, monthEnd);
    const avgPerWorkday = targetHours > 0 && totalWorkdaysInMonth > 0 ? targetHours / totalWorkdaysInMonth : 0;
    avgPerWorkdayEl.textContent = hoursFmt(avgPerWorkday);

    if (targetHours <= 0) {
      paceNoteEl.textContent = 'Trag dein Zielstunden ein, um deine Tagesempfehlung zu sehen.';
      paceNoteEl.classList.remove('done');
      return;
    }
    if (remaining <= 0) {
      paceNoteEl.innerHTML = '<strong>Ziel erreicht!</strong> Alles Weitere ist Bonus.';
      paceNoteEl.classList.add('done');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let rangeStart = null;
    if (monthEnd < today) {
      rangeStart = null;
    } else if (monthStart > today) {
      rangeStart = monthStart;
    } else {
      rangeStart = today;
    }

    paceNoteEl.classList.remove('done');
    if (!rangeStart) {
      paceNoteEl.innerHTML = `Der Monat ist vorbei, es fehlen noch <strong>${hoursFmt(remaining)}</strong> zum Ziel.`;
      return;
    }

    const remainingWorkdays = countWorkdaysInclusive(rangeStart, monthEnd);
    if (remainingWorkdays === 0) {
      paceNoteEl.innerHTML = `Keine Werktage mehr übrig, aber noch <strong>${hoursFmt(remaining)}</strong> offen.`;
      return;
    }
    const perDay = remaining / remainingWorkdays;
    paceNoteEl.innerHTML = `Noch <strong>${hoursFmt(remaining)}</strong> an ${remainingWorkdays} Werktagen → <strong>${hoursFmt(perDay)}</strong> pro Werktag.`;
  }

  function renderAll() {
    renderMonthLabel();
    rateEl.value = data.rate ?? '';
    hoursEl.value = data.hours ?? '';
    dayDateEl.min = toDateKey(new Date(current.getFullYear(), current.getMonth(), 1));
    dayDateEl.max = toDateKey(new Date(current.getFullYear(), current.getMonth() + 1, 0));
    const todayKey = toDateKey(new Date());
    dayDateEl.value = (todayKey >= dayDateEl.min && todayKey <= dayDateEl.max) ? todayKey : dayDateEl.min;
    renderExtras();
    renderDays();
    renderTotals();
  }

  function switchMonth(offset) {
    current.setMonth(current.getMonth() + offset);
    data = loadMonth(current);
    renderAll();
  }

  rateEl.addEventListener('input', () => {
    data.rate = rateEl.value;
    saveMonth(current, data);
    renderTotals();
  });

  hoursEl.addEventListener('input', () => {
    data.hours = hoursEl.value;
    saveMonth(current, data);
    renderTotals();
  });

  extraForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const label = extraLabelEl.value.trim();
    const amount = parseFloat(extraAmountEl.value.replace(',', '.')) || 0;
    if (!label) return;
    data.extras.push({ label, amount });
    saveMonth(current, data);
    extraForm.reset();
    extraLabelEl.focus();
    renderExtras();
    renderTotals();
  });

  dayForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateKey = dayDateEl.value;
    const h = parseInt(dayHoursIntEl.value, 10) || 0;
    const m = parseInt(dayMinutesEl.value, 10) || 0;
    const hours = h + (m / 60);
    if (!dateKey || hours <= 0) return;
    const existing = data.days.find((d) => d.date === dateKey);
    if (existing) {
      existing.hours = hours;
    } else {
      data.days.push({ date: dateKey, hours });
    }
    saveMonth(current, data);
    dayHoursIntEl.value = '';
    dayMinutesEl.value = '';
    dayHoursIntEl.focus();
    renderDays();
    renderTotals();
  });

  prevMonthBtn.addEventListener('click', () => switchMonth(-1));
  nextMonthBtn.addEventListener('click', () => switchMonth(1));

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0d1a' : '#f4f5fb');
  }

  function initTheme() {
    const saved = localStorage.getItem('lohnrechner:theme');
    if (saved) {
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  themeToggle.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('lohnrechner:theme', next);
  });

  initTheme();

  function updateOfflineNote() {
    offlineNote.hidden = navigator.onLine;
  }
  window.addEventListener('online', updateOfflineNote);
  window.addEventListener('offline', updateOfflineNote);
  updateOfflineNote();

  renderAll();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }
})();
