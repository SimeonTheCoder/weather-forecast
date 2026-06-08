// document.querySelector('canvas').width = document.body.width;
// document.querySelector('canvas').height = document.body.height / 2;

import { normalize, fromHex, toHex, lerp } from './color-utils.js';
import { getDate } from './date.js';
import { settings } from './settings.js';
import { showSpinner } from './spinner.js';

let time = 0;

const canvasElement = document.querySelector('canvas');

export const width = canvasElement.offsetWidth;
export const height = canvasElement.offsetHeight;

const sizeRatio = width / 2560;

canvasElement.width = width;
canvasElement.height = height;

export const canvas = document.querySelector('canvas').getContext('2d');

canvas.lineJoin = 'round';

export function clear() {
	canvas.clearRect(0, 0, width, height);
}

const cloudLevels = ['☀️', '🌤️', '⛅', '🌥️', '☁️'];
const cloudLevelsRain = ['💧', '🌦️', '🌦️', '🌧️', '⛈️'];

export function getCloudIcon(percentage, raining) {
	const index = Math.max(
		0,
		Math.min(4, Math.floor(Math.max(percentage / 100 - 0.1, 0) * 5.55)),
	);
	return raining ? cloudLevelsRain[index] : cloudLevels[index];
}

export function celsiumToFahrenheit(temperature) {
	return temperature * 1.8 + 32;
}

export function renderTemperature(temperature) {
	return settings.units == 'celsium'
		? `${Math.floor(temperature)}°`
		: `${Math.floor(celsiumToFahrenheit(temperature))} F`;
}

export function to12HTime(hour) {
	if (hour == 0) return '12 AM';
	if (hour < 12) return `${hour} AM`;
	if (hour == 12) return `12 PM`;
	if (hour > 12) return `${hour - 12} PM`;
}

export function renderTime(hour) {
	return settings.clock == '24h' ? `${hour}:00` : `${to12HTime(hour)}`;
}

export function getBackgroundColor(change) {
	let direction = -1;

	if (settings.theme == 'dark') direction = 1;

	const color = settings.theme == 'light' ? '#ffffff' : `#16161D`;

	const result = {
		r: fromHex(color).r + direction * change,
		g: fromHex(color).g + direction * change,
		b: fromHex(color).b + direction * change,
	};

	return toHex(result);
}

export function getForegroundColor() {
	return settings.theme == 'light' ? '#000000' : `#ffffff`;
}

function renderBackground(options, fontScale) {
	function x(x) {
		return Math.floor(
			(width / (24 - 0)) * (x - 0) * (options.sx ? options.sx : 1) +
				50 * sizeRatio * fontScale,
		);
	}

	function y(y) {
		return Math.floor(
			height -
				((y - options.yBoundBottom) /
					(options.yBoundTop - options.yBoundBottom)) *
					height,
		);
	}

	for (let i = 0; i <= 24; i++) {
		canvas.beginPath();

		const color = fromHex(
			i % 2 == 0 ? getBackgroundColor(0.02) : getBackgroundColor(0),
		);

		const skyGradient = canvas.createLinearGradient(
			x(i) - 50 * sizeRatio,
			0,
			x(i) - 50 * sizeRatio + x(i + 1) - x(i) + 1,
			0,
		);

		skyGradient.addColorStop(
			0,
			lerp(
				normalize(
					lerp('#0088ff', '#ff8800', Math.abs(i / 24 - 0.5) * 2),
				),
				color,
				0.7,
			),
		);
		skyGradient.addColorStop(
			1,
			lerp(
				normalize(
					lerp(
						'#0088ff',
						'#ff8800',
						Math.abs((i + 1) / 24 - 0.5) * 2,
					),
				),
				color,
				0.7,
			),
		);

		canvas.fillStyle = skyGradient;
		canvas.rect(
			x(i) - Math.floor(50 * sizeRatio),
			0,
			x(i + 1) - x(i) + 5,
			height,
		);

		canvas.fill();
		canvas.closePath();

		canvas.beginPath();

		const cloudsGradient = canvas.createLinearGradient(0, 0, 0, height);

		const alpha =
			i != 24 ? Math.floor((options.data[i].clouds / 100) * 255) : 0;

		cloudsGradient.addColorStop(
			0,
			lerp(
				normalize(
					lerp(`#0088ff`, getBackgroundColor(0.25), alpha / 255),
				),
				color,
				0.2,
			),
		);
		cloudsGradient.addColorStop(
			1,
			lerp(
				normalize(
					lerp(`#ffffff`, getBackgroundColor(0.25), alpha / 255),
				),
				color,
				0.2,
			) + alpha.toString(16).padStart(2, '0'),
		);

		canvas.fillStyle = cloudsGradient;
		canvas.rect(
			x(i) - Math.floor(50 * sizeRatio),
			0,
			x(i + 1) - x(i) + 5,
			height,
		);

		canvas.fill();
		canvas.closePath();
	}
}

