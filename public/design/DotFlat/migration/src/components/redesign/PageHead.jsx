import React from 'react';

/**
 * Standard page header with display title + accent word + optional sub & actions.
 * Matches the design system across all DotFlat screens.
 */
export default function PageHead({ title, accent, sub, actions }) {
  return (
    <div className="df-page-head">
      <div>
        <h1 className="df-page-head__title">
          {title}{' '}
          {accent && <span style={{ color: 'var(--df-accent)' }}>{accent}</span>}
        </h1>
        <div className="df-accent-rule"></div>
        {sub && <p className="df-page-head__sub">{sub}</p>}
      </div>
      {actions && <div className="df-page-head__actions">{actions}</div>}
    </div>
  );
}
