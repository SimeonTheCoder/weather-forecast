import { getCoordinates } from './csv-reader.js';
import { getDate, setDate } from './date.js';
import {
	clear,
	getCloudIcon,
	loadingSpinner,
	renderTemperature,
} from './graphics.js';
import * as manager from './manager.js';
import {
	loadSettings,
	saveSettings,
	setSetting,
	settings,
} from './settings.js';

let daySelected = 0;
let feelsLikeEnabled = false;

let animationTimer = 0;
let timerSpeed = 1;

let rangeLower = 0;
let rangeUpper = 40;

let feelsLikeStaged = false;

let spinnerEnabled = true;

function clearCards() {
	for (let card of cards) {
		card.classList.remove('selected');
	}
}

function updateCards(dayForecasts) {
	const today = getDate();

	const daysOfTheWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	let minAllDays = 999;
	let maxAllDays = -999;

	for (let card of cards) {
		let id = Number(card.id.slice(4));

		const min = dayForecasts[id]
			.map((e) => e.temperature)
			.reduce((acc, v) => Math.min(acc, v), 999)
			.toFixed(0);

		const max = dayForecasts[id]
			.map((e) => e.temperature)
			.reduce((acc, v) => Math.max(acc, v), -999)
			.toFixed(0);

		const averageCloduiness =
			dayForecasts[id]
				.map((e) => e.clouds)
				.reduce((acc, v) => acc + v, 0) / dayForecasts[id].length;

		maxAllDays = Math.max(max, maxAllDays);
		minAllDays = Math.min(min, minAllDays);

		const rain =
			dayForecasts[id].map((e) => e.rain).filter((h) => h > 0.3).length /
			24;

		console.log('Rain: ' + rain);

		card.children[1].children[0].textContent =
			daysOfTheWeek[(today.dayOfWeek + id - 1 + 7) % 7];
		card.children[1].children[1].children[0].textContent =
			renderTemperature(max);
		card.children[1].children[1].children[1].textContent =
			renderTemperature(min);
		card.children[0].textContent = getCloudIcon(
			averageCloduiness,
			rain > 0.25,
		);
	}

	rangeLower = minAllDays - 5;
	rangeUpper = maxAllDays + 5;
}

function updatePreviousDay(newDay) {
	previousDay = newDay.map((d) => ({
		hour: d.hour,
		temperature: d.temperature,
		feelsLike: feelsLikeStaged ? d.feelsLike : d.temperature,
		clouds: d.clouds,
		rain: d.rain,
	}));
}

function smoothstep(t) {
	return t * t * (3.0 - 2.0 * t);
}

function switchTheme() {
	document.body.classList.toggle('dark');
	document
		.querySelectorAll('input')
		.forEach((e) => e.classList.toggle('dark'));
	document
		.querySelectorAll('.weather-card')
		.forEach((e) => e.classList.toggle('dark'));
}

function enableFeelsLike() {
	feelsLikeEnabled = true;

	animationTimer = 0;
	timerSpeed = 1;
}

async function forecast() {
	spinnerEnabled = true;
	// const coordinates = await loadCoordinates();
	const coordinates = await getCoordinates(settings.city);

	console.log(coordinates);

	dayForecasts = await manager.createForecast(
		200,
		coordinates[0],
		coordinates[1],
	);
	updateCards(dayForecasts);

	spinnerEnabled = false;
}

