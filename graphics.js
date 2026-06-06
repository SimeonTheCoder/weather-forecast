// document.querySelector('canvas').width = document.body.width;
// document.querySelector('canvas').height = document.body.height / 2;

import {
	normalizeColor,
	hexToColor,
	colorToHex,
	lerpColors,
} from './color-utils.js';

const canvasElement = document.querySelector('canvas');

const dimensions = canvasElement.getBoundingClientRect();
const dpr = window.devicePixelRatio || 1;

export const width = dimensions.width * dpr;
export const height = dimensions.height * dpr;

canvasElement.width = width;
canvasElement.height = height;

export const canvas = document.querySelector('canvas').getContext('2d');
canvas.scale(dpr, dpr);

export function clear() {
	canvas.clearRect(0, 0, width, height);
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

	console.log(grid);

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

	function x(x) {
		return (
			(width / (end - start)) *
				(x - start) *
				(options.sx ? options.sx : 1) +
			50
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

	for (let i = start; i < end - 1; i++) {
		canvas.beginPath();

		const currTemp = options.data[i].temperature;
		const nextTemp = options.data[i + 1].temperature;

		const currFeels = options.data[i].feelsLike;
		const nextFeels = options.data[i + 1].feelsLike;

		const xCurr = x(i);
		const xNext = x(i + 1);

		const yCurrTemp = y(currTemp);
		const yNextTemp = y(nextTemp);

		const yCurrFeels = y(currFeels);
		const yNextFeels = y(nextFeels);

		canvas.strokeStyle = colorFromTemperature(currTemp);
		canvas.fillStyle = colorFromTemperature(currTemp);

		const minY = options.feelsLikeEnabled
			? Math.max(yCurrTemp, yCurrFeels)
			: yCurrTemp;

		const maxY = options.feelsLikeEnabled
			? Math.min(yCurrTemp, yCurrFeels)
			: yCurrTemp;

		canvas.moveTo(xCurr, yCurrTemp);
		canvas.lineTo(xNext, yNextTemp);

		if (options.feelsLikeEnabled) {
			canvas.moveTo(xCurr, yCurrFeels);
			canvas.lineTo(xNext, yNextFeels);
		}

		canvas.font = '20px Arial';
		canvas.fillText(`${Math.floor(i - start)}:00`, xCurr - 25, maxY - 50);

		canvas.font = '40px Arial';
		canvas.fillText(`${Math.round(currTemp)}°`, xCurr - 25, minY + 50);

		if (options.feelsLikeEnabled) {
			canvas.font = '20px Arial';
			canvas.fillText('feels', xCurr - 25, minY + 80);
			canvas.fillText('like', xCurr - 17, minY + 110);

			canvas.font = '30px Arial';
			canvas.fillText(
				`${Math.round(currFeels)}°`,
				xCurr - 22,
				minY + 150,
			);
		}

		canvas.fill();
		canvas.stroke();

		if (options.feelsLikeEnabled) {
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

	for (let i = start; i < end - 1; i++) {
		canvas.fillStyle = colorFromTemperature(options.data[i].temperature);

		canvas.beginPath();

		canvas.arc(x(i), y(options.data[i].temperature), 5, 0, Math.PI * 2);
		if (options.feelsLikeEnabled)
			canvas.arc(x(i), y(options.data[i].feelsLike), 5, 0, Math.PI * 2);

		canvas.fill();
	}

	// canvas.fill();
}
