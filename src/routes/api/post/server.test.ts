import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

describe('POST /api/post', () => {
	it('should throw a 400 error if title is missing or invalid', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});
		const request = {
			json: vi.fn().mockResolvedValue({
				description: 'Desc', contact: 'Contact', industry: true, education: 'none'
			})
		};

		await expect(
			POST({
				locals: { safeGetSession: mockSafeGetSession },
				request
			} as unknown as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 400, body: { message: 'Invalid title' } });
	});

	it('should throw a 400 error if description is missing or invalid', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});
		const request = {
			json: vi.fn().mockResolvedValue({
				title: 'Title', contact: 'Contact', industry: true, education: 'none'
			})
		};

		await expect(
			POST({
				locals: { safeGetSession: mockSafeGetSession },
				request
			} as unknown as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 400, body: { message: 'Invalid description' } });
	});

	it('should throw a 400 error if education is invalid', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});
		const request = {
			json: vi.fn().mockResolvedValue({
				title: 'Title', description: 'Desc', contact: 'Contact', industry: true, education: 'invalid_edu'
			})
		};

		await expect(
			POST({
				locals: { safeGetSession: mockSafeGetSession },
				request
			} as unknown as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 400, body: { message: 'Invalid education level' } });
	});

	it('should throw an error if post DB insertion fails', async () => {
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				insert: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: new Error('DB Error')
						})
					})
				})
			})
		};

		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: {
				user: { email: 'test@example.com' }
			}
		});

		const request = {
			json: vi.fn().mockResolvedValue({
				title: 'Test',
				description: 'Desc',
				contact: 'Contact',
				industry: true,
				education: 'undergraduate',
				keywords: []
			})
		};

		await expect(
			POST({
				locals: {
					supabase: mockSupabase,
					safeGetSession: mockSafeGetSession
				},
				request
			} as unknown as Parameters<typeof POST>[0])
		).rejects.toMatchObject({ status: 500, body: { message: 'Failed to create post.' } });
	});

	it('should throw an error if post DB insertion succeeds but no data is returned', async () => {
		const mockSupabase = {
			from: vi.fn().mockReturnValue({
				insert: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: null
						})
					})
				})
			})
		};

		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: {
				user: { email: 'test@example.com' }
			}
		});

		const request = {
			json: vi.fn().mockResolvedValue({
				title: 'Test',
				description: 'Desc',
				contact: 'Contact',
				industry: true,
				education: 'undergraduate',
				keywords: []
			})
		};

		await expect(
			POST({
				locals: {
					supabase: mockSupabase,
					safeGetSession: mockSafeGetSession
				},
				request
			} as unknown as Parameters<typeof POST>[0])
		).rejects.toMatchObject({
			status: 500,
			body: { message: 'Post creation succeeded but no data returned.' }
		});
	});

	it('should successfully create a post', async () => {
		const mockSupabase = {
			from: vi.fn().mockImplementation((table) => {
				if (table === 'post') {
					return {
						insert: vi.fn().mockReturnValue({
							select: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: { id: 1 },
									error: null
								})
							})
						})
					};
				}
				if (table === 'postkeyword') {
					return {
						insert: vi.fn().mockResolvedValue({
							error: null
						})
					};
				}
			})
		};

		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: {
				user: { email: 'test@example.com' }
			}
		});

		const request = {
			json: vi.fn().mockResolvedValue({
				title: 'Test',
				description: 'Desc',
				contact: 'Contact',
				industry: true,
				education: 'undergraduate',
				keywords: ['keyword1']
			})
		};

		const response = await POST({
			locals: {
				supabase: mockSupabase,
				safeGetSession: mockSafeGetSession
			},
			request
		} as unknown as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
	});
});
