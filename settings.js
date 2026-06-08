export let settings = {
	units: 'celsium',
	clock: '24h',
	theme: 'light',
	feelsLike: false,
	city: 'Sofia',
};

export function setSetting(name, value) {
	settings[name] = value;
}

export function saveSettings() {
	localStorage.setItem('settings', JSON.stringify(settings));
}

export function loadSettings() {
	if (!localStorage.getItem('settings')) return;
	settings = JSON.parse(localStorage.getItem('settings'));
}
