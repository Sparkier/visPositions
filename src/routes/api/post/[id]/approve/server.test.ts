import { describe, it, expect, vi } from 'vitest';
import type { HttpError } from '@sveltejs/kit';
import { PATCH } from './+server';

vi.mock('$env/static/private', () => ({
	ADMIN_EMAIL: 'admin@example.com'
}));

describe('Post Approve API', () => {
	it('should throw 401 error if session is missing', async () => {
		const locals = {
			safeGetSession: vi.fn().mockResolvedValue({
				session: null
			})
		};
		const params = { id: '123' };

		try {
			await PATCH({ locals, params } as unknown as Parameters<typeof PATCH>[0]);
			expect.fail('Should have thrown an error');
		} catch (e) {
			const error = e as HttpError;
			expect(error.status).toBe(401);
			expect(error.body.message).toBe('Unauthorized');
		}
	});

	it('should throw 403 error if user is not admin', async () => {
		const locals = {
			safeGetSession: vi.fn().mockResolvedValue({
				session: {
					user: {
						email: 'user@example.com'
					}
				}
			})
		};
		const params = { id: '123' };

		try {
			await PATCH({ locals, params } as unknown as Parameters<typeof PATCH>[0]);
			expect.fail('Should have thrown an error');
		} catch (e) {
			const error = e as HttpError;
			expect(error.status).toBe(403);
			expect(error.body.message).toBe('Forbidden');
		}
	});

	it('should throw 400 error if post ID is missing', async () => {
		const locals = {
			safeGetSession: vi.fn().mockResolvedValue({
				session: {
					user: {
						email: 'admin@example.com'
					}
				}
			})
		};
		const params = { id: '' };

		try {
			await PATCH({ locals, params } as unknown as Parameters<typeof PATCH>[0]);
			expect.fail('Should have thrown an error');
		} catch (e) {
			const error = e as HttpError;
			expect(error.status).toBe(400);
			expect(error.body.message).toBe('Post ID is required');
		}
	});

	it('should throw 500 error if supabase update fails', async () => {
		const mockSupabase = {
			from: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
		};

		const locals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: {
					user: {
						email: 'admin@example.com'
					}
				}
			})
		};
		const params = { id: '123' };

		try {
			await PATCH({ locals, params } as unknown as Parameters<typeof PATCH>[0]);
			expect.fail('Should have thrown an error');
		} catch (e) {
			const error = e as HttpError;
			expect(error.status).toBe(500);
			expect(error.body.message).toBe('Internal Server Error');
		}
	});

	it('should return success response when approval succeeds', async () => {
		const mockSupabase = {
			from: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({ error: null })
		};

		const locals = {
			supabase: mockSupabase,
			safeGetSession: vi.fn().mockResolvedValue({
				session: {
					user: {
						email: 'admin@example.com'
					}
				}
			})
		};
		const params = { id: '123' };

		const response = await PATCH({ locals, params } as unknown as Parameters<typeof PATCH>[0]);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ success: true, message: 'Post approved' });

		expect(mockSupabase.from).toHaveBeenCalledWith('post');
		expect(mockSupabase.update).toHaveBeenCalledWith(
			expect.objectContaining({
				vetted: true,
				vetted_at: expect.any(String)
			})
		);
		expect(mockSupabase.eq).toHaveBeenCalledWith('id', '123');
	});
});
