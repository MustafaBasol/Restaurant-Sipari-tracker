import React from 'react';
import Providers from './Providers';
import Router from './Router';

const App: React.FC = () => {
  return (
    <Providers>
      <div className="min-h-screen text-text-primary font-sans">
        <Router />
      </div>
    </Providers>
  );
};

export default App;
