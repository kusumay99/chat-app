import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { setAuthToken } from '../config/apiClient';
import Toast from 'react-native-toast-message';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // keep centralized apiClient in sync
      try {
        setAuthToken(token);
      } catch (e) {
        // ignore
      }
      setIsAuthenticated(true);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      try {
        setAuthToken(null);
      } catch (e) {
        // ignore
      }
      setIsAuthenticated(false);
    }
  }, [token]);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      
      // Try to get token from SecureStore
      const storedToken = await SecureStore.getItemAsync('authToken');
      
      if (storedToken) {
        // Verify token with backend
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          setUser(response.data.user);
          setToken(storedToken);
        } catch (error) {
          // Token is invalid, clear stored credentials
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      const { user: userData, accessToken, refreshToken } = response.data;
      
      // Store credentials securely
      await SecureStore.setItemAsync('authToken', accessToken);
      
      // Store refresh token in AsyncStorage
      await AsyncStorage.setItem('refreshToken', refreshToken);
      
      setUser(userData);
      setToken(accessToken);
      
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: `Hello ${userData.username}`,
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: message,
      });
      return { success: false, message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username,
        email,
        password
      });

      const { user: userData, accessToken, refreshToken } = response.data;
      
      // Store credentials securely
      await SecureStore.setItemAsync('authToken', accessToken);
      
      // Store refresh token in AsyncStorage
      await AsyncStorage.setItem('refreshToken', refreshToken);
      
      setUser(userData);
      setToken(accessToken);
      
      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: `Welcome ${userData.username}`,
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: message,
      });
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthData();
      Toast.show({
        type: 'info',
        text1: 'Logged Out',
        text2: 'See you next time!',
      });
    }
  };

  const clearAuthData = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await AsyncStorage.removeItem('refreshToken');
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const updateUser = (userData) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const refreshToken = async () => {
    try {
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: storedRefreshToken
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      // Update stored credentials
      await SecureStore.setItemAsync('authToken', accessToken);
      
      await AsyncStorage.setItem('refreshToken', newRefreshToken);
      setToken(accessToken);
      
      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await clearAuthData();
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
