'use client';

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  Box,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { createWishlistItemSchema } from '@/lib/validation/wishlistSchema';

interface WishlistAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onItemAdded: () => void;
}

export function WishlistAddModal({
  isOpen,
  onClose,
  groupId,
  onItemAdded,
}: WishlistAddModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage(null);

    // Client-side validation using Zod
    try {
      createWishlistItemSchema.parse({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        link: formData.link.trim() || undefined,
      });
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          newErrors[err.path[0] || 'form'] = err.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/groups/${groupId}/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          link: formData.link.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.message || 'Failed to add item';

        // Handle validation errors from server
        if (response.status === 422) {
          setErrors({ form: errorMessage });
        } else {
          setErrors({ form: errorMessage });
        }
        return;
      }

      setSuccessMessage('Item added to wishlist');

      // Reset form and close modal after brief success message
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          link: '',
        });
        setSuccessMessage(null);
        onItemAdded();
        onClose();
      }, 1500);
    } catch (error) {
      setErrors({ form: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Item to Wishlist</ModalHeader>
        <ModalCloseButton isDisabled={isSubmitting} />

        <form onSubmit={handleSubmit}>
          <ModalBody pb={6}>
            {successMessage && (
              <Alert status="success" mb={4} borderRadius="md">
                <AlertIcon />
                {successMessage}
              </Alert>
            )}

            {errors.form && (
              <Alert status="error" mb={4} borderRadius="md">
                <AlertIcon />
                {errors.form}
              </Alert>
            )}

            <FormControl isInvalid={Boolean(errors.title)} mb={4}>
              <FormLabel htmlFor="title">Title *</FormLabel>
              <Input
                id="title"
                name="title"
                placeholder="What would you like to do?"
                value={formData.title}
                onChange={handleInputChange}
                disabled={isSubmitting}
                maxLength={255}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              <FormErrorMessage id="title-error">
                {errors.title}
              </FormErrorMessage>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                {formData.title.length}/255
              </div>
            </FormControl>

            <FormControl isInvalid={Boolean(errors.description)} mb={4}>
              <FormLabel htmlFor="description">Description</FormLabel>
              <Textarea
                id="description"
                name="description"
                placeholder="Add more details (optional)"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
                maxLength={1000}
                rows={4}
                aria-describedby={errors.description ? 'description-error' : undefined}
              />
              <FormErrorMessage id="description-error">
                {errors.description}
              </FormErrorMessage>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                {formData.description.length}/1000
              </div>
            </FormControl>

            <FormControl isInvalid={Boolean(errors.link)}>
              <FormLabel htmlFor="link">Link</FormLabel>
              <Input
                id="link"
                name="link"
                type="url"
                placeholder="https://example.com (optional)"
                value={formData.link}
                onChange={handleInputChange}
                disabled={isSubmitting}
                aria-describedby={errors.link ? 'link-error' : undefined}
              />
              <FormErrorMessage id="link-error">
                {errors.link}
              </FormErrorMessage>
              <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '4px' }}>
                Must start with http:// or https://
              </div>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isSubmitting}
              loadingText="Saving..."
            >
              Save Item
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
