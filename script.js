// ==============================================
// Configuration
// ==============================================
const USE_MOCK_API = true;
const MOCK_API_DELAY = 500; 

// API Configuration
const API_KEY = USE_MOCK_API ? "mock-key" : "YOUR_OPENWEATHER_API_KEY";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/direct";
const HISTORY_URL =
  "https://api.openweathermap.org/data/2.5/onecall/timemachine";

// DOM Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const celsiusBtn = document.getElementById("celsius-btn");
const fahrenheitBtn = document.getElementById("fahrenheit-btn");
const currentCity = document.getElementById("current-city");
const currentTemp = document.getElementById("current-temp");
const weatherDesc = document.getElementById("weather-desc");
const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const weatherIcon = document.getElementById("weather-icon");
const alertsContainer = document.getElementById("alerts-container");
const hourlyContainer = document.getElementById("hourly-container");
const dailyContainer = document.getElementById("daily-container");
const historyDate = document.getElementById("history-date");
const getHistoryBtn = document.getElementById("get-history-btn");
const historicalResults = document.getElementById("historical-results");

// Global variables
let currentUnit = "metric";
let currentWeatherData = null;
let currentLocation = null;

// ==============================================
// Initialization
// ==============================================
document.addEventListener("DOMContentLoaded", () => {
  // Set current year in footer
  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  // Set max date for historical data (yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  historyDate.max = formatDate(yesterday);

  // Create background particles
  createParticles();

  // Event listeners
  searchBtn.addEventListener("click", searchWeather);
  locationBtn.addEventListener("click", getLocationWeather);
  cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchWeather();
  });
  celsiusBtn.addEventListener("click", () => switchUnit("metric"));
  fahrenheitBtn.addEventListener("click", () => switchUnit("imperial"));
  getHistoryBtn.addEventListener("click", getHistoricalWeather);

  // Show loading state
  document.body.classList.add("loading");

  // Default to user's location or a default city
  if (navigator.geolocation && !USE_MOCK_API) {
    getLocationWeather();
  } else {
    fetchWeather("Kathmandu"); // Default city
  }
});

// ==============================================
// API Functions
// ==============================================
async function fetchWeather(city) {
  try {
    if (USE_MOCK_API) {
      // Use mock data with simulated delay
      await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY));
      const mockData = generateMockWeatherData(city);
      currentWeatherData = mockData;
      currentLocation = {
        lat: mockData.lat,
        lon: mockData.lon,
        name: city,
        country: "Nepal",
      };
      updateUI(mockData, city, "Nepal");
      return;
    }

    // Real API implementation
    const geoResponse = await fetch(
      `${GEOCODE_URL}?q=${city}&limit=1&appid=${API_KEY}`
    );
    const geoData = await geoResponse.json();

    if (geoData.length === 0) {
      alert("City not found. Please try another location.");
      return;
    }

    const { lat, lon, name, country } = geoData[0];
    currentLocation = { lat, lon, name, country };

    const weatherResponse = await fetch(
      `${BASE_URL}/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=${currentUnit}&appid=${API_KEY}`
    );
    const weatherData = await weatherResponse.json();

    currentWeatherData = weatherData;
    updateUI(weatherData, name, country);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    alert("Error fetching weather data. Please try again.");
  }
}

async function getHistoricalWeather() {
  if (!currentLocation) {
    alert("Please select a location first");
    return;
  }

  const selectedDate = historyDate.value;
  if (!selectedDate) {
    alert("Please select a date");
    return;
  }

  try {
    if (USE_MOCK_API) {
      // Use mock historical data
      await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY));
      const date = new Date(selectedDate);
      const mockData = generateMockHistoricalData(date);
      displayHistoricalData(mockData.current, date);
      return;
    }

    // Real API implementation
    const date = new Date(selectedDate);
    const timestamp = Math.floor(date.getTime() / 1000);

    const response = await fetch(
      `${HISTORY_URL}?lat=${currentLocation.lat}&lon=${currentLocation.lon}&dt=${timestamp}&units=${currentUnit}&appid=${API_KEY}`
    );
    const data = await response.json();

    if (data.current) {
      displayHistoricalData(data.current, date);
    } else {
      historicalResults.innerHTML =
        "<p>No historical data available for this date.</p>";
    }
  } catch (error) {
    console.error("Error fetching historical data:", error);
    alert("Error fetching historical data. Please try again.");
  }
}

