import React from 'react';

export default function Spinner({ size = 16 }) {
  return (
    <span
      className="df-spinner"
      style={{ width: size, height: size, borderWidth: Math.max(1, size / 8) }}
      aria-hidden="true"
    />
  );
}
