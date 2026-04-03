# Studiqo API Client

Workspace package for generated API types/client derived from OpenAPI.

## Generate

After changing [`apps/api/docs/openapi/openapi.yaml`](../apps/api/docs/openapi/openapi.yaml):

```bash
npm run generate -w packages/api-client
```

Imports: `@studiqo/api-client/client`, `@studiqo/api-client/errors`, or `@studiqo/api-client/generated` for types.