// ==============================================
// UI Update Functions
// ==============================================
function updateUI(data, city, country) {
  // Set weather class for background and effects
  const weatherType = data.current.weather[0].main.toLowerCase();
  document.body.className = weatherType;
  document.body.classList.remove("loading");

  // Create weather effects
  createWeatherEffects(weatherType);

  // Current weather
  const current = data.current;
  currentCity.textContent = `${city}, ${country}`;
  currentTemp.textContent = `${Math.round(current.temp)}°`;
  weatherDesc.textContent = current.weather[0].description;
  feelsLike.textContent = `${Math.round(current.feels_like)}°`;
  humidity.textContent = `${current.humidity}%`;
  wind.textContent = `${
    currentUnit === "metric"
      ? Math.round(current.wind_speed * 3.6)
      : Math.round(current.wind_speed)
  } ${currentUnit === "metric" ? "km/h" : "mph"}`;
  pressure.textContent = `${current.pressure} hPa`;
  weatherIcon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
  weatherIcon.alt = current.weather[0].description;

  // Weather alerts
  updateAlerts(data.alerts);

  // Hourly forecast (next 12 hours)
  updateHourlyForecast(data.hourly.slice(0, 12));

  // Daily forecast (next 5 days)
  updateDailyForecast(data.daily.slice(0, 5));

  // Update charts
  updateCharts(data.hourly.slice(0, 24), data.daily);
}

function updateAlerts(alerts) {
  alertsContainer.innerHTML = "";

  if (!alerts || alerts.length === 0) {
    alertsContainer.innerHTML = "<p>No active alerts for your location.</p>";
    return;
  }

  alerts.forEach((alert) => {
    const alertElement = document.createElement("div");
    alertElement.className = "alert-item";
    alertElement.innerHTML = `
            <h4>${alert.event}</h4>
            <p>${alert.description}</p>
            <small>From: ${formatDateTime(alert.start)} - To: ${formatDateTime(
      alert.end
    )}</small>
        `;
    alertsContainer.appendChild(alertElement);
  });
}

function updateHourlyForecast(hourlyData) {
  hourlyContainer.innerHTML = "";

  hourlyData.forEach((hour) => {
    const time = new Date(hour.dt * 1000);
    const hourElement = document.createElement("div");
    hourElement.className = "hourly-item";
    hourElement.innerHTML = `
            <div>${formatTime(time)}</div>
            <img src="https://openweathermap.org/img/wn/${
              hour.weather[0].icon
            }.png" alt="${hour.weather[0].description}">
            <div>${Math.round(hour.temp)}°</div>
            <small>${Math.round(hour.pop * 100)}%</small>
        `;
    hourlyContainer.appendChild(hourElement);
  });
}

function updateDailyForecast(dailyData) {
  dailyContainer.innerHTML = "";

  dailyData.forEach((day) => {
    const date = new Date(day.dt * 1000);
    const dayElement = document.createElement("div");
    dayElement.className = "daily-item";
    dayElement.innerHTML = `
            <div>${formatDay(date)}</div>
            <img src="https://openweathermap.org/img/wn/${
              day.weather[0].icon
            }.png" alt="${day.weather[0].description}">
            <div>${Math.round(day.temp.max)}° / ${Math.round(
      day.temp.min
    )}°</div>
            <small>${Math.round(day.pop * 100)}%</small>
        `;
    dailyContainer.appendChild(dayElement);
  });
}

