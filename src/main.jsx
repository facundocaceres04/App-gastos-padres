import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ExpensesProvider } from './context/ExpensesContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ExpensesProvider>
      <App />
    </ExpensesProvider>
  </StrictMode>,
);
