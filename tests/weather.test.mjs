import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchWeather } from '../services/weather.ts';
import {
  weatherDate,
  weatherIcon,
  weatherStudyTip,
} from '../weatherPresentation.ts';

const lookup = {
  results: [
    {
      name: 'Vassouras',
      admin1: 'Rio de Janeiro',
      country: 'Brasil',
      latitude: -22.40389,
      longitude: -43.6625,
    },
  ],
};
const forecast = {
  current: {
    time: '2026-11-18T09:00',
    temperature_2m: 25,
    apparent_temperature: 26,
    relative_humidity_2m: 70,
    wind_speed_10m: 10,
    weather_code: 0,
  },
  daily: {
    time: ['2026-11-18', '2026-11-19', '2026-11-20'],
    temperature_2m_max: [30, 29, 28],
    temperature_2m_min: [19, 20, 21],
    precipitation_probability_max: [60, 50, 40],
    weather_code: [63, 3, 0],
  },
  hourly: {
    time: ['2026-11-18T09:00', '2026-11-19T14:00', '2026-11-20T18:00'],
    temperature_2m: [25, 26, 24],
    precipitation_probability: [30, 40, 20],
    weather_code: [2, 95, 0],
  },
};
function setup(t, handler) {
  const previous = globalThis.fetch;
  const previousKey = process.env.EXPO_PUBLIC_WEATHER_API_KEY;
  globalThis.fetch = handler;
  t.after(() => {
    globalThis.fetch = previous;
    if (previousKey === undefined)
      delete process.env.EXPO_PUBLIC_WEATHER_API_KEY;
    else process.env.EXPO_PUBLIC_WEATHER_API_KEY = previousKey;
  });
}
const successful = async (url) =>
  Response.json(String(url).includes('geocoding-api.') ? lookup : forecast);

