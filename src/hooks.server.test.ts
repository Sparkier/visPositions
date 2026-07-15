import { describe, it, expect, vi } from 'vitest';
import { authGuard } from './hooks.server';

describe('authGuard middleware', () => {
	it('redirects unauthenticated users from private paths to /auth', async () => {
		const resolve = vi.fn();
		const event = {
			locals: {
				safeGetSession: vi.fn().mockResolvedValue({ session: null, user: null })
			},
			url: { pathname: '/private/dashboard' }
		} as any;

		try {
			await authGuard({ event, resolve });
			expect.fail('Expected redirect to be thrown');
		} catch (e: any) {
			expect(e.status).toBe(303);
			expect(e.location).toBe('/auth');
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
		} as any;

		try {
			await authGuard({ event, resolve });
			expect.fail('Expected redirect to be thrown');
		} catch (e: any) {
			expect(e.status).toBe(303);
			expect(e.location).toBe('/private/post');
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
		} as any;

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
		} as any;

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
		} as any;

		const result = await authGuard({ event, resolve });

		expect(result).toBe('resolved');
		expect(resolve).toHaveBeenCalledWith(event);
		expect(event.locals.session).toBe(session);
		expect(event.locals.user).toBe(user);
	});
});
