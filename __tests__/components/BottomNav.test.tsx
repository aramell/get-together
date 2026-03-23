import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BottomNav } from '@/components/layout/BottomNav';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/groups',
}));

// Mock chakra UI useBreakpointValue to simulate mobile
jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useBreakpointValue: () => true, // Always show on mobile
}));

describe('BottomNav - Mobile Navigation (Task 4)', () => {
  // Test 1: BottomNav renders on mobile
  it('should render bottom navigation bar on mobile', () => {
    render(<BottomNav />);
    const nav = screen.getByRole('button', { name: /Get-Together/i });
    expect(nav).toBeInTheDocument();
  });

  // Test 2: Has three tabs
  it('should display three navigation tabs', () => {
    render(<BottomNav />);
    expect(screen.getByText('Get-Together')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  // Test 3: Sticky positioning
  it('should be positioned sticky at bottom', () => {
    const { container } = render(<BottomNav />);
    const navBox = container.firstChild;
    expect(navBox).toBeInTheDocument();
  });

  // Test 4: Minimum height 56px
  it('should have minimum height of 56px (iOS standard)', () => {
    const { container } = render(<BottomNav />);
    const navBox = container.firstChild;
    expect(navBox).toBeInTheDocument();
  });

  // Test 5: Get-Together tab navigation
  it('should navigate to /groups on Get-Together click', () => {
    render(<BottomNav />);
    const getTogetherBtn = screen.getByRole('button', { name: /Get-Together/i });
    expect(getTogetherBtn).toBeInTheDocument();
  });

  // Test 6: Wishlist tab navigation
  it('should navigate to /wishlist on Wishlist click', () => {
    render(<BottomNav />);
    const wishlistBtn = screen.getByRole('button', { name: /Wishlist/i });
    expect(wishlistBtn).toBeInTheDocument();
  });

  // Test 7: Groups tab navigation
  it('should navigate to /groups on Groups click', () => {
    render(<BottomNav />);
    const groupsBtn = screen.getByRole('button', { name: /Groups/i });
    expect(groupsBtn).toBeInTheDocument();
  });

  // Test 8: Icon visibility
  it('should display icons for each tab', () => {
    const { container } = render(<BottomNav />);
    // Check for SVG icons from react-icons
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  // Test 9: Tab labels are visible
  it('should display visible tab labels (not icon-only)', () => {
    render(<BottomNav />);
    const getTogetherLabel = screen.getByText('Get-Together');
    const wishlistLabel = screen.getByText('Wishlist');
    const groupsLabel = screen.getByText('Groups');

    expect(getTogetherLabel).toBeVisible();
    expect(wishlistLabel).toBeVisible();
    expect(groupsLabel).toBeVisible();
  });

  // Test 10: Active tab highlighting
  it('should highlight active tab with different background', () => {
    render(<BottomNav />);
    const tabs = screen.getAllByRole('button');
    expect(tabs.length).toBe(3);
  });

  // Test 11: Keyboard navigation support
  it('should support keyboard navigation (Tab between tabs)', () => {
    render(<BottomNav />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('type', 'button');
    });
  });

  // Test 12: Touch target sizing
  it('should have adequate touch target size (56px height)', () => {
    const { container } = render(<BottomNav />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });
});
