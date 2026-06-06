import * as manager from './manager.js';

let daySelected = 0;
let feelsLikeEnabled = false;

let animationTimer = 0;
let timerSpeed = 1;

let feelsLikeStaged = false;

function clearCards() {
	for (let card of cards) {
		card.classList.remove('selected');
	}
}

function updateCards(dayForecasts) {
	for (let card of cards) {
		let id = card.id.slice(4);

		const min = dayForecasts[id]
			.map((e) => e.temperature)
			.reduce((acc, v) => Math.min(acc, v), 999)
			.toFixed(0);

		const max = dayForecasts[id]
			.map((e) => e.temperature)
			.reduce((acc, v) => Math.max(acc, v), -999)
			.toFixed(0);

		card.children[1].children[1].children[0].textContent = max + '°';
		card.children[1].children[1].children[1].textContent = min + '°';
	}
}

function updatePreviousDay(newDay) {
	previousDay = newDay.map((d) => ({
		hour: d.hour,
		temperature: d.temperature,
		feelsLike: feelsLikeStaged ? d.feelsLike : d.temperature,
	}));
}

function smoothstep(t) {
	return t * t * (3.0 - 2.0 * t);
}

document
	.querySelector('input[type="checkbox"]')
	.addEventListener('click', () => {
		feelsLikeStaged = !feelsLikeEnabled;

		if (feelsLikeStaged) {
			feelsLikeEnabled = true;

			animationTimer = 0;
			timerSpeed = 1;
		} else {
			updatePreviousDay(previousDay);

			animationTimer = 9;
			timerSpeed = -1;
		}
	});

const cards = document.querySelectorAll('.weather-card');

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

const dayForecasts = await manager.createForecast(200);
updateCards(dayForecasts);

let previousDay = [];

for (let j = 0; j < 24; j++) {
	const hour = {
		hour: j,
		temperature: 0,
		feelsLike: 0,
	};

	previousDay.push(hour);
}

setInterval(() => {
	const t = smoothstep(Math.min(1, animationTimer / 10));

	manager.renderForecast(
		dayForecasts[daySelected].map((f, i) => {
			return {
				hour: f.hour,
				temperature:
					(1 - t) * previousDay[i].temperature + t * f.temperature,
				feelsLike: (1 - t) * previousDay[i].feelsLike + t * f.feelsLike,
			};
		}),
		feelsLikeEnabled,
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
}, 16);
