import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, Unsubscribe, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Question } from '../types/index';
import { useAuthContext } from '../contexts/AuthContext';

interface DataContextType {
  currentUser: User | null;
  questions: Question[];
  currentQuestion: Question | null;
  isDataLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const { currentUser: user } = useAuthContext() as { currentUser: any };

  useEffect(() => {
    if (!user || !user.uid) return;

    if (!isInitialLoadComplete) {
      setIsDataLoading(true);
    }
    
    let unsubscribeUsers: Unsubscribe | null = null;
    let unsubscribeQuestions: Unsubscribe | null = null;

    // Track if both subscriptions have received initial data
    let userDataReceived = false;
    let questionDataReceived = false;

    // Subscribe to current user's document only
    unsubscribeUsers = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const userData: User = {
          ...(snapshot.data() as User),
          uid: snapshot.id,
        };
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
      }
      
      // Mark user data as received
      userDataReceived = true;
      
      // If both subscriptions have received data, mark initial load as complete
      if (userDataReceived && questionDataReceived && !isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
        setIsDataLoading(false);
      }
    }, error => {
      console.error("Error listening to user document:", error);
      setIsDataLoading(false);
      setIsInitialLoadComplete(true);
    });

    // Subscribe to ACTIVE questions only
    const activeQuestionsQuery = query(collection(db, 'questions'), where('active', '==', true));
    unsubscribeQuestions = onSnapshot(activeQuestionsQuery, (snapshot) => {
      const questionData = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        questionId: doc.id,
      }));
      setQuestions(questionData);
      const active = questionData.find((q) => q.active);
      setCurrentQuestion(active || null);
      
      // Mark question data as received
      questionDataReceived = true;
      
      // If both subscriptions have received data, mark initial load as complete
      if (userDataReceived && questionDataReceived && !isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
        setIsDataLoading(false);
      }
    }, error => {
      console.error("Error listening to questions:", error);
      setIsDataLoading(false);
      setIsInitialLoadComplete(true);
    });

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeQuestions) unsubscribeQuestions();
    };
  }, [user, isInitialLoadComplete]);

  return (
    <DataContext.Provider value={{ currentUser, questions, currentQuestion, isDataLoading }}>
      {children}
    </DataContext.Provider>
  );
}; 