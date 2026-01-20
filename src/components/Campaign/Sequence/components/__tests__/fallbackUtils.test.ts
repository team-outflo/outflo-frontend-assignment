import { describe, it, expect } from 'vitest';
import {
  buildFixChain,
  parseFixChain,
  createColumnFix,
  determineFallbackMode,
  validateFallbackState,
} from '../fallbackUtils';
import type { FallbackState, FallbackMode } from '../fallbackTypes';
import type { CsvColumnFix } from '@/types/campaigns';

describe('fallbackUtils', () => {
  describe('buildFixChain', () => {
    describe('linkedin mode', () => {
      it('builds skipLeads fixChain for skipLead mode', () => {
        const state: FallbackState = { mode: 'skipLead' };
        const result = buildFixChain('linkedin', state);
        expect(result).toEqual({ fixType: 'skipLeads' });
      });

      it('builds sendBlank fixChain', () => {
        const state: FallbackState = { mode: 'sendBlank' };
        const result = buildFixChain('linkedin', state);
        expect(result).toEqual({ fixType: 'sendBlank' });
      });

      it('builds insertDefaultValue fixChain with value', () => {
        const state: FallbackState = { mode: 'insertValue', defaultValue: 'Test Default' };
        const result = buildFixChain('linkedin', state);
        expect(result).toEqual({
          fixType: 'insertDefaultValue',
          defaultValue: 'Test Default',
        });
      });
    });

    describe('custom mode', () => {
      it('builds fetchFromLinkedIn fixChain with source field', () => {
        const state: FallbackState = {
          mode: 'fetchLinkedIn',
          linkedInField: 'firstName',
        };
        const result = buildFixChain('custom', state);
        expect(result).toEqual({
          fixType: 'fetchFromLinkedIn',
          sourceField: 'firstName',
        });
      });

      it('builds fetchFromLinkedIn with nested fallback', () => {
        const state: FallbackState = {
          mode: 'fetchLinkedIn',
          linkedInField: 'company',
          fallbackMode: 'insertValue',
          fallbackDefaultValue: 'Unknown Company',
        };
        const result = buildFixChain('custom', state);
        expect(result).toEqual({
          fixType: 'fetchFromLinkedIn',
          sourceField: 'company',
          fallback: {
            fixType: 'insertDefaultValue',
            defaultValue: 'Unknown Company',
          },
        });
      });

      it('builds fetchFromLinkedIn with skipLeads fallback', () => {
        const state: FallbackState = {
          mode: 'fetchLinkedIn',
          linkedInField: 'title',
          fallbackMode: 'skipLead',
        };
        const result = buildFixChain('custom', state);
        expect(result).toEqual({
          fixType: 'fetchFromLinkedIn',
          sourceField: 'title',
          fallback: {
            fixType: 'skipLeads',
          },
        });
      });
    });

    describe('allleadsPresent mode', () => {
      it('builds allLeadsPresent with skipLeads fallback by default', () => {
        const state: FallbackState = { mode: 'skipLead' };
        const result = buildFixChain('allleadsPresent', state);
        expect(result).toEqual({
          fixType: 'allLeadsPresent',
          fallback: {
            fixType: 'skipLeads',
          },
        });
      });

      it('builds insertDefaultValue when insertValue mode with value', () => {
        const state: FallbackState = { mode: 'insertValue', defaultValue: 'Fallback' };
        const result = buildFixChain('allleadsPresent', state);
        expect(result).toEqual({
          fixType: 'insertDefaultValue',
          defaultValue: 'Fallback',
        });
      });

      it('builds fetchFromLinkedIn for allleadsPresent when selected', () => {
        const state: FallbackState = {
          mode: 'fetchLinkedIn',
          linkedInField: 'firstName',
          fallbackMode: 'sendBlank',
        };
        const result = buildFixChain('allleadsPresent', state);
        expect(result).toEqual({
          fixType: 'fetchFromLinkedIn',
          sourceField: 'firstName',
          fallback: {
            fixType: 'sendBlank',
          },
        });
      });
    });
  });

  describe('parseFixChain', () => {
    it('returns default state for undefined fixChain', () => {
      const result = parseFixChain('linkedin', undefined);
      expect(result).toEqual({ mode: 'skipLead' });
    });

    it('parses insertDefaultValue fixChain', () => {
      const fixChain: CsvColumnFix['fixChain'] = {
        fixType: 'insertDefaultValue',
        defaultValue: 'Test',
      };
      const result = parseFixChain('linkedin', fixChain);
      expect(result).toEqual({
        mode: 'insertValue',
        defaultValue: 'Test',
      });
    });

    it('parses sendBlank fixChain', () => {
      const fixChain: CsvColumnFix['fixChain'] = { fixType: 'sendBlank' };
      const result = parseFixChain('linkedin', fixChain);
      expect(result).toEqual({ mode: 'sendBlank' });
    });

    it('parses fetchFromLinkedIn with nested fallback', () => {
      const fixChain: CsvColumnFix['fixChain'] = {
        fixType: 'fetchFromLinkedIn',
        sourceField: 'company',
        fallback: {
          fixType: 'insertDefaultValue',
          defaultValue: 'Unknown',
        },
      };
      const result = parseFixChain('custom', fixChain);
      expect(result).toEqual({
        mode: 'fetchLinkedIn',
        linkedInField: 'company',
        fallbackMode: 'insertValue',
        fallbackDefaultValue: 'Unknown',
      });
    });

    it('parses allLeadsPresent fixChain with skipLeads fallback', () => {
      const fixChain: CsvColumnFix['fixChain'] = {
        fixType: 'allLeadsPresent',
        fallback: {
          fixType: 'skipLeads',
        },
      };
      const result = parseFixChain('allleadsPresent', fixChain);
      // For allLeadsPresent, the fallback becomes the primary mode in UI
      expect(result.mode).toBe('skipLead');
    });

    it('parses allLeadsPresent fixChain with insertDefaultValue fallback', () => {
      const fixChain: CsvColumnFix['fixChain'] = {
        fixType: 'allLeadsPresent',
        fallback: {
          fixType: 'insertDefaultValue',
          defaultValue: 'Default Company',
        },
      };
      const result = parseFixChain('allleadsPresent', fixChain);
      // For allLeadsPresent, the fallback becomes the primary mode in UI
      expect(result.mode).toBe('insertValue');
      expect(result.defaultValue).toBe('Default Company');
    });

    it('parses allLeadsPresent fixChain with sendBlank fallback', () => {
      const fixChain: CsvColumnFix['fixChain'] = {
        fixType: 'allLeadsPresent',
        fallback: {
          fixType: 'sendBlank',
        },
      };
      const result = parseFixChain('allleadsPresent', fixChain);
      expect(result.mode).toBe('sendBlank');
    });
  });

  describe('createColumnFix', () => {
    it('creates a complete CsvColumnFix object', () => {
      const state: FallbackState = { mode: 'sendBlank' };
      const result = createColumnFix('csv_company', 'custom', state);

      expect(result.columnName).toBe('csv_company');
      expect(result.fixChain).toEqual({ fixType: 'sendBlank' });
      expect(result.appliedAt).toBeDefined();
      expect(typeof result.appliedAt).toBe('number');
    });
  });

  describe('determineFallbackMode', () => {
    it('returns linkedin for linkedin variable type', () => {
      const result = determineFallbackMode('linkedin', undefined);
      expect(result).toBe('linkedin');
    });

    it('returns allleadsPresent when existingFix has allLeadsPresent type', () => {
      const existingFix: CsvColumnFix = {
        columnName: 'test',
        fixChain: { fixType: 'allLeadsPresent' },
        appliedAt: Date.now(),
      };
      const result = determineFallbackMode('csv', existingFix);
      expect(result).toBe('allleadsPresent');
    });

    it('returns custom for csv variables without allLeadsPresent fix', () => {
      const existingFix: CsvColumnFix = {
        columnName: 'test',
        fixChain: { fixType: 'sendBlank' },
        appliedAt: Date.now(),
      };
      const result = determineFallbackMode('csv', existingFix);
      expect(result).toBe('custom');
    });

    it('returns custom for api variables', () => {
      const result = determineFallbackMode('api', undefined);
      expect(result).toBe('custom');
    });
  });

  describe('validateFallbackState', () => {
    it('returns valid for skipLead mode', () => {
      const state: FallbackState = { mode: 'skipLead' };
      const result = validateFallbackState('linkedin', state);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns valid for sendBlank mode', () => {
      const state: FallbackState = { mode: 'sendBlank' };
      const result = validateFallbackState('linkedin', state);
      expect(result.isValid).toBe(true);
    });

    it('returns invalid for insertValue without defaultValue', () => {
      const state: FallbackState = { mode: 'insertValue', defaultValue: '' };
      const result = validateFallbackState('linkedin', state);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Default value is required');
    });

    it('returns valid for insertValue with defaultValue', () => {
      const state: FallbackState = { mode: 'insertValue', defaultValue: 'Test' };
      const result = validateFallbackState('linkedin', state);
      expect(result.isValid).toBe(true);
    });

    it('returns invalid for fetchLinkedIn without linkedInField', () => {
      const state: FallbackState = { mode: 'fetchLinkedIn' };
      const result = validateFallbackState('custom', state);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('LinkedIn field is required');
    });

    it('returns valid for fetchLinkedIn with linkedInField', () => {
      const state: FallbackState = { mode: 'fetchLinkedIn', linkedInField: 'firstName' };
      const result = validateFallbackState('custom', state);
      expect(result.isValid).toBe(true);
    });

    it('returns invalid for fallback insertValue without fallbackDefaultValue', () => {
      const state: FallbackState = {
        mode: 'fetchLinkedIn',
        linkedInField: 'firstName',
        fallbackMode: 'insertValue',
        fallbackDefaultValue: '',
      };
      const result = validateFallbackState('custom', state);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Fallback default value is required');
    });
  });
});

