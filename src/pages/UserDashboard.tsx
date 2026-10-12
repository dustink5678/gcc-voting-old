import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Stack,
  useToast,
  Radio,
  RadioGroup,
  Flex,
  Center,
  Spinner,
} from '@chakra-ui/react';
import { updateDoc, doc, getDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const UserDashboard = () => {
  const { user } = useAuth();
  const { currentQuestion, isDataLoading, currentUser } = useData();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!currentUser) return;
    setHasVoted(currentUser.answered);
  }, [currentUser]);

  const handleVote = async () => {
    if (!currentQuestion || !selectedOption || !user) return;

    // Optimistic UX: mark as voting/voted immediately
    setIsVoting(true);
    const previousHasVoted = hasVoted;
    setHasVoted(true);
    try {
      // Check if user has already voted
      if (currentUser?.answered) {
        throw new Error('You have already voted on this question');
      }

      // Check if question is still active
      if (!currentQuestion.active) {
        throw new Error('Voting for this question has ended');
      }

      // Use atomic increment to update the vote count
      const questionRef = doc(db, 'questions', currentQuestion.questionId);
      const answersPath = `answers.${selectedOption}`;
      
      await updateDoc(questionRef, {
        [answersPath]: increment(1),
        lastVoteAt: serverTimestamp()
      });

      // Update user's answered status
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        answered: true,
        votedAt: serverTimestamp(),
        lastVoteOption: selectedOption
      });
      // success: keep optimistic state
      
      toast({
        title: 'Vote submitted successfully',
        status: 'success',
        duration: 3000,
      });
      
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      // revert optimistic state on error when appropriate
      setHasVoted(previousHasVoted);
      let errorMessage = 'Please try again or contact an administrator.';
      
      if (error.message?.includes('already voted')) {
        errorMessage = 'You have already voted on this question.';
        setHasVoted(true);
      } else if (error.message?.includes('not found')) {
        errorMessage = 'This question is no longer available.';
      } else if (error.message?.includes('no longer active') || error.message?.includes('ended')) {
        errorMessage = 'Voting for this question has ended.';
      }
      
      toast({
        title: 'Error submitting vote',
        description: errorMessage,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsVoting(false);
    }
  };

  const renderContent = () => {
    if (!currentUser?.verified) {
      return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
          <Box 
            maxW="lg" 
            w="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md" 
            textAlign="center"
          >
            <Heading mb={4}>Waiting for Verification</Heading>
            <Text color="gray.600">
              Your account is pending verification from an administrator. 
              You will be able to participate in voting once your account is verified.
            </Text>
          </Box>
        </Box>
      );
    }

    if (hasVoted) {
      return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
          <Box 
            maxW="lg" 
            w="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md" 
            textAlign="center"
          >
            <Heading mb={4}>Waiting for Next Question</Heading>
            <Text color="gray.600">
              Thank you for submitting your vote! 
              Please wait until the next question is published by the admin.
            </Text>
          </Box>
        </Box>
      );
    }

    if (!currentQuestion) {
      return (
        <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
          <Box 
            maxW="lg" 
            w="100%" 
            bg="white" 
            p={8} 
            borderRadius="md" 
            boxShadow="md" 
            textAlign="center"
          >
            <Heading mb={4}>No Active Question</Heading>
            <Text color="gray.600">
              There is currently no active question to vote on. 
              Please check back later.
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box width="100%" display="flex" justifyContent="center" alignItems="center" py={10}>
        <Box
          maxW="lg"
          w="100%"
          p={8}
          bg="white"
          borderRadius="md"
          boxShadow="md"
        >
          <Stack spacing={6}>
            <Heading size="lg" textAlign="center">{currentQuestion.questionText}</Heading>
            <RadioGroup onChange={setSelectedOption} value={selectedOption}>
              <Stack spacing={4}>
                {currentQuestion.options.map((option) => (
                  <Radio key={option} value={option} size="lg">
                    {option}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
            <Button
              colorScheme="garnet"
              size="lg"
              w="full"
              onClick={handleVote}
              isDisabled={!selectedOption || isVoting}
            >
              {isVoting ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  };

  return (
    <Box 
      width="100vw" 
      minH="100%" 
      bg="gray.50" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
    >
      {isDataLoading && !currentQuestion ? (
        <Center>
          <Spinner size="xl" color="garnet.500" thickness="4px" />
        </Center>
      ) : (
        renderContent()
      )}
    </Box>
  );
};

export default UserDashboard; 