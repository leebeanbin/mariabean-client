export interface WeatherInfo {
    temp: number;
    feelsLike: number;
    description: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    cityName: string;
}

const OWM_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

export async function getWeather(lat: number, lng: number): Promise<WeatherInfo | null> {
    if (!OWM_KEY) return null;
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_KEY}&units=metric&lang=kr`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return {
            temp: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            description: data.weather[0]?.description ?? '',
            icon: data.weather[0]?.icon ?? '',
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            cityName: data.name,
        };
    } catch {
        return null;
    }
}

export function weatherToEmoji(description: string): string {
    const d = description.toLowerCase();
    if (d.includes('맑') || d.includes('clear')) return '☀️';
    if (d.includes('구름') || d.includes('cloud')) return '☁️';
    if (d.includes('비') || d.includes('rain')) return '🌧️';
    if (d.includes('눈') || d.includes('snow')) return '❄️';
    if (d.includes('안개') || d.includes('fog') || d.includes('mist')) return '🌫️';
    if (d.includes('천둥') || d.includes('thunder')) return '⛈️';
    return '🌤️';
}
