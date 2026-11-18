import type { WeatherForecast } from '../types/weather';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function numbers(value: Record<string, unknown>, keys: string[]) {
  return keys.every(
    (key) => typeof value[key] === 'number' && Number.isFinite(value[key])
  );
}
function condition(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.text === 'string' &&
    typeof value.code === 'number'
  );
}
export function isWeatherForecast(value: unknown): value is WeatherForecast {
  if (
    !isRecord(value) ||
    !isRecord(value.location) ||
    !isRecord(value.current) ||
    !isRecord(value.forecast)
  )
    return false;
  const { location, current, forecast } = value;
  return (
    ['name', 'region', 'country'].every(
      (key) => typeof location[key] === 'string'
    ) &&
    numbers(location, ['lat', 'lon']) &&
    numbers(current, ['temp_c', 'feelslike_c', 'humidity', 'wind_kph']) &&
    typeof current.last_updated === 'string' &&
    condition(current.condition) &&
    Array.isArray(forecast.forecastday) &&
    forecast.forecastday.every((item) => {
      if (
        !isRecord(item) ||
        typeof item.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        !isRecord(item.day)
      )
        return false;
      return (
        numbers(item.day, ['maxtemp_c', 'mintemp_c', 'daily_chance_of_rain']) &&
        condition(item.day.condition) &&
        Array.isArray(item.hour) &&
        item.hour.every(
          (hour) =>
            isRecord(hour) &&
            typeof hour.time === 'string' &&
            numbers(hour, ['temp_c', 'chance_of_rain']) &&
            condition(hour.condition)
        )
      );
    })
  );
}

const CONDITIONS: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Predomínio de sol',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro com geada',
  51: 'Garoa fraca',
  53: 'Garoa moderada',
  55: 'Garoa intensa',
  56: 'Garoa congelante fraca',
  57: 'Garoa congelante intensa',
  61: 'Chuva fraca',
  63: 'Chuva moderada',
  65: 'Chuva forte',
  66: 'Chuva congelante fraca',
  67: 'Chuva congelante forte',
  71: 'Neve fraca',
  73: 'Neve moderada',
  75: 'Neve intensa',
  77: 'Grãos de neve',
  80: 'Pancadas de chuva fracas',
  81: 'Pancadas de chuva moderadas',
  82: 'Pancadas de chuva fortes',
  85: 'Pancadas de neve fracas',
  86: 'Pancadas de neve intensas',
  95: 'Trovoada',
  96: 'Trovoada com granizo leve',
  97: 'Trovoada forte',
  99: 'Trovoada com granizo forte',
};
const invalidForecast = () =>
  new Error('O serviço enviou dados de clima em um formato inesperado.');

function conditionFromCode(code: number) {
  return { code, text: CONDITIONS[code] ?? 'Condições não informadas' };
}

function numericSeries(
  group: Record<string, unknown>,
  key: string,
  length: number
): number[] {
  const values = group[key];
  if (
    !Array.isArray(values) ||
    values.length !== length ||
    !values.every(
      (value) => typeof value === 'number' && Number.isFinite(value)
    )
  )
    throw invalidForecast();
  return values;
}

