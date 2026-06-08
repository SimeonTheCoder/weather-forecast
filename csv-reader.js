export async function read() {
	const raw = await fetch('./world_cities.csv').then((r) => r.text());

	const lines = raw.split('\n');

	return lines.map((l) => l.split(',').slice(0, 4));
}

export async function getCoordinates(city) {
	const data = await read();
	const row = data.filter(
		(d) => d[0].toLowerCase() == city.toLowerCase().trim(),
	)[0];

	return [Number(row[2]), Number(row[3])];
}
