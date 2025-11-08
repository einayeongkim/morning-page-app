import { Button } from './ui/button';
import { motion } from 'motion/react';
import { createClient } from '../utils/supabase/client';

interface LoginScreenProps {
  onLogin: (provider: string) => void;
  onEmailLogin: () => void;
  onSocialLoginSuccess: (user: { id: string; name: string; email: string }) => void;
}

export function LoginScreen({ onLogin, onEmailLogin, onSocialLoginSuccess }: LoginScreenProps) {
  const handleAppleLogin = async () => {
    try {
      const supabase = createClient();
      // Note: For Apple OAuth to work, you need to configure it in Supabase Dashboard
      // Visit: https://supabase.com/docs/guides/auth/social-login
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Apple login error:', error);
        // Fallback to mock login for now
        onLogin('apple');
      }
    } catch (err) {
      console.error('Apple login exception:', err);
      // Fallback to mock login
      onLogin('apple');
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <h2 className="mb-8 text-center text-gray-700">Sign Up or Log In</h2>

        <div className="space-y-4">
          <Button
            onClick={onEmailLogin}
            variant="outline"
            className="w-full border-gray-300 text-gray-700"
            size="lg"
          >
            Continue with Email
          </Button>

          <Button
            onClick={handleAppleLogin}
            className="w-full bg-black hover:bg-gray-900 text-white"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          By continuing, you agree to our{' '}
          <a href="#" className="text-gray-600 hover:underline">
            Terms & Conditions
          </a>{' '}
          and{' '}
          <a href="#" className="text-gray-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  );
}
