import React from 'react';
import PageHead from '../components/redesign/PageHead';

/**
 * Empty stub. Real content migrates in Step 2+.
 * Keeps routes working during the foundation phase.
 */
export default function Stub({ title, accent, sub }) {
  return (
    <>
      <PageHead title={title} accent={accent} sub={sub} />
      <div className="df-empty">
        <h3>Coming online</h3>
        <p>This screen is being migrated to the new design. Real data wiring lands in the next step.</p>
      </div>
    </>
  );
}
