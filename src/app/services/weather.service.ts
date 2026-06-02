import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})

export class WeatherService {
  private apiUrl: string = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(private http: HttpClient) { }

  getWeather(city: string, countryCode?: string, units: string = 'metric'): Observable<any> {
    let query = city;
    if (countryCode) {
      query += `,${countryCode}`;
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${environment.apiKey}&units=${units}&lang=es`;
    return this.http.get(url);
  }

  getWeatherByCoords(lat: number, lon: number, units: string = 'metric'): Observable<any> {
    const url = `${this.apiUrl}?lat=${lat}&lon=${lon}&appid=${environment.apiKey}&units=${units}&lang=es`;
    return this.http.get(url);
  }

  getForecast(cityName: string, countryCode?: string, units: string = 'metric') {
    let query = cityName;
    if (countryCode) {
      query += ',' + countryCode;
    }
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${query}&appid=${environment.apiKey}&units=${units}&lang=es`;
    return this.http.get(url);
  }

  getForecastByCoords(lat: number, lon: number, units: string = 'metric') {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${environment.apiKey}&units=${units}&lang=es`;
    return this.http.get(url);
  }
}