const SwaggerParser = require('@apidevtools/swagger-parser');
const fs = require('fs');
const path = require('path');

async function bundle() {
  const specPath = path.join(__dirname, '../openapi/index.yaml');
  const outputPath = path.join(__dirname, '../openapi/bundled.yaml');

  try {
    // Bundle resolves all $refs into a single document
    const api = await SwaggerParser.bundle(specPath);

    // Convert to YAML
    const YAML = require('yamljs');
    const yamlStr = YAML.stringify(api, 10, 2);

    // Write bundled spec
    fs.writeFileSync(outputPath, yamlStr);
    console.log('✓ Bundled OpenAPI spec written to:', outputPath);
    process.exit(0);
  } catch (error) {
    console.error('✗ Bundle error:', error.message);
    process.exit(1);
  }
}

bundle();
