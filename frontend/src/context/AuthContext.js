import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // Try to get current user info
        const res = await axios.get('/auth/me');
        setCurrentUser(res.data);
      } catch (err) {
        // If error, user is not logged in
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Update user preferences
  const updateUserPreferences = async (preferences) => {
    try {
      const res = await axios.put('/auth/preferences', preferences);
      setCurrentUser(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating preferences');
      throw err;
    }
  };

  // Log out
  const logout = async () => {
    try {
      await axios.get('/auth/logout');
      setCurrentUser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error logging out');
      // Force logout even if API call fails
      setCurrentUser(null);
    }
  };

  // Reset error
  const resetError = () => {
    setError(null);
  };

  // Create auth value object
  const value = {
    currentUser,
    loading,
    error,
    updateUserPreferences,
    logout,
    resetError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
