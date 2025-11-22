const SwaggerParser = require('@apidevtools/swagger-parser');
const path = require('path');

async function validate() {
  const specPath = path.join(__dirname, '../openapi/index.yaml');

  try {
    await SwaggerParser.validate(specPath);
    console.log('✓ OpenAPI spec is valid');
    process.exit(0);
  } catch (error) {
    console.error('✗ Validation error:', error.message);
    process.exit(1);
  }
}

validate();
