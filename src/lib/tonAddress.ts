import { Address } from '@ton/core';

/**
 * TON Address utilities with @ton/core for proper conversion
 * Handles conversion between Raw and User-friendly formats
 */

/**
 * Simple validation for Raw format address
 * Raw format: "0:4ce213123806227a8d02b45410f3e6a908489381b829d349930f0374c1b83c22"
 */
export const isRawFormat = (address: string): boolean => {
  return !!address?.match(/^-?\d+:[a-fA-F0-9]{64}$/);
};

/**
 * Simple validation for User-friendly format 
 * User-friendly format: "EQTOITEjgGInqNAqtFAQ8+apCEiTgbgp00mTDwN0wbg8Ig"
 */
export const isUserFriendlyFormat = (address: string): boolean => {
  return !!address?.match(/^[EU]Q[A-Za-z0-9_-]{46}$/);
};

/**
 * Convert hex string to Uint8Array (browser-compatible)
 */
const hexToUint8Array = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
};

/**
 * Parse raw address format manually
 * Raw format: "0:4ce213123806227a8d02b45410f3e6a908489381b829d349930f0374c1b83c22"
 */
const parseRawAddress = (rawAddress: string): { workchain: number, hash: Uint8Array } => {
  const parts = rawAddress.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid raw address format');
  }
  
  const workchain = parseInt(parts[0]);
  const hashHex = parts[1];
  
  if (isNaN(workchain) || hashHex.length !== 64) {
    throw new Error('Invalid workchain or hash format');
  }
  
  const hash = hexToUint8Array(hashHex);
  return { workchain, hash };
};

/**
 * Convert Raw format address to User-friendly format
 * Raw format: "0:4ce213123806227a8d02b45410f3e6a908489381b829d349930f0374c1b83c22"
 * User-friendly format: "EQTOITEjgGInqNAqtFAQ8+apCEiTgbgp00mTDwN0wbg8Ig"
 */
export const rawToUserFriendly = (rawAddress: string): string => {
  try {
    // Try to parse directly first (most reliable approach)
    const address = Address.parse(rawAddress);
    return address.toString({ urlSafe: true, bounceable: false });
  } catch (parseError) {
    // Fallback: Parse manually and create Address object
    try {
      const { workchain, hash } = parseRawAddress(rawAddress);
      const address = new Address(workchain, hash as any);
      return address.toString({ urlSafe: true, bounceable: false });
    } catch (error) {
      console.error('Failed to convert raw address to user-friendly:', error);
      throw new Error('فشل في تحويل تنسيق العنوان');
    }
  }
};

/**
 * Convert User-friendly format to Raw format
 */
export const userFriendlyToRaw = (userFriendlyAddress: string): string => {
  try {
    const address = Address.parse(userFriendlyAddress);
    return address.toRawString();
  } catch (error) {
    console.error('Failed to convert user-friendly address to raw:', error);
    throw new Error('فشل في تحويل تنسيق العنوان');
  }
};

/**
 * Validate and normalize address to user-friendly format
 * Accepts both Raw and User-friendly formats
 */
export const normalizeAddress = (address: string): string => {
  if (!address || typeof address !== 'string') {
    throw new Error('عنوان غير صحيح');
  }

  const trimmedAddress = address.trim();
  
  // Check if it's Raw format (workchain:hash)
  if (isRawFormat(trimmedAddress)) {
    return rawToUserFriendly(trimmedAddress);
  }
  
  // Check if it's User-friendly format (EQ... or UQ...)
  if (isUserFriendlyFormat(trimmedAddress)) {
    return trimmedAddress;
  }
  
  throw new Error('تنسيق العنوان غير صحيح. يرجى استخدام التنسيق الخام (0:...) أو التنسيق المألوف (EQ...)');
};

/**
 * Format address for display (show first 6 and last 4 characters)
 * Automatically converts Raw addresses to User-friendly format first
 */
export const formatAddressForDisplay = (address: string): string => {
  if (!address) return '';
  
  // If it's Raw format, convert to user-friendly first
  let displayAddress = address;
  if (isRawFormat(address)) {
    try {
      displayAddress = rawToUserFriendly(address);
    } catch {
      // If conversion fails, use original
      displayAddress = address;
    }
  }
  
  if (displayAddress.length <= 10) return displayAddress;
  return `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`;
};