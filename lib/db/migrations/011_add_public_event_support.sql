-- Migration: Add public event link support
-- Story: 7-3-public-event-links
-- Date: 2026-03-23
-- Description: Enable non-members to RSVP to events via public links

-- Add public_token column to event_proposals table
ALTER TABLE event_proposals
  ADD COLUMN public_token VARCHAR(64) UNIQUE DEFAULT NULL;

-- Create index for faster public token lookups
CREATE INDEX idx_event_proposals_public_token ON event_proposals(public_token) WHERE public_token IS NOT NULL;

-- Create public_rsvps table for non-member RSVPs
CREATE TABLE IF NOT EXISTS public_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(50) NOT NULL CHECK (status IN ('in', 'maybe', 'out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate RSVPs from same email for same event
  CONSTRAINT unique_email_per_event UNIQUE (event_id, email)
);

-- Create indexes for efficient queries
CREATE INDEX idx_public_rsvps_event_id ON public_rsvps(event_id);
CREATE INDEX idx_public_rsvps_event_status ON public_rsvps(event_id, status);
CREATE INDEX idx_public_rsvps_created_at ON public_rsvps(created_at);
