import React, { useState } from 'react';
import LottieModule from 'lottie-react';
const Lottie = LottieModule.default || LottieModule;
import whatsappLottie from '../assets/whatsapp-lottie.json';
import './ShareModal.css';

const ShareModal = ({ isOpen, onClose, shareUrl }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      isLottie: true,
      animationData: whatsappLottie,
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Twitter',
      icon: '𝕏',
      color: '#ffffff',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Telegram',
      isImage: true,
      icon: 'https://img.icons8.com/?size=160&id=k4jADXhS5U1t&format=png',
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Instagram',
      isImage: true,
      icon: 'https://img.icons8.com/?size=96&id=Xy10Jcu1L2Su&format=png',
      color: '#E4405F',
      url: `https://www.instagram.com/`
    },
    {
      name: 'Copy',
      icon: '🔗',
      color: '#a3e635',
      action: handleCopy
    }
  ];

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <button className="share-close" onClick={onClose}>&times;</button>
        
        <div className="share-header">
          <div className="share-icon-box">
             <span className="icon">🔗</span>
          </div>
          <h3>Share Match</h3>
          <p>Invite friends to view live score</p>
        </div>

        <div className="share-body">
          <div className="input-group">
            <input 
              type="text" 
              value={shareUrl} 
              readOnly 
              className="share-url-input"
              onFocus={(e) => e.target.select()}
            />
            <button className="inner-copy-btn" onClick={handleCopy}>
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="share-actions">
            {shareOptions.map((option, idx) => (
              option.action ? (
                <button 
                  key={idx} 
                  className="social-circle" 
                  onClick={option.action}
                  style={{ '--accent': option.color }}
                  title={option.name}
                >
                  {option.icon}
                </button>
              ) : (
                <a 
                  key={idx} 
                  href={option.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="social-circle"
                  style={{ '--accent': option.color }}
                  title={option.name}
                >
                  {option.isLottie ? (
                    <div style={{ width: '24px', height: '24px' }}>
                      <Lottie animationData={option.animationData} loop={true} />
                    </div>
                  ) : option.isImage ? (
                    <img src={option.icon} alt={option.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                  ) : option.icon}
                </a>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
