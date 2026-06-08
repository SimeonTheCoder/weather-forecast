import { toHex, fromHex, lerp, normalize } from './color-utils.js';

const size = 0.2;

function t(x) {
	// return x * x * (3 - 2 * x);
	return x;
}

export function showSpinner(ctx, width, height, time, scaling) {
	// ctx.clearRect(0, 0, width, height);
	const circles = 8;

	const angle = 360 / circles;
	const speed = 0.1;

	for (let i = 1; i <= circles; i++) {
		ctx.beginPath();

		const x = Math.cos(((i * angle) / 180 - time * speed * 0.25) * Math.PI);
		const y = Math.sin(((i * angle) / 180 - time * speed * 0.25) * Math.PI);

		const circleSize = t(
			Math.max(0, Math.sin(time * speed + ((i * angle) / 180) * Math.PI)),
		);
		// const size = (i / circles) ** 2;

		ctx.fillStyle = 'coral';

		ctx.arc(
			width / 2 + x * size * 300 * scaling,
			height / 2 + y * 300 * size * scaling,
			circleSize * 100 * size * scaling,
			0,
			2 * Math.PI,
		);
		ctx.fill();
	}
}
