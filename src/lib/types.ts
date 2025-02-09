export type Post = {
	id: number;
	title: string;
	description: string;
	created_at: string;
	contact: string;
	vetted: boolean;
	industry: boolean;
	education: Education;
	keyword: Keyword[];
};

export enum Education {
	None = 'none',
	Undergraduate = 'undergraduate',
	Graduate = 'graduate',
	PhD = 'phd'
}

export const educationMap = {
	[Education.None]: 'None',
	[Education.Undergraduate]: 'Undergraduate',
	[Education.Graduate]: 'Graduate',
	[Education.PhD]: 'PhD'
};

export type Keyword = {
	id: number;
	title: string;
};
