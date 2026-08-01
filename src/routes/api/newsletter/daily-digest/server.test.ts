import { describe, it, expect, vi, afterEach } from 'vitest';
import { POST } from './+server';

// Mock svelte kit error function
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: (status: number, message: string) => {
			const err = new Error(message);
			(err as any).status = status;
			(err as any).body = { message };
			return err;
		}
	};
});

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	DAILY_DIGEST_SECRET_KEY: 'test_secret_key',
	FROM_EMAIL: 'test@example.com',
	LINKEDIN_ACCESS_TOKEN: 'test_linkedin_token',
	LINKEDIN_ORGANIZATION_ID: 'test_org_id',
	RESEND_API_KEY: 'test_api_key',
	RESEND_AUDIENCE_ID: 'test_audience_id'
}));

// Mock resend
vi.mock('resend', () => {
	return {
		Resend: vi.fn().mockImplementation(function () {
			return {
				broadcasts: {
					create: vi.fn().mockResolvedValue({ data: { id: 'test_id' }, error: null }),
					send: vi.fn().mockResolvedValue({ error: null })
				}
			};
		})
	};
});

describe('Daily Digest API', () => {
	it('should return 401 if Authorization header is missing', async () => {
		const request = new Request('http://localhost/api/newsletter/daily-digest', {
			method: 'POST'
		});

		const response = await POST({ request, locals: { supabase: {} } } as unknown as Parameters<
			typeof POST
		>[0]);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ message: 'Unauthorized' });
	});

	it('should return 401 if Authorization header is invalid', async () => {
		const request = new Request('http://localhost/api/newsletter/daily-digest', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer wrong_key'
			}
		});

		const response = await POST({ request, locals: { supabase: {} } } as unknown as Parameters<
			typeof POST
		>[0]);
		const data = await response.json();

		expect(response.status).toBe(401);
		expect(data).toEqual({ message: 'Unauthorized' });
	});

	it('should return 500 when Supabase returns an error fetching posts', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const mockSupabase = {
			from: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
		};

		const request = new Request('http://localhost/api/newsletter/daily-digest', {
			method: 'POST',
			headers: {
				Authorization: 'Bearer test_secret_key'
			}
		});

		try {
			await POST({
				request,
				locals: { supabase: mockSupabase }
			} as unknown as Parameters<typeof POST>[0]);
			expect.fail('Expected POST to throw an error');
		} catch (e: any) {
			expect(e.status).toBe(500);
			expect(e.body?.message).toBe('Internal Server Error');
			expect(consoleSpy).toHaveBeenCalledWith('Error fetching vetted posts:', { message: 'DB Error' });
			expect(consoleSpy).toHaveBeenCalledWith('Error in daily digest endpoint:', expect.any(Error));
		}

		consoleSpy.mockRestore();
	});
});
