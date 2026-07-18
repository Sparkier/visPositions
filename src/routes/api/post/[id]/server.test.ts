import { describe, it, expect, vi } from 'vitest';
import { DELETE } from './+server';
import { error } from '@sveltejs/kit';

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
	it('should throw 400 when invalid input is provided', async () => {
		const mockSafeGetSession = vi.fn().mockResolvedValue({
			session: {
				user: {
					email: 'test@example.com'
				}
			}
		});

		const locals = {
			supabase: {},
			safeGetSession: mockSafeGetSession
		};

		const params = {
			id: '1'
		};

		// Test invalid title
		const request1 = {
			json: vi.fn().mockResolvedValue({
				title: 123,
				description: 'valid',
				contact: 'valid',
				industry: true,
				education: 'none',
				expiration_date: '2025-01-01',
				keywords: []
			})
		};

		const { PATCH } = await import('./+server');

		await expect(
			PATCH({ locals, params, request: request1 } as unknown as Parameters<typeof PATCH>[0])
		).rejects.toThrow('Invalid input data');

		// Test invalid keywords array
		const request2 = {
			json: vi.fn().mockResolvedValue({
				title: 'valid',
				description: 'valid',
				contact: 'valid',
				industry: true,
				education: 'none',
				expiration_date: '2025-01-01',
				keywords: 'not-an-array'
			})
		};

		await expect(
			PATCH({ locals, params, request: request2 } as unknown as Parameters<typeof PATCH>[0])
		).rejects.toThrow('Invalid input data');

		expect(error).toHaveBeenCalledWith(400, 'Invalid input data');
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
