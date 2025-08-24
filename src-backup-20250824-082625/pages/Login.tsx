
import React from 'react';
import Auth from './Auth';

const Login: React.FC = () => {
  // Render the Auth experience directly at /login to satisfy E2E expectations
  return <Auth />;
};

export default Login;
