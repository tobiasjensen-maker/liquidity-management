import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from '@economic/taco';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider settings={{ uniqueUserIdentifier: 'demo-user' }}>
            <App />
        </Provider>
    </StrictMode>
);
