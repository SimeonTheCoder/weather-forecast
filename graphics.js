export const canvas = document.querySelector('canvas').getContext('2d');

export function clear() {
	canvas.clearRect(0, 0, 10000, 10000);
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

	const width = document.querySelector('canvas').width;
	const height = document.querySelector('canvas').height;

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

export function plotTemperature(
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

	const width = document.querySelector('canvas').width;
	const height = document.querySelector('canvas').height;

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

		canvas.font = '20px Arial';

		canvas.strokeText(
			`${Math.floor(i - start)}:00`,
			x(i) - 25,
			y(data[i]) - 50,
		);

		canvas.font = '40px Arial';

		canvas.strokeText(
			`${Math.floor(data[i])}°`,
			x(i) - 25,
			y(data[i]) + 50,
		);
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

	for (let i = start; i < end - 1; i++) {
		canvas.beginPath();
		canvas.arc(x(i), y(data[i]), 5, 0, Math.PI * 2);
		canvas.fill();
	}

	canvas.fill();
}
