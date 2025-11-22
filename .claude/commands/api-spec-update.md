# Update API Specification

Update API specification and regenerate TypeScript client.

## Steps
1. Review changes to `openapi/` folder
2. Validate OpenAPI spec: `npm run validate:openapi`
3. Generate TypeScript client: `npm run generate:client`
4. Check for breaking changes in client
5. Update frontend code if needed

## Success Criteria
- OpenAPI spec is valid
- TypeScript client generates successfully
- No breaking changes (or documented)
