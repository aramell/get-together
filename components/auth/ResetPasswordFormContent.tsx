'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Alert, AlertIcon, Text } from '@chakra-ui/react';
import ResetPasswordForm from './ResetPasswordForm';

export default function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get('email') || '';
  const code = searchParams.get('code') || '';

  const handleSuccess = () => {
    // Redirect to login page after successful reset
    router.push('/auth/login');
  };

  return (
    <>
      {!email && (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">Enter the email address you requested the reset code for</Text>
        </Alert>
      )}

      <Box w="100%">
        <ResetPasswordForm
          email={email}
          code={code}
          onSuccess={handleSuccess}
        />
      </Box>
    </>
  );
}
