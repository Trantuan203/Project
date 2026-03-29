import React, { createContext, useEffect, useState } from 'react';

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
    return response;
  };

  const register = async (payload) => {
    const response = await registerUser(payload);
    setCurrentUser(response.user);
    setIsAuthReady(true);
    return response;
  };

  const logout = () => {
    clearStoredSession();
    setCurrentUser(null);
    setIsAuthReady(true);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
