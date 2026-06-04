import { plot } from './graphics.js';
import { smooth } from './math.js';

const quantizationScale = 2;

export function predictWithHistory(data, steps) {
	let residual = [...data];

	const bands = [];

	const scales = [20, 1];

	for (const scale of scales) {
		const low = smooth(residual, scale ** 3);

		const band = residual.map((x, i) => x - low[i]);

		bands.push(band);

		residual = low;
	}

	bands.push(residual);

	const predictedBands = bands.map((band) => makePrediction(band, steps));

	let layeredPrediction = new Array(steps).fill(0);

	for (let b = 0; b < predictedBands.length; b++) {
		const interpolated = interpolatePrediction(predictedBands[b], steps);

		for (let i = 0; i < steps; i++) {
			layeredPrediction[i] += interpolated[i];
		}
	}

	layeredPrediction = smooth(layeredPrediction, 4);

	const result = [];

	for (let i = 0; i < data.length; i++) result.push(data[i]);

	// const layeredPrediction = new Array(steps).fill(0);

	// const prev = new Array(steps).fill(0);

	// for (let level = 12; level > 0; level--) {
	// 	const prediction = makePrediction(
	// 		data.map((x, i) => x - prev[i]).filter((_, i) => i % level === 0),
	// 		steps / level,
	// 		data,
	// 		steps,
	// 	);

	// 	for (let j = 0; j < interpolated.length; j++)
	// 		prev[j] += interpolated[j];

	// 	const interpolated = interpolatePrediction(prediction, steps);

	// 	for (let j = 0; j < interpolated.length; j++) {
	// 		layeredPrediction[j] += interpolated[j] * (1 / 12);
	// 	}
	// }

	// console.log(layeredPrediction);

	for (let i = 0; i < layeredPrediction.length; i++) {
		if (i < 20) {
			let pred = (layeredPrediction[i] * (i / 20) ** 2) / 1.0;
			result.push((1 - i / 20) * data[data.length - 1] + (i / 20) * pred);
		} else {
			result.push(layeredPrediction[i]);
		}
	}

	return result;
}

function interpolatePrediction(prediction, steps) {
	const result = [];

	const stepsPerPrediction = steps / prediction.length;

	for (let i = 0; i < steps; i++) {
		const prevIndex = Math.floor(i / stepsPerPrediction);
		const nextIndex = prevIndex + 1;

		const projectedPrevI = prevIndex * stepsPerPrediction;
		const projectedNextI = nextIndex * stepsPerPrediction;

		const ratio = smoothInterpolation(
			(i - projectedPrevI) / (projectedNextI - projectedPrevI),
		);

		const readingA = prediction[prevIndex];
		const readingB = prediction[nextIndex];

		const interpolated = (1 - ratio) * readingA + ratio * readingB;

		result.push(interpolated);
	}

	return result;
}

function smoothInterpolation(value) {
	// return value;
	return -(Math.cos(Math.PI * value) - 1) / 2;
}

function getTransitionProbability(markov, from, to) {
	// console.log('From ' + from + ' to ' + to);

	const offset = to - from;

	const fromScaled = from * quantizationScale;
	const offsetScaled = offset * quantizationScale;

	const fromBottom = Math.floor(fromScaled) + 40 * quantizationScale;
	const fromUpper = Math.ceil(fromScaled) + 40 * quantizationScale;

	if (
		fromBottom < 0 ||
		fromUpper < 0 ||
		fromBottom >= 80 * quantizationScale ||
		fromUpper >= 80 * quantizationScale
	)
		return 0;

	const offsetBottom = Math.floor(offsetScaled) + 20 * quantizationScale;
	const offsetUpper = Math.ceil(offsetScaled) + 20 * quantizationScale;

	const fromFrac = smoothInterpolation(fromScaled - Math.floor(fromScaled));
	const offsetFrac = smoothInterpolation(
		offsetScaled - Math.floor(offsetScaled),
	);

	const probabilityBB = markov[fromBottom][offsetBottom];
	const probabilityBU = markov[fromBottom][offsetUpper];

	const probabilityB =
		(1 - offsetFrac) * probabilityBB + offsetFrac * probabilityBU;

	const probabilityUB = markov[fromUpper][offsetBottom];
	const probabilityUU = markov[fromUpper][offsetUpper];

	const probabilityU =
		(1 - offsetFrac) * probabilityUB + offsetFrac * probabilityUU;

	const probability = (1 - fromFrac) * probabilityB + fromFrac * probabilityU;

	return probability;
}

