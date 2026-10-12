import {
  Box,
  Button,
  Flex,
  Text,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Tabs,
  TabList,
  Tab,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on role and current path
  const getTabIndex = () => {
    if (!user) return 0;

    const path = location.pathname;

    if (user.role === 'admin') {
      // Admin tabs: Admin Panel(0), Dashboard(1)
      if (path === '/admin') return 0;
      if (path === '/dashboard') return 1;
      return 0;
    } else if (user.role === 'shame') {
      // Shame tabs: Pending(0)
      if (path === '/pending') return 0;
      return 0;
    } else {
      // User tabs: Dashboard(0)
      if (path === '/dashboard') return 0;
      return 0;
    }
  };

  const handleTabChange = (index: number) => {
    if (!user) return;

    if (user.role === 'admin') {
      if (index === 0) navigate('/admin');
      else if (index === 1) navigate('/dashboard');
    } else if (user.role === 'shame') {
      if (index === 0) navigate('/pending');
    } else {
      if (index === 0) navigate('/dashboard');
    }
  };

  return (
    <Flex
      direction="column"
      width="100vw"
      boxShadow="md"
    >
      <Flex
        as="nav"
        width="100%"
        bg="garnet.500"
        color="white"
        py={2}
        px={4}
        align="center"
        justify="space-between"
      >
        <Box>
          <Text fontWeight="bold" fontSize="lg">Gamecock Consulting Club</Text>
        </Box>

        {user && (
          <Menu>
            <MenuButton 
              as={Button} 
              variant="ghost" 
              color="white" 
              _hover={{ bg: 'garnet.600' }} 
              _active={{ bg: 'garnet.600' }}
            >
              <Flex align="center" gap={2}>
                <Avatar size="sm" src={user.photoURL || undefined} name={user.displayName || user.name || 'User'} />
                <Text display={{ base: 'none', md: 'block' }}>{user.displayName || user.name || 'User'}</Text>
              </Flex>
            </MenuButton>
            <MenuList color="black">
              <MenuItem fontWeight="bold">
                {user.role === 'admin' ? 'Administrator' : user.role === 'shame' ? 'Shame' : 'Member'}
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={signOut}>Sign Out</MenuItem>
            </MenuList>
          </Menu>
        )}
      </Flex>

      {/* Navigation Tabs based on user role */}
      {user && (
        <Tabs
          index={getTabIndex()}
          onChange={handleTabChange}
          variant="enclosed"
          bg="white"
          width="100%"
          colorScheme="garnet"
          px={4}
        >
          <TabList>
            {user.role === 'admin' && (
              <>
                <Tab as={Link} to="/admin">Admin Panel</Tab>
                <Tab as={Link} to="/dashboard">Dashboard</Tab>
              </>
            )}
            {user.role === 'shame' && (
              <>
                <Tab as={Link} to="/pending">Pending</Tab>
              </>
            )}
            {user.role === 'user' && (
              <>
                <Tab as={Link} to="/dashboard">Dashboard</Tab>
              </>
            )}
          </TabList>
        </Tabs>
      )}
    </Flex>
  );
};

export default Navbar; 