import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/custom.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './state/CartContext';
import { StoreAuthProvider } from './state/StoreAuthContext';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreAuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </StoreAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
