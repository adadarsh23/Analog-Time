document.addEventListener('DOMContentLoaded', async () => {
    const hourHand = document.getElementById('hour');
    const minuteHand = document.getElementById('minute');
    const secondHand = document.getElementById('second');
    const currentTimeIndiaDisplay = document.getElementById('current-time');
    const timeIndiaDisplay = document.getElementById('time-india');
    const timeUSADisplay = document.getElementById('time-usa');
    const timeUKDisplay = document.getElementById('time-uk');
    const timeJapanDisplay = document.getElementById('time-japan');

    const monthYearDisplay = document.getElementById('monthYear');
    const calendarDaysGrid = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const weatherInfoDisplay = document.getElementById('weather-info');

    const OPENWEATHER_API_KEY = '175e45047a98e6a928c0124ff69b9108';
    let userTimeZone = 'Asia/Kolkata';
    let userLocationInfo = null;
    let currentCalendarDate = new Date();

    async function getUserLocationInfo() {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data && data.timezone) userTimeZone = data.timezone;
            return data;
        } catch {
            userTimeZone = 'Asia/Kolkata';
            return { city: 'Noida', country_code: 'IN', latitude: 28.57, longitude: 77.32 };
        }
    }

    function getTimeParts(timeZone) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        return formatter.format(now);
    }

    function getTimeComponents(timeZone) {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        }).formatToParts(now);

        const get = (type) => +parts.find(p => p.type === type)?.value || 0;
        return {
            hours: get('hour'),
            minutes: get('minute'),
            seconds: get('second'),
        };
    }

    function updateClock() {
    // 1. User's Local Time (based on IP)
    currentTimeIndiaDisplay.textContent = getTimeParts(userTimeZone);

    // 2. Fixed Country Times
    timeIndiaDisplay.textContent = getTimeParts('Asia/Kolkata');
    timeUSADisplay.textContent = getTimeParts('America/New_York');
    timeUKDisplay.textContent = getTimeParts('Europe/London');
    timeJapanDisplay.textContent = getTimeParts('Asia/Tokyo');

    // 3. Analog Clock (based on IP/user's timezone)
    const { hours, minutes, seconds } = getTimeComponents(userTimeZone);
    const totalMilliseconds = (hours * 3600000) + (minutes * 60000) + (seconds * 1000);

    hourHand.style.transform = `translate(-50%, 0%) rotate(${(totalMilliseconds / 3600000) * 30}deg)`;
    minuteHand.style.transform = `translate(-50%, 0%) rotate(${(totalMilliseconds / 60000) * 6}deg)`;
    secondHand.style.transform = `translate(-50%, 0%) rotate(${(totalMilliseconds / 1000) * 6}deg)`;

    requestAnimationFrame(updateClock);
}


    async function fetchWeather(location) {
        try {
            const { city, country_code, latitude, longitude } = location;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
            const res = await fetch(url);
            const data = await res.json();
            const icon = `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            weatherInfoDisplay.innerHTML = `
                <img src="${icon}" alt="${data.weather[0].description}">
                <span>${city}, ${country_code} - ${Math.round(data.main.temp)}°C, ${data.weather[0].description}</span>
            `;
        } catch (err) {
            weatherInfoDisplay.textContent = `Weather load error`;
        }
    }

    function renderCalendar(date) {
        calendarDaysGrid.innerHTML = '';
        const year = date.getFullYear();
        const month = date.getMonth();
        monthYearDisplay.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: userTimeZone }));
        const todayDay = today.getDate(), todayMonth = today.getMonth(), todayYear = today.getFullYear();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.classList.add('empty-day');
            calendarDaysGrid.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const div = document.createElement('div');
            div.textContent = day;
            div.classList.add('calendar-day');
            if (day === todayDay && month === todayMonth && year === todayYear) {
                div.classList.add('today');
            }
            calendarDaysGrid.appendChild(div);
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar(currentCalendarDate);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar(currentCalendarDate);
    });

    userLocationInfo = await getUserLocationInfo();
    fetchWeather(userLocationInfo);
    renderCalendar(currentCalendarDate);
    updateClock();
    setInterval(() => fetchWeather(userLocationInfo), 300000); // 5 min
});
