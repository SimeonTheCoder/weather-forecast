export let settings = {
	units: 'celsium',
	clock: '24h',
	theme: 'light',
};

export function setSetting(name, value) {
	settings[name] = value;
}
