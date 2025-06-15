
import React, { useEffect } from 'react';

const SignUp: React.FC = () => {
  useEffect(() => {
    window.location.href = '/auth';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to signup...</p>
    </div>
  );
};

export default SignUp;
