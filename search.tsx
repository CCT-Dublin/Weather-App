import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Button, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function SearchScreen() {
  const [city, setCity] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [forecast, setForecast] = useState<any[]>([]);

  // Load search history on screen open
  useEffect(() => {
    AsyncStorage.getItem('searchHistory').then(data => {
      if (data) setHistory(JSON.parse(data));
    });
  }, []);

  const fetchWeather = async (cityName: string, units = unit) => {
    setLoading(true);
    setError('');
    setWeather(null);
    setForecast([]);
    try {
      const apiKey = '175890de4b6acd7fd24e63f41dc2cf6b';
      // Fetch current weather
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=${units}`
      );
      if (!response.ok) {
        throw new Error('City not found.');
      }
      const data = await response.json();
      setWeather(data);

      // Fetch 5-day forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=${units}`
      );
      if (!forecastRes.ok) {
        throw new Error('Could not fetch forecast.');
      }
      const forecastData = await forecastRes.json();

      // Group forecast by day and get daily high/low and icon
      const daily: Record<string, any[]> = {};
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toLocaleDateString('en-IE');
        if (!daily[date]) daily[date] = [];
        daily[date].push(item);
      });

      const dailyForecast = Object.entries(daily).slice(0, 5).map(([date, items]) => {
        const temps = items.map((i: any) => i.main.temp);
        const min = Math.min(...temps);
        const max = Math.max(...temps);
        // Use the icon from the midday forecast if possible, else first
        const iconItem = items[Math.floor(items.length / 2)] || items[0];
        return {
          date,
          min,
          max,
          icon: iconItem.weather[0].icon,
          main: iconItem.weather[0].main,
        };
      });
      setForecast(dailyForecast);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weather.');
    } finally {
      setLoading(false);
    }
  };

  // Search function (API integration will be added later)
  const handleSearch = async () => {
    setError('');
    if (!city.trim()) {
      setError('Please enter a city name.');
      return;
    }
    await fetchWeather(city);
    const newHistory = [city, ...history.filter(c => c.toLowerCase() !== city.toLowerCase())];
    setHistory(newHistory);
    await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
    setCity('');
  };

  // Clear search history
  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem('searchHistory');
  };

  // Allow searching by tapping on a history item
  const handleHistoryPress = (item: string) => {
    setCity(item);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Weather by City</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Enter city name"
        autoCapitalize="words"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Search"
        onPress={handleSearch}
        disabled={!city.trim()}
      />
      <Button title="Clear History" onPress={clearHistory} color="#888" />
      <Button
        title={`Show in ${unit === 'metric' ? 'Fahrenheit' : 'Celsius'}`}
        onPress={() => {
          const newUnit = unit === 'metric' ? 'imperial' : 'metric';
          setUnit(newUnit);
          if (weather) fetchWeather(weather.name, newUnit);
        }}
      />
      {loading && <Text>Loading weather...</Text>}
      {weather && !loading && (
        <View style={styles.weatherBox}>
          <Text style={styles.weatherCity}>{weather.name}, {weather.sys?.country}</Text>
          <Text style={styles.weatherDate}>
            {new Date(weather.dt * 1000).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
          <View style={styles.weatherRow}>
            {weather.weather && weather.weather[0] && (
              <View style={styles.iconBox}>
                <Image
                  source={{ uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png` }}
                  style={{ width: 60, height: 60 }}
                />
                <Text>{weather.weather[0].main}</Text>
              </View>
            )}
            <View>
              <Text style={styles.temp}>
                {Math.round(weather.main.temp)}° {unit === 'metric' ? 'C' : 'F'}
              </Text>
              <Text>Humidity: {weather.main.humidity}%</Text>
              <Text>Wind: {weather.wind.speed} {unit === 'metric' ? 'm/s' : 'mph'}</Text>
            </View>
          </View>
        </View>
      )}
      {forecast.length > 0 && !loading && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>5-Day Forecast</Text>
          {forecast.map((day, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ width: 100 }}>{day.date}</Text>
              <Image
                source={{ uri: `https://openweathermap.org/img/wn/${day.icon}@2x.png` }}
                style={{ width: 40, height: 40, marginRight: 8 }}
              />
              <Text style={{ width: 80 }}>{day.main}</Text>
              <Text>
                {Math.round(day.min)}° / {Math.round(day.max)}° {unit === 'metric' ? 'C' : 'F'}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.subtitle}>Search History:</Text>
      <FlatList
        data={history}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleHistoryPress(item)}>
            <Text style={styles.historyItem}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item}
        ListEmptyComponent={<Text style={styles.empty}>No recent searches.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  subtitle: {
    marginTop: 24,
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyItem: {
    padding: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    marginTop: 8,
  },
  empty: {
    color: '#888',
    marginTop: 16,
    fontStyle: 'italic',
  },
  weatherBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    alignItems: 'center',
  },
  weatherCity: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  weatherDate: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    alignItems: 'center',
    marginRight: 16,
  },
  temp: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  forecastBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  forecastDate: {
    fontWeight: 'bold',
  },
});