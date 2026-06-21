import { describe, it, expect, vi } from 'vitest';
import { DELETE } from './+server';
import { error } from '@sveltejs/kit';

// Need to mock SvelteKit error so it actually throws an error we can catch
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => {
		const err = new Error(message);
		(err as any).status = status;
		return err;
	}),
	text: vi.fn((message) => new Response(message))
}));

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

		await expect(DELETE({ locals, params } as any)).rejects.toThrow('Not found or unauthorized');

		// Verify that error was called with 404
		expect(error).toHaveBeenCalledWith(404, 'Not found or unauthorized');
	});
});
