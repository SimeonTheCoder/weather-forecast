// document.querySelector('canvas').width = document.body.width;
// document.querySelector('canvas').height = document.body.height / 2;

import {
	normalizeColor,
	hexToColor,
	colorToHex,
	lerpColors,
} from './color-utils.js';
import { getDate } from './date.js';
import { settings } from './settings.js';

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
		r: hexToColor(color).r + direction * change,
		g: hexToColor(color).g + direction * change,
		b: hexToColor(color).b + direction * change,
	};

	return colorToHex(result);
}

export function getForegroundColor() {
	return settings.theme == 'light' ? '#000000' : `#ffffff`;
}

export function plot(
	data,
	rangeStart,
	rangeEnd,
	yBoundBottom,
	yBoundTop,
	color,
	sx,
	grid,
) {
	const start = rangeStart ? rangeStart : 0;
	const end = rangeEnd ? rangeEnd : 360;

	function x(x) {
		return (width / (end - start)) * (x - start) * (sx ? sx : 1);
	}

	function y(y) {
		return (
			height - ((y - yBoundBottom) / (yBoundTop - yBoundBottom)) * height
		);
	}

	canvas.beginPath();

	for (let i = start; i < end - 1; i++) {
		canvas.moveTo(x(i), y(data[i]));
		canvas.lineTo(x(i + 1), y(data[i + 1]));
	}

	if (grid) {
		for (let i = -100; i < 100; i += 10) {
			canvas.moveTo(x(start), y(i));
			canvas.lineTo(x(end), y(i));
		}

		for (let i = -10; i < 10000; i += 24) {
			canvas.moveTo(x(i + 12), y(yBoundTop));
			canvas.lineTo(x(i + 12), y(yBoundBottom));
		}
	}

	canvas.strokeStyle = color ? color : 'black';
	canvas.stroke();
}

export function plotWeather(options) {
	const start = options.rangeStart ? options.rangeStart : 0;
	const end = options.rangeEnd ? options.rangeEnd : 360;

	const step = options.step ? options.step : width <= 600 ? 3 : 1;
	const fontScale = step;
	const iconScale = (step - 1) * 0.5 + 1;

	function x(x) {
		return (
			(width / (end - start)) *
				(x - start) *
				(options.sx ? options.sx : 1) +
			50 * sizeRatio * fontScale
		);
	}

	function y(y) {
		return (
			height -
			((y - options.yBoundBottom) /
				(options.yBoundTop - options.yBoundBottom)) *
				height
		);
	}

	function colorFromTemperature(t) {
		return t >= 15
			? colorToHex(
					normalizeColor(
						lerpColors(
							hexToColor('888888'),
							hexToColor('ff0000'),
							(t - 15) / (40 - 15),
						),
					),
				)
			: colorToHex(
					normalizeColor(
						lerpColors(
							hexToColor('0000ff'),
							hexToColor('888888'),
							Math.max(0, Math.min(1, (t - 5) / (15 - 5))),
						),
					),
				);
	}

	const currHour = getDate().hour;

	for (let i = start; i <= end; i++) {
		canvas.fillStyle =
			i % 2 == 0 ? getBackgroundColor(0.05) : getBackgroundColor(0);
		canvas.fillRect(x(i) - 50 * sizeRatio, 0, x(i + 1) - x(i), 1000);
	}

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

		const xCurr = x(i);
		const xNext = x(i + step);

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

		if (currRain * 10 > 1) {
			canvas.fillStyle = '#0000ff44';
			canvas.fillRect(
				x(i) - 50 * sizeRatio,
				height - height * options.data[i].rain * 0.3,
				x(i + 1 * step) - x(i),
				height * options.data[i].rain * 0.3,
			);
			// canvas.font = `${Math.floor(20 * sizeRatio * fontScale)}px ${options.font}`;
			// canvas.fillText(
			// 	`${currRain.toFixed(1)} mm`,
			// 	xCurr - 35 * sizeRatio * fontScale,
			// 	height -
			// 		height * options.data[i].rain * 0.3 -
			// 		35 * sizeRatio * fontScale,
			// );
		}

		canvas.strokeStyle = colorFromTemperature(currTemp);
		canvas.fillStyle = colorFromTemperature(currTemp);

		if (i + step != end) {
			canvas.moveTo(xCurr, yCurrTemp);
			canvas.lineTo(xNext, yNextTemp);

			if (options.feelsLikeEnabled) {
				canvas.moveTo(xCurr, yCurrFeels);
				canvas.lineTo(xNext, yNextFeels);
			}
		}

		canvas.font = `${Math.floor(20 * sizeRatio * fontScale)}px ${options.font}`;
		canvas.fillText(
			`${renderTime(i - start)}`,
			xCurr - 25 * sizeRatio * fontScale,
			maxY - 50 * sizeRatio * fontScale,
		);
		canvas.font = `${Math.floor(50 * sizeRatio * iconScale)}px ${options.font}`;
		canvas.fillText(
			`${getCloudIcon(currClouds, currRain > 0.3)}`,
			xCurr - 35 * sizeRatio * fontScale,
			maxY - 100 * sizeRatio * fontScale,
		);

		canvas.font = `${Math.floor(40 * sizeRatio * fontScale)}px ${options.font}`;
		canvas.fillText(
			`${renderTemperature(currTemp)}`,
			xCurr - 25 * sizeRatio * fontScale,
			minY + 50 * sizeRatio * fontScale,
		);

		canvas.fill();
		canvas.stroke();

		if (options.feelsLikeEnabled) {
			canvas.font = `${Math.floor(20 * sizeRatio * fontScale)}px ${options.font}`;
			canvas.fillText(
				'feels',
				xCurr - 25 * sizeRatio * fontScale,
				minY + 80 * sizeRatio * fontScale,
			);
			canvas.fillText(
				'like',
				xCurr - 17 * sizeRatio * fontScale,
				minY + 110 * sizeRatio * fontScale,
			);

			canvas.font = `${Math.floor(30 * sizeRatio * fontScale)}px ${options.font}`;
			canvas.fillText(
				`${renderTemperature(currFeels)}`,
				xCurr - 22 * fontScale * sizeRatio,
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
					xCurr - 50 * fontScale * sizeRatio,
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
				xCurr - 50 * fontScale * sizeRatio,
				minY + 110 * fontScale * sizeRatio,
			);

			canvas.fill();
			canvas.stroke();

			canvas.fillStyle = temp;
		}

		// canvas.fill();
		// canvas.stroke();

		if (options.feelsLikeEnabled && i + step != end) {
			canvas.beginPath();

			canvas.moveTo(xCurr, yCurrTemp);
			canvas.lineTo(xNext, yNextTemp);
			canvas.lineTo(xNext, yNextFeels);
			canvas.lineTo(xCurr, yCurrFeels);
			canvas.lineTo(xCurr, yCurrTemp);

			canvas.fillStyle += '88';
		}

		canvas.fill();
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
		if (options.feelsLikeEnabled)
			canvas.arc(
				x(i),
				y(options.data[i].feelsLike),
				5 * sizeRatio,
				0,
				Math.PI * 2,
			);

		canvas.fill();
	}

	// canvas.fill();
}
