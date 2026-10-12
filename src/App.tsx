import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel'
import UserDashboard from './pages/UserDashboard';
import PendingVoters from './pages/PendingVoters';
import LoadingScreen from './components/LoadingScreen';
import Navbar from './components/Navbar';

// Gamecock Consulting Club theme: Garnet #73000A, Black #000000, White #FFFFFF, Light Gray #F2F2F2
const theme = extendTheme({
  colors: {
    garnet: {
      50: '#f5e5e6',
      100: '#e6bfc2',
      200: '#d6999e',
      300: '#c6737a',
      400: '#b74d56',
      500: '#73000A', // Carolina Garnet - primary
      600: '#5c0008',
      700: '#450006',
      800: '#2e0004',
      900: '#170002',
    },
    blue: {
      50: '#f2f2f2',
      100: '#e6e6e6',
      200: '#bfbfbf',
      300: '#999999',
      400: '#4d4d4d',
      500: '#73000A',
      600: '#5c0008',
      700: '#450006',
      800: '#2e0004',
      900: '#170002',
    },
    red: {
      50: '#f5e5e6',
      100: '#e6bfc2',
      200: '#d6999e',
      300: '#c6737a',
      400: '#b74d56',
      500: '#73000A', // Carolina Garnet
      600: '#5c0008',
      700: '#450006',
      800: '#2e0004',
      900: '#170002',
    },
    gray: {
      50: '#F2F2F2', // Light gray background tone
    },
  },
});

const PrivateRoute = ({ children, adminOnly = false, controllerOnly = false }: { children: React.ReactNode; adminOnly?: boolean; controllerOnly?: boolean }) => {
  const { user, loading } = useAuth() as any;
  
  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin' && user.email !== 'dustinisaacking@gmail.com') {
    return <Navigate to="/dashboard" replace />;
  }

  if (controllerOnly) {
    const isController = user.role === 'admin';
    if (!isController) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Calculate content height based on whether user is admin (with tabs) or not
  const contentMinHeight = (user.role === 'admin') ? 'calc(100vh - 98px)' : 'calc(100vh - 56px)';

  return (
    <Flex direction="column" width="100vw" minH="100vh">
      <Navbar />
      <Box flex="1" width="100%" maxW="100vw" minH={contentMinHeight}>
        {children}
      </Box>
    </Flex>
  );
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth() as any;

  if (loading) {
    return <LoadingScreen />;
  }

      // If user is authenticated, redirect them immediately
    if (user) {
      if (user.role === 'admin' || user.email === 'dustinisaacking@gmail.com') {
        return <Navigate to="/admin" replace />;
      } else if (user.role === 'shame') {
        return <Navigate to="/pending" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }

  return (
    <Box width="100vw" minH="100vh">
      {children}
    </Box>
  );
};

// MODIFY THIS COMPONENT:
const AppContent = () => {
  const { user, loading } = useAuth() as any;
  
  // Show loading screen while determining authentication state
  if (loading) {
    return <LoadingScreen />;
  }
  
  return (
    <Flex direction="column" width="100vw" minH="100vh" maxW="100vw" overflow="hidden">
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route
          path="/admin"
          element={
            <PrivateRoute adminOnly>
              <AdminPanel />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <UserDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/pending"
          element={
            <PrivateRoute>
              <PendingVoters />
            </PrivateRoute>
          }
        />
        <Route path="/" element={
          loading ? (
            <LoadingScreen />
          ) : (user?.role === 'admin' || user?.email === 'dustinisaacking@gmail.com') ? (
            <Navigate to="/admin" replace />
          ) : user?.role === 'shame' ? (
            <Navigate to="/pending" replace />
          ) : (
            <Navigate to="/dashboard" replace />
          )
        } />
      </Routes>
    </Flex>
  );
};


const App = () => {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <AuthProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
};

export default App;
