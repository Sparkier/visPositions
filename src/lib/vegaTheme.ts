import { type Config as VgConfig } from 'vega';
import { type Config as VlConfig } from 'vega-lite';

export const markColor = '#0d6797';
export const axisColor = '#979797';

const axiomTheme: VgConfig | VlConfig = {
	background: 'transparent',
	group: {
		fill: '#fff'
	},
	view: {
		fill: '#fff'
	},
	title: {
		color: axisColor
	},

	arc: { fill: markColor },
	area: {
		line: true,
		fill: {
			x1: 1,
			y1: 1,
			x2: 1,
			y2: 0,
			gradient: 'linear',
			stops: [
				{
					offset: 0,
					color: '#ffffff'
				},
				{
					offset: 1,
					color: markColor
				}
			]
		}
	},
	line: { stroke: markColor },
	path: { stroke: markColor },
	rect: { fill: markColor },
	shape: { stroke: markColor },
	symbol: { fill: markColor, size: 30 },
	bar: { fill: markColor, cornerRadiusTopRight: 3, cornerRadiusBottomRight: 3 },

	axis: {
		domainColor: axisColor,
		domainWidth: 0.5,
		gridWidth: 0.2,
		labelColor: axisColor,
		tickColor: axisColor,
		tickWidth: 0.2,
		titleColor: axisColor,
		labelFontSize: 12
	},

	axisBand: {
		grid: false
	},

	axisX: {
		grid: true,
		tickSize: 10
	},

	axisY: {
		grid: true
	},

	legend: {
		labelFontSize: 11,
		padding: 1,
		symbolSize: 30,
		symbolType: 'square'
	},

	range: {
		category: ['#0d6797', '#e1722f']
	}
};

export default axiomTheme;
