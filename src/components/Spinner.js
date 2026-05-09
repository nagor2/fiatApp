import React from 'react';

export default function Spinner({ size = 16 }) {
  return (
    <img
      src="/img/loading.png"
      className="df-spinner"
      style={{ width: size, height: size }}
      alt=""
      aria-hidden="true"
    />
  );
}
