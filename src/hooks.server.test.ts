import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { authGuard, supabase } from './hooks.server';

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('@supabase/ssr', () => ({
	createServerClient: vi.fn().mockImplementation(() => {
		return {
			auth: {
				getSession: vi.fn().mockResolvedValue({ data: { session: null } })
			}
		};
	})
}));

describe('supabase middleware', () => {
	it('safeGetSession returns { session: null, user: null } when no session is found', async () => {
		const resolve = vi.fn().mockResolvedValue(new Response());

		const mockCookies = {
			getAll: vi.fn().mockReturnValue([]),
			set: vi.fn()
		};

		const event = {
			locals: {},
			cookies: mockCookies
		} as unknown as RequestEvent;

		await supabase({ event, resolve });

		const result = await event.locals.safeGetSession();
		expect(result).toEqual({ session: null, user: null });
	});
});

describe('authGuard middleware', () => {
	it('redirects unauthenticated users from private paths to /auth', async () => {
		const resolve = vi.fn();
		const event = {
			locals: {
				safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
			},
			url: { pathname: '/private/dashboard' }
		} as unknown as RequestEvent;

		try {
			await authGuard({ event, resolve });
			expect.fail('Expected redirect to be thrown');
		} catch (e) {
			const err = e as { status: number; location: string };
			expect(err.status).toBe(303);
			expect(err.location).toBe('/auth');
		}
	});

	it('redirects authenticated users from /auth to /private/post', async () => {
		const resolve = vi.fn();
		const event = {
			locals: {
				safeGetSession: vi
					.fn()
					.mockResolvedValue({ session: { id: 'test_session' }, user: { id: 'test_user' } })
			},
			url: { pathname: '/auth' }
		} as unknown as RequestEvent;

		try {
			await authGuard({ event, resolve });
			expect.fail('Expected redirect to be thrown');
		} catch (e) {
			const err = e as { status: number; location: string };
			expect(err.status).toBe(303);
			expect(err.location).toBe('/private/post');
		}
	});

	it('sets session and user on event.locals', async () => {
		const resolve = vi.fn().mockResolvedValue('resolved');
		const session = { id: 'test_session' };
		const user = { id: 'test_user' };
		const event = {
			locals: {
				safeGetSession: vi.fn().mockResolvedValue({ session, user })
			},
			url: { pathname: '/public/path' }
		} as unknown as RequestEvent;

		const result = await authGuard({ event, resolve });

		expect(result).toBe('resolved');
		expect(resolve).toHaveBeenCalledWith(event);
		expect(event.locals.session).toBe(session);
		expect(event.locals.user).toBe(user);
	});

	it('allows unauthenticated users to access public paths', async () => {
		const resolve = vi.fn().mockResolvedValue('resolved');
		const event = {
			locals: {
				safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
			},
			url: { pathname: '/public/path' }
		} as unknown as RequestEvent;

		const result = await authGuard({ event, resolve });

		expect(result).toBe('resolved');
		expect(resolve).toHaveBeenCalledWith(event);
		expect(event.locals.session).toBeNull();
		expect(event.locals.user).toBeNull();
	});

	it('allows authenticated users to access private paths', async () => {
		const resolve = vi.fn().mockResolvedValue('resolved');
		const session = { id: 'test_session' };
		const user = { id: 'test_user' };
		const event = {
			locals: {
				safeGetSession: vi.fn().mockResolvedValue({ session, user })
			},
			url: { pathname: '/private/dashboard' }
		} as unknown as RequestEvent;

		const result = await authGuard({ event, resolve });

		expect(result).toBe('resolved');
		expect(resolve).toHaveBeenCalledWith(event);
		expect(event.locals.session).toBe(session);
		expect(event.locals.user).toBe(user);
	});
});
