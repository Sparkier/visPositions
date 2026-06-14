export function getDefaultExpirationDate(monthsToAdd: number = 3): Date {
	const defaultDate = new Date();
	defaultDate.setMonth(defaultDate.getMonth() + monthsToAdd);
	return defaultDate;
}
