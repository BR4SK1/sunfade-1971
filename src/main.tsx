import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PaletteProvider } from './context/PaletteContext.js';
import { ThemeWrapper } from './theme/ThemeWrapper.js';
import App from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PaletteProvider>
      <ThemeWrapper>
        <App />
      </ThemeWrapper>
    </PaletteProvider>
  </StrictMode>,
);
