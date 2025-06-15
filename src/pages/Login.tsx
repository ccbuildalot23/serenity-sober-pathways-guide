
import React, { useEffect } from 'react';

const Login: React.FC = () => {
  useEffect(() => {
    window.location.href = '/auth';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to login...</p>
    </div>
  );
};

export default Login;
