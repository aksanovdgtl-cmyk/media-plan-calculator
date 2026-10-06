
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MediaPlanEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '0.1.0';
  const WEEKS_IN_MONTH = 365.25 / 12 / 7;

  const PLATFORMS = {
    google: {
      label: 'Google Ads', model: 'cpc', role: 'Сформированный спрос', color: '#28b6ef',
      learning: { period: 'month', events: 30, label: '30 конверсий в месяц на кампанию' },
      testShare: 20
    },
    meta: {
      label: 'Meta Ads', model: 'cpm', role: 'Холодный спрос и ретаргетинг', color: '#8b5cf6',
      learning: { period: 'week', events: 50, label: '50 событий в неделю на группу' },
      testShare: 25
    },
    yandex: {
      label: 'Яндекс Директ', model: 'cpc', role: 'Поиск и РСЯ', color: '#ff4f4f',
      learning: { period: 'week', events: 10, label: '10 конверсий в неделю на стратегию' },
      testShare: 20
    },
    telegram: {
      label: 'Telegram Ads', model: 'cpm', role: 'Каналы, боты и поиск', color: '#2aabee',
      learning: null,
      testShare: 30
    }
  };

  const SCENARIOS = {
    conservative: { label: 'Осторожный', direction: -1 },
    base: { label: 'Базовый', direction: 0 },
    optimistic: { label: 'Сильный', direction: 1 }
  };

  function number(value, fallback) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : (fallback || 0);
    if (value == null || value === '') return fallback || 0;
    let text = String(value).trim().replace(/\s|\u00a0|\u202f/g, '');
    if (text.includes(',') && text.includes('.')) {
      text = text.lastIndexOf(',') > text.lastIndexOf('.')
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, '');
    } else if (text.includes(',')) text = text.replace(',', '.');
    const parsed = Number(text.replace(/[^0-9eE+\-.]/g, ''));
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function divide(a, b) {
    return b > 0 ? a / b : 0;
  }

  function round(value, digits) {
    const factor = 10 ** (digits == null ? 2 : digits);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function scenarioFactor(spreadPct, direction, inverse) {
    const spread = clamp(number(spreadPct, 20), 0, 80) / 100;
    if (!direction) return 1;
    const signed = inverse ? -direction : direction;
    return Math.max(0.05, 1 + spread * signed);
  }

  function normalizeInput(input) {
    const channels = (input.channels || []).map((channel) => {
      const platform = PLATFORMS[channel.id] || PLATFORMS.google;
      return {
        id: channel.id,
        enabled: channel.enabled !== false,
        weight: Math.max(0, number(channel.weight)),
        model: channel.model === 'cpm' ? 'cpm' : 'cpc',
        cpc: Math.max(0, number(channel.cpc)),
        cpm: Math.max(0, number(channel.cpm)),
        ctr: clamp(number(channel.ctr), 0, 100),
        clickToResult: clamp(number(channel.clickToResult), 0, 100),
        resultToSale: clamp(number(channel.resultToSale), 0, 100),
        resultType: channel.resultType || 'lead',
        structures: Math.max(1, Math.round(number(channel.structures, 1))),
        testUnits: Math.max(1, Math.round(number(channel.testUnits, 1))),
        testShare: clamp(number(channel.testShare, platform.testShare), 0, 100),
        platform
      };
    }).filter((channel) => channel.enabled);

    const weightTotal = channels.reduce((sum, channel) => sum + channel.weight, 0);
    channels.forEach((channel) => {
      channel.share = channels.length
        ? (weightTotal > 0 ? channel.weight / weightTotal : 1 / channels.length)
        : 0;
    });

    return {
      currency: input.currency || 'USD',
      months: clamp(Math.round(number(input.months, 3)), 1, 24),
      monthlyBudget: Math.max(0, number(input.monthlyBudget)),
      monthlyGrowth: clamp(number(input.monthlyGrowth), -90, 300),
      averageOrder: Math.max(0, number(input.averageOrder)),
      marginPct: clamp(number(input.marginPct), 0, 100),
      fixedValuePerSale: Math.max(0, number(input.fixedValuePerSale)),
      uncertainty: clamp(number(input.uncertainty, 20), 0, 80),
      channels,
      weightTotal
    };
  }

  function monthBudgets(input) {
    const growth = 1 + input.monthlyGrowth / 100;
    const months = [];
    for (let index = 0; index < input.months; index += 1) {
      months.push({ month: index + 1, budget: input.monthlyBudget * (growth ** index) });
    }
    return months;
  }

  function saleValue(input) {
    if (input.fixedValuePerSale > 0) return input.fixedValuePerSale;
    return input.averageOrder * input.marginPct / 100;
  }

  function forecastChannel(channel, budget, input, scenarioKey) {
    const scenario = SCENARIOS[scenarioKey] || SCENARIOS.base;
    const costFactor = scenarioFactor(input.uncertainty, scenario.direction, true);
    const performanceFactor = scenarioFactor(input.uncertainty, scenario.direction, false);
    const adjustedCpc = channel.cpc * costFactor;
    const adjustedCpm = channel.cpm * costFactor;
    const adjustedCtr = clamp(channel.ctr * performanceFactor, 0, 100);
    const adjustedClickToResult = clamp(channel.clickToResult * performanceFactor, 0, 100);
    const adjustedResultToSale = clamp(channel.resultToSale * performanceFactor, 0, 100);
    let impressions = 0;
    let clicks = 0;

    if (channel.model === 'cpc' && adjustedCpc > 0) {
      clicks = budget / adjustedCpc;
      impressions = adjustedCtr > 0 ? clicks / (adjustedCtr / 100) : 0;
    } else if (channel.model === 'cpm' && adjustedCpm > 0) {
      impressions = budget / adjustedCpm * 1000;
      clicks = impressions * adjustedCtr / 100;
    }

    const results = clicks * adjustedClickToResult / 100;
    const sales = channel.resultType === 'sale'
      ? results
      : results * adjustedResultToSale / 100;
    const revenue = sales * input.averageOrder;
    const value = sales * saleValue(input);
    const contribution = value - budget;

    return {
      id: channel.id,
      label: channel.platform.label,
      color: channel.platform.color,
      role: channel.platform.role,
      scenario: scenarioKey,
      budget,
      share: channel.share * 100,
      impressions,
      clicks,
      results,
      sales,
      revenue,
      value,
      contribution,
      cpc: divide(budget, clicks),
      cpm: divide(budget, impressions) * 1000,
      ctr: divide(clicks, impressions) * 100,
      cpr: divide(budget, results),
      cac: divide(budget, sales),
      roas: divide(revenue, budget),
      romi: divide(contribution, budget) * 100,
      structures: channel.structures,
      testUnits: channel.testUnits,
      testShare: channel.testShare,
      resultType: channel.resultType
    };
  }

  function sumForecasts(items, input, scenarioKey) {
    const sums = items.reduce((acc, item) => {
      ['budget', 'impressions', 'clicks', 'results', 'sales', 'revenue', 'value', 'contribution'].forEach((key) => {
        acc[key] += item[key] || 0;
      });
      return acc;
    }, { budget: 0, impressions: 0, clicks: 0, results: 0, sales: 0, revenue: 0, value: 0, contribution: 0 });
    return Object.assign(sums, {
      scenario: scenarioKey,
      cpc: divide(sums.budget, sums.clicks),
      cpm: divide(sums.budget, sums.impressions) * 1000,
      ctr: divide(sums.clicks, sums.impressions) * 100,
      cpr: divide(sums.budget, sums.results),
      cac: divide(sums.budget, sums.sales),
      roas: divide(sums.revenue, sums.budget),
      romi: divide(sums.contribution, sums.budget) * 100,
      breakEvenCac: saleValue(input)
    });
  }

  function buildScenario(input, scenarioKey, months) {
    const monthly = months.map((month) => {
      const channels = input.channels.map((channel) => forecastChannel(channel, month.budget * channel.share, input, scenarioKey));
      return { month: month.month, budget: month.budget, channels, total: sumForecasts(channels, input, scenarioKey) };
    });
    const byChannel = input.channels.map((channel) => {
      const items = monthly.map((month) => month.channels.find((item) => item.id === channel.id));
      return Object.assign(sumForecasts(items, input, scenarioKey), {
        id: channel.id,
        label: channel.platform.label,
        color: channel.platform.color,
        role: channel.platform.role,
        share: channel.share * 100,
        structures: channel.structures,
        testUnits: channel.testUnits,
        testShare: channel.testShare,
        resultType: channel.resultType
      });
    });
    return { key: scenarioKey, label: SCENARIOS[scenarioKey].label, monthly, channels: byChannel, total: sumForecasts(byChannel, input, scenarioKey) };
  }

  function addWarning(list, warning) {
    list.push(Object.assign({ severity: 'warning', channel: '', evidence: [] }, warning));
  }

  function buildWarnings(input, base, months) {
    const warnings = [];
    if (!input.channels.length) {
      addWarning(warnings, { severity: 'critical', title: 'Не выбраны рекламные каналы', text: 'Включите хотя бы одну платформу.' });
      return warnings;
    }
    if (input.monthlyBudget <= 0) addWarning(warnings, { severity: 'critical', title: 'Не задан бюджет', text: 'Укажите бюджет первого меся.' });
    if (Math.abs(input.weightTotal - 100) > 0.1 && input.weightTotal > 0) {
      addWarning(warnings, {
        severity: 'info', title: 'Доли нормализованы до 100%',
        text: `Сумма введённых весов — ${round(input.weightTotal)}%. Движок пересчитал их пропорционально.`
      });
    }
    if (input.averageOrder <= 0 || saleValue(input) <= 0) {
      addWarning(warnings, {
        severity: 'info', title: 'Окупаемость не может быть оценена',
        text: 'Добавьте средний чек и маржу или ценность одной продажи.'
      });
    }

    base.channels.forEach((forecast) => {
      const channel = input.channels.find((item) => item.id === forecast.id);
      const firstMonth = base.monthly[0].channels.find((item) => item.id === forecast.id);
      const platform = channel.platform;
      const incomplete = channel.model === 'cpc'
        ? channel.cpc <= 0 || channel.ctr <= 0 || channel.clickToResult <= 0
        : channel.cpm <= 0 || channel.ctr <= 0 || channel.clickToResult <= 0;
      if (incomplete) {
        addWarning(warnings, {
          severity: 'critical', channel: channel.id, title: `${platform.label}: не хватает исходных метрик`,
          text: `Заполните ${channel.model === 'cpc' ? 'CPC' : 'CPM'}, CTR и конверсию клика в результат.`
        });
        return;
      }

      if (platform.learning) {
        const requiredMonthly = platform.learning.period === 'week'
          ? platform.learning.events * WEEKS_IN_MONTH * channel.structures
          : platform.learning.events * channel.structures;
        if (firstMonth.results < requiredMonthly) {
          addWarning(warnings, {
            channel: channel.id,
            title: `${platform.label}: мало событий для автостратегии`,
            text: `Прогноз первого меся — ${round(firstMonth.results, 0)} результа при ориентире ${round(requiredMonthly, 0)} для ${channel.structures} ${channel.structures === 1 ? 'структуры' : 'структур'}.`,
            evidence: [platform.learning.label],
            recommendation: 'Укрупните структуру, увеличьте бюджет или используйте более управляемую стратегию.'
          });
        }
      }

      if (channel.id === 'google' && firstMonth.cpr > 0) {
        const learningBudget = firstMonth.cpr * 10 * 1.4 * WEEKS_IN_MONTH * channel.structures;
        if (firstMonth.budget < learningBudget) {
          addWarning(warnings, {
            severity: 'info', channel: channel.id, title: 'Google Ads: нет запаса на обучение',
            text: `По формуле 10 лидов в неделю + 40% запаса нужно около ${round(learningBudget)} в месяц при расчётном CPR ${round(firstMonth.cpr)}.`
          });
        }
      }

      if (channel.id === 'meta') {
        const testingBudget = firstMonth.budget * channel.testShare / 100;
        const resultsPerTest = divide(firstMonth.results * channel.testShare / 100, channel.testUnits);
        if (channel.testUnits > 1 && resultsPerTest < 1) {
          addWarning(warnings, {
            channel: channel.id, title: 'Meta Ads: тестовый бюджет размазан',
            text: `${round(testingBudget)} на ${channel.testUnits} тестов дают меньше одного прогнозного результа на тест.`,
            recommendation: 'Сократите число тестов или увеличьте тестовую долю. В фактуре ориентир — 20–25% бюджета на тесы.'
          });
        }
      }

      if (channel.id === 'telegram') {
        const testImpressions = firstMonth.impressions * channel.testShare / 100;
        const perUnit = divide(testImpressions, channel.testUnits);
        if (perUnit < 3000) {
          addWarning(warnings, {
            channel: channel.id, title: 'Telegram Ads: мало показов на тест',
            text: `Получается около ${round(perUnit, 0)} показов на каждую из ${channel.testUnits} связок. Для первичного сравнения лучше иметь хотя бы 3–5 тысяч показов.`,
            recommendation: 'Уменьшите число одновременных тестов или увеличьте долю на тестирование.'
          });
        }
      }
    });

    if (base.total.sales > 0 && saleValue(input) > 0 && base.total.cac > saleValue(input)) {
      addWarning(warnings, {
        severity: 'critical', title: 'Прогнозный CAC выше безубыточного',
        text: `CAC ${round(base.total.cac)} превышает ценность одной продажи ${round(saleValue(input))}.`,
        recommendation: 'Пересоберите прогнозы каналов, воронку или экономику до запуска.'
      });
    }

    if (input.monthlyGrowth > 25) {
      addWarning(warnings, {
        severity: 'info', title: 'Агрессивный рост бюджета',
        text: `План увеличивает бюджет на ${round(input.monthlyGrowth)}% каждый месяц.`,
        recommendation: 'Масштабируйте только после проверки качества лидов и сделок.'
      });
    }

    return warnings;
  }

  function calculate(rawInput) {
    const input = normalizeInput(rawInput || {});
    const months = monthBudgets(input);
    const scenarios = {};
    Object.keys(SCENARIOS).forEach((key) => { scenarios[key] = buildScenario(input, key, months); });
    const warnings = buildWarnings(input, scenarios.base, months);
    return {
      version: VERSION,
      input,
      months,
      scenarios,
      warnings,
      assumptions: {
        saleValue: saleValue(input),
        scenarioSpread: input.uncertainty,
        formula: 'Показы = бюджет / CPM × 1000; клики = показы × CTR; результы = клики × CR; продажи = результы × CR в продажу'
      }
    };
  }

  return { VERSION, WEEKS_IN_MONTH, PLATFORMS, SCENARIOS, number, round, normalizeInput, calculate };
});

