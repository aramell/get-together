'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Input,
  Select,
  Button,
  IconButton,
  Text,
} from '@chakra-ui/react';
import { ArrowUpIcon, ArrowDownIcon, DeleteIcon } from '@chakra-ui/icons';
import {
  LogisticsCategoryDef,
  LogisticsCategoryMode,
  MAX_CATEGORY_LABEL_LENGTH,
} from '@/lib/logistics/defaultCategories';

interface DraftCategory {
  // Present for existing categories; absent for rows added in this session.
  key?: string;
  label: string;
  mode: LogisticsCategoryMode;
  // Stable React key for rows with no category key yet.
  draftId: string;
}

interface LogisticsCategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  categories: LogisticsCategoryDef[];
  // Keys that have items in this view. The server checks the whole group.
  usedKeys: Set<string>;
  onSave: (list: { key?: string; label: string; mode: LogisticsCategoryMode }[]) => Promise<void>;
}

let draftCounter = 0;
const nextDraftId = () => `draft-${++draftCounter}`;

export function LogisticsCategoryEditor({
  isOpen,
  onClose,
  categories,
  usedKeys,
  onSave,
}: LogisticsCategoryEditorProps) {
  const [draft, setDraft] = useState<DraftCategory[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(categories.map((c) => ({ ...c, draftId: c.key })));
    }
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const update = (index: number, patch: Partial<DraftCategory>) =>
    setDraft((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const move = (index: number, delta: number) =>
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) => setDraft((prev) => prev.filter((_, i) => i !== index));

  const add = () =>
    setDraft((prev) => [...prev, { label: '', mode: 'single', draftId: nextDraftId() }]);

  const hasInvalidLabel = draft.some((r) => {
    const len = r.label.trim().length;
    return len < 1 || len > MAX_CATEGORY_LABEL_LENGTH;
  });
  const canSave = draft.length >= 1 && !hasInvalidLabel && !saving;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft.map((r) => ({ key: r.key, label: r.label.trim(), mode: r.mode })));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Manage categories</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            {draft.map((row, index) => {
              const inUse = Boolean(row.key && usedKeys.has(row.key));
              const label = row.label.trim() || 'category';
              return (
                <HStack key={row.draftId} spacing={2} align="center">
                  <Input
                    size="sm"
                    value={row.label}
                    maxLength={MAX_CATEGORY_LABEL_LENGTH}
                    onChange={(e) => update(index, { label: e.target.value })}
                    aria-label={`Category name ${index + 1}`}
                  />
                  <Select
                    size="sm"
                    width="auto"
                    value={row.mode}
                    isDisabled={inUse}
                    onChange={(e) => update(index, { mode: e.target.value as LogisticsCategoryMode })}
                    aria-label={`Type for ${label}`}
                    title={inUse ? 'The type is locked while this category has items' : undefined}
                  >
                    <option value="single">One person claims</option>
                    <option value="seats">Limited seats</option>
                  </Select>
                  <IconButton
                    aria-label={`Move ${label} up`}
                    icon={<ArrowUpIcon />}
                    size="sm"
                    variant="ghost"
                    isDisabled={index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    aria-label={`Move ${label} down`}
                    icon={<ArrowDownIcon />}
                    size="sm"
                    variant="ghost"
                    isDisabled={index === draft.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <IconButton
                    aria-label={`Remove ${label}`}
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    isDisabled={inUse || draft.length <= 1}
                    title={inUse ? "Can't remove a category that has items" : undefined}
                    onClick={() => remove(index)}
                  />
                </HStack>
              );
            })}
            {draft.some((r) => r.key && usedKeys.has(r.key)) && (
              <Text fontSize="xs" color="ink.500">
                Categories with items can be renamed and reordered, but not removed or changed to a different type.
              </Text>
            )}
            <Button size="sm" variant="outline" alignSelf="flex-start" onClick={add}>
              Add category
            </Button>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="coral" onClick={handleSave} isDisabled={!canSave} isLoading={saving}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default LogisticsCategoryEditor;
