import SwaggerParser from '@apidevtools/swagger-parser';
import path from 'path';
import { OpenAPI } from 'openapi-types';

let cachedSpec: OpenAPI.Document | null = null;

export async function loadOpenAPISpec(): Promise<OpenAPI.Document> {
  if (cachedSpec) {
    return cachedSpec;
  }

  const specPath = path.join(__dirname, '../openapi/index.yaml');

  try {
    // Bundle all $ref references into a single spec
    cachedSpec = await SwaggerParser.bundle(specPath);
    console.log('OpenAPI spec loaded and bundled successfully');
    return cachedSpec;
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error);
    throw error;
  }
}

export async function validateOpenAPISpec(): Promise<void> {
  const specPath = path.join(__dirname, '../openapi/index.yaml');

  try {
    // Validate the spec against OpenAPI 3.0
    await SwaggerParser.validate(specPath);
    console.log('OpenAPI spec is valid');
  } catch (error) {
    console.error('OpenAPI spec validation failed:', error);
    throw error;
  }
}
