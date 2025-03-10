// UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ip } from '../ContentExport';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  // Don't initialize from localStorage anymore
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  
  // Set up axios defaults for all requests
  useEffect(() => {
    // Always include credentials for cookie-based auth
    axios.defaults.withCredentials = true;
    
    // Interceptor to handle auth errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only redirect on 401 for API requests that aren't the verify-token endpoint
        if (error.response && 
            error.response.status === 401 && 
            !error.config.url.includes('/api/verify-token')) {
          
          console.log("401 error detected, logging out user");
          
          // Update context
          setUser(null);
          setRole(null);
          
          // Navigate to login
          navigate('/medapp/login');
        }
        return Promise.reject(error);
      }
    );
    
    return () => {
      // Clean up interceptor on unmount
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate, setUser, setRole]);

  // Fetch user session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Try to verify auth using HTTP-only cookie
        const response = await axios.get(`${ip.address}/api/verify-token`, {
          withCredentials: true
        });
        
        if (response.data.user) {
          setUser(response.data.user);
          setRole(response.data.role);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        // Authentication failed, but don't redirect
        console.log("Auth verification failed:", error.message);
        setUser(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [navigate]);

  // Logout function that calls the backend to clear cookies
  const logout = async () => {
    try {
      // Call logout API to clear HTTP-only cookies
      await axios.post(`${ip.address}/api/logout`, {}, {
        withCredentials: true
      });
      
      setUser(null);
      setRole(null);
      navigate('/medapp/login');
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, still clear local state
      setUser(null);
      setRole(null);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      role, 
      setUser, 
      setRole,
      logout,
      // This function is now used just for state management, not for storage
      setAuthToken: (token, userData, userRole) => {
        if (userData) setUser(userData);
        if (userRole) setRole(userRole);
        // No need to store token locally, as it's in the HTTP-only cookie
      }
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;