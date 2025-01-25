import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#0d6797',
					light: '#1884bd',
					dark: '#094d71'
				},
				accent: '#e1722f'
			}
		}
	},

	plugins: [typography, forms]
} satisfies Config;
