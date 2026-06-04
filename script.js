/*
apparent_temperature: "°C"
cloud_cover: "%"
rain: "mm"
temperature_2m: "°C"
time: "iso8601"
wind_direction_10m: "°"
wind_speed_10m: "km/h"
*/

import { clear as clearCanvas, plot, plotTemperature } from './graphics.js';
import {
	fourierTransform,
	generateArr,
	inverseFourierTransform,
	smooth,
	taylorSeries,
} from './math.js';
import { predictWithHistory } from './predictor.js';
import { updateCards } from './ui.js';

const predictionSteps = 200;

const URL =
	'https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2026-04-02&end_date=2026-05-31&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m';

async function fetchData() {
	const data = await fetch(URL).then((r) => r.json());
	console.log(data.hourly);
	return data.hourly;
}

function forecast(data) {
	const predictedTemperature = predictWithHistory(data, predictionSteps);
	const sampleCount = data.length;

	return {
		temperature_2m: predictedTemperature,
	};
}

function renderForecast(data) {
	console.log(data);
	const sampleCount = data.temperature_2m.length;

	plot(
		data.temperature_2m,
		sampleCount - 100 - predictionSteps,
		sampleCount,
		-10,
		40,
		'red',
	);
}

let data = await fetchData();
let forecastDaySelected = 0;

sliceForecast();

let animationCounter = 1;
let previous = [];

export let dayForecsts = sliceForecast();
previous = dayForecsts[forecastDaySelected];
renderDailyForecast();

setInterval(renderDailyForecast, 5);

function renderDailyForecast() {
	clearCanvas();

	plotTemperature({
		data: dayForecsts[forecastDaySelected].map(
			(e, i) =>
				e.temperature * (animationCounter / 24) +
				previous[i].temperature * (1 - animationCounter / 24),
		),
		rangeStart: 0,
		rangeEnd: 24,
		yBoundBottom: 0,
		yBoundTop: 40,
		// sx: end / 24,
	});

	animationCounter = Math.min(24, animationCounter + 1);
}

function sliceForecast() {
	const value = data.temperature_2m.length;
	const copy = data.temperature_2m.slice(0, value);

	const forecastResult = forecast(copy, predictionSteps);
	// renderForecast(forecastResult);

	const future = forecastResult.temperature_2m.slice(copy.length + 1);

	const dayForecsts = [];

	for (let i = 0; i < 5; i++) {
		dayForecsts.push(
			future.slice(i * 24, i * 24 + 25).map((t, i) => ({
				hour: i,
				temperature: t,
			})),
		);
	}

	updateCards(dayForecsts);

	return dayForecsts;

	// plot(
	// 	data.temperature_2m.slice(0, value + predictionSteps),
	// 	copy.length - 100,
	// 	copy.length + predictionSteps,
	// 	-10,
	// 	30,
	// 	'green',
	// 	1,
	// 	true,
	// );
}

export function setDay(day) {
	previous = dayForecsts[forecastDaySelected];
	forecastDaySelected = day;
	animationCounter = 1;
	renderDailyForecast();
}

// document.getElementById('left').addEventListener('click', () => {
// 	setDay(forecastDaySelected - 1);
// });

// document.getElementById('right').addEventListener('click', () => {
// 	setDay(forecastDaySelected + 1);
// });
