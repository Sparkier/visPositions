import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { authGuard, supabase } from './hooks.server';
import { createServerClient } from '@supabase/ssr';

vi.mock('@supabase/ssr', () => ({
	createServerClient: vi.fn()
}));

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

import type { Mock } from 'vitest';

describe('supabase middleware', () => {
	let event: RequestEvent;
	let resolve: Mock<[event: RequestEvent], Promise<Response>>;
	let mockGetSession: Mock;
	let mockGetUser: Mock;

	beforeEach(() => {
		mockGetSession = vi.fn();
		mockGetUser = vi.fn();

		(createServerClient as unknown as Mock).mockReturnValue({
			auth: {
				getSession: mockGetSession,
				getUser: mockGetUser
			}
		});

		event = {
			locals: {},
			cookies: {
				getAll: vi.fn(),
				set: vi.fn()
			}
		} as unknown as RequestEvent;
		resolve = vi.fn().mockResolvedValue('resolved');
	});

	it('returns null session and user if getSession returns no session', async () => {
		mockGetSession.mockResolvedValue({ data: { session: null } });

		await supabase({ event, resolve });
		const result = await event.locals.safeGetSession();

		expect(result).toEqual({ session: null, user: null });
		expect(mockGetUser).not.toHaveBeenCalled();
	});

	it('returns null session and user if getSession returns a session but getUser returns an error', async () => {
		mockGetSession.mockResolvedValue({ data: { session: { id: 'test_session' } } });
		mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

		await supabase({ event, resolve });
		const result = await event.locals.safeGetSession();

		expect(result).toEqual({ session: null, user: null });
		expect(mockGetUser).toHaveBeenCalled();
	});

	it('returns session and user if both getSession and getUser succeed', async () => {
		const session = { id: 'test_session' };
		const user = { id: 'test_user' };
		mockGetSession.mockResolvedValue({ data: { session } });
		mockGetUser.mockResolvedValue({ data: { user }, error: null });

		await supabase({ event, resolve });
		const result = await event.locals.safeGetSession();

		expect(result).toEqual({ session, user });
		expect(mockGetUser).toHaveBeenCalled();
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