function adaptForecast(
  raw: unknown,
  location: WeatherForecast['location']
): WeatherForecast {
  if (
    !isRecord(raw) ||
    !isRecord(raw.current) ||
    !isRecord(raw.daily) ||
    !isRecord(raw.hourly)
  )
    throw invalidForecast();
  const { current, daily, hourly } = raw;
  if (
    !numbers(current, [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'weather_code',
    ]) ||
    typeof current.time !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current.time) ||
    !Array.isArray(daily.time) ||
    !daily.time.every(
      (time) => typeof time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(time)
    ) ||
    !Array.isArray(hourly.time) ||
    !hourly.time.every(
      (time) =>
        typeof time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)
    )
  )
    throw invalidForecast();
  const dates = daily.time as string[];
  const times = hourly.time as string[];
  const maximums = numericSeries(daily, 'temperature_2m_max', dates.length);
  const minimums = numericSeries(daily, 'temperature_2m_min', dates.length);
  const rain = numericSeries(
    daily,
    'precipitation_probability_max',
    dates.length
  );
  const dailyCodes = numericSeries(daily, 'weather_code', dates.length);
  const temperatures = numericSeries(hourly, 'temperature_2m', times.length);
  const hourlyRain = numericSeries(
    hourly,
    'precipitation_probability',
    times.length
  );
  const hourlyCodes = numericSeries(hourly, 'weather_code', times.length);
  const hours = times.map((time, index) => ({
    time: time.replace('T', ' '),
    temp_c: temperatures[index],
    chance_of_rain: hourlyRain[index],
    condition: conditionFromCode(hourlyCodes[index]),
  }));
  const forecast: WeatherForecast = {
    location,
    current: {
      temp_c: current.temperature_2m as number,
      feelslike_c: current.apparent_temperature as number,
      humidity: current.relative_humidity_2m as number,
      wind_kph: current.wind_speed_10m as number,
      last_updated: current.time.replace('T', ' '),
      condition: conditionFromCode(current.weather_code as number),
    },
    forecast: {
      forecastday: dates.map((date, index) => ({
        date,
        day: {
          maxtemp_c: maximums[index],
          mintemp_c: minimums[index],
          daily_chance_of_rain: rain[index],
          condition: conditionFromCode(dailyCodes[index]),
        },
        hour: hours.filter((hour) => hour.time.startsWith(`${date} `)),
      })),
    },
  };
  if (!isWeatherForecast(forecast)) throw invalidForecast();
  return forecast;
}

export async function fetchWeather(
  city: string,
  signal?: AbortSignal
): Promise<WeatherForecast> {
  const query = city.trim();
  if (query.length < 2 || query.length > 100)
    throw new Error('Informe uma cidade com 2 a 100 caracteres.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 12000);
  async function request(url: string): Promise<unknown> {
    if (controller.signal.aborted) throw new Error('Consulta cancelada.');
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 429)
      throw new Error(
        'Muitas consultas ao serviço de clima. Aguarde um pouco e tente novamente.'
      );
    if (!response.ok)
      throw new Error(
        `O serviço de clima está indisponível (HTTP ${response.status}). Tente novamente.`
      );
    return response.json();
  }
  try {
    const search = new URLSearchParams({
      name: query,
      count: '1',
      language: 'pt',
      format: 'json',
    });
    const geocoding = await request(`${GEOCODING_URL}?${search}`);
    if (
      !isRecord(geocoding) ||
      (geocoding.results !== undefined && !Array.isArray(geocoding.results))
    )
      throw invalidForecast();
    const place: unknown = geocoding.results?.[0];
    if (!place)
      throw new Error(
        'Cidade não encontrada. Tente informar também o estado ou o país.'
      );
    if (
      !isRecord(place) ||
      typeof place.name !== 'string' ||
      !numbers(place, ['latitude', 'longitude']) ||
      Math.abs(place.latitude as number) > 90 ||
      Math.abs(place.longitude as number) > 180
    )
      throw invalidForecast();
    const location = {
      name: place.name,
      region: typeof place.admin1 === 'string' ? place.admin1 : '',
      country: typeof place.country === 'string' ? place.country : '',
      lat: place.latitude as number,
      lon: place.longitude as number,
    };
    const params = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      timezone: 'auto',
      forecast_days: '3',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      current:
        'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
      daily:
        'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
      hourly: 'temperature_2m,precipitation_probability,weather_code',
    });
    return adaptForecast(await request(`${FORECAST_URL}?${params}`), location);
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut)
      throw new Error(
        'A consulta demorou demais. Verifique a internet e tente novamente.'
      );
    if (error instanceof TypeError)
      throw new Error(
        'Não foi possível conectar ao clima. Verifique sua internet.'
      );
    if (error instanceof SyntaxError)
      throw new Error('O serviço de clima enviou uma resposta inválida.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
