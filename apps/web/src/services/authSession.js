import axios from 'axios';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const AUTH_EXPIRED_EVENT = 'auth:expired';

const AUTH_BASE_URL = '/api/auth';
const REFRESH_SKEW_MS = 30_000;

let refreshPromise = null;

export class AuthExpiredError extends Error {
    constructor(message = '登录已过期，请重新登录。') {
        super(message);
        this.name = 'AuthExpiredError';
    }
}

const dispatchAuthExpired = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
};

const parseJwtPayload = (token) => {
    try {
        const [, payload] = token.split('.');
        if (!payload) {
            return null;
        }

        const normalized = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(Math.ceil(payload.length / 4) * 4, '=');

        return JSON.parse(window.atob(normalized));
    } catch {
        return null;
    }
};

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

export const isTokenExpired = (token, skewMs = REFRESH_SKEW_MS) => {
    if (!token) {
        return true;
    }

    const payload = parseJwtPayload(token);
    if (!payload?.exp) {
        return false;
    }

    return payload.exp * 1000 <= Date.now() + skewMs;
};

export const storeAuthSession = (authData = {}) => {
    const accessToken = authData.accessToken || authData.token;
    const refreshToken = authData.refreshToken;

    if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }

    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

export const clearAuthSession = ({ notify = false } = {}) => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    if (notify) {
        dispatchAuthExpired();
    }
};

export const refreshAccessToken = async () => {
    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
        clearAuthSession({ notify: true });
        throw new AuthExpiredError();
    }

    refreshPromise = axios.post(`${AUTH_BASE_URL}/refresh`, { refreshToken })
        .then((response) => {
            const authData = response.data || {};
            storeAuthSession(authData);

            const accessToken = authData.accessToken || authData.token;
            if (!accessToken) {
                throw new AuthExpiredError();
            }

            return accessToken;
        })
        .catch(() => {
            clearAuthSession({ notify: true });
            throw new AuthExpiredError();
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

export const getValidAccessToken = async ({ forceRefresh = false } = {}) => {
    const accessToken = getStoredAccessToken();

    if (!forceRefresh && accessToken && !isTokenExpired(accessToken)) {
        return accessToken;
    }

    return refreshAccessToken();
};
