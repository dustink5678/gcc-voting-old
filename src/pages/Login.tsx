import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  useToast,
  Flex,
  Image,
  Center,
  Spinner,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
} from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import gccLogo from '../assets/logo.png';

const Login = () => {
  const { signInWithGoogle, resetUserCache, signOut, user } = useAuth() as any;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Effect for checking existing user and redirect
  useEffect(() => {
    if (user) {
      // @ts-ignore
      if (user.role === 'admin' || user.email === 'dustinisaacking@gmail.com') {
        navigate('/admin');
      // @ts-ignore
      } else if (user.role === 'shame') {
        navigate('/pending');
      // @ts-ignore
      } else if (user.verified) {
        navigate('/dashboard');
      } else {
        toast({
          title: 'Account pending verification',
          description: 'Your account requires verification by an administrator.',
          status: 'info',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  }, [user, navigate, toast]);

  // Handle Google sign-in button click
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      handleAuthError(error, 'Google');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Reset Session button click
  const handleResetSession = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      resetUserCache();
      await signOut();
      toast({
        title: 'Session Reset',
        description: 'Your session and cache have been cleared. Please try signing in again.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      setErrorMessage('Failed to reset session. Please reload the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for error handling
  const handleAuthError = (error: any, provider: string) => {
    console.error(`Error starting ${provider} sign-in:`, error);
    let errorMsg = `${provider} authentication failed. Please try again.`;
    if (error.code === 'auth/network-request-failed') {
      errorMsg = 'Network error. This may be caused by content blockers or privacy settings. Try disabling ad blockers or using incognito mode.';
    } else if (error.code === 'auth/web-storage-unsupported' || error.code === 'auth/storage-unavailable') {
      errorMsg = 'Your browser has disabled cookies or storage. Please enable them for this site or try a different browser.';
    } else if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Authentication popup was blocked or closed. Please allow popups for this site.';
    } else if (error.message) {
      errorMsg = error.message;
    }
    setErrorMessage(errorMsg);
    toast({
      title: `${provider} Authentication Error`,
      description: errorMsg,
      status: 'error',
      duration: 7000,
      isClosable: true,
    });
  };

  // Show loading spinner if authentication is in progress
  if (isLoading) {
    return (
      <Box 
        width="100%" 
        minH="calc(100vh - 56px)" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Center>
          <VStack spacing={4}>
            <Spinner size="xl" color="garnet.500" thickness="4px" />
            <Text>
              {'Processing, please wait...'}
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box 
      width="100%" 
      minH="calc(100vh - 56px)" 
      bg="gray.50" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
    >
      <Flex 
        direction="column" 
        align="center" 
        maxW="md"
        width="100%"
        p={8}
        bg="white"
        boxShadow="md"
        borderRadius="md"
      >
        <Image 
          src={gccLogo}
          alt="Gamecock Consulting Club Logo" 
          height="100px"
          objectFit="contain"
          mb={6}
        />
        <Heading mb={6} textAlign="center" color="garnet.500">Gamecock Consulting Club Voting</Heading>
        <Text mb={8} textAlign="center" color="gray.600">
          Sign in with your Google account to participate in club voting
        </Text>
        
        {errorMessage && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription display="block">
                {errorMessage}
              </AlertDescription>
            </Box>
            <CloseButton 
              position="absolute" 
              right="8px" 
              top="8px" 
              onClick={() => setErrorMessage(null)}
            />
          </Alert>
        )}
        
        <VStack spacing={4} width="100%">
          <Button
            size="lg"
            colorScheme="garnet"
            onClick={handleGoogleSignIn}
            width="100%"
            leftIcon={<FcGoogle size={20} />}
            isLoading={isLoading}
          >
            Sign in with Google
          </Button>
          <Button
            size="md"
            variant="outline"
            colorScheme="gray"
            onClick={handleResetSession}
            width="100%"
            isLoading={isLoading}
          >
            Reset Session / Clear Cache
          </Button>
        </VStack>
      </Flex>
    </Box>
  );
};

export default Login;