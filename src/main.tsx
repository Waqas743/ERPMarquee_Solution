import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import Swal from 'sweetalert2';

if (!(window as any).__fetchWrapped) {
  const originalFetch = window.fetch.bind(window);
  const activeRequests = new Map();

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method || 'GET';
    const body = init?.body ? String(init.body) : '';
    
    // Create a unique key for the request to prevent duplicates
    const requestKey = `${method}:${url}:${body}`;

    if (activeRequests.has(requestKey)) {
      return activeRequests.get(requestKey).then((res: Response) => res.clone());
    }

    const headers = new Headers(init?.headers || {});
    const token = localStorage.getItem('authToken');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    const fetchPromise = originalFetch(input, { ...init, headers }).then(response => {
      // Handle 401 Unauthorized globally
      if (response.status === 401 && window.location.pathname !== '/login') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/login';
      }
      
      // Handle other server errors (400, 500, etc.) globally
      if (response.status >= 400 && response.status !== 401) {
        console.error(`Server Error: ${response.status} on ${input}`);
        try {
          const clone = response.clone();
          clone.json().then(errorData => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: errorData.message || `An error occurred (${response.status})`
            });
          }).catch(() => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: `An error occurred (${response.status})`
            });
          });
        } catch (e) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `An error occurred (${response.status})`
          });
        }
      }
      
      return response;
    }).catch(error => {
      // Handle network errors (e.g., server down, no internet)
      console.error("Global fetch error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: error.message || 'Failed to connect to the server'
      });
      throw error;
    }).finally(() => {
      // Keep in cache for 300ms to debounce double-clicks or strict mode double-renders
      setTimeout(() => {
        activeRequests.delete(requestKey);
      }, 300);
    });

    activeRequests.set(requestKey, fetchPromise);
    return fetchPromise.then(res => res.clone());
  };
  (window as any).__fetchWrapped = true;
}

createRoot(document.getElementById('root')!).render(
  <App />
);
