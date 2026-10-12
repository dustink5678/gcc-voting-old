import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Stack,
  Text,
  Table,
  Select,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Flex,
  Divider,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  HStack,
  Center,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  getDocs,
  updateDoc,
  doc,
  addDoc,
  Timestamp,
  writeBatch,
  deleteDoc,
  getDoc,
  collection,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Question } from '../types/index';
import { FiTrash2 } from 'react-icons/fi';
import { useData } from '../contexts/DataContext';

const AdminPanel = () => {
  // Get data from context instead of fetching it
  const { questions, currentQuestion, isDataLoading } = useData();

  // Calculate vote percentages
  const calculatePercentages = (answers: Record<string, number>) => {
    if (!answers) return {};

    const totalVotes = Object.values(answers).reduce((sum, count) => sum + count, 0);
    if (totalVotes === 0) return {};

    const percentages: Record<string, number> = {};
    Object.entries(answers).forEach(([option, count]) => {
      percentages[option] = Math.round((count / totalVotes) * 100);
    });

    return percentages;
  };

  // Sort questions based on selected criteria
  const getSortedQuestions = (questions: Question[]) => {
    return [...questions].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          // Sort by createdAt descending (newest first)
          const bTime = b.createdAt ? (b.createdAt as any).toMillis?.() || b.createdAt.getTime() : 0;
          const aTime = a.createdAt ? (a.createdAt as any).toMillis?.() || a.createdAt.getTime() : 0;
          return bTime - aTime;
        case 'date-asc':
          // Sort by createdAt ascending (oldest first)
          const aTimeAsc = a.createdAt ? (a.createdAt as any).toMillis?.() || a.createdAt.getTime() : 0;
          const bTimeAsc = b.createdAt ? (b.createdAt as any).toMillis?.() || b.createdAt.getTime() : 0;
          return aTimeAsc - bTimeAsc;
        case 'votes-desc':
          // Sort by total votes descending
          const aTotal = Object.values(a.answers || {}).reduce((sum, count) => sum + count, 0);
          const bTotal = Object.values(b.answers || {}).reduce((sum, count) => sum + count, 0);
          return bTotal - aTotal;
        case 'votes-asc':
          // Sort by total votes ascending
          const aTotalAsc = Object.values(a.answers || {}).reduce((sum, count) => sum + count, 0);
          const bTotalAsc = Object.values(b.answers || {}).reduce((sum, count) => sum + count, 0);
          return aTotalAsc - bTotalAsc;
        case 'yes-percent-desc':
          // Sort by first option percentage descending
          const aPercentages = calculatePercentages(a.answers || {});
          const bPercentages = calculatePercentages(b.answers || {});
          const aFirstOption = a.options[0] || '';
          const bFirstOption = b.options[0] || '';
          const aPercent = aPercentages[aFirstOption] || 0;
          const bPercent = bPercentages[bFirstOption] || 0;
          return bPercent - aPercent;
        case 'yes-percent-asc':
          // Sort by first option percentage ascending
          const aPercentagesAsc = calculatePercentages(a.answers || {});
          const bPercentagesAsc = calculatePercentages(b.answers || {});
          const aFirstOptionAsc = a.options[0] || '';
          const bFirstOptionAsc = b.options[0] || '';
          const aPercentAsc = aPercentagesAsc[aFirstOptionAsc] || 0;
          const bPercentAsc = bPercentagesAsc[bFirstOptionAsc] || 0;
          return aPercentAsc - bPercentAsc;
        default:
          return 0;
      }
    });
  };

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  const [newQuestion, setNewQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
  });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isDeleteAllQuestionsAlertOpen, setIsDeleteAllQuestionsAlertOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteQuestionLoading, setDeleteQuestionLoading] = useState(false);
  const [deleteAllQuestionsLoading, setDeleteAllQuestionsLoading] = useState(false);
  const [deleteAllUsersLoading, setDeleteAllUsersLoading] = useState(false);
  const [isDeleteAllUsersAlertOpen, setIsDeleteAllUsersAlertOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'votes-desc' | 'votes-asc' | 'yes-percent-desc' | 'yes-percent-asc'>('date-desc');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteUserAlertOpen, 
    onOpen: onDeleteUserAlertOpen, 
    onClose: onDeleteUserAlertClose 
  } = useDisclosure();
  const {
    isOpen: isDeleteQuestionAlertOpen,
    onOpen: onDeleteQuestionAlertOpen,
    onClose: onDeleteQuestionAlertClose
  } = useDisclosure();
  const cancelRef = useRef(null);
  const toast = useToast();

  // Real-time listener for all users in admin panel
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const setupUsersListener = () => {
      try {
        setUsersLoading(true);
        unsubscribe = onSnapshot(
          collection(db, 'users'),
          (snapshot) => {
            const userData: User[] = snapshot.docs.map((doc) => ({
              ...(doc.data() as User),
              uid: doc.id,
            }));
            setUsers(userData);
            setUsersLoading(false);
          },
          (error) => {
            console.error('Error listening to users:', error);
            toast({
              title: 'Error fetching users',
              status: 'error',
              duration: 3000,
            });
            setUsersLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up users listener:', error);
        toast({
          title: 'Error setting up real-time updates',
          status: 'error',
          duration: 3000,
        });
        setUsersLoading(false);
      }
    };

    setupUsersListener();

    // Cleanup function to unsubscribe from the listener
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast]);

  // Real-time listener for all questions in admin panel (for question history)
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const setupQuestionsListener = () => {
      try {
        unsubscribe = onSnapshot(
          collection(db, 'questions'),
          (snapshot) => {
            const questionData: Question[] = snapshot.docs.map((doc) => ({
              ...(doc.data() as Question),
              questionId: doc.id,
            }));
            setAllQuestions(questionData);
          },
          (error) => {
            console.error('Error listening to questions:', error);
            toast({
              title: 'Error fetching questions',
              status: 'error',
              duration: 3000,
            });
          }
        );
      } catch (error) {
        console.error('Error setting up questions listener:', error);
        toast({
          title: 'Error setting up question updates',
          status: 'error',
          duration: 3000,
        });
      }
    };

    setupQuestionsListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast]);

  const handleChangeUserRole = async (userId: string, newRole: 'admin' | 'regent' | 'user') => {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        toast({
          title: 'User not found',
          description: 'The user may have been deleted.',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      await updateDoc(userRef, { role: newRole });
      toast({
        title: `User role updated to ${newRole}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error updating user role',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleVerifyUser = async (userId: string, verified: boolean) => {
    try {
      // First check if user document still exists
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast({
          title: 'User not found',
          description: 'The user may have been deleted.',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      await updateDoc(userRef, { verified });
      toast({
        title: `User ${verified ? 'verified' : 'unverified'} successfully`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error updating user',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    onDeleteUserAlertOpen();
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleteLoading(true);
    try {
      // Delete the user document from Firestore
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      
      toast({
        title: 'User deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error deleting user',
        description: 'Failed to delete user. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleteLoading(false);
      onDeleteUserAlertClose();
      setUserToDelete(null);
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleAddOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, ''],
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = [...newQuestion.options];
    newOptions.splice(index, 1);
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  const handleCreateQuestion = async () => {
    try {
      const batch = writeBatch(db);

      // Deactivate current question if it exists
      if (currentQuestion) {
        batch.update(doc(db, 'questions', currentQuestion.questionId), { active: false });
      }

      // Create new question
      const questionRef = await addDoc(collection(db, 'questions'), {
        questionText: newQuestion.questionText,
        options: newQuestion.options.filter((opt) => opt.trim() !== ''),
        active: true,
        createdAt: Timestamp.now(),
        answers: {},
      });

      // Reset all users' answered status using in-memory users
      users.forEach((u) => {
        batch.update(doc(db, 'users', u.uid), { answered: false });
      });

      await batch.commit();

      // No need to update local state - context handles this

      setNewQuestion({
        questionText: '',
        options: ['', '', '', ''],
      });
      onClose();
      toast({
        title: 'Question created successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: 'Error creating question',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleActivateQuestion = async (questionId: string) => {
    try {
      const batch = writeBatch(db);
  
      // Deactivate all questions
      for (const question of questions) {
        batch.update(doc(db, 'questions', question.questionId), { active: false });
      }
  
      // Activate selected question and reset its answers
      batch.update(doc(db, 'questions', questionId), { 
        active: true,
        answers: {} // Reset the answers object to clear vote counts
      });
  
      // Reset all users' answered status using in-memory users
      users.forEach((u) => {
        batch.update(doc(db, 'users', u.uid), { answered: false });
      });
  
      await batch.commit();
  
      // No need to update local state - context handles this
  
      toast({
        title: 'Question reset and activated successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error activating question:', error);
      toast({
        title: 'Error activating question',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Filter for users who haven't voted
  const pendingVoters = useMemo(() => users.filter(user => user.verified && !user.answered), [users]);
  
  // Count verified and unverified users
  const verifiedUsers = useMemo(() => users.filter(user => user.verified).length, [users]);
  const unverifiedUsers = useMemo(() => users.filter(user => !user.verified).length, [users]);
  
  // Sort users to display unverified users at the top
  const sortedUsers = useMemo(() => {
    const arr = [...users];
    arr.sort((a, b) => {
      if (a.verified && !b.verified) return 1;
      if (!a.verified && b.verified) return -1;
      return (a.displayName || a.name || "").localeCompare(b.displayName || b.name || "");
    });
    return arr;
  }, [users]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedUsers.length / pageSize)), [sortedUsers.length]);
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage]);

  const handleDeleteQuestion = async (question: Question) => {
    setQuestionToDelete(question);
    onDeleteQuestionAlertOpen();
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    setDeleteQuestionLoading(true);
    try {
      // Delete the question document from Firestore
      await deleteDoc(doc(db, 'questions', questionToDelete.questionId));
      
      toast({
        title: 'Question deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error deleting question',
        description: 'Failed to delete question. Please try again.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleteQuestionLoading(false);
      onDeleteQuestionAlertClose();
      setQuestionToDelete(null);
    }
  };

  const handleDeleteAllQuestions = () => {
    setIsDeleteAllQuestionsAlertOpen(true);
  };

  const confirmDeleteAllQuestions = async () => {
    setDeleteAllQuestionsLoading(true);
    try {
      const batch = writeBatch(db);
      
      for (const question of allQuestions) {
        const questionRef = doc(db, 'questions', question.questionId);
        batch.delete(questionRef);
      }
      
      await batch.commit();
      
      toast({
        title: 'All questions deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting all questions:', error);
      toast({
        title: 'Error deleting all questions',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleteAllQuestionsLoading(false);
      setIsDeleteAllQuestionsAlertOpen(false);
    }
  };

  const handleDeleteAllUsers = () => {
    setIsDeleteAllUsersAlertOpen(true);
  };

  const confirmDeleteAllUsers = async () => {
    setDeleteAllUsersLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Filter out admin and regent users
      const nonAdminUsers = users.filter(user => user.role !== 'admin' && user.role !== 'regent');
      
      for (const user of nonAdminUsers) {
        const userRef = doc(db, 'users', user.uid);
        batch.delete(userRef);
      }
      
      await batch.commit();
      
      toast({
        title: 'All non-admin/regent users deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting all non-admin/regent users:', error);
      toast({
        title: 'Error deleting all non-admin/regent users',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleteAllUsersLoading(false);
      setIsDeleteAllUsersAlertOpen(false);
    }
  };

  return (
    <Box width="100vw" minH="100%" bg="gray.50" p={4}>
      {(isDataLoading || usersLoading) && users.length === 0 ? (
        <Center minH="70vh">
          <Spinner size="xl" color="garnet.500" thickness="4px" />
        </Center>
      ) : (
        <Box maxW="1400px" mx="auto" w="100%">
          <Flex direction="column" w="100%" mb={6}>
            <Heading size="lg" mb={4}>Admin Panel</Heading>
            
            <Box bg="white" p={6} borderRadius="md" boxShadow="md" mb={6} w="100%">
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md">Current Question</Heading>
                <Button colorScheme="garnet" onClick={onOpen}>Create New Question</Button>
              </Flex>
              
              {currentQuestion ? (
                <Box>
                  <Text fontWeight="bold" mb={2}>{currentQuestion.questionText}</Text>
                  <Stack spacing={2} mb={4}>
                    {currentQuestion.options.map((option, index) => {
                      const voteCount = currentQuestion.answers?.[option] || 0;
                      const percentages = calculatePercentages(currentQuestion.answers || {});
                      const percentage = percentages[option] || 0;

                      return (
                        <Text key={index}>
                          {option}: {voteCount} votes ({percentage}%)
                        </Text>
                      );
                    })}
                  </Stack>
                  {Object.keys(currentQuestion.answers || {}).length > 0 && (
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      Total votes: {Object.values(currentQuestion.answers || {}).reduce((sum, count) => sum + count, 0)}
                    </Text>
                  )}
                </Box>
              ) : (
                <Text>No active question. Create a new question to get started.</Text>
              )}
            </Box>
            
            <Tabs isLazy w="100%">
              <TabList>
                <Tab>Users Management</Tab>
                <Tab>Questions History</Tab>
                <Tab>Pending Voters</Tab>
              </TabList>

              <TabPanels w="100%">
                <TabPanel p={0} pt={4}>
                  <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                      <Heading size="md">
                        User Management ({users.length} total - Verified: {verifiedUsers}, Unverified: {unverifiedUsers})
                      </Heading>
                      <Button 
                        colorScheme="garnet" 
                        size="sm"
                        onClick={handleDeleteAllUsers}
                        isLoading={deleteAllUsersLoading}
                      >
                        Delete All Users Except Admin/Regent
                      </Button>
                    </Flex>
                    <Box maxH="500px" overflowY="auto" w="100%">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Status</Th>
                            <Th>Role</Th>
                            <Th>Voted</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {pagedUsers.map((user) => (
                            <Tr key={user.uid}>
                              <Td>{user.displayName || user.name || "User"}</Td>
                              <Td>{user.email}</Td>
                              <Td>
                                <Badge colorScheme={user.verified ? 'green' : 'red'}>
                                  {user.verified ? 'Verified' : 'Unverified'}
                                </Badge>
                              </Td>
                              <Td>
                                <Menu>
                                  <MenuButton as={Button} size="sm" variant="outline">
                                    {user.role || 'user'}
                                  </MenuButton>
                                  <MenuList>
                                    <MenuItem onClick={() => handleChangeUserRole(user.uid, 'user')}>
                                      User
                                    </MenuItem>
                                    <MenuItem onClick={() => handleChangeUserRole(user.uid, 'regent')}>
                                      Regent
                                    </MenuItem>
                                    <MenuItem onClick={() => handleChangeUserRole(user.uid, 'admin')}>
                                      Admin
                                    </MenuItem>
                                  </MenuList>
                                </Menu>
                              </Td>
                              <Td>
                                <Badge colorScheme={user.answered ? 'green' : 'yellow'}>
                                  {user.answered ? 'Voted' : 'Not Voted'}
                                </Badge>
                              </Td>
                              <Td>
                                <Flex gap={2}>
                                  {user.verified ? (
                                    (user.role === 'admin' || user.role === 'regent') ? (
                                      <Tooltip label={`${user.role.charAt(0).toUpperCase() + user.role.slice(1)} users cannot be unverified`} hasArrow>
                                        <Button
                                          size="sm"
                                          colorScheme="gray"
                                          isDisabled={true}
                                        >
                                          {user.role}
                                        </Button>
                                      </Tooltip>
                                    ) : (
                                      <Button
                                        size="sm"
                                        colorScheme="garnet"
                                        onClick={() => handleVerifyUser(user.uid, false)}
                                      >
                                        Unverify
                                      </Button>
                                    )
                                  ) : (
                                    <Button
                                      size="sm"
                                      colorScheme="green"
                                      onClick={() => handleVerifyUser(user.uid, true)}
                                    >
                                      Verify
                                    </Button>
                                  )}
                                  <Tooltip label="Delete user" hasArrow>
                                    <IconButton
                                      icon={<FiTrash2 />}
                                      aria-label="Delete user"
                                      colorScheme="garnet"
                                      variant="solid"
                                      size="sm"
                                      onClick={() => handleDeleteUser(user)}
                                    />
                                  </Tooltip>
                                </Flex>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      <Flex justifyContent="space-between" alignItems="center" mt={4}>
                        <Text fontSize="sm">Page {currentPage} of {totalPages}</Text>
                        <HStack>
                          <Button size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} isDisabled={currentPage === 1}>Prev</Button>
                          <Button size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} isDisabled={currentPage === totalPages}>Next</Button>
                        </HStack>
                      </Flex>
                    </Box>
                  </Box>
                </TabPanel>

                <TabPanel p={0} pt={4}>
                  <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                    <Flex justifyContent="space-between" alignItems="center" mb={4}>
                      <Heading size="md">Question History</Heading>
                      <Button
                        colorScheme="garnet"
                        size="sm"
                        onClick={handleDeleteAllQuestions}
                        isLoading={deleteAllQuestionsLoading}
                      >
                        Delete All Questions
                      </Button>
                    </Flex>

                    <Flex justifyContent="flex-start" mb={4}>
                      <Select
                        placeholder="Sort by..."
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        width="200px"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="votes-desc">Most Votes</option>
                        <option value="votes-asc">Least Votes</option>
                        <option value="yes-percent-desc">Highest Yes %</option>
                        <option value="yes-percent-asc">Lowest Yes %</option>
                      </Select>
                    </Flex>
                    <Box maxH="500px" overflowY="auto" w="100%">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th width="60px">#</Th>
                            <Th>Question</Th>
                            <Th>Status</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {getSortedQuestions(allQuestions).map((question, index) => (
                            <Tr key={question.questionId}>
                              <Td fontWeight="bold" color="gray.600">{index + 1}</Td>
                              <Td>
                                <Box>
                                  <Text fontWeight="bold">{question.questionText}</Text>
                                  <Box mt={2} ml={2}>
                                    {question.options.map((option) => {
                                      const voteCount = question.answers?.[option] || 0;
                                      const percentages = calculatePercentages(question.answers || {});
                                      const percentage = percentages[option] || 0;

                                      return (
                                        <Text key={option} fontSize="sm" color="gray.600">
                                          {option}: {voteCount} votes ({percentage}%)
                                        </Text>
                                      );
                                    })}
                                    {Object.keys(question.answers || {}).length > 0 && (
                                      <Text fontSize="xs" color="gray.500" mt={1}>
                                        Total: {Object.values(question.answers || {}).reduce((sum, count) => sum + count, 0)} votes
                                      </Text>
                                    )}
                                  </Box>
                                </Box>
                              </Td>
                              <Td>
                                <Badge colorScheme={question.active ? 'green' : 'gray'}>
                                  {question.active ? 'Active' : 'Inactive'}
                                </Badge>
                              </Td>
                              <Td>
                                <HStack spacing={2}>
                                  {(
                                    <Button
                                      size="sm"
                                      colorScheme="green"
                                      onClick={() => handleActivateQuestion(question.questionId)}
                                    >
                                      Redo
                                    </Button>
                                  )}
                                  <Tooltip label="Delete question" hasArrow>
                                    <IconButton
                                      icon={<FiTrash2 />}
                                      aria-label="Delete question"
                                      colorScheme="garnet"
                                      variant="solid"
                                      size="sm"
                                      onClick={() => handleDeleteQuestion(question)}
                                    />
                                  </Tooltip>
                                </HStack>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </Box>
                </TabPanel>
                
                <TabPanel p={0} pt={4}>
                  {pendingVoters.length > 0 ? (
                    <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                      <Heading size="md" mb={4}>Pending Voters ({pendingVoters.length})</Heading>
                      <Text mb={3}>The following users have not voted on the current question:</Text>
                      <Box maxH="500px" overflowY="auto" w="100%">
                        <Table variant="simple" size="sm">
                          <Thead>
                            <Tr>
                              <Th>Name</Th>
                              <Th>Email</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {pendingVoters.map((user) => (
                              <Tr key={user.uid}>
                                <Td>{user.displayName || user.name || "User"}</Td>
                                <Td>{user.email}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    </Box>
                  ) : (
                    <Box bg="white" p={6} borderRadius="md" boxShadow="md" w="100%">
                      <Heading size="md" mb={4}>Pending Voters</Heading>
                      <Text>All verified users have voted on the current question.</Text>
                    </Box>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Flex>
        </Box>
      )}

      {/* Create Question Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Question</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Question Text</FormLabel>
                <Input
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  placeholder="Enter your question"
                />
              </FormControl>

              <FormLabel>Options</FormLabel>
              {newQuestion.options.map((option, index) => (
                <Flex key={index} gap={2}>
                  <Input
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {newQuestion.options.length > 2 && (
                    <Button
                      colorScheme="garnet"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                    >
                      X
                    </Button>
                  )}
                </Flex>
              ))}
              <Button onClick={handleAddOption} colorScheme="garnet" variant="outline">
                Add Option
              </Button>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="garnet"
              onClick={handleCreateQuestion}
              isDisabled={
                newQuestion.questionText.trim() === '' ||
                newQuestion.options.filter((opt) => opt.trim() !== '').length < 2
              }
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteUserAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteUserAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete User
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {userToDelete?.displayName || userToDelete?.email}? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteUserAlertClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="garnet" 
                onClick={confirmDeleteUser} 
                ml={3}
                isLoading={deleteLoading}
                loadingText="Deleting"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete Question Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteQuestionAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteQuestionAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Question
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the question "{questionToDelete?.questionText}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteQuestionAlertClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="garnet" 
                onClick={confirmDeleteQuestion} 
                ml={3}
                isLoading={deleteQuestionLoading}
                loadingText="Deleting"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete All Questions Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteAllQuestionsAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteAllQuestionsAlertOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete All Questions
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete all questions? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                ref={cancelRef} 
                onClick={() => setIsDeleteAllQuestionsAlertOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                colorScheme="garnet" 
                onClick={confirmDeleteAllQuestions} 
                ml={3}
                isLoading={deleteAllQuestionsLoading}
                loadingText="Deleting"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Delete All Users Alert Dialog */}
      <AlertDialog
        isOpen={isDeleteAllUsersAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteAllUsersAlertOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete All Non-Admin/Regent Users
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete all non-admin/regent users? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                ref={cancelRef} 
                onClick={() => setIsDeleteAllUsersAlertOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                colorScheme="garnet" 
                onClick={confirmDeleteAllUsers} 
                ml={3}
                isLoading={deleteAllUsersLoading}
                loadingText="Deleting"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default AdminPanel; 