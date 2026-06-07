import { plot } from './graphics.js';
import { smooth } from './math.js';

const quantizationScale = 2;

export function predictWithHistory(
	data,
	steps,
	rangeLower,
	rangeUpper,
	precisionLower,
	precisionUpper,
	useOctaves,
) {
	let residual = [...data];

	const bands = [];

	if (useOctaves) {
		const scales = [20, 1];

		for (const scale of scales) {
			const low = smooth(residual, scale ** 3);

			const band = residual.map((x, i) => x - low[i]);

			bands.push(band);

			residual = low;
		}
	}

	bands.push(residual);

	const predictedBands = bands.map((band) =>
		makePrediction(
			band,
			steps,
			rangeLower,
			rangeUpper,
			precisionLower,
			precisionUpper,
		),
	);

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

	const smoothingThreshold = 20;

	for (let i = 0; i < layeredPrediction.length; i++) {
		if (i >= smoothingThreshold) {
			result.push(layeredPrediction[i]);
			continue;
		}

		let pred = (layeredPrediction[i] * (i / smoothingThreshold) ** 2) / 1.0;
		result.push(
			(1 - i / smoothingThreshold) * data[data.length - 1] +
				(i / smoothingThreshold) * pred,
		);
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
	return -(Math.cos(Math.PI * value) - 1) / 2;
}

function getTransitionProbability(
	markov,
	from,
	to,
	rangeLower,
	rangeUpper,
	precisionLower,
	precisionUpper,
) {
	const offset = to - from;

	const fromBottom = Math.floor(
		convertToSpace(from, rangeLower, rangeUpper, quantizationScale),
	);

	const fromUpper = Math.ceil(
		convertToSpace(offset, rangeLower, rangeUpper, quantizationScale),
	);

	if (
		fromBottom < 0 ||
		fromUpper < 0 ||
		fromBottom >= (rangeUpper - rangeLower) * quantizationScale ||
		fromUpper >= (rangeUpper - rangeLower) * quantizationScale
	)
		return 0;

	const offsetBottom = Math.floor(
		convertToSpace(
			offset,
			precisionLower,
			precisionUpper,
			quantizationScale,
		),
	);
	const offsetUpper = Math.ceil(
		convertToSpace(
			offset,
			precisionLower,
			precisionUpper,
			quantizationScale,
		),
	);

	const fromFrac = smoothInterpolation(
		from * quantizationScale - Math.floor(from * quantizationScale),
	);

	const offsetFrac = smoothInterpolation(
		offset * quantizationScale - Math.floor(offset * quantizationScale),
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

function convertToSpace(x, lower, upper, quantizationScale) {
	// const distanceFromLowerBound = x - lower;
	return (x - lower) * quantizationScale;
}

function constructMarkov(
	data,
	rangeLower,
	rangeUpper,
	precisionLower,
	precisionUpper,
) {
	const rangeSpan = rangeUpper - rangeLower;
	const precisionSpan = precisionUpper - precisionLower;

	const markov = new Array(rangeSpan * quantizationScale);

	for (let i = 0; i < rangeSpan * quantizationScale; i++)
		markov[i] = new Array(precisionSpan * quantizationScale).fill(0);

	for (let i = 0; i < data.length - 1; i++) {
		const bucketIndex = Math.floor(
			convertToSpace(data[i], rangeLower, rangeUpper, quantizationScale),
		);

		const offsetQuantized = Math.floor(
			convertToSpace(
				data[i + 1] - data[i],
				precisionLower,
				precisionUpper,
				quantizationScale,
			),
		);

		markov[bucketIndex][offsetQuantized]++;
	}

	for (let i = 0; i < rangeSpan * quantizationScale; i++) {
		let sum = 0;

		for (let j = 0; j < precisionSpan * quantizationScale; j++) {
			sum += markov[i][j];
			markov[i][j] = sum;
		}
	}

	for (let i = 0; i < rangeSpan * quantizationScale; i++) {
		let sum = markov[i][precisionSpan * quantizationScale - 1];

		if (sum === 0) continue;

		for (let j = 0; j < precisionSpan * quantizationScale; j++) {
			markov[i][j] /= sum;
		}
	}

	return markov;
}

function predictNext(
	markov,
	previous,
	rangeLower,
	rangeUpper,
	precisionLower,
	precisionUpper,
) {
	const random = Math.random();

	let current = previous;

	let middle = getTransitionProbability(
		markov,
		previous,
		current,
		rangeLower,
		rangeUpper,
		precisionLower,
		precisionUpper,
	);

	let left = 0;
	let right = markov[0].length;

	let steps = 0;

	while (Math.abs(middle - random) > 0.05) {
		steps++;

		if (steps > 1000) return current;

		if (middle < random) left = current;
		else if (middle > random) right = current;

		current = 0.5 * left + 0.5 * right;
		middle = getTransitionProbability(
			markov,
			previous,
			current,
			rangeLower,
			rangeUpper,
			precisionLower,
			precisionUpper,
		);
	}

	return current;
}

function makePrediction(
	data,
	steps,
	rangeLower,
	rangeUpper,
	precisionLower,
	precisionUpper,
) {
	const markov = constructMarkov(
		data,
		rangeLower,
		rangeUpper,
		precisionLower,
		precisionUpper,
	);

	let average = 0;

	for (let i = data.length - 100; i < data.length; i++) {
		average += data[i];
	}

	average /= 100;

	const result = new Array(Math.floor(steps)).fill(0);

	for (let k = 0; k < 200; k++) {
		let last = data[data.length - 1];

		let velocity = 0;

		for (let i = 0; i < steps; i++) {
			const curr = predictNext(
				markov,
				last,
				rangeLower,
				rangeUpper,
				precisionLower,
				precisionUpper,
			);

			velocity += -(0.1 * (curr - average));
			velocity *= 0.9;

			const currPrediction = curr + velocity;

			result[i] += currPrediction;

			last = currPrediction;
		}
	}

	for (let i = 0; i < steps; i++) result[i] /= 200;

	return result;
}
