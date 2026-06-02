import { setDay } from './script.js';

const cards = document.querySelectorAll('.weather-card');

function clearCards() {
	for (let card of cards) {
		card.classList.remove('selected');
	}
}

for (let card of cards) {
	card.addEventListener('click', (e) => {
		clearCards();

		let day = e.currentTarget.id.slice(4);
		setDay(day);

		e.currentTarget.classList.add('selected');
	});
}

export function updateCards(dayForecasts) {
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
