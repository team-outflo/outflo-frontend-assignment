import { describe, it, expect } from 'vitest';
import { isApiVariable, getApiVariableBaseName } from '../variableUtils';

describe('variableUtils', () => {
  describe('isApiVariable', () => {
    it('returns true for variables starting with api_', () => {
      expect(isApiVariable('api_email')).toBe(true);
      expect(isApiVariable('api_custom_field')).toBe(true);
      expect(isApiVariable('api_123')).toBe(true);
    });

    it('returns true for variables starting with csv_', () => {
      expect(isApiVariable('csv_company')).toBe(true);
      expect(isApiVariable('csv_email')).toBe(true);
    });

    it('returns true for variables without known prefixes (new format)', () => {
      expect(isApiVariable('custom_variable')).toBe(true);
      expect(isApiVariable('companySize')).toBe(true);
      expect(isApiVariable('my_field')).toBe(true);
    });

    it('returns false for linkedin_ prefixed variables', () => {
      expect(isApiVariable('linkedin_firstName')).toBe(false);
      expect(isApiVariable('linkedin_lastName')).toBe(false);
      expect(isApiVariable('linkedin_company')).toBe(false);
    });

    it('returns false for sender_ prefixed variables', () => {
      expect(isApiVariable('sender_firstName')).toBe(false);
      expect(isApiVariable('sender_company')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isApiVariable('')).toBe(false);
    });

    it('handles normaliseColumn parameter', () => {
      // When normaliseColumn is provided and doesn't have known prefix
      expect(isApiVariable('some_id', 'custom_column')).toBe(true);
      
      // When normaliseColumn has known prefix
      expect(isApiVariable('linkedin_firstName', 'linkedin_firstName')).toBe(false);
    });
  });

  describe('getApiVariableBaseName', () => {
    it('removes api_ prefix', () => {
      expect(getApiVariableBaseName('api_email')).toBe('email');
      expect(getApiVariableBaseName('api_custom_field')).toBe('custom_field');
    });

    it('returns variable as-is if no api_ prefix', () => {
      expect(getApiVariableBaseName('email')).toBe('email');
      expect(getApiVariableBaseName('custom_field')).toBe('custom_field');
    });

    it('returns empty string for empty input', () => {
      expect(getApiVariableBaseName('')).toBe('');
    });

    it('does not modify csv_ prefix', () => {
      expect(getApiVariableBaseName('csv_company')).toBe('csv_company');
    });
  });
});

