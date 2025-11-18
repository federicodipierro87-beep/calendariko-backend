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
  return (
    <div className="flex justify-center my-4">
      <ReCAPTCHA
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={onVerify}
        onExpired={onExpired}
        onErrored={onError}
        size={size}
        theme={theme}
      />
    </div>
  );
};

export default ReCaptcha;