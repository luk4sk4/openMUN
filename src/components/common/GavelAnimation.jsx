import React from 'react';
import { createPortal } from 'react-dom';
import gavelImage from '../../assets/gavel-realistic.webp';
import gavelBase from '../../assets/gavel-base.webp';
import './GavelAnimation.css';

/** Mount to play once; use onComplete to unmount, and mount again to replay. */
export default function GavelAnimation({ onComplete }) {
  return createPortal(
    <div
      className="gavel-animation"
      aria-hidden="true"
      onAnimationEnd={event => {
        if (event.target === event.currentTarget) onComplete?.();
      }}
    >
      <svg className="gavel-animation__scene" viewBox="0 0 360 360" focusable="false">
        <g className="gavel-animation__impact" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <ellipse cx="130" cy="248" rx="56" ry="16" />
          <path d="M52 218l-16-10m174 10 16-10M130 176v-18" />
        </g>
        <image href={gavelBase} x="58" y="225" width="150" height="75" />
        <g className="gavel-animation__hammer">
          <image href={gavelImage} x="80" y="125" width="260" height="130" />
        </g>
      </svg>
    </div>,
    document.body
  );
}
