import { Component, OnInit } from '@angular/core';
import { WeatherService } from './services/weather.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})

export class AppComponent implements OnInit {
  cityName: string = '';
  countryCode: string = '';
  weather: any = null;
  loading: boolean = false;
  errorMessage: string = '';
  locationLoading: boolean = false;
  forecast: any[] = [];
  forecastLoading = false;
  units: 'metric' | 'imperial' = 'metric';
  unitSymbol = '°C';

  constructor(private weatherService: WeatherService) { }

  searchHistory: { city: string; country: string; timestamp: number }[] = [];
  maxHistory = 5;

  ngOnInit() { }

  // Cargar historial al iniciar
  loadHistory() {
    const stored = localStorage.getItem('weatherHistory');
    if (stored) {
      this.searchHistory = JSON.parse(stored);
    }
  }

  // Agregar al historial (se llama en cada búsqueda exitosa)
  addToHistory(city: string, country: string) {
    if (!city) return;
    // Eliminar duplicado (misma ciudad y país)
    this.searchHistory = this.searchHistory.filter(
      item => !(item.city.toLowerCase() === city.toLowerCase() && item.country.toLowerCase() === (country || '').toLowerCase())
    );
    this.searchHistory.unshift({ city, country: country || '', timestamp: Date.now() });
    if (this.searchHistory.length > this.maxHistory) {
      this.searchHistory.pop();
    }
    localStorage.setItem('weatherHistory', JSON.stringify(this.searchHistory));
  }

  // Limpiar historial
  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('weatherHistory');
  }

  // Cargar desde el historial
  selectFromHistory(item: { city: string; country: string }) {
    this.cityName = item.city;
    this.countryCode = item.country;
    this.getWeather();
  }

  toggleUnits() {
    this.units = this.units === 'metric' ? 'imperial' : 'metric';
    this.unitSymbol = this.units === 'metric' ? '°C' : '°F';

    // Refrescar datos actuales si hay una ciudad cargada
    if (this.cityName) {
      if (this.cityName && this.countryCode) {
        this.refreshWeatherData();
      } else if (this.cityName) {
        this.refreshWeatherData();
      }
    }
  }

  refreshWeatherData() {
    if (!this.cityName) return;

    this.loading = true;
    this.weatherService.getWeather(this.cityName, this.countryCode || undefined, this.units).subscribe({
      next: (res: any) => {
        this.weather = res;
        this.loading = false;
        // Refrescar pronóstico
        this.weatherService.getForecast(this.cityName, this.countryCode || undefined, this.units).subscribe({
          next: (forecastRes: any) => {
            this.forecast = this.processForecast(forecastRes);
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Error al actualizar los datos.';
        this.loading = false;
      }
    });
  }

  // Método para obtener el clima actual
  getWeather() {
    const city = this.cityName.trim();
    const country = this.countryCode.trim() || '';

    if (!city) {
      alert('Por favor ingrese el nombre de la ciudad.');
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.weather = null;
    this.forecast = [];

    this.weatherService.getWeather(city, country || undefined, this.units).subscribe({
      next: (res: any) => {
        this.weather = res;
        this.cityName = res.name || city;
        this.countryCode = res.sys?.country || country;
        this.addToHistory(city, country);
        this.loading = false;
        this.fetchForecast(this.cityName, this.countryCode);
        this.weatherService.getForecast(this.cityName, this.countryCode, this.units).subscribe({
        next: (forecastRes: any) => {
          this.forecast = this.processForecast(forecastRes);
        }
      });
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo obtener el clima para esa ubicación.';
        this.loading = false;
      }
    });
  }

  // Método para obtener el clima por geolocalización
  getLocationWeather() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    this.locationLoading = true;
    this.errorMessage = '';
    this.weather = null;
    this.forecast = [];

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.weatherService.getWeatherByCoords(latitude, longitude, this.units).subscribe({
          next: (res: any) => {
            this.weather = res;
            this.cityName = res.name || '';
            this.countryCode = res.sys?.country || '';
            this.addToHistory(this.cityName, this.countryCode);
            this.locationLoading = false;
            this.getForecastByCoords(latitude, longitude);
          },
          error: (err) => {
            console.error(err);
            this.errorMessage = 'No se pudo obtener el clima para tu ubicación.';
            this.locationLoading = false;
          }
        });
      },
      (err) => {
        console.error(err);
        this.errorMessage = 'Permiso de ubicación denegado o no disponible.';
        this.locationLoading = false;
      }
    );
  }

  // Método para obtener el pronóstico por coordenadas
  getForecastByCoords(lat: number, lon: number) {
    this.forecastLoading = true;
    this.weatherService.getForecastByCoords(lat, lon, this.units).subscribe({
      next: (res: any) => {
        this.forecast = this.processForecast(res);
        this.forecastLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.forecastLoading = false;
      }
    });
  }

  // Método para procesar el pronóstico y obtener solo un dato por día
  processForecast(data: any): any[] {
    const daily: any[] = [];
    const seen = new Set<string>();

    for (let item of data.list) {
      const date = item.dt_txt.split(' ')[0]; // "2026-06-02"
      if (!seen.has(date)) {
        seen.add(date);
        daily.push({
          date: date,
          temp_min: item.main.temp_min,
          temp_max: item.main.temp_max,
          icon: item.weather[0].main,
          description: item.weather[0].description
        });
      }
      if (daily.length === 5) break;
    }
    return daily;
  }

  // Método genérico para obtener pronóstico
  fetchForecast(city: string, country: string) {
    this.forecastLoading = true;
    this.weatherService.getForecast(city, country || undefined).subscribe({
      next: (res: any) => {
        this.forecast = this.processForecast(res);
        this.forecastLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.forecastLoading = false;
      }
    });
  }

  // Método para obtener el ícono del clima
  getWeatherIcon(main?: string): string {
    if (!main) return 'fa-solid fa-sun';
    switch (main.toLowerCase()) {
      case 'clouds':
        return 'fa-solid fa-cloud';
      case 'rain':
        return 'fa-solid fa-cloud-showers-heavy';
      case 'drizzle':
        return 'fa-solid fa-cloud-rain';
      case 'thunderstorm':
        return 'fa-solid fa-bolt';
      case 'snow':
        return 'fa-regular fa-snowflake';
      default:
        return 'fa-solid fa-sun';
    }
  }
}