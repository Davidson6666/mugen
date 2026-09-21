import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fontes bitmap servidas pelo proprio projeto: a apresentacao nao pode depender
// de internet para a interface sair com a cara certa.
import '@fontsource/press-start-2p';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import './index.css';
import App from './App.jsx';
import { applyPaletteToCss } from './utils/palette.js';

applyPaletteToCss();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
