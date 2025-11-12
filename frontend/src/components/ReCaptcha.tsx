import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface ReCaptchaProps {
  onVerify: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
  size?: 'compact' | 'normal';
  theme?: 'light' | 'dark';
}

// Chiave pubblica reCAPTCHA
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const ReCaptcha: React.FC<ReCaptchaProps> = ({
  onVerify,
  onExpired,
  onError,
  size = 'normal',
  theme = 'light'
}) => {
  console.log('🔍 ReCaptcha component rendering with key:', RECAPTCHA_SITE_KEY);
  
  return (
    <div className="flex justify-center my-4">
      <div className="border-2 border-blue-500 p-2 bg-blue-50">
        <p className="text-blue-600 text-xs text-center mb-2">
          🔍 ReCAPTCHA Component Loading... Key: {RECAPTCHA_SITE_KEY.substring(0, 20)}...
        </p>
        <ReCAPTCHA
          sitekey={RECAPTCHA_SITE_KEY}
          onChange={(token) => {
            console.log('🔍 ReCAPTCHA onChange triggered:', token ? 'token received' : 'token null');
            onVerify(token);
          }}
          onExpired={() => {
            console.log('🔍 ReCAPTCHA onExpired triggered');
            onExpired?.();
          }}
          onErrored={() => {
            console.log('🔍 ReCAPTCHA onErrored triggered');
            onError?.();
          }}
          size={size}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default ReCaptcha;