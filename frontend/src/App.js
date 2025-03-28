import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { ThemeProvider } from 'styled-components';

// Components
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import RecurringExpenses from './pages/RecurringExpenses';
import Login from './pages/Login';
import Navigation from './components/Navigation';
import PrivateRoute from './components/PrivateRoute';
import GlobalStyle from './styles/GlobalStyle';
import { theme } from './styles/theme';

// Context
import { AuthProvider } from './context/AuthContext';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
axios.defaults.withCredentials = true;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<Navigation />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="add-expense" element={
                <PrivateRoute>
                  <AddExpense />
                </PrivateRoute>
              } />
              <Route path="categories" element={
                <PrivateRoute>
                  <Categories />
                </PrivateRoute>
              } />
              <Route path="reports" element={
                <PrivateRoute>
                  <Reports />
                </PrivateRoute>
              } />
              <Route path="recurring-expenses" element={
                <PrivateRoute>
                  <RecurringExpenses />
                </PrivateRoute>
              } />
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
