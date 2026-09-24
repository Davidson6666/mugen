import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fonte servida pelo proprio projeto: a apresentacao nao pode depender de
// internet para a interface sair com a cara certa.
import '@fontsource/barlow-condensed/600-italic.css';
import '@fontsource/barlow-condensed/800-italic.css';
import '@fontsource/barlow-condensed/900-italic.css';
import './index.css';
import App from './App.jsx';
import { applyPaletteToCss } from './utils/palette.js';

applyPaletteToCss();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
