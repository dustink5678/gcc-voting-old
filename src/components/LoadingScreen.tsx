import { Box, Spinner, Stack, Text } from '@chakra-ui/react';

const LoadingScreen = () => {
  return (
    <Box
      height="100vh"
      width="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Stack gap={4} align="center">
        <Spinner size="xl" color="garnet.500" thickness="4px" />
        <Text fontSize="xl">Loading...</Text>
      </Stack>
    </Box>
  );
};

export default LoadingScreen; 