// UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ip } from '../ContentExport';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  // Initialize with localStorage values if available
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [role, setRole] = useState(() => {
    const storedRole = localStorage.getItem('role');
    return storedRole || null;
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  
  const logout = () => {
    // Clear state and localStorage
    setUser(null);
    setRole(null);
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    // You can add an API call to logout on server if needed
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await axios.get(`${ip.address}/api/get/session`, {
          withCredentials: true
        });
        
        if (response.data.user) {
          setUser(response.data.user);
          setRole(response.data.role);
          
          // Store in localStorage for persistence
          localStorage.setItem('user', JSON.stringify(response.data.user));
          localStorage.setItem('role', response.data.role);
          setError(null);
        } else {
          setUser(null);
          setRole(null);
          localStorage.removeItem('user');
          localStorage.removeItem('role');
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        setError(error.message || "Failed to fetch session");
        
        // Keep using localStorage data if API fails
        // This prevents unnecessary logouts on temporary API issues
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [navigate]);

  // Provide a wrapper component for the loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      role, 
      setUser, 
      setRole, 
      error,
      logout,
      refreshSession: () => {
        setLoading(true);
        // This allows manual refresh of session when needed
      }
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;