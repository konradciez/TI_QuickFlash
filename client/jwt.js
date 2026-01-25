const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

function setTokens(token, refreshToken) {
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
	localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function setAccess(token) {
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

function getAccess() {
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefresh() {
	return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function removeTokens() {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
	localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function parseJWT(token) {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	try {
		const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
		return payload;
	} catch (e) {
		return null;
	}
}

function getCurrentUser() {
	const token = getAccess();
	if (!token) return null;
	const payload = parseJWT(token);
	if (!payload) return null;
	return {
		username: payload.username,
		role: payload.role,
		exp: payload.exp,
	};
}

function isLoggedIn() {
	const user = getCurrentUser();
	if (!user) return false;
	//czy token nie wygasł
	if (user.exp && Date.now() / 1000 > user.exp) 
		return false;
	return true;
}

window.setTokens = setTokens;
window.setAccess = setAccess;
window.getAccess = getAccess;
window.getRefresh = getRefresh;
window.removeTokens = removeTokens;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
