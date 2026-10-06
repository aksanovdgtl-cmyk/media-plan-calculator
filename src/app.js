
(function () {
  'use strict';

  const Engine = window.MediaPlanEngine;
  if (!Engine) throw new Error('MediaPlanEngine is not loaded');

  const channelState = [
    { id: 'google', enabled: true, weight: 30, model: 'cpc', cpc: '', cpm: '', ctr: '', clickToResult: '', resultToSale: '', resultType: 'lead', structures: 1, testUnits: 3, testShare: 20 },
    { id: 'meta', enabled: true, weight: 25, model: 'cpm', cpc: '', cpm: '', ctr: '', clickToResult: '', resultToSale: '', resultType: 'lead', structures: 1, testUnits: 5, testShare: 25 },
    { id: 'yandex', enabled: true, weight: 25, model: 'cpc', cpc: '', cpm: '', ctr: '', clickToResult: '', resultToSale: '', resultType: 'lead', structures: 1, testUnits: 3, testShare: 20 },
    { id: 'telegram', enabled: true, weight: 20, model: 'cpm', cpc: '', cpm: '', ctr: '', clickToResult: '', resultToSale: '', resultType: 'subscriber', structures: 1, testUnits: 5, testShare: 30 }
  ];

  const demo = {
    globals: { currency: 'USD', months: 3, monthlyBudget: 10000, monthlyGrowth: 0, averageOrder: 1500, marginPct: 55, fixedValuePerSale: '', uncertainty: 20 },
    channels: {
      google: { weight: 35, model: 'cpc', cpc: 4.5, ctr: 6, clickToResult: 5, resultToSale: 15, resultType: 'lead', structures: 1, testUnits: 3, testShare: 20 },
      meta: { weight: 30, model: 'cpm', cpm: 9, ctr: 1.2, clickToResult: 4, resultToSale: 12, resultType: 'lead', structures: 1, testUnits: 5, testShare: 25 },
      yandex: { weight: 20, model: 'cpc', cpc: 1.8, ctr: 7, clickToResult: 6, resultToSale: 14, resultType: 'lead', structures: 1, testUnits: 3, testShare: 20 },
      telegram: { weight: 15, model: 'cpm', cpm: 2, ctr: 0.6, clickToResult: 10, resultToSale: 5, resultType: 'subscriber', structures: 1, testUnits: 5, testShare: 30 }
    }
  };

  const state = { result: null, activeScenario: 'base', hasRun: false };
  const $ = (id) => document.getElementById(id);
  const form = $('mp-form');
  const channelsRoot = $('mp-channels');
  const results = $('mp-results');

  function field(label, key, value, options) {
    const opts = options || {};
    const wrapper = document.createElement('label');
    wrapper.className = `mp-field${opts.wide ? ' mp-field--wide' : ''}${opts.className ? ` ${opts.className}` : ''}`;
    if (opts.hidden) wrapper.hidden = true;
    const span = document.createElement('span');
    span.textContent = label;
    let input;
    if (opts.select) {
      input = document.createElement('select');
      opts.select.forEach(([optionValue, text]) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = text;
        input.appendChild(option);
      });
      input.value = value;
    } else {
      input = document.createElement('input');
      input.type = 'number';
      input.min = opts.min == null ? '0' : String(opts.min);
      input.max = opts.max == null ? '' : String(opts.max);
      input.step = opts.step || 'any';
      input.inputMode = 'decimal';
      input.value = value;
      if (opts.placeholder) input.placeholder = opts.placeholder;
    }
    input.dataset.key = key;
    wrapper.append(span, input);
    if (opts.note) {
      const small = document.createElement('small');
      small.textContent = opts.note;
      wrapper.appendChild(small);
    }
    return wrapper;
  }

  function renderChannels() {
    channelsRoot.replaceChildren();
    channelState.forEach((channel) => {
      const platform = Engine.PLATFORMS[channel.id];
      const article = document.createElement('article');
      article.className = 'channel-card';
      article.dataset.channel = channel.id;
      article.style.setProperty('--channel-color', platform.color);

      const header = document.createElement('div');
      header.className = 'channel-card__header';
      const label = document.createElement('label');
      label.className = 'channel-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = channel.enabled;
      checkbox.dataset.key = 'enabled';
      const titleWrap = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = platform.label;
      const role = document.createElement('small');
      role.textContent = platform.role;
      titleWrap.append(title, role);
      label.append(checkbox, titleWrap);
      const share = document.createElement('span');
      share.className = 'channel-share';
      share.textContent = `${channel.weight}%`;
      header.append(label, share);

      const body = document.createElement('div');
      body.className = 'channel-card__body';
      body.hidden = !channel.enabled;
      body.append(
        field('Вес канала, %', 'weight', channel.weight, { max: 100 }),
        field('Модель расчёта', 'model', channel.model, { select: [['cpc', 'Оплата за клик / CPC'], ['cpm', 'Оплата за показы / CPM']] }),
        field('CPC', 'cpc', channel.cpc, { className: 'cost-cpc', hidden: channel.model !== 'cpc', placeholder: 'Из планировщика' }),
        field('CPM', 'cpm', channel.cpm, { className: 'cost-cpm', hidden: channel.model !== 'cpm', placeholder: 'За 1000 показов' }),
        field('CTR, %', 'ctr', channel.ctr, { max: 100, placeholder: 'Например, 1.2' }),
        field('Клик → результат, %', 'clickToResult', channel.clickToResult, { max: 100 }),
        field('Что считаем результатом', 'resultType', channel.resultType, { select: [['lead', 'Заявка'], ['subscriber', 'Подписчик'], ['activation', 'Запуск бота / активация'], ['sale', 'Продажа']] }),
        field('Результат → продажа, %', 'resultToSale', channel.resultToSale, { max: 100, className: 'result-to-sale', hidden: channel.resultType === 'sale' }),
        field('Кампаний / групп / стратегий', 'structures', channel.structures, { min: 1, step: 1, note: 'Для проверки объёма обучения' }),
        field('Тестовых связок', 'testUnits', channel.testUnits, { min: 1, step: 1 }),
        field('Доля бюджета на тесы, %', 'testShare', channel.testShare, { max: 100 })
      );

      const fact = document.createElement('p');
      fact.className = 'channel-fact';
      if (channel.id === 'google') fact.textContent = 'Ориентир из фактуры: 30+ конверсий в месяц; запас бюджета на 10 лидов в неделю + 40%.';
      if (channel.id === 'meta') fact.textContent = 'Ориентир: 50 событий в неделю на группу; 20–25% бюджета на тесы.';
      if (channel.id === 'yandex') fact.textContent = 'Ориентир: 10 конверсий в неделю на одну автостратегию.';
      if (channel.id === 'telegram') fact.textContent = 'Формула из фактуры: бюджет / CPM × 1000 → показы × CTR → клики × CR → результат.';
      body.appendChild(fact);
      article.append(header, body);
      channelsRoot.appendChild(article);
    });
  }

  function syncChannelsFromDom() {
    channelsRoot.querySelectorAll('[data-channel]').forEach((card) => {
      const channel = channelState.find((item) => item.id === card.dataset.channel);
      card.querySelectorAll('[data-key]').forEach((input) => {
        channel[input.dataset.key] = input.type === 'checkbox' ? input.checked : input.value;
      });
    });
  }

  function collectInput() {
    syncChannelsFromDom();
    return {
      currency: $('mp-currency').value,
      months: $('mp-months').value,
      monthlyBudget: $('mp-monthly-budget').value,
      monthlyGrowth: $('mp-monthly-growth').value,
      averageOrder: $('mp-average-order').value,
      marginPct: $('mp-margin').value,
      fixedValuePerSale: $('mp-fixed-value-per-sale').value,
      uncertainty: $('mp-uncertainty').value,
      channels: channelState.map((channel) => Object.assign({}, channel))
    };
  }

  function money(value) {
    const currency = $('mp-currency').value;
    try {
      return new Intl.NumberFormat('ru-RU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
    } catch (error) {
      return `${format(value, 0)} ${currency}`;
    }
  }

  function format(value, digits) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits == null ? 2 : digits }).format(Number(value) || 0);
  }

  function setKpi(id, value, note) {
    const el = $(id);
    el.querySelector('strong').textContent = value;
    el.querySelector('span:last-child').textContent = note || '';
  }

  function scenarioResult() {
    return state.result.scenarios[state.activeScenario];
  }

  function renderScenarioCards() {
    const root = $('mp-scenarios');
    root.replaceChildren();
    Object.values(state.result.scenarios).forEach((scenario) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `scenario-card${state.activeScenario === scenario.key ? ' is-active' : ''}`;
      button.dataset.scenario = scenario.key;
      const label = document.createElement('span');
      label.textContent = scenario.label;
      const sales = document.createElement('strong');
      sales.textContent = `${format(scenario.total.sales, 1)} продаж`;
      const cac = document.createElement('small');
      cac.textContent = `CAC ${scenario.total.sales > 0 ? money(scenario.total.cac) : '—'} · ROMI ${format(scenario.total.romi, 0)}%`;
      button.append(label, sales, cac);
      root.appendChild(button);
    });
  }

  function renderKpis() {
    const current = scenarioResult().total;
    setKpi('mp-kpi-budget', money(current.budget), `${state.result.input.months} мес.`);
    setKpi('mp-kpi-impressions', format(current.impressions, 0), 'показов');
    setKpi('mp-kpi-clicks', format(current.clicks, 0), `CPC ${current.clicks > 0 ? money(current.cpc) : '—'}`);
    setKpi('mp-kpi-results', format(current.results, 1), `CPR ${current.results > 0 ? money(current.cpr) : '—'}`);
    setKpi('mp-kpi-sales', format(current.sales, 1), `CAC ${current.sales > 0 ? money(current.cac) : '—'}`);
    setKpi('mp-kpi-roas', `${format(current.roas, 2)}×`, `ROMI ${format(current.romi, 0)}%`);
  }

  function renderChannelsTable() {
    const tbody = $('mp-channel-rows');
    tbody.replaceChildren();
    scenarioResult().channels.forEach((channel) => {
      const row = document.createElement('tr');
      const label = document.createElement('th');
      label.scope = 'row';
      const dot = document.createElement('i');
      dot.style.background = channel.color;
      label.append(dot, document.createTextNode(channel.label));
      const values = [
        `${format(channel.share, 1)}%`, money(channel.budget), format(channel.impressions, 0), format(channel.clicks, 0),
        format(channel.results, 1), channel.results ? money(channel.cpr) : '—', format(channel.sales, 1),
        channel.sales ? money(channel.cac) : '—', `${format(channel.roas, 2)}×`
      ];
      row.appendChild(label);
      values.forEach((value) => { const td = document.createElement('td'); td.textContent = value; row.appendChild(td); });
      tbody.appendChild(row);
    });
  }

  function renderBudgetBars() {
    const root = $('mp-budget-bars');
    root.replaceChildren();
    scenarioResult().channels.forEach((channel) => {
      const row = document.createElement('div');
      row.className = 'budget-bar';
      const head = document.createElement('div');
      const name = document.createElement('span');
      name.textContent = channel.label;
      const value = document.createElement('strong');
      value.textContent = `${format(channel.share, 1)}% · ${money(channel.budget)}`;
      head.append(name, value);
      const track = document.createElement('span');
      track.className = 'budget-bar__track';
      const fill = document.createElement('span');
      fill.className = 'budget-bar__fill';
      fill.style.width = `${channel.share}%`;
      fill.style.background = channel.color;
      track.appendChild(fill);
      row.append(head, track);
      root.appendChild(row);
    });
  }

  function renderWarnings() {
    const root = $('mp-warnings');
    root.replaceChildren();
    if (!state.result.warnings.length) {
      const empty = document.createElement('p');
      empty.className = 'mp-empty';
      empty.textContent = 'Критичных противоречий в исходных данных нет.';
      root.appendChild(empty);
      return;
    }
    state.result.warnings.forEach((warning) => {
      const item = document.createElement('article');
      item.className = `plan-warning plan-warning--${warning.severity}`;
      const badge = document.createElement('span');
      badge.textContent = { critical: 'Критично', warning: 'Проверить', info: 'Учесть' }[warning.severity] || 'Учесть';
      const title = document.createElement('h4');
      title.textContent = warning.title;
      const text = document.createElement('p');
      text.textContent = warning.text;
      item.append(badge, title, text);
      if (warning.recommendation) {
        const recommendation = document.createElement('p');
        recommendation.className = 'plan-warning__action';
        recommendation.textContent = warning.recommendation;
        item.appendChild(recommendation);
      }
      root.appendChild(item);
    });
  }

  function renderMonthly() {
    const tbody = $('mp-month-rows');
    tbody.replaceChildren();
    scenarioResult().monthly.forEach((month) => {
      const row = document.createElement('tr');
      const values = [
        `Месяц ${month.month}`, money(month.total.budget), format(month.total.impressions, 0), format(month.total.clicks, 0),
        format(month.total.results, 1), format(month.total.sales, 1), month.total.sales ? money(month.total.cac) : '—', `${format(month.total.roas, 2)}×`, `${format(month.total.romi, 0)}%`
      ];
      values.forEach((value, index) => {
        const cell = document.createElement(index === 0 ? 'th' : 'td');
        if (index === 0) cell.scope = 'row';
        cell.textContent = value;
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    });
  }

  function renderResults() {
    renderScenarioCards();
    renderKpis();
    renderChannelsTable();
    renderBudgetBars();
    renderWarnings();
    renderMonthly();
    $('mp-assumption').textContent = `Сценарии меняют стоимость трафика и конверсии на ±${format(state.result.assumptions.scenarioSpread, 0)}%. Это не рыночный бенчмарк, а диапазон чувствительности вашего плана.`;
    results.hidden = false;
  }

  function calculate(scroll) {
    state.result = Engine.calculate(collectInput());
    state.hasRun = true;
    renderResults();
    if (scroll) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyDemo() {
    Object.entries(demo.globals).forEach(([key, value]) => {
      const input = $(`mp-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
      if (input) input.value = value;
    });
    channelState.forEach((channel) => Object.assign(channel, demo.channels[channel.id], { enabled: true }));
    renderChannels();
    calculate(true);
    $('mp-demo-note').hidden = false;
  }

  function reset() {
    form.reset();
    channelState.forEach((channel, index) => Object.assign(channel, {
      enabled: true, weight: [30, 25, 25, 20][index], model: Engine.PLATFORMS[channel.id].model,
      cpc: '', cpm: '', ctr: '', clickToResult: '', resultToSale: '', resultType: channel.id === 'telegram' ? 'subscriber' : 'lead',
      structures: 1, testUnits: channel.id === 'meta' || channel.id === 'telegram' ? 5 : 3, testShare: Engine.PLATFORMS[channel.id].testShare
    }));
    renderChannels();
    state.result = null;
    state.hasRun = false;
    state.activeScenario = 'base';
    results.hidden = true;
    $('mp-demo-note').hidden = true;
  }

  function exportPlan() {
    if (!state.result) return;
    const result = state.result;
    const base = result.scenarios.base;
    const scenarios = Object.values(result.scenarios).map((scenario) => ({
      'Сценарий': scenario.label, 'Бюджет': Engine.round(scenario.total.budget), 'Показы': Engine.round(scenario.total.impressions, 0),
      'Клики': Engine.round(scenario.total.clicks, 0), 'Результаты': Engine.round(scenario.total.results, 1), 'Продажи': Engine.round(scenario.total.sales, 1),
      'CPR': Engine.round(scenario.total.cpr), 'CAC': Engine.round(scenario.total.cac), 'ROAS': Engine.round(scenario.total.roas), 'ROMI, %': Engine.round(scenario.total.romi)
    }));
    const channels = base.channels.map((channel) => ({
      'Канал': channel.label, 'Доля, %': Engine.round(channel.share), 'Бюджет': Engine.round(channel.budget), 'Показы': Engine.round(channel.impressions, 0),
      'Клики': Engine.round(channel.clicks, 0), 'Результаты': Engine.round(channel.results, 1), 'CPR': Engine.round(channel.cpr), 'Продажи': Engine.round(channel.sales, 1),
      'CAC': Engine.round(channel.cac), 'Выручка': Engine.round(channel.revenue), 'ROAS': Engine.round(channel.roas), 'ROMI, %': Engine.round(channel.romi)
    }));
    const monthly = base.monthly.map((month) => ({
      'Месяц': month.month, 'Бюджет': Engine.round(month.total.budget), 'Показы': Engine.round(month.total.impressions, 0), 'Клики': Engine.round(month.total.clicks, 0),
      'Результаты': Engine.round(month.total.results, 1), 'Продажи': Engine.round(month.total.sales, 1), 'CAC': Engine.round(month.total.cac), 'ROAS': Engine.round(month.total.roas), 'ROMI, %': Engine.round(month.total.romi)
    }));
    const warnings = result.warnings.map((warning) => ({ 'Приоритет': warning.severity, 'Канал': warning.channel, 'Вывод': warning.title, 'Объяснение': warning.text, 'Что делать': warning.recommendation || '' }));

    if (window.XLSX) {
      const workbook = XLSX.utils.book_new();
      [['Сценарии', scenarios], ['Каналы', channels], ['По месяцам', monthly], ['Проверки', warnings]].forEach(([name, rows]) => {
        const sheet = XLSX.utils.json_to_sheet(rows);
        sheet['!cols'] = Object.keys(rows[0] || { A: '' }).map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(workbook, sheet, name);
      });
      XLSX.writeFile(workbook, `media-plan-${new Date().toISOString().slice(0, 10)}.xlsx`, { compression: true });
      return;
    }
    const csv = [['Канал', 'Бюджет', 'Показы', 'Клики', 'Результаты', 'Продажи', 'CAC', 'ROAS']]
      .concat(channels.map((row) => [row['Канал'], row['Бюджет'], row['Показы'], row['Клики'], row['Результаты'], row['Продажи'], row.CAC, row.ROAS]))
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'media-plan.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  channelsRoot.addEventListener('change', (event) => {
    const card = event.target.closest('[data-channel]');
    if (!card) return;
    const channel = channelState.find((item) => item.id === card.dataset.channel);
    const key = event.target.dataset.key;
    if (key) channel[key] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (key === 'enabled' || key === 'model' || key === 'resultType') renderChannels();
    if (state.hasRun) calculate(false);
  });
  channelsRoot.addEventListener('input', (event) => {
    if (event.target.dataset.key === 'weight') {
      const card = event.target.closest('[data-channel]');
      card.querySelector('.channel-share').textContent = `${event.target.value || 0}%`;
    }
    if (state.hasRun) calculate(false);
  });
  form.addEventListener('input', (event) => {
    if (!event.target.closest('#mp-channels') && state.hasRun) calculate(false);
  });
  $('mp-calculate').addEventListener('click', () => calculate(true));
  $('mp-demo').addEventListener('click', applyDemo);
  $('mp-reset').addEventListener('click', reset);
  $('mp-export').addEventListener('click', exportPlan);
  $('mp-scenarios').addEventListener('click', (event) => {
    const button = event.target.closest('[data-scenario]');
    if (!button) return;
    state.activeScenario = button.dataset.scenario;
    renderResults();
  });

  renderChannels();
})();

