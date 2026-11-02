import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './NewDebateSessionModal.css';

export default function NewDebateSessionModal({ isOpen, onDecision }) {
  const { t } = useTranslation();
  const dialog = useRef(null);
  useEffect(() => {
    if (isOpen && !dialog.current.open) dialog.current.showModal();
    else if (!isOpen && dialog.current.open) dialog.current.close();
  }, [isOpen]);

  return (
    <dialog ref={dialog} className="new-debate-session" aria-labelledby="new-debate-session-title"
      aria-describedby="new-debate-session-message" onCancel={e => { e.preventDefault(); onDecision(false); }}>
      <h2 id="new-debate-session-title">{t('history.newSessionQuestion')}</h2>
      <p id="new-debate-session-message">{t('history.newSessionMessage')}</p>
      <div className="new-debate-session-actions">
        <button type="button" onClick={() => onDecision(false)}>{t('history.continueSession')}</button>
        <button type="button" className="primary" onClick={() => onDecision(true)}>{t('history.startNewSession')}</button>
      </div>
    </dialog>
  );
}
