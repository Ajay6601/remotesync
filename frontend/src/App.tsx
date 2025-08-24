// frontend/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/index.ts';
import { useAppDispatch, useAppSelector } from './hooks/redux.ts';
import { getCurrentUser } from './store/slices/authSlice.ts';

// Components
import Login from './components/auth/Login.tsx';
import Register from './components/auth/Register.tsx';
import Dashboard from './components/dashboard/Dashboard.tsx';
import WorkspaceView from './components/workspace/WorkspaceView.tsx';
import LoadingSpinner from './components/ui/LoadingSpinner.tsx';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Auth Route wrapper
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
};

// App content component
const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated, user]);

  return (
    <div className="App">
      <Routes>
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <Register />
            </AuthRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/*"
          element={
            <ProtectedRoute>
              <WorkspaceView />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;




// import React, { useEffect } from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { Provider } from 'react-redux';
// import { Toaster } from 'react-hot-toast';
// import { store } from './store/index.ts';
// import { useAppDispatch, useAppSelector } from './hooks/redux.ts';
// import { getCurrentUser } from './store/slices/authSlice.ts';

// // Components
// import Login from './components/auth/Login.tsx';

// // Protected Route wrapper
// const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  
//   console.log('ProtectedRoute - isAuthenticated:', isAuthenticated, 'loading:', loading);
  
//   if (loading) {
//     return <div>Loading...</div>;
//   }
  
//   return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
// };

// // Auth Route wrapper
// const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const { isAuthenticated } = useAppSelector((state) => state.auth);
  
//   console.log('AuthRoute - isAuthenticated:', isAuthenticated);
  
//   return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
// };

// // Simple Dashboard component
// const Dashboard: React.FC = () => {
//   return (
//     <div className="min-h-screen bg-gray-50 p-8">
//       <div className="max-w-7xl mx-auto">
//         <h1 className="text-3xl font-bold text-gray-900 mb-8">🚀 RemoteSync Dashboard</h1>
//         <p className="text-gray-600">Welcome! You are successfully logged in.</p>
//       </div>
//     </div>
//   );
// };

// // App content component
// const AppContent: React.FC = () => {
//   const dispatch = useAppDispatch();
//   const { isAuthenticated, user } = useAppSelector((state) => state.auth);

//   useEffect(() => {
//     console.log('AppContent - Auth state:', { isAuthenticated, user });
//     if (isAuthenticated && !user) {
//       dispatch(getCurrentUser());
//     }
//   }, [dispatch, isAuthenticated, user]);

//   return (
//     <div className="App">
//       <Routes>
//         <Route
//           path="/login"
//           element={
//             <AuthRoute>
//               <Login />
//             </AuthRoute>
//           }
//         />
//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Dashboard />
//             </ProtectedRoute>
//           }
//         />
//         <Route path="/" element={<Navigate to="/dashboard" />} />
//       </Routes>
//       <Toaster
//         position="top-right"
//         toastOptions={{
//           duration: 4000,
//           style: {
//             background: '#363636',
//             color: '#fff',
//           },
//         }}
//       />
//     </div>
//   );
// };

// const App: React.FC = () => {
//   return (
//     <Provider store={store}>
//       <Router>
//         <AppContent />
//       </Router>
//     </Provider>
//   );
// };

// export default App;