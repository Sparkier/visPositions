import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

describe('POST /api/post', () => {
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
				industry: 'Tech',
				education: 'BSc',
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
		).rejects.toThrow('Failed to create post.');
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
				industry: 'Tech',
				education: 'BSc',
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
		).rejects.toThrow('Post creation succeeded but no data returned.');
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
				industry: 'Tech',
				education: 'BSc',
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