export function plotWeather(options) {
	const start = options.rangeStart ? options.rangeStart : 0;
	const end = options.rangeEnd ? options.rangeEnd : 360;

	const step = options.step ? options.step : width <= 600 ? 3 : 1;
	const fontScale = step;
	const iconScale = (step - 1) * 0.5 + 1;

	function x(x) {
		return Math.floor(
			(width / (end - start)) *
				(x - start) *
				(options.sx ? options.sx : 1) +
				50 * sizeRatio * fontScale,
		);
	}

	function y(y) {
		return Math.floor(
			height -
				((y - options.yBoundBottom) /
					(options.yBoundTop - options.yBoundBottom)) *
					height,
		);
	}

	function colorFromTemperature(t) {
		return t >= 15
			? normalize(
					lerp(
						'#88ffcc',
						'#ff4400',
						Math.max(0, Math.min(1, (t - 15) / (40 - 15))),
					),
				)
			: normalize(
					lerp(
						'#0088ff',
						'#88ffcc',
						Math.max(0, Math.min(1, (t - 5) / (15 - 5))),
					),
				);
	}

	const currHour = getDate().hour;

	renderBackground(options, fontScale);

	if (options.isFirstDay) {
		for (let i = start; i < currHour; i++) {
			canvas.fillStyle = '#00000011';
			canvas.fillRect(x(i) - 50 * sizeRatio, 0, x(i + 1) - x(i), 1000);
		}

		canvas.fillStyle = getBackgroundColor(0.2);
		canvas.fillRect(
			x(currHour) - 50 * sizeRatio,
			0,
			x(currHour + 1) - x(currHour),
			1000,
		);
	}

	for (let i = start; i < end; i += step) {
		canvas.beginPath();

		const currTemp = options.data[i].temperature;
		const nextTemp =
			i + step != end ? options.data[i + step].temperature : 0;

		const currFeels = options.data[i].feelsLike;
		const nextFeels =
			i + step != end ? options.data[i + step].feelsLike : 0;

		const currClouds = options.data[i].clouds;
		const currRain = options.data[i].rain;

		const yCurrTemp = y(currTemp);
		const yNextTemp = y(nextTemp);

		const yCurrFeels = y(currFeels);
		const yNextFeels = y(nextFeels);

		const minY = options.feelsLikeEnabled
			? Math.max(yCurrTemp, yCurrFeels)
			: yCurrTemp;

		const maxY = options.feelsLikeEnabled
			? Math.min(yCurrTemp, yCurrFeels)
			: yCurrTemp;

		const minYNext = options.feelsLikeEnabled
			? Math.max(yNextTemp, yNextFeels)
			: yNextTemp;

		const maxYNext = options.feelsLikeEnabled
			? Math.min(yNextTemp, yNextFeels)
			: yNextTemp;

		if (currRain * 10 > 1) {
			canvas.fillStyle = '#0000ff44';
			canvas.fillRect(
				x(i) - 50 * sizeRatio,
				height - height * options.data[i].rain * 0.3,
				x(i + 1 * step) - x(i),
				height * options.data[i].rain * 0.3,
			);
		}

		canvas.strokeStyle = colorFromTemperature(currTemp);
		canvas.fillStyle = colorFromTemperature(currTemp);

		if (i + step != end) {
			canvas.moveTo(x(i), yCurrTemp);
			canvas.lineTo(x(i + step), yNextTemp);

			canvas.strokeStyle = colorFromTemperature(currFeels);
			canvas.fillStyle = colorFromTemperature(currFeels);

			if (options.feelsLikeEnabled) {
				canvas.moveTo(x(i), yCurrFeels);
				canvas.lineTo(x(i + step), yNextFeels);
			}
		}

		canvas.strokeStyle = colorFromTemperature(currTemp);
		canvas.fillStyle = toHex(
			// normalizeColor(
			lerp(colorFromTemperature(currTemp), '#ffffff', 1.0),
			// ),
		);

		canvas.font = `${Math.floor(20 * sizeRatio * fontScale)}px ${options.font}`;
		canvas.fillText(
			`${renderTime(i - start)}`,
			x(i) - 25 * sizeRatio * fontScale,
			maxY - 50 * sizeRatio * fontScale,
		);
		canvas.font = `${Math.floor(50 * sizeRatio * iconScale)}px ${options.font}`;
		canvas.fillText(
			`${getCloudIcon(currClouds, currRain > 0.3)}`,
			x(i) - 35 * sizeRatio * fontScale,
			maxY - 100 * sizeRatio * fontScale,
		);

		canvas.font = `${Math.floor(40 * sizeRatio * fontScale)}px ${options.font}`;
		canvas.fillText(
			`${renderTemperature(currTemp)}`,
			x(i) - 25 * sizeRatio * fontScale,
			minY + 50 * sizeRatio * fontScale,
		);

		canvas.fill();
		canvas.stroke();

		canvas.fillStyle = colorFromTemperature(currTemp);

		if (options.feelsLikeEnabled) {
			canvas.font = `${Math.floor(20 * sizeRatio * fontScale)}px ${options.font}`;
			canvas.fillText(
				'feels',
				x(i) - 25 * sizeRatio * fontScale,
				minY + 80 * sizeRatio * fontScale,
			);
			canvas.fillText(
				'like',
				x(i) - 17 * sizeRatio * fontScale,
				minY + 110 * sizeRatio * fontScale,
			);

			canvas.font = `${Math.floor(30 * sizeRatio * fontScale)}px ${options.font}`;
			canvas.fillText(
				`${renderTemperature(currFeels)}`,
				x(i) - 22 * fontScale * sizeRatio,
				minY + 150 * fontScale * sizeRatio,
			);

			canvas.fill();
			canvas.stroke();

			if (currRain >= 0.25) {
				let temp = canvas.fillStyle;

				canvas.fillStyle = 'dodgerblue';

				canvas.font = `${Math.floor(30 * sizeRatio * fontScale)}px ${options.font}`;
				canvas.fillText(
					`💧${Math.min(100, Math.max(0, Math.round(currRain * 100)))}%`,
					x(i) - 50 * fontScale * sizeRatio,
					minY + 190 * fontScale * sizeRatio,
				);

				canvas.fill();
				canvas.stroke();

				canvas.fillStyle = temp;
			}
		} else if (currRain >= 0.25) {
			let temp = canvas.fillStyle;
			canvas.fillStyle = 'dodgerblue';

			canvas.font = `${Math.floor(30 * sizeRatio * fontScale)}px ${options.font}`;
			canvas.fillText(
				`💧${Math.min(100, Math.max(0, Math.round(currRain * 100)))}%`,
				x(i) - 50 * fontScale * sizeRatio,
				minY + 110 * fontScale * sizeRatio,
			);

			canvas.fill();
			canvas.stroke();

			canvas.fillStyle = temp;
		}

		if (options.feelsLikeEnabled && i + step != end) {
			canvas.beginPath();

			const grad = canvas.createLinearGradient(
				x(i) * 0.5 + x(i + step) * 0.5,
				maxYNext * 0.5 + maxYNext * 0.5,
				x(i) * 0.5 + x(i + step) * 0.5,
				minY * 0.5 + minYNext * 0.5,
			);
			grad.addColorStop(
				0,
				colorFromTemperature(
					Math.max(currTemp, currFeels) * 0.5 +
						Math.max(nextTemp, nextFeels) * 0.5,
				) + '88',
			);
			grad.addColorStop(
				1,
				colorFromTemperature(
					Math.min(currTemp, currFeels) * 0.5 +
						Math.min(nextTemp, nextFeels) * 0.5,
				) + '88',
			);

			canvas.fillStyle = grad;

			canvas.moveTo(x(i), yCurrTemp);
			canvas.lineTo(x(i + step), yNextTemp);
			canvas.lineTo(x(i + step), yNextFeels);
			canvas.lineTo(x(i), yCurrFeels);
			canvas.lineTo(x(i), yCurrTemp);

			canvas.fill();
		}
	}

	canvas.strokeStyle = options.color ? options.color : 'black';
	canvas.stroke();

	for (let i = start; i < end; i += step) {
		canvas.fillStyle = colorFromTemperature(options.data[i].temperature);

		canvas.beginPath();

		canvas.arc(
			x(i),
			y(options.data[i].temperature),
			5 * sizeRatio,
			0,
			Math.PI * 2,
		);

		if (options.feelsLikeEnabled) {
			canvas.arc(
				x(i),
				y(options.data[i].feelsLike),
				5 * sizeRatio,
				0,
				Math.PI * 2,
			);
		}

		canvas.fill();
	}
}

export function loadingSpinner() {
	showSpinner(canvas, width, height, time++, sizeRatio);
}
