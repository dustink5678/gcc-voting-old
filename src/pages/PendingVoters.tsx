import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  List,
  ListItem,
  Flex,
  Container,
  Badge,
} from '@chakra-ui/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types/index';

const PendingVoters = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Subscribe to users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData: User[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as User),
        uid: doc.id,
      }));
      setUsers(userData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error loading users:', error);
      if (error.code === 'permission-denied') {
        setError('You do not have permission to view the pending voters list.');
      } else {
        setError('Failed to load users. Please refresh the page.');
      }
      setIsLoading(false);
    });

    // Subscribe to active question only
    const activeQuestionsQuery = query(collection(db, 'questions'), where('active', '==', true));
    const unsubscribeQuestions = onSnapshot(
      activeQuestionsQuery,
      (snapshot) => {
        const activeQuestion = snapshot.docs[0]; // Should only be one active question
        if (activeQuestion) {
          setCurrentQuestion(activeQuestion.data().questionText);
        } else {
          setCurrentQuestion(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error loading questions:', error);
        setError('Failed to load question data. Please refresh the page.');
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeQuestions();
    };
  }, []);

  // Filter for verified users who haven't voted (exclude shame users who can't vote)
  const pendingVoters = users.filter(
    (user) => user.verified && !user.answered && user.role !== 'shame'
  );

  if (isLoading) {
    return (
      <Box
        width="100vw"
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        py={10}
      >
        <Box
          bg="white"
          p={8}
          borderRadius="md"
          boxShadow="md"
          textAlign="center"
        >
          <Heading size="lg" mb={4}>Loading...</Heading>
          <Text>Loading pending voters...</Text>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        width="100vw"
        minH="100vh"
        bg="gray.50"
        display="flex"
        alignItems="center"
        justifyContent="center"
        py={10}
      >
        <Box
          bg="white"
          p={8}
          borderRadius="md"
          boxShadow="md"
          textAlign="center"
        >
          <Heading size="lg" mb={4} color="garnet.500">Error</Heading>
          <Text mb={4}>{error}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      width="100vw"
      minH="100vh"
      bg="gray.50"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={10}
    >
      <Container maxW="container.md">
        <Box
          bg="white"
          p={8}
          borderRadius="md"
          boxShadow="md"
          width="100%"
          textAlign="center"
        >
          <Heading size="lg" mb={2}>Wall of Shame</Heading>
          
          {currentQuestion ? (
            <Text fontSize="xl" mb={6} color="gray.600">
              Current Question: "{currentQuestion}"
            </Text>
          ) : (
            <Text fontSize="xl" mb={6} color="gray.600">
              No active question
            </Text>
          )}

          {pendingVoters.length > 0 ? (
            <>
              <Badge fontSize="md" colorScheme="garnet" mb={4}>
                {pendingVoters.length} Member{pendingVoters.length !== 1 ? 's' : ''} Pending
              </Badge>
              
              <List spacing={3}>
                {pendingVoters.map((user) => (
                  <ListItem 
                    key={user.uid}
                    p={3}
                    bg="garnet.50"
                    borderRadius="md"
                    boxShadow="sm"
                    fontSize="xl"
                    fontWeight="bold"
                  >
                    {user.displayName || user.name || "Unknown Member"}
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <Box 
              p={10} 
              textAlign="center"
              fontSize="xl"
              fontWeight="bold"
              color="green.500"
            >
              All members have voted!
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default PendingVoters; 