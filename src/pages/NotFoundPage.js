import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="region_middle">
      <div className="panel xs_12" style={{ backgroundColor: '#FFFFFF', padding: '40px', textAlign: 'center' }}>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'underline' }}>
          Go to Home Page
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
