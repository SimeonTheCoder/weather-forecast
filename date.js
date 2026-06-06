let dateObj = new Date();

let date = {
	year: dateObj.getFullYear(),
	month: dateObj.getMonth() + 1,
	day: dateObj.getDate(),

	hour: dateObj.getHours(),

	dayOfWeek: dateObj.getDay(),
};

export function getDate() {
	return date;
}

export function setDate(newDate) {
	date = newDate;
}
