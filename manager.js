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
import { predictWithHistory } from './predictor.js';

async function fetchData(URL) {
	const data = await fetch(URL).then((r) => r.json());
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

	const cloudRainMarkov = [];
	// const intensityData = [];

	for (let i = 0; i < 5; i++) {
		cloudRainMarkov.push(new Array(4).fill(0));
		// intensityData.push(new Array(100).fill(0));
	}

	for (let i = 0; i < data.rain.length - 1; i++) {
		const isRaining = data.rain[i] > 0;
		const isRainingNext = data.rain[i + 1] > 0;

		const curr_clouds = data.cloud_cover[i];
		const cloudBucket = Math.min(4, Math.floor((curr_clouds / 100) * 5));

		cloudRainMarkov[cloudBucket][
			(isRaining ? 2 : 0) + (isRainingNext ? 1 : 0)
		]++;

		// intensityData[cloudBucket][Math.floor(data.rain[i] * 5)]++;
	}

	for (let i = 0; i < 5; i++) {
		const sumA = cloudRainMarkov[i][0] + cloudRainMarkov[i][1];
		const sumB = cloudRainMarkov[i][2] + cloudRainMarkov[i][3];

		cloudRainMarkov[i][0] /= sumA;
		cloudRainMarkov[i][1] /= sumA;

		cloudRainMarkov[i][2] /= sumB;
		cloudRainMarkov[i][3] /= sumB;

		// const rainAmountSum = intensityData[i]
		// 	.slice(1)
		// 	.reduce((acc, curr) => acc + curr);

		// console.log(rainAmountSum);

		// let previous = 0;

		// for (let j = 1; j < 100; j++) {
		// 	intensityData[i][j] /= rainAmountSum;
		// 	intensityData[i][j] += previous;

		// 	previous = intensityData[i][j];
		// }
	}

	// console.log(
	// 	intensityData.map((p) => p.map((e) => (e * 100).toFixed(2)).slice(1)),
	// );

	const historyLength = data.rain.length;
	const rainData = [];

	for (let i = 0; i < historyLength; i++) {
		rainData.push(data.rain[i]);
	}

	let isRaining = false;

	for (let i = 0; i < predictionSteps; i++) {
		rainData.push(0);
	}

	for (let k = 0; k < 2000; k++) {
		for (let i = 0; i < predictionSteps; i++) {
			let curr_clouds = predictedCloudCoverage[historyLength + i];
			if (isNaN(curr_clouds)) curr_clouds = 0;
			// console.log(curr_clouds);

			const bucket = Math.min(4, Math.floor((curr_clouds / 100) * 5));

			const probability = cloudRainMarkov[bucket][isRaining ? 2 : 0];
			const random = Math.random();

			const before = isRaining;

			isRaining = random > probability;

			const value = isRaining
				? (Math.random() ** 1.22 / 1.06 + 0.65) ** 5
				: 0;

			// const randomAmount = Math.random();
			// let amount = 0;

			// for (let j = 1; j < intensityData[bucket].length; j++) {
			// 	if (intensityData[bucket][j] < randomAmount) continue;
			// 	amount = j / 5;

			// 	break;
			// }

			// const value = isRaining ? amount * 5 : 0;

			rainData[historyLength + i] += value / 2000;
		}
	}

	return {
		temperature_2m: predictedTemperature,
		apparent_temperature: predictedFeelsLike,
		cloud_cover: predictedCloudCoverage,
		rain: rainData,
	};
}

export async function createForecast(predictionSteps) {
	const timeNow = getDate();

	const dateStr = `${timeNow.year}-${timeNow.month.toString().padStart(2, '0')}-${(timeNow.day - 1).toString().padStart(2, '0')}`;

	const URL = `https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2024-01-01&end_date=${dateStr}&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m`;

	// const URL =
	// 	'https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2026-01-01&end_date=2026-05-31&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m';

	// const URL =
	// 	'https://archive-api.open-meteo.com/v1/archive?latitude=42.6975&longitude=23.3241&start_date=2026-05-01&end_date=2026-05-20&hourly=temperature_2m,apparent_temperature,rain,cloud_cover,wind_speed_10m,wind_direction_10m';

	let data = await fetchData(URL);

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
	// renderForecast(forecastResult);

	const pastSamplesOffset = data.apparent_temperature.length;

	const dayForecsts = [];

	for (let i = 0; i < 5; i++) {
		const day = [];

		for (let j = 0; j < 24; j++) {
			const sampleIndex = pastSamplesOffset + i * 24 + j + 1;

			const hour = {
				hour: j,
				temperature: forecastResult.temperature_2m[sampleIndex],
				feelsLike: forecastResult.apparent_temperature[sampleIndex],
				clouds: forecastResult.cloud_cover[sampleIndex],
				rain: forecastResult.rain[sampleIndex],
			};

			day.push(hour);
		}

		dayForecsts.push(day);
	}

	return dayForecsts;
}