function updateCharts(hourlyData, dailyData) {
  // Temperature chart (24 hours)
  const tempCtx = document.getElementById("temp-chart").getContext("2d");

  if (window.tempChart) {
    window.tempChart.destroy();
  }

  window.tempChart = new Chart(tempCtx, {
    type: "line",
    data: {
      labels: hourlyData.map((hour) => formatTime(new Date(hour.dt * 1000))),
      datasets: [
        {
          label: "Temperature (°)",
          data: hourlyData.map((hour) => Math.round(hour.temp)),
          borderColor: "rgba(231, 76, 60, 1)",
          backgroundColor: "rgba(231, 76, 60, 0.2)",
          tension: 0.3,
          fill: true,
        },
        {
          label: "Feels Like (°)",
          data: hourlyData.map((hour) => Math.round(hour.feels_like)),
          borderColor: "rgba(52, 152, 219, 1)",
          backgroundColor: "rgba(52, 152, 219, 0.2)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });

  // Precipitation chart (5 days)
  const precipCtx = document.getElementById("precip-chart").getContext("2d");

  if (window.precipChart) {
    window.precipChart.destroy();
  }

  window.precipChart = new Chart(precipCtx, {
    type: "bar",
    data: {
      labels: dailyData.map((day) => formatDay(new Date(day.dt * 1000))),
      datasets: [
        {
          label: "Precipitation Probability (%)",
          data: dailyData.map((day) => Math.round(day.pop * 100)),
          backgroundColor: "rgba(52, 152, 219, 0.7)",
          borderColor: "rgba(52, 152, 219, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    },
  });
}

function displayHistoricalData(data, date) {
  historicalResults.innerHTML = `
        <h4>Weather on ${formatDate(date)}</h4>
        <div class="historical-details">
            <div><i class="fas fa-temperature-high"></i> Temperature: ${Math.round(
              data.temp
            )}°</div>
            <div><i class="fas fa-temperature-low"></i> Feels Like: ${Math.round(
              data.feels_like
            )}°</div>
            <div><i class="fas fa-tint"></i> Humidity: ${data.humidity}%</div>
            <div><i class="fas fa-wind"></i> Wind: ${
              currentUnit === "metric"
                ? Math.round(data.wind_speed * 3.6)
                : Math.round(data.wind_speed)
            } ${currentUnit === "metric" ? "km/h" : "mph"}</div>
            <div><i class="fas fa-compress-alt"></i> Pressure: ${
              data.pressure
            } hPa</div>
            <div><i class="fas fa-cloud"></i> Conditions: ${
              data.weather[0].description
            }</div>
            <div><i class="fas fa-sun"></i> UV Index: ${data.uvi}</div>
        </div>
    `;
}

// ==============================================
// Utility Functions
// ==============================================
function searchWeather() {
  const city = cityInput.value.trim();
  if (city) {
    fetchWeather(city);
    cityInput.value = "";
  } else {
    alert("Bhaktapur");
  }
}

function getLocationWeather() {
  if (USE_MOCK_API) {
    fetchWeather("Your Location");
    return;
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `${GEOCODE_URL}?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
          );
          const data = await response.json();

          const city = data[0]?.name || "Your Location";
          const country = data[0]?.country || "";

          const weatherResponse = await fetch(
            `${BASE_URL}/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely&units=${currentUnit}&appid=${API_KEY}`
          );
          const weatherData = await weatherResponse.json();

          currentLocation = {
            lat: latitude,
            lon: longitude,
            name: city,
            country,
          };
          currentWeatherData = weatherData;
          updateUI(weatherData, city, country);
        } catch (error) {
          console.error("Error fetching location weather:", error);
          alert("Error getting your location weather. Using default city.");
          fetchWeather("London");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Using default city.");
        fetchWeather("London");
      }
    );
  } else {
    alert("Geolocation is not supported by your browser. Using default city.");
    fetchWeather("London");
  }
}

function switchUnit(unit) {
  if (currentUnit === unit) return;

  currentUnit = unit;
  celsiusBtn.classList.toggle("active", unit === "metric");
  fahrenheitBtn.classList.toggle("active", unit === "imperial");

  if (currentLocation) {
    fetchWeather(currentLocation.name);
  }
}

// ==============================================
// Animation and Effect Functions
// ==============================================
function createParticles() {
  const particleCount = 50;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");

    const size = Math.random() * 5 + 2;
    const posX = Math.random() * window.innerWidth;
    const posY = Math.random() * window.innerHeight;
    const opacity = Math.random() * 0.5 + 0.1;
    const animationDuration = Math.random() * 20 + 10;
    const delay = Math.random() * 5;

    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}px`;
    particle.style.top = `${posY}px`;
    particle.style.opacity = opacity;
    particle.style.animation = `float ${animationDuration}s ease-in-out ${delay}s infinite`;

    document.body.appendChild(particle);
  }
}

function createWeatherEffects(weatherType) {
  document
    .querySelectorAll(".snowflake, .raindrop")
    .forEach((el) => el.remove());

  if (weatherType.includes("snow")) {
    createSnowflakes();
  } else if (weatherType.includes("rain") || weatherType.includes("drizzle")) {
    createRaindrops();
  }
}

function createSnowflakes() {
  const snowflakeCount = 30;
  const container = document.createElement("div");
  container.className = "snowflakes-container";

  for (let i = 0; i < snowflakeCount; i++) {
    const snowflake = document.createElement("div");
    snowflake.classList.add("snowflake");
    snowflake.innerHTML = "❄";

    const size = Math.random() * 1 + 0.5;
    const posX = Math.random() * window.innerWidth;
    const delay = Math.random() * 5;
    const duration = Math.random() * 10 + 5;
    const opacity = Math.random() * 0.7 + 0.3;

    snowflake.style.left = `${posX}px`;
    snowflake.style.fontSize = `${size}em`;
    snowflake.style.animationDuration = `${duration}s`;
    snowflake.style.animationDelay = `${delay}s`;
    snowflake.style.opacity = opacity;

    container.appendChild(snowflake);
  }

  document.body.appendChild(container);
}

function createRaindrops() {
  const raindropCount = 50;
  const container = document.createElement("div");
  container.className = "raindrops-container";

  for (let i = 0; i < raindropCount; i++) {
    const raindrop = document.createElement("div");
    raindrop.classList.add("raindrop");

    const posX = Math.random() * window.innerWidth;
    const delay = Math.random() * 2;
    const duration = Math.random() * 1 + 0.5;
    const length = Math.random() * 10 + 10;

    raindrop.style.left = `${posX}px`;
    raindrop.style.height = `${length}px`;
    raindrop.style.animationDuration = `${duration}s`;
    raindrop.style.animationDelay = `${delay}s`;

    container.appendChild(raindrop);
  }

  document.body.appendChild(container);
}

// ==============================================
// Mock Data Generators
// ==============================================
function generateMockWeatherData(city) {
  const now = Math.floor(Date.now() / 1000);
  const weatherTypes = [
    { id: 800, main: "Clear", description: "clear sky", icon: "01d" },
    { id: 801, main: "Clouds", description: "few clouds", icon: "02d" },
    { id: 803, main: "Clouds", description: "broken clouds", icon: "04d" },
    { id: 500, main: "Rain", description: "light rain", icon: "10d" },
    { id: 600, main: "Snow", description: "light snow", icon: "13d" },
    { id: 200, main: "Thunderstorm", description: "thunderstorm", icon: "11d" },
  ];

  // Random weather condition
  const randomWeather =
    weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

  return {
    lat: 51.5074,
    lon: -0.1278,
    timezone: "Asia/Kathmandu",
    timezone_offset: 3600,
    current: {
      dt: now,
      sunrise: now - 36000,
      sunset: now + 36000,
      temp: Math.round(15 + Math.random() * 15),
      feels_like: Math.round(14 + Math.random() * 15),
      pressure: 1000 + Math.floor(Math.random() * 20),
      humidity: 40 + Math.floor(Math.random() * 50),
      dew_point: 10 + Math.random() * 5,
      uvi: Math.random() * 8,
      clouds: Math.random() * 100,
      visibility: 10000,
      wind_speed: Math.random() * 10,
      wind_deg: Math.random() * 360,
      weather: [randomWeather],
    },
    hourly: Array(24)
      .fill()
      .map((_, i) => ({
        dt: now + i * 3600,
        temp: Math.round(12 + Math.sin(i / 4) * 8 + Math.random() * 3),
        feels_like: Math.round(11 + Math.sin(i / 4) * 8 + Math.random() * 3),
        pressure: 1000 + Math.floor(Math.random() * 20),
        humidity: 40 + Math.floor(Math.random() * 50),
        dew_point: 10 + Math.random() * 5,
        uvi: Math.max(0, 5 - Math.abs(12 - i)),
        clouds: Math.random() * 100,
        visibility: 10000,
        wind_speed: Math.random() * 10,
        wind_deg: Math.random() * 360,
        weather: [
          {
            id: i > 18 || i < 6 ? 800 : 801,
            main: i > 18 || i < 6 ? "Clear" : "Clouds",
            description: i > 18 || i < 6 ? "clear sky" : "few clouds",
            icon: i > 18 || i < 6 ? "01n" : "02d",
          },
        ],
        pop: Math.random() > 0.7 ? Math.random() * 0.5 : 0,
      })),
    daily: Array(5)
      .fill()
      .map((_, i) => ({
        dt: now + i * 86400,
        sunrise: now + i * 86400 - 36000,
        sunset: now + i * 86400 + 36000,
        temp: {
          day: Math.round(15 + Math.sin(i) * 5 + Math.random() * 3),
          min: Math.round(10 + Math.sin(i) * 3 + Math.random() * 2),
          max: Math.round(20 + Math.sin(i) * 5 + Math.random() * 3),
          night: Math.round(12 + Math.sin(i) * 3 + Math.random() * 2),
          eve: Math.round(16 + Math.sin(i) * 4 + Math.random() * 2),
          morn: Math.round(13 + Math.sin(i) * 3 + Math.random() * 2),
        },
        feels_like: {
          day: Math.round(14 + Math.sin(i) * 5 + Math.random() * 3),
          night: Math.round(11 + Math.sin(i) * 3 + Math.random() * 2),
          eve: Math.round(15 + Math.sin(i) * 4 + Math.random() * 2),
          morn: Math.round(12 + Math.sin(i) * 3 + Math.random() * 2),
        },
        pressure: 1000 + Math.floor(Math.random() * 20),
        humidity: 40 + Math.floor(Math.random() * 50),
        dew_point: 10 + Math.random() * 5,
        wind_speed: Math.random() * 10,
        wind_deg: Math.random() * 360,
        weather: [
          weatherTypes[Math.floor(Math.random() * weatherTypes.length)],
        ],
        clouds: Math.random() * 100,
        pop: Math.random() > 0.7 ? Math.random() * 0.7 : 0,
        uvi: 5 + Math.random() * 3,
      })),
    alerts:
      Math.random() > 0.7
        ? [
            {
              sender_name: "Weather Service",
              event: ["Heat Wave", "Storm Warning", "Flood Alert"][
                Math.floor(Math.random() * 3)
              ],
              start: now,
              end: now + 86400,
              description:
                "Severe weather conditions expected in your area. Please take necessary precautions.",
            },
          ]
        : null,
  };
}

function generateMockHistoricalData(date) {
  const timestamp = Math.floor(date.getTime() / 1000);
  const weatherTypes = [
    { id: 800, main: "Clear", description: "clear sky", icon: "01d" },
    { id: 801, main: "Clouds", description: "few clouds", icon: "02d" },
    { id: 500, main: "Rain", description: "light rain", icon: "10d" },
  ];

  const randomWeather =
    weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

  return {
    lat: 51.5074,
    lon: -0.1278,
    timezone: "Europe/London",
    timezone_offset: 3600,
    current: {
      dt: timestamp,
      sunrise: timestamp - 36000,
      sunset: timestamp + 36000,
      temp: Math.round(10 + Math.random() * 15),
      feels_like: Math.round(9 + Math.random() * 15),
      pressure: 1000 + Math.floor(Math.random() * 20),
      humidity: 40 + Math.floor(Math.random() * 50),
      dew_point: 5 + Math.random() * 5,
      uvi: Math.random() * 8,
      clouds: Math.random() * 100,
      visibility: 10000,
      wind_speed: Math.random() * 10,
      wind_deg: Math.random() * 360,
      weather: [randomWeather],
    },
  };
}

// ==============================================
// Formatting Functions
// ==============================================
function formatDateTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(date) {
  return date.toLocaleDateString([], { weekday: "short" });
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}
