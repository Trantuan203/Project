import React, { createContext, useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '../services/socket';

import {
  AUTH_SESSION_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  clearStoredSession,
  fetchCurrentUser,
  loginUser,
  readStoredSession,
  readStoredToken,
  registerUser,
} from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => readStoredSession());
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydrateAuth = async () => {
      const storedToken = readStoredToken();

      if (!storedToken) {
        clearStoredSession();

        if (isMounted) {
          setCurrentUser(null);
          setIsAuthReady(true);
        }

        return;
      }

      try {
        const user = await fetchCurrentUser();
        connectSocket(storedToken);

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        clearStoredSession();

        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== AUTH_SESSION_STORAGE_KEY && event.key !== AUTH_TOKEN_STORAGE_KEY) {
        return;
      }

      setCurrentUser(readStoredSession());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (credentials) => {
    const response = await loginUser(credentials);
    setCurrentUser(response.user);
    setIsAuthReady(true);
    connectSocket(response.token);
    return response;
  };

  const register = async (payload) => {
    const response = await registerUser(payload);
    setCurrentUser(response.user);
    setIsAuthReady(true);
    connectSocket(response.token);
    return response;
  };

  const logout = () => {
    clearStoredSession();
    disconnectSocket();
    setCurrentUser(null);
    setIsAuthReady(true);
  };

  const updateCurrentUser = (updater) => {
    setCurrentUser((currentValue) => {
      if (!currentValue) {
        return currentValue;
      }

      const nextValue =
        typeof updater === 'function' ? updater(currentValue) : { ...currentValue, ...updater };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(nextValue));
      }

      return nextValue;
    });
  };

  const updateCurrentUserPreferences = (section, value) => {
    updateCurrentUser((currentValue) => ({
      ...currentValue,
      preferences: {
        ...(currentValue.preferences || {}),
        [section]: value,
      },
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthReady,
        isAuthenticated: Boolean(currentUser),
        login,
        logout,
        register,
        updateCurrentUser,
        updateCurrentUserPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