function constructMarkov(data) {
	const markov = new Array(80 * quantizationScale);

	for (let i = 0; i < 80 * quantizationScale; i++)
		markov[i] = new Array(40 * quantizationScale).fill(0);

	for (let i = 0; i < data.length - 1; i++) {
		const bucketIndex =
			Math.floor(data[i] * quantizationScale) + 40 * quantizationScale;
		const offsetQuantized =
			Math.floor((data[i + 1] - data[i]) * quantizationScale) +
			20 * quantizationScale;

		markov[bucketIndex][offsetQuantized]++;
	}

	for (let i = 0; i < 80 * quantizationScale; i++) {
		let sum = 0;

		for (let j = 0; j < 40 * quantizationScale; j++) {
			sum += markov[i][j];
			markov[i][j] = sum;
		}
	}

	for (let i = 0; i < 80 * quantizationScale; i++) {
		let sum = markov[i][40 * quantizationScale - 1];

		if (sum === 0) continue;

		for (let j = 0; j < 40 * quantizationScale; j++) {
			markov[i][j] /= sum;
		}
	}

	console.log(markov);
	return markov;
}

function predictNext(markov, previous) {
	const random = Math.random();

	let current = previous;

	let middle = getTransitionProbability(markov, previous, current);

	let left = 0;
	let right = 39;

	let steps = 0;

	while (Math.abs(middle - random) > 0.05) {
		steps++;

		if (steps > 1000) return current;

		if (middle < random) left = current;
		else if (middle > random) right = current;

		current = 0.5 * left + 0.5 * right;
		middle = getTransitionProbability(markov, previous, current);
	}

	return current;

	// console.log(
	// 	getTransitionProbability(markov, previous, current) +
	// 		', REQUIRED: ' +
	// 		random,
	// );

	// while (
	// 	getTransitionProbability(markov, previous + tension * 0.0, current) <
	// 	random
	// ) {
	// 	// console.log(
	// 	// 	getTransitionProbability(markov, previous, current) +
	// 	// 		', REQUIRED: ' +
	// 	// 		random,
	// 	// );
	// 	current += 0.1;
	// }

	// return [current, tension];
}

function makePrediction(data, steps) {
	const markov = constructMarkov(data);

	// for (let t = -10; t <= 30; t += 0.1) {
	// 	const distribution = new Array(20).fill(0);

	// 	for (let i = 0; i < 2000; i++) {
	// 		// distribution[i] = smoothInterpolation(i / 2000.0);

	// 		distribution[i] = getTransitionProbability(
	// 			markov,
	// 			t,
	// 			t + i / 200.0 - 5,
	// 		);
	// 	}

	// 	plot(distribution, 0, 2000, 0, 1);
	// }

	let average = 0;

	for (let i = data.length - 100; i < data.length; i++) {
		average += data[i];
	}

	average /= 100;

	const result = new Array(Math.floor(steps)).fill(0);

	for (let k = 0; k < 20; k++) {
		let last = data[data.length - 1];

		let velocity = 0;

		for (let i = 0; i < steps; i++) {
			const curr = predictNext(markov, last);

			velocity += -(0.1 * (curr - average));
			velocity *= 0.9;

			const currPrediction = curr + velocity;

			result[i] += currPrediction;

			last = currPrediction;
		}
	}

	for (let i = 0; i < steps; i++) result[i] /= 20;

	return result;
}