test('consulta HTTPS sem chave, busca cidade em português e solicita três dias', async (t) => {
  const requested = [];
  setup(t, async (url, options) => {
    const parsed = new URL(url);
    requested.push(parsed);
    assert.equal(parsed.protocol, 'https:');
    for (const key of ['key', 'apikey', 'token'])
      assert.equal(parsed.searchParams.has(key), false);
    assert.equal(options.headers.Authorization, undefined);
    assert.ok(options.signal);
    return successful(url);
  });
  const data = await fetchWeather(' Vassouras, Rio de Janeiro ');
  assert.equal(requested[0].origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(
    requested[0].searchParams.get('name'),
    'Vassouras, Rio de Janeiro'
  );
  assert.equal(requested[0].searchParams.get('language'), 'pt');
  assert.equal(requested[1].origin, 'https://api.open-meteo.com');
  assert.equal(requested[1].searchParams.get('latitude'), '-22.40389');
  assert.equal(requested[1].searchParams.get('longitude'), '-43.6625');
  assert.equal(requested[1].searchParams.get('forecast_days'), '3');
  assert.equal(requested[1].searchParams.get('timezone'), 'auto');
  assert.equal(requested[1].searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(data.location.name, 'Vassouras');
  assert.equal(data.current.temp_c, 25);
  assert.equal(data.forecast.forecastday.length, 3);
});
test('funciona em um clone sem variável de chave e ignora configuração antiga', async (t) => {
  setup(t, successful);
  delete process.env.EXPO_PUBLIC_WEATHER_API_KEY;
  assert.equal((await fetchWeather('Vassouras')).current.temp_c, 25);
  for (const key of ['', 'SUA_CHAVE_AQUI', 'chave-antiga-invalida']) {
    process.env.EXPO_PUBLIC_WEATHER_API_KEY = key;
    assert.equal((await fetchWeather('Vassouras')).current.temp_c, 25);
  }
});
test('preserva horários locais, probabilidades e descrições em português', async (t) => {
  setup(t, successful);
  const data = await fetchWeather('Vassouras');
  assert.equal(data.current.last_updated, '2026-11-18 09:00');
  assert.equal(data.current.condition.text, 'Céu limpo');
  const [first, second, third] = data.forecast.forecastday;
  assert.equal(first.day.condition.text, 'Chuva moderada');
  assert.equal(first.day.daily_chance_of_rain, 60);
  assert.equal(first.hour[0].time, '2026-11-18 09:00');
  assert.equal(second.hour[0].time, '2026-11-19 14:00');
  assert.equal(second.hour[0].condition.text, 'Trovoada');
  assert.equal(third.day.mintemp_c, 21);
});
test('cidade inválida não faz chamada externa', async (t) => {
  setup(t, () => assert.fail('Não deve chamar a rede'));
  for (const city of ['', ' ', 'A', 'x'.repeat(101)])
    await assert.rejects(fetchWeather(city), /cidade/);
});
test('cidade inexistente mostra erro sem solicitar previsão', async (t) => {
  let calls = 0;
  setup(t, async () => {
    calls += 1;
    return Response.json({ results: [] });
  });
  await assert.rejects(
    fetchWeather('Cidade desconhecida'),
    /Cidade não encontrada/
  );
  assert.equal(calls, 1);
  globalThis.fetch = async () => Response.json({ generationtime_ms: 1 });
  await assert.rejects(
    fetchWeather('Cidade desconhecida'),
    /Cidade não encontrada/
  );
});
test('trata limite de consultas e falhas HTTP antes de interpretar o corpo', async (t) => {
  setup(t, async () => new Response('', { status: 429 }));
  await assert.rejects(fetchWeather('Vassouras'), /Muitas consultas/);
  globalThis.fetch = async () => new Response('indisponível', { status: 503 });
  await assert.rejects(fetchWeather('Vassouras'), /503/);
  globalThis.fetch = async (url) =>
    String(url).includes('geocoding-api.')
      ? Response.json(lookup)
      : new Response('', { status: 400 });
  await assert.rejects(fetchWeather('Vassouras'), /400/);
});
test('rejeita localização malformada e coordenadas fora do intervalo', async (t) => {
  setup(t, successful);
  for (const invalid of [
    { results: 'inválido' },
    { results: [{}] },
    { results: [{ ...lookup.results[0], latitude: 999 }] },
    null,
  ]) {
    globalThis.fetch = async () => Response.json(invalid);
    await assert.rejects(fetchWeather('Vassouras'), /formato inesperado/);
  }
});
test('rejeita séries inconsistentes e valores nulos sem inventar temperaturas', async (t) => {
  setup(t, successful);
  const variants = [
    { ...forecast, current: { temperature_2m: 25 } },
    { ...forecast, daily: { ...forecast.daily, temperature_2m_max: [30] } },
    {
      ...forecast,
      hourly: { ...forecast.hourly, temperature_2m: [null, 26, 24] },
    },
    { ...forecast, hourly: { ...forecast.hourly, time: ['data inválida'] } },
  ];
  for (const invalid of variants) {
    globalThis.fetch = async (url) =>
      Response.json(String(url).includes('geocoding-api.') ? lookup : invalid);
    await assert.rejects(fetchWeather('Vassouras'), /formato inesperado/);
  }
});
test('previsão sem dias permite o estado vazio da tela', async (t) => {
  setup(t, async (url) =>
    Response.json(
      String(url).includes('geocoding-api.')
        ? lookup
        : {
            ...forecast,
            daily: {
              time: [],
              temperature_2m_max: [],
              temperature_2m_min: [],
              precipitation_probability_max: [],
              weather_code: [],
            },
            hourly: {
              time: [],
              temperature_2m: [],
              precipitation_probability: [],
              weather_code: [],
            },
          }
    )
  );
  assert.deepEqual((await fetchWeather('Vassouras')).forecast.forecastday, []);
});
test('falha de rede e resposta não JSON mostram mensagens claras', async (t) => {
  setup(t, async () => {
    throw new TypeError('Failed to fetch');
  });
  await assert.rejects(fetchWeather('Vassouras'), /Verifique sua internet/);
  globalThis.fetch = async () => new Response('<html>Falha</html>');
  await assert.rejects(fetchWeather('Vassouras'), /resposta inválida/);
});
test('cancelamento interrompe a busca da cidade', async (t) => {
  setup(
    t,
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        )
      )
  );
  const controller = new AbortController();
  const pending = fetchWeather('Vassouras', controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
test('cancelamento também interrompe a segunda chamada de previsão', async (t) => {
  let markReady;
  const ready = new Promise((resolve) => {
    markReady = resolve;
  });
  setup(t, async (url, { signal }) => {
    if (String(url).includes('geocoding-api.')) return Response.json(lookup);
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () =>
        reject(new DOMException('Aborted', 'AbortError'))
      );
      markReady();
    });
  });
  const controller = new AbortController();
  const pending = fetchWeather('Vassouras', controller.signal);
  await ready;
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
test('limite de espera cancela a consulta com mensagem recuperável', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  setup(
    t,
    (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        )
      )
  );
  const pending = fetchWeather('Vassouras');
  t.mock.timers.tick(12000);
  await assert.rejects(pending, /demorou demais/);
});
test('sugestões de organização e ícones continuam funcionando', () => {
  assert.match(weatherStudyTip(50, 25), /Guarda-chuva/);
  assert.match(weatherStudyTip(10, 30), /Leve água/);
  assert.match(weatherStudyTip(10, 25), /material separado/);
  assert.equal(weatherIcon('Chuva leve'), 'cloud-rain');
  assert.equal(weatherIcon('Céu limpo'), 'sun');
  assert.equal(weatherIcon('Trovoada'), 'cloud-lightning');
  assert.match(weatherDate('2026-11-18'), /18\/11/);
});
