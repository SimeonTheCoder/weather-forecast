import { plot } from './graphics.js';
import {
	fourierTransform,
	generateArr,
	inverseFourierTransform,
	smooth,
	taylorSeries,
} from './math.js';

export function predict(data) {
	const sampleCount = data.length;

	const fourierWindowSize = 100;

	const frequencyMagnitudeEvolution = Array.from(
		{ length: fourierWindowSize },
		() => [],
	);
	const frequencyPhaseEvolution = Array.from(
		{ length: fourierWindowSize },
		() => [],
	);

	for (let i = 0; i < sampleCount - fourierWindowSize; i++) {
		const currData = [];

		for (let j = 0; j < fourierWindowSize; j++) {
			const w =
				0.5 *
				(1 - Math.cos((2 * Math.PI * j) / (fourierWindowSize - 1))); // Hann window
			currData.push(data[i + j] * w);
		}

		const currFrequencies = fourierTransform(currData);

		for (let j = 0; j < fourierWindowSize; j++) {
			frequencyMagnitudeEvolution[j].push(currFrequencies.magnitude[j]);
			frequencyPhaseEvolution[j].push(currFrequencies.phase[j]);
		}
	}

	const snapshots = Array.from({ length: 20 }, () => ({
		magnitude: [],
		phase: [],
	}));

	for (let i = 0; i < fourierWindowSize; i++) {
		const prediction = generateArr(
			taylorSeries(
				smooth(frequencyMagnitudeEvolution[i], 5),
				sampleCount - fourierWindowSize - 10,
			),
			sampleCount - fourierWindowSize + 10,
		).slice(sampleCount - fourierWindowSize);

		const phasePrediction = generateArr(
			taylorSeries(
				smooth(frequencyPhaseEvolution[i], 5),
				sampleCount - fourierWindowSize - 10,
			),
			sampleCount - fourierWindowSize + 10,
		).slice(sampleCount - fourierWindowSize);

		plot(prediction, 0, 360, -10, 10);

		for (let j = 0; j < prediction.length; j++) {
			snapshots[j].magnitude.push(prediction[j]);
			snapshots[j].phase.push(phasePrediction[j]);
			// snapshots[j].phase.push(
			// 	frequencyPhaseEvolution[i][
			// 		frequencyPhaseEvolution[i].length - 1
			// 	] +
			// 		j * 0.1,
			// );
		}
	}

	let finalAdditions = [];

	for (let i = 0; i < 20; i++) {
		finalAdditions.push(
			inverseFourierTransform(
				snapshots[i],
				20,
				fourierWindowSize,
				sampleCount - 20,
			)[i] + data[data.length - 1],
		);
	}

	finalAdditions = smooth(finalAdditions, 2);

	const prediction = [];

	for (let i = 0; i < data.length; i++) {
		prediction.push(data[i]);
	}

	for (let i = 0; i < 20; i++) {
		prediction.push(finalAdditions[i]);
	}

	return prediction;
}
