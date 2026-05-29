export function derivativePoint(data, i) {
	const n = data.length;

	if (i === 0) return data[1] - data[0];
	if (i === n - 1) return data[n - 1] - data[n - 2];

	return 0.5 * (data[i + 1] - data[i - 1]);
}

// export function derivativePoint(data, i) {
// 	const n = data.length;

// 	// boundary handling (keep it simple but stable)
// 	if (i === 0) return data[1] - data[0];
// 	if (i === n - 1) return data[n - 1] - data[n - 2];

// 	if (i === 1 || i === n - 2) {
// 		// slightly asymmetric smoothing near edges
// 		return (
// 			(data[i + 1] - data[i - 1]) * 0.5 +
// 			(data[i + 1] - data[i]) * 0.25 -
// 			(data[i] - data[i - 1]) * 0.25
// 		);
// 	}

// 	// smooth 5-point derivative stencil (VERY stable)
// 	return (
// 		(-data[i - 2] + 8 * data[i - 1] - 8 * data[i + 1] + data[i + 2]) / 12
// 	);
// }

export function derivativeFull(data) {
	const copy = [0];

	for (let i = 1; i < data.length - 1; i++) {
		copy.push(derivativePoint(data, i));
	}

	copy.push(0);

	return copy;
}

export function fact(n) {
	if (n == 0 || n == 1) return 1;
	return n * fact(n - 1);
}

export function taylorSeries(data, point) {
	const derivatives = [data];

	for (let i = 1; i < 10; i++) {
		derivatives.push(derivativeFull(derivatives[i - 1]));
	}

	return (x) => {
		let result = data[point];

		for (let i = 1; i < derivatives.length; i++) {
			result += ((x - point) ** i * derivatives[i][point]) / fact(i);
		}

		return result;
	};
}

export function fourierTransform(data, sampleCount = data.length) {
	const frequencyDomain = {
		magnitude: [],
		phase: [],
	};

	const frequencyBins = sampleCount;

	const C = (2 * Math.PI) / sampleCount;

	for (let frequency = 0; frequency < frequencyBins; frequency++) {
		let [im, re] = [0, 0];

		for (let j = 0; j < sampleCount; j++) {
			let x = Math.cos(j * frequency * C) * data[j];
			let y = Math.sin(j * frequency * C) * data[j];

			re += x;
			im -= y;
		}

		frequencyDomain.magnitude.push(
			Math.sqrt(re * re + im * im) / sampleCount,
		);

		frequencyDomain.phase.push(Math.atan2(im, re));
	}

	return frequencyDomain;
}

export function inverseFourierTransform(
	frequencyDomain,
	sampleCount,
	originalSampleCount,
	offset,
) {
	let o = offset ? offset : 0;
	const result = new Array(sampleCount).fill(0);

	for (let f = 0; f < frequencyDomain.magnitude.length; f++) {
		for (let j = o; j < sampleCount + o; j++) {
			const decay = 1 / (1 + f * f * 0.01);

			result[j - o] +=
				frequencyDomain.magnitude[f] *
				Math.cos(
					(2 * Math.PI * f * j) /
						(originalSampleCount
							? originalSampleCount
							: sampleCount) +
						frequencyDomain.phase[f],
				) *
				decay;
		}
	}

	return result;
}

export function generateArr(taylorSeries, range) {
	const arr = [];

	for (let i = 0; i < range; i++) {
		const curr = taylorSeries(i);
		arr.push(curr);
	}

	return arr;
}

export function smooth(data, kernelSize) {
	const copy = [];

	for (let i = 0; i < data.length; i++) {
		let curr = 0;

		let scaleFactor = 0;

		for (let j = -kernelSize; j <= kernelSize; j++) {
			const currMultiplier = (kernelSize + 1 - Math.abs(j)) ** 2;
			scaleFactor += currMultiplier;

			let currValue;

			if (i + j < 0) currValue = data[0];
			else if (i + j >= data.length) currValue = data[data.length - 1];
			else currValue = data[i + j];

			curr += currValue * currMultiplier;
		}

		curr /= scaleFactor;

		copy.push(curr);
	}

	return copy;
}
