/*
apparent_temperature: "°C"
cloud_cover: "%"
rain: "mm"
temperature_2m: "°C"
time: "iso8601"
wind_direction_10m: "°"
wind_speed_10m: "km/h"
*/

import { clear as clearCanvas, plotWeather } from './graphics.js';
import {
	fourierTransform,
	generateArr,
	inverseFourierTransform,
	smooth,
} from './math.js';
import { predictWithHistory } from './predictor.js';

async function fetchData(URL) {
	const data = await fetch(URL).then((r) => r.json());
	console.log(data.hourly);
	return data.hourly;
}

function forecast(data, predictionSteps) {
	const predictedTemperature = predictWithHistory(
		data.temperature_2m,
		predictionSteps,
	);
	const predictedFeelsLike = predictWithHistory(
		data.apparent_temperature,
		predictionSteps,
	);

	return {
		temperature_2m: predictedTemperature,
		apparent_temperature: predictedFeelsLike,
	};
}

export async function createForecast(predictionSteps) {
	const URL =
		'https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2026-01-01&end_date=2026-05-31&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m';

	let data = await fetchData(URL);
	return sliceForecast(data, predictionSteps);
}

export function renderForecast(dayForecast, feelsLikeEnabled) {
	clearCanvas();

	plotWeather({
		data: dayForecast,
		rangeStart: 0,
		rangeEnd: 24,
		yBoundBottom: 0,
		yBoundTop: 40,
		feelsLikeEnabled: feelsLikeEnabled,
		// sx: end / 24,
	});
}

function sliceForecast(data, predictionSteps) {
	const forecastResult = forecast(data, predictionSteps);
	// renderForecast(forecastResult);

	const pastSamplesOffset = data.apparent_temperature.length;

	const dayForecsts = [];

	for (let i = 0; i < 5; i++) {
		const day = [];

		for (let j = 0; j < 24; j++) {
			const hour = {
				hour: j,
				temperature:
					forecastResult.temperature_2m[
						pastSamplesOffset + i * 24 + j + 1
					],
				feelsLike:
					forecastResult.apparent_temperature[
						pastSamplesOffset + i * 24 + j + 1
					],
			};

			day.push(hour);
		}

		dayForecsts.push(day);
	}

	return dayForecsts;
}
