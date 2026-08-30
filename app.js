(() => {
  const rateEl = document.getElementById('rate');
  const hoursEl = document.getElementById('hours');
  const baseWageEl = document.getElementById('baseWage');
  const extrasListEl = document.getElementById('extrasList');
  const extraForm = document.getElementById('extraForm');
  const extraLabelEl = document.getElementById('extraLabel');
  const extraAmountEl = document.getElementById('extraAmount');
  const totalAmountEl = document.getElementById('totalAmount');
  const monthLabelEl = document.getElementById('monthLabel');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const offlineNote = document.getElementById('offlineNote');

  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const money = (n) => (Number.isFinite(n) ? n : 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const storeKey = (d) => `lohnrechner:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  let current = new Date();
  current.setDate(1);

  function loadMonth(date) {
    const raw = localStorage.getItem(storeKey(date));
    if (raw) {
      try { return JSON.parse(raw); } catch { /* fall through */ }
    }
    return { rate: '', hours: '', extras: [] };
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

  function renderTotals() {
    const rate = parseFloat(rateEl.value.replace(',', '.')) || 0;
    const hours = parseFloat(hoursEl.value.replace(',', '.')) || 0;
    const base = rate * hours;
    const extrasSum = data.extras.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    baseWageEl.textContent = money(base);
    totalAmountEl.textContent = money(base + extrasSum);
  }

  function renderAll() {
    renderMonthLabel();
    rateEl.value = data.rate ?? '';
    hoursEl.value = data.hours ?? '';
    renderExtras();
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

  prevMonthBtn.addEventListener('click', () => switchMonth(-1));
  nextMonthBtn.addEventListener('click', () => switchMonth(1));

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
