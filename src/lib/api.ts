import { auth } from './firebase';

/**
 * Calls a same-origin backend API with the current Firebase user's short-lived ID token.
 * The server verifies the token before running any paid AI operation.
 */
export async function authenticatedApiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Bu işlem için önce Google hesabınızla güvenli giriş yapmalısınız.');
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(input, { ...init, headers });
}
