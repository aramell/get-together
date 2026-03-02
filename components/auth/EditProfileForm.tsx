'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Spinner,
  Progress,
  HStack,
} from '@chakra-ui/react';
import { updateProfileSchema, UpdateProfileFormData } from '@/lib/validation/profileSchema';
import { updateUserProfile, requestEmailChange } from '@/lib/services/authService';
import { uploadAvatar } from '@/lib/services/storageService';
import { useAuth } from '@/lib/contexts/AuthContext';

interface EditProfileFormProps {
  onSuccess?: () => void;
  initialProfile?: {
    display_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export default function EditProfileForm({ onSuccess, initialProfile }: EditProfileFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    display_name: initialProfile?.display_name || '',
    new_email: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialProfile?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar must be less than 2MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle input change with real-time validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-specific error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }, [fieldErrors]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccess(null);
      setFieldErrors({});

      try {
        if (!user?.id) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Validate form data
        const validationResult = updateProfileSchema.safeParse(formData);
        if (!validationResult.success) {
          const errors: Record<string, string> = {};
          validationResult.error.issues.forEach((issue) => {
            const fieldName = issue.path[0] as string;
            errors[fieldName] = issue.message;
          });
          setFieldErrors(errors);
          setLoading(false);
          return;
        }

        const updates: Record<string, string> = {};
        if (formData.display_name) {
          updates.display_name = formData.display_name;
        }

        // Handle profile update
        if (Object.keys(updates).length > 0) {
          const result = await updateUserProfile(user.id, updates);
          if (!result.success) {
            setError(result.message || 'Failed to update profile');
            setLoading(false);
            return;
          }
          setSuccess('Profile updated successfully');
        }

        // Handle avatar upload
        if (selectedFile) {
          setUploadProgress(50);
          const uploadResult = await uploadAvatar(user.id, selectedFile);
          if (!uploadResult.success) {
            setError(uploadResult.message || 'Failed to upload avatar');
            setLoading(false);
            return;
          }
          if (uploadResult.url) {
            updates.avatar_url = uploadResult.url;
          }
          setUploadProgress(75);
          setSuccess((prev) => (prev ? prev + '. Avatar updated.' : 'Avatar updated successfully'));
          setSelectedFile(null);
        }

        // Handle email change
        if (formData.new_email) {
          const emailResult = await requestEmailChange(user.id, formData.new_email);
          if (!emailResult.success) {
            setError(emailResult.message || 'Failed to request email change');
            setLoading(false);
            return;
          }
          setSuccess((prev) =>
            prev ? prev + `. ${emailResult.message}` : emailResult.message
          );
          setFormData((prev) => ({ ...prev, new_email: '' }));
        }

        setUploadProgress(100);

        // Call success callback
        if (onSuccess) {
          setTimeout(onSuccess, 1000);
        }
      } catch (err: any) {
        console.error('Form submission error:', err);
        setError(err.message || 'An error occurred while updating your profile');
      } finally {
        setLoading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    },
    [formData, selectedFile, user, onSuccess]
  );

  return (
    <Box as="form" onSubmit={handleSubmit} noValidate>
      <VStack spacing={6} align="stretch">
        {/* Error Alert */}
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <Text>{success}</Text>
          </Alert>
        )}

        {/* Display Name Field */}
        <FormControl isInvalid={!!fieldErrors.display_name}>
          <FormLabel htmlFor="display_name">Display Name</FormLabel>
          <Input
            id="display_name"
            name="display_name"
            type="text"
            placeholder="Enter your display name"
            value={formData.display_name}
            onChange={handleInputChange}
            disabled={loading}
            aria-describedby="display_name-error"
          />
          {fieldErrors.display_name && (
            <FormErrorMessage id="display_name-error">
              {fieldErrors.display_name}
            </FormErrorMessage>
          )}
        </FormControl>

        {/* New Email Field */}
        <FormControl isInvalid={!!fieldErrors.new_email}>
          <FormLabel htmlFor="new_email">New Email Address (Optional)</FormLabel>
          <Input
            id="new_email"
            name="new_email"
            type="email"
            placeholder="Enter new email address"
            value={formData.new_email}
            onChange={handleInputChange}
            disabled={loading}
            aria-describedby="new_email-error"
          />
          {formData.new_email && (
            <Text fontSize="xs" color="fg.muted" mt={2}>
              A confirmation email will be sent to this address
            </Text>
          )}
          {fieldErrors.new_email && (
            <FormErrorMessage id="new_email-error">
              {fieldErrors.new_email}
            </FormErrorMessage>
          )}
        </FormControl>

        {/* Avatar Upload */}
        <FormControl>
          <FormLabel htmlFor="avatar">Profile Picture (Optional)</FormLabel>
          <Input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={handleFileChange}
            disabled={loading}
            aria-label="Upload profile picture"
          />
          <Text fontSize="xs" color="fg.muted" mt={2}>
            JPG, PNG, or GIF • Max 2MB
          </Text>

          {/* Avatar Preview */}
          {previewUrl && (
            <Box mt={4}>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Preview:
              </Text>
              <Box
                as="img"
                src={previewUrl}
                alt="Avatar preview"
                maxW="120px"
                borderRadius="lg"
                borderWidth="1px"
              />
            </Box>
          )}
        </FormControl>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Box>
            <Text fontSize="sm" mb={2}>
              Uploading... {uploadProgress}%
            </Text>
            <Progress value={uploadProgress} size="sm" borderRadius="full" />
          </Box>
        )}

        {/* Submit Button */}
        <HStack spacing={4} justify="flex-end" pt={4}>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={loading}
            loadingText="Saving..."
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : 'Save Changes'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
