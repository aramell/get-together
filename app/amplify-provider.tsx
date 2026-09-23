'use client'

import { ReactNode } from 'react'
import { ChakraProvider, Box } from '@chakra-ui/react'
import { AuthProvider } from '@/lib/contexts/AuthContext'
import { BottomNav } from '@/components/layout/BottomNav'
import theme from '@/lib/theme'

export function AmplifyProvider({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Box display="flex" flexDirection="column" minH="100vh">
          <Box flex={1} pb={{ base: '56px', md: 0 }}>
            {children}
          </Box>
          <BottomNav />
        </Box>
      </AuthProvider>
    </ChakraProvider>
  )
}
