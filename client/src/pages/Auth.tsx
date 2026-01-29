import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Box } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(endpoint, { username, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-900 dark:to-gray-800 text-slate-800 dark:text-slate-100">
      <div className="glass p-8 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center">
        
        <div className="bg-blue-600 p-3 rounded-xl mb-6 shadow-lg shadow-blue-600/30">
            <Box className="text-white" size={32} />
        </div>

        <h1 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
            {isLogin ? 'Enter your credentials to access your designs' : 'Sign up to start creating 3D models'}
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Username</label>
              <input 
                type="text" 
                placeholder="johndoe" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="input-field"
                required
              />
          </div>
          
          <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="input-field"
                required
              />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full justify-center mt-4 py-3 text-lg"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {error && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm w-full text-center">{error}</div>}

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;