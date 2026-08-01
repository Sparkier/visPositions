import { error } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { DELETE, PATCH } from './+server';

// Need to mock SvelteKit error so it actually throws an error we can catch
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => {
		const err = new Error(message);
		(err as Error & { status: number }).status = status;
		return err;
	}),
	text: vi.fn((message) => new Response(message))
}));

describe('PATCH /api/post/[id]', () => {
	it('should throw a 400 error if title is empty or invalid', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});
		const request = {
			json: vi.fn().mockResolvedValue({
				title: ''
			})
		};

		await expect(
			PATCH({
				locals: { safeGetSession: mockSafeGetSession },
				params: { id: '1' },
				request
			} as unknown as Parameters<typeof PATCH>[0])
		).rejects.toThrow('Invalid title');
	});

	it('should throw a 400 error if description is invalid', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});
		const request = {
			json: vi.fn().mockResolvedValue({
				description: 123
			})
		};

		await expect(
			PATCH({
				locals: { safeGetSession: mockSafeGetSession },
				params: { id: '1' },
				request
			} as unknown as Parameters<typeof PATCH>[0])
		).rejects.toThrow('Invalid description');
	});

	it('should throw a 400 error if education is invalid', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});
		const request = {
			json: vi.fn().mockResolvedValue({
				education: 'middle_school'
			})
		};

		await expect(
			PATCH({
				locals: { safeGetSession: mockSafeGetSession },
				params: { id: '1' },
				request
			} as unknown as Parameters<typeof PATCH>[0])
		).rejects.toThrow('Invalid education level');
	});

	it('should successfully update a post', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: { user: { email: 'test@example.com' } }
		});

		const mockEq4 = vi.fn().mockResolvedValue({ error: null });
		const mockEq3 = vi.fn().mockReturnValue({ eq: mockEq4 });
		const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq3 });

		const mockEq5 = vi.fn().mockResolvedValue({ error: null });
		const mockDelete = vi.fn().mockReturnValue({ eq: mockEq5 });

		const mockInsert = vi.fn().mockResolvedValue({ error: null });

		const mockFrom = vi.fn().mockImplementation((table) => {
			if (table === 'post') {
				return { update: mockUpdate };
			}
			if (table === 'postkeyword') {
				return { delete: mockDelete, insert: mockInsert };
			}
		});

		const mockSupabase = {
			from: mockFrom
		};

		const request = {
			json: vi.fn().mockResolvedValue({
				title: 'Valid Title',
				description: 'Valid description.',
				contact: 'test@example.com',
				industry: true,
				education: 'none',
				keywords: ['tech'],
				expiration_date: '2025-12-31'
			})
		};

		const res = await PATCH({
			locals: { safeGetSession: mockSafeGetSession, supabase: mockSupabase },
			params: { id: '1' },
			request
		} as unknown as Parameters<typeof PATCH>[0]);

		expect(res.status).toBe(200);
		expect(await res.text()).toBe('Post updated');
	});
});

describe('DELETE /api/post/[id]', () => {
	it('should throw 404 when deleting a non-existent post', async () => {
		// Create a mock chain for supabase
		const mockEq2 = vi.fn().mockResolvedValue({ data: [] });
		const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
		const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
		const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

		const mockSupabase = {
			from: mockFrom
		};

		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: {
				user: {
					email: 'test@example.com'
				}
			}
		});

		const locals = {
			supabase: mockSupabase,
			safeGetSession: mockSafeGetSession
		};

		const params = {
			id: 'non-existent-id'
		};

		await expect(
			DELETE({ locals, params } as unknown as Parameters<typeof DELETE>[0])
		).rejects.toThrow('Not found or unauthorized');

		// Verify that error was called with 404
		expect(error).toHaveBeenCalledWith(404, 'Not found or unauthorized');
	});
});