function initListeners() {
	document.getElementById('refresh').addEventListener('click', async () => {
		const dateStr = document.getElementById('date').value;
		const tokens = dateStr.split('.');

		console.log(
			new Date(
				`2026-${tokens[1].padStart(2, '0')}-${tokens[0].padStart(2, '0')}`,
			),
		);

		setDate({
			year: 2026,
			month: Number(tokens[1]),
			day: Number(tokens[0]),
			dayOfWeek: new Date(
				`2026-${tokens[1].padStart(2, '0')}-${tokens[0].padStart(2, '0')}`,
			).getDay(),
			hour: getDate().hour,
		});

		console.log(getDate());

		updatePreviousDay(dayForecasts[daySelected]);

		await forecast();

		clearCards();

		daySelected = 0;
		cards[0].classList.add('selected');

		animationTimer = 0;
		timerSpeed = 1;
	});

	document.getElementById('units').addEventListener('click', () => {
		if (settings.units == 'celsium') setSetting('units', 'fahrenheit');
		else setSetting('units', 'celsium');

		updateCards(dayForecasts);
		saveSettings();
	});

	document.getElementById('clock').addEventListener('click', () => {
		if (settings.clock == '24h') setSetting('clock', '12h');
		else setSetting('clock', '24h');

		saveSettings();
	});

	document.getElementById('theme').addEventListener('click', () => {
		if (settings.theme == 'light') setSetting('theme', 'dark');
		else setSetting('theme', 'light');

		switchTheme();

		saveSettings();
	});

	document.getElementById('feels-like').addEventListener('click', () => {
		setSetting('feelsLike', !settings.feelsLike);
		feelsLikeStaged = !feelsLikeEnabled;

		if (feelsLikeStaged) {
			enableFeelsLike();
		} else {
			updatePreviousDay(previousDay);

			animationTimer = 9;
			timerSpeed = -1;
		}

		saveSettings();
	});

	document
		.getElementById('search-city')
		.addEventListener('click', async () => {
			const cityName = document.getElementById('city').value;

			if (cityName.trim() == '') return;

			setSetting('city', cityName);

			updatePreviousDay(dayForecasts[daySelected]);

			await forecast();

			clearCards();

			daySelected = 0;
			cards[0].classList.add('selected');

			animationTimer = 0;
			timerSpeed = 1;

			saveSettings();
		});
}

function setupCards(cards) {
	for (let card of cards) {
		card.addEventListener('click', (e) => {
			clearCards();

			updatePreviousDay(dayForecasts[daySelected]);

			daySelected = e.currentTarget.id.slice(4);
			e.currentTarget.classList.add('selected');

			animationTimer = 0;
			timerSpeed = 1;
		});
	}
}

loadSettings();
const cards = document.querySelectorAll('.weather-card');

setupCards(cards);

let dayForecasts;

let previousDay = [];

for (let j = 0; j < 24; j++) {
	const hour = {
		hour: j,
		temperature: 0,
		feelsLike: 0,
		clouds: 0,
		rain: 0,
	};

	previousDay.push(hour);
}

setInterval(() => {
	if (spinnerEnabled) {
		clear();
		loadingSpinner();
	}

	const t = smoothstep(Math.min(1, animationTimer / 10));

	manager.renderForecast(
		dayForecasts[daySelected].map((f, i) => {
			return {
				hour: f.hour,
				temperature:
					(1 - t) * previousDay[i].temperature + t * f.temperature,
				feelsLike: (1 - t) * previousDay[i].feelsLike + t * f.feelsLike,
				clouds: (1 - t) * previousDay[i].clouds + t * f.clouds,
				rain: (1 - t) * previousDay[i].rain + t * f.rain,
			};
		}),
		rangeLower,
		rangeUpper,
		feelsLikeEnabled,
		daySelected == 0,
	);

	animationTimer += timerSpeed;

	if (animationTimer == 10 || animationTimer == -1) {
		updatePreviousDay(dayForecasts[daySelected]);
		timerSpeed = 0;
		animationTimer = 0;

		if (feelsLikeStaged != feelsLikeEnabled) {
			feelsLikeEnabled = feelsLikeStaged;
		}
	}

	if (spinnerEnabled) {
		loadingSpinner();
	}
}, 16);

await forecast();
cards[0].classList.add('selected');

initListeners();

if (settings.theme == 'dark') switchTheme();
feelsLikeEnabled = settings.feelsLike;
feelsLikeStaged = settings.feelsLike;

if (feelsLikeEnabled) enableFeelsLike();
