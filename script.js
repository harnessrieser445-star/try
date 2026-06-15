// Weather Dashboard Application
// Using OpenWeatherMap API (Free tier)

// Configuration
const API_KEY = 'b0cfa02d42d2326bd1aedc46fe9367e5'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const currentWeatherContainer = document.getElementById('currentWeatherContainer');
const forecastContainer = document.getElementById('forecastContainer');
const recentSearchList = document.getElementById('recentSearchList');

// Storage for recent searches
const RECENT_SEARCHES_KEY = 'weatherDashboardSearches';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches();
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});

/**
 * Handle search functionality
 */
function handleSearch() {
    const city = searchInput.value.trim();
    
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        showError('API key not configured. Please add your OpenWeatherMap API key to script.js');
        return;
    }
    
    fetchWeather(city);
}

/**
 * Fetch weather data for a city
 */
async function fetchWeather(city) {
    try {
        hideError();
        showLoadingSpinner(true);
        
        // Get coordinates for the city
        const coordinates = await getCoordinates(city);
        if (!coordinates) {
            showError(`City "${city}" not found. Please try another city.`);
            showLoadingSpinner(false);
            return;
        }
        
        const { lat, lon, name, country } = coordinates;
        
        // Fetch current weather and forecast
        const [currentData, forecastData] = await Promise.all([
            fetchCurrentWeather(lat, lon),
            fetchForecast(lat, lon)
        ]);
        
        if (currentData && forecastData) {
            displayCurrentWeather(currentData, name, country);
            displayForecast(forecastData.list);
            addRecentSearch(name);
        } else {
            showError('Failed to fetch weather data. Please try again.');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showError('An error occurred while fetching weather data.');
    } finally {
        showLoadingSpinner(false);
        searchInput.value = '';
    }
}

/**
 * Get coordinates for a city name
 */
async function getCoordinates(city) {
    try {
        const response = await fetch(
            `${GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) throw new Error('Geocoding failed');
        
        const data = await response.json();
        if (data.length === 0) return null;
        
        const { lat, lon, name, country } = data[0];
        return { lat, lon, name, country };
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * Fetch current weather data
 */
async function fetchCurrentWeather(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) throw new Error('Weather fetch failed');
        return await response.json();
    } catch (error) {
        console.error('Weather fetch error:', error);
        return null;
    }
}

/**
 * Fetch 5-day forecast data
 */
async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        
        if (!response.ok) throw new Error('Forecast fetch failed');
        return await response.json();
    } catch (error) {
        console.error('Forecast fetch error:', error);
        return null;
    }
}

/**
 * Display current weather information
 */
function displayCurrentWeather(data, cityName, country) {
    const {
        main,
        weather,
        wind,
        clouds,
        sys,
        visibility,
        dt
    } = data;
    
    // Update city and date
    document.getElementById('cityName').textContent = `${cityName}, ${country}`;
    document.getElementById('currentDate').textContent = formatDate(new Date(dt * 1000));
    
    // Update weather icon and description
    const iconCode = weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    document.getElementById('weatherIcon').src = iconUrl;
    document.getElementById('weatherDescription').textContent = weather[0].description;
    
    // Update temperature
    document.getElementById('temperature').textContent = `${Math.round(main.temp)}°C`;
    document.getElementById('feelsLike').textContent = `${Math.round(main.feels_like)}°C`;
    
    // Update weather details
    document.getElementById('humidity').textContent = `${main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} km`;
    
    // Update sunrise and sunset
    document.getElementById('sunrise').textContent = formatTime(new Date(sys.sunrise * 1000));
    document.getElementById('sunset').textContent = formatTime(new Date(sys.sunset * 1000));
    
    // Show current weather container
    currentWeatherContainer.classList.remove('hidden');
}

/**
 * Display 5-day forecast
 */
function displayForecast(forecastList) {
    // Get one forecast per day (every 24 hours / 8 intervals)
    const dailyForecasts = new Map();
    
    forecastList.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = formatDate(date).split(',')[0]; // Get only the date part
        
        // Keep only the first forecast for each day
        if (!dailyForecasts.has(day)) {
            dailyForecasts.set(day, forecast);
        }
    });
    
    // Convert to array and take first 5 days
    const forecasts = Array.from(dailyForecasts.values()).slice(0, 5);
    
    // Create forecast cards
    const forecastCardsHtml = forecasts.map(forecast => {
        const date = new Date(forecast.dt * 1000);
        const temp = Math.round(forecast.main.temp);
        const icon = forecast.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;
        const description = forecast.weather[0].description;
        const humidity = forecast.main.humidity;
        
        return `
            <div class="forecast-card">
                <div class="date">${formatDate(date)}</div>
                <img src="${iconUrl}" alt="${description}" class="icon">
                <div class="temp">${temp}°C</div>
                <div class="description">${description}</div>
                <div class="humidity"><i class="fas fa-droplets"></i> ${humidity}%</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('forecastCards').innerHTML = forecastCardsHtml;
    forecastContainer.classList.remove('hidden');
}

/**
 * Format date string
 */
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format time string (HH:MM)
 */
function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

/**
 * Hide error message
 */
function hideError() {
    errorMessage.classList.remove('show');
}

/**
 * Show/hide loading spinner
 */
function showLoadingSpinner(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

/**
 * Add city to recent searches
 */
function addRecentSearch(city) {
    let searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
    
    // Remove duplicate if exists
    searches = searches.filter(s => s.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    searches.unshift(city);
    
    // Keep only last 10 searches
    searches = searches.slice(0, 10);
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    loadRecentSearches();
}

/**
 * Load and display recent searches
 */
function loadRecentSearches() {
    const searches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];
    
    if (searches.length === 0) {
        recentSearchList.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No recent searches</p>';
        return;
    }
    
    const html = searches.map(city => `
        <button class="recent-search-btn" onclick="fetchWeatherByCity('${city}')">
            <i class="fas fa-history"></i> ${city}
        </button>
    `).join('');
    
    recentSearchList.innerHTML = html;
}

/**
 * Helper function to fetch weather by city name (for recent searches)
 */
function fetchWeatherByCity(city) {
    searchInput.value = city;
    fetchWeather(city);
}

/**
 * Clear all recent searches (optional utility function)
 */
function clearRecentSearches() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    loadRecentSearches();
}

// Log API key status on load
console.log('Weather Dashboard initialized.');
if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('⚠️ API key not configured. Get a free key at https://openweathermap.org/api');
}
