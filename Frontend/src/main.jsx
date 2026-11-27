import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './shared-theme/variables.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./i18n.js"
import AppTheme from "./shared-theme/AppTheme.jsx";
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './redux/store';
import FullScreenLoader from './Components/FullScreenLoader';
import SessionGate from './Components/SessionGate';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
    <PersistGate loading={<FullScreenLoader />} persistor={persistor}>
    <SessionGate>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <AppTheme>
      <CssBaseline/>
      <App />
    </AppTheme>
    </GoogleOAuthProvider>
    </SessionGate>
    </PersistGate>
    </Provider>
  </StrictMode>,
)

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then(() => console.log("Service Worker Registered"))
    .catch((err) => console.error(err));
}
