/*
apparent_temperature: "°C"
cloud_cover: "%"
rain: "mm"
temperature_2m: "°C"
time: "iso8601"
wind_direction_10m: "°"
wind_speed_10m: "km/h"
*/

import { getDate } from './date.js';
import { clear as clearCanvas, plot, plotWeather } from './graphics.js';
import {
	fourierTransform,
	generateArr,
	inverseFourierTransform,
	smooth,
} from './math.js';
import { predictRainWithHistory, predictWithHistory } from './predictor.js';

async function fetchData(URL) {
	// const data = await fetch('./data.json').then((r) => r.json());
	const data = await fetch(URL).then((r) => r.json());
	// return data;
	// document.body.innerHTML = JSON.stringify(data.hourly);
	return data.hourly;
}

function forecast(data, predictionSteps) {
	const predictedTemperature = predictWithHistory(
		data.temperature_2m,
		predictionSteps,
		-40,
		40,
		-20,
		20,
		false,
	);
	const predictedFeelsLike = predictWithHistory(
		data.apparent_temperature,
		predictionSteps,
		-40,
		40,
		-20,
		20,
		false,
	);

	const predictedCloudCoverage = predictWithHistory(
		data.cloud_cover,
		predictionSteps,
		0,
		150,
		-20,
		20,
		false,
	);

	const rainPrediction = predictRainWithHistory(
		data.rain,
		predictionSteps,
		predictedCloudCoverage,
	);

	return {
		temperature_2m: predictedTemperature,
		apparent_temperature: predictedFeelsLike,
		cloud_cover: predictedCloudCoverage,
		rain: rainPrediction,
	};
}

export async function createForecast(predictionSteps) {
	const timeNow = getDate();

	const dateStr = `${timeNow.year}-${timeNow.month.toString().padStart(2, '0')}-${(timeNow.day - 1).toString().padStart(2, '0')}`;

	// const URL = `https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2026-01-01&end_date=2026-03-03&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m`;

	const URL = `https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2026-01-01&end_date=${dateStr}&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m`;
	let data = await fetchData(URL);

	console.log(data);

	return sliceForecast(data, predictionSteps);
}

export function renderForecast(
	dayForecast,
	yBottom,
	yTop,
	feelsLikeEnabled,
	isFirstDay,
) {
	clearCanvas();

	plotWeather({
		data: dayForecast,
		rangeStart: 0,
		rangeEnd: 24,
		yBoundBottom: yBottom,
		yBoundTop: yTop,
		feelsLikeEnabled: feelsLikeEnabled,
		isFirstDay: isFirstDay,
		font: 'Trebuchet MS',
		// sx: end / 24,
	});
}

function sliceForecast(data, predictionSteps) {
	const forecastResult = forecast(data, predictionSteps);
	const pastSamplesOffset = data.apparent_temperature.length;

	const dayForecsts = [];

	for (let i = 0; i < 5; i++) {
		const day = [];

		for (let j = 0; j < 24; j++) {
			const sampleIndex = pastSamplesOffset + i * 24 + j + 1;

			const hour = {
				hour: j,
				temperature: forecastResult.temperature_2m[sampleIndex] * 1,
				feelsLike: forecastResult.apparent_temperature[sampleIndex],
				// clouds: ((j + i * 24) / 24 / 5) * 100,
				clouds: forecastResult.cloud_cover[sampleIndex],
				rain: forecastResult.rain[sampleIndex],
			};

			day.push(hour);
		}

		dayForecsts.push(day);
	}

	return dayForecsts;
}
