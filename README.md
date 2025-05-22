# Tari Market REST API

A REST API wrapper for the Tari gRPC wallet services.

## Type-Safe gRPC Implementation

This project implements type-safe gRPC calls to the Tari wallet services. There are two approaches available:

### 1. Manual TypeScript Interface Definitions

The current implementation uses manually defined TypeScript interfaces in `src/utils/grpc.ts`.

Benefits:

- No additional build steps required
- Immediate type safety
- Works with existing codebase without modifications

To add new RPC methods:

1. Add the method signature to the `WalletClient` interface
2. Define request and response interfaces for the method
3. Use the `promisify` helper function to make typed calls

Example:

```typescript
// Adding a new method
interface WalletClient {
  // Existing methods...

  // New method
  GetTransactionInfo: (
    request: GetTransactionInfoRequest,
    callback: (
      error: Error | null,
      response: GetTransactionInfoResponse
    ) => void
  ) => void;
}

// Define related types
interface GetTransactionInfoRequest {
  id: string;
}

interface GetTransactionInfoResponse {
  // Response fields...
}

// Use in your code
const transactionInfo = await promisify(
  client.GetTransactionInfo.bind(client),
  { id: "transaction-id" }
);
```

### 2. Auto-Generated Types (Future Enhancement)

For a more complete solution, you can implement automatic type generation from .proto files:

1. Install additional dependencies:

   ```
   npm install --save-dev protoc ts-proto
   ```

2. Run the type generation script:

   ```
   npm run generate-types
   ```

3. Import and use the generated types

## Running the API

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The API will be available at http://localhost:3000.

```
open http://localhost:3000
```
