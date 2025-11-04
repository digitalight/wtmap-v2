import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import AuthForm from '@/components/AuthForm';

const RegisterPage = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleRegister = async (email, password) => {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setSuccess(null);
    } else {
      setSuccess('Registration successful! Please check your email for verification.');
      setError(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
      <AuthForm onSubmit={handleRegister} />
    </div>
  );
};

export default RegisterPage;