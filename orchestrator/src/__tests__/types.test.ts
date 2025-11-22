import { AppError, NotFoundError, ValidationError } from '../types';

describe('Error Types', () => {
  describe('AppError', () => {
    it('should create an error with status code and message', () => {
      const error = new AppError(500, 'Internal server error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.isOperational).toBe(true);
      expect(error.name).toBe('AppError');
    });

    it('should allow setting isOperational to false', () => {
      const error = new AppError(500, 'Critical error', false);

      expect(error.isOperational).toBe(false);
    });

    it('should have a stack trace', () => {
      const error = new AppError(400, 'Bad request');

      expect(error.stack).toBeDefined();
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with resource info', () => {
      const error = new NotFoundError('Project', 123);

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Project with id 123 not found');
      expect(error.name).toBe('NotFoundError');
    });

    it('should handle string ids', () => {
      const error = new NotFoundError('Task', 'abc-123');

      expect(error.message).toBe('Task with id abc-123 not found');
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with validation message', () => {
      const error = new ValidationError('Invalid email format');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid email format');
      expect(error.name).toBe('ValidationError');
    });
  });
});
