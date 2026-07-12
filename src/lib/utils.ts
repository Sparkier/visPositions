export function getDefaultExpirationDate(monthsToAdd: number = 3): Date {
	const defaultDate = new Date();
	defaultDate.setMonth(defaultDate.getMonth() + monthsToAdd);
	return defaultDate;
}

export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
