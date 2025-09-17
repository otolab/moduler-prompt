import { describe, it, expect } from 'vitest';
import { validateProfileOptions } from './profile-validator.js';

describe('Profile Validator', () => {
  describe('validateProfileOptions', () => {
    it('should accept camelCase parameters', () => {
      const profile = {
        options: {
          temperature: 0.7,
          maxTokens: 4000,
          topP: 0.9
        }
      };

      expect(() => validateProfileOptions(profile)).not.toThrow();
    });

    it('should reject snake_case parameters', () => {
      const profile = {
        options: {
          max_tokens: 4000,
          top_p: 0.9
        }
      };

      expect(() => validateProfileOptions(profile)).toThrow('snake_case');
      expect(() => validateProfileOptions(profile)).toThrow("Change 'max_tokens' to 'maxTokens'");
      expect(() => validateProfileOptions(profile)).toThrow("Change 'top_p' to 'topP'");
    });

    it('should handle mixed case parameters', () => {
      const profile = {
        options: {
          temperature: 0.7,  // camelCase - OK
          max_tokens: 4000,  // snake_case - Error
          topP: 0.9         // camelCase - OK
        }
      };

      expect(() => validateProfileOptions(profile)).toThrow('snake_case');
      expect(() => validateProfileOptions(profile)).toThrow("Change 'max_tokens' to 'maxTokens'");
    });

    it('should pass when no options provided', () => {
      const profile = {};
      expect(() => validateProfileOptions(profile)).not.toThrow();
    });

    it('should pass when profile is null', () => {
      expect(() => validateProfileOptions(null)).not.toThrow();
    });

    it('should provide helpful error message', () => {
      const profile = {
        options: {
          max_tokens: 4000,
          repetition_penalty: 1.1
        }
      };

      try {
        validateProfileOptions(profile);
        expect.fail('Should have thrown an error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Please use camelCase format');
        expect(message).toContain('Example:');
        expect(message).toContain('maxTokens: 4000');
      }
    });
  });
});