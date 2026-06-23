import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { Buffer } from "buffer";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ThemeProvider } from "./context/ThemeContext"
import { AuthProvider } from "./context/AuthContext"

// Polyfill Buffer for merkletreejs / keccak256
window.Buffer = Buffer;

// Use createHttpLink for more explicit control
const link = createHttpLink({
  uri: "https://api.studio.thegraph.com/query/YOUR_ID/YOUR_SUBGRAPH/version/latest",
});

const client = new ApolloClient({
  link: link,
  cache: new InMemoryCache(),
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={client}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </ApolloProvider>
    </ErrorBoundary>
  </StrictMode>,
)
