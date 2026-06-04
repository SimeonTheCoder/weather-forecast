// document.querySelector('canvas').width = document.body.width;
// document.querySelector('canvas').height = document.body.height / 2;

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

function hexToColor(hex) {
	const rBits = hex.slice(1, 3);
	const gBits = hex.slice(3, 5);
	const bBits = hex.slice(5, 7);

	const r = parseInt(rBits, 16) / 255.0;
	const g = parseInt(gBits, 16) / 255.0;
	const b = parseInt(bBits, 16) / 255.0;

	return {
		r,
		g,
		b,
	};
}

function colorToHex(color) {
	const rBits = Math.floor(color.r * 255)
		.toString(16)
		.padStart(2, '0');
	const gBits = Math.floor(color.g * 255)
		.toString(16)
		.padStart(2, '0');
	const bBits = Math.floor(color.b * 255)
		.toString(16)
		.padStart(2, '0');

	return `#${rBits}${gBits}${bBits}`;
}

function lerpColors(colA, colB, t) {
	return {
		r: colA.r * (1 - t) + colB.r * t,
		g: colA.g * (1 - t) + colB.g * t,
		b: colA.b * (1 - t) + colB.b * t,
	};
}

function normalizeColor(col) {
	const l = Math.sqrt(col.r * col.r + col.g * col.g + col.b * col.b);

	return {
		r: col.r / l,
		g: col.g / l,
		b: col.b / l,
	};
}

export function plotTemperature(options) {
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

	canvas.beginPath();

	for (let i = start; i < end - 1; i++) {
		canvas.moveTo(x(i), y(options.data[i]));
		canvas.lineTo(x(i + 1), y(options.data[i + 1]));

		canvas.font = '20px Arial';

		canvas.strokeText(
			`${Math.floor(i - start)}:00`,
			x(i) - 25,
			y(options.data[i]) - 50,
		);

		canvas.font = '40px Arial';

		canvas.strokeText(
			`${Math.round(options.data[i])}°`,
			x(i) - 25,
			y(options.data[i]) + 50,
		);
	}

	if (options.grid) {
		for (let i = -100; i < 100; i += 10) {
			canvas.moveTo(x(start), y(i));
			canvas.lineTo(x(end), y(i));
		}

		for (let i = -10; i < 10000; i += 24) {
			canvas.moveTo(x(i + 12), y(options.yBoundTop));
			canvas.lineTo(x(i + 12), y(options.yBoundBottom));
		}
	}

	canvas.strokeStyle = options.color ? options.color : 'black';
	canvas.stroke();

	for (let i = start; i < end - 1; i++) {
		canvas.fillStyle =
			options.data[i] >= 15
				? colorToHex(
						normalizeColor(
							lerpColors(
								hexToColor('888888'),
								hexToColor('ff0000'),
								(options.data[i] - 15) / (40 - 15),
							),
						),
					)
				: colorToHex(
						normalizeColor(
							lerpColors(
								hexToColor('0000ff'),
								hexToColor('888888'),
								(options.data[i] - -40) / (15 - -40),
							),
						),
					);

		// canvas.fillStyle = colorToHex(
		// 	normalizeColor(
		// 		lerpColors(
		// 			hexToColor('0000ff'),
		// 			hexToColor('ff0000'),
		// 			(data[i] - 15) / (40 - 15),
		// 		),
		// 	),
		// );

		canvas.beginPath();
		canvas.arc(x(i), y(options.data[i]), 5, 0, Math.PI * 2);
		canvas.fill();
	}

	// canvas.fill();
}
