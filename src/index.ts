import { serve } from "@hono/node-server";
import { Hono } from "hono";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const PROTO_PATH = "./proto/wallet.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const walletProto = protoDescriptor.tari.rpc.Wallet;

// Instantiates a gRPC client for the Wallet service.
const client = new walletProto(
  "127.0.0.1:18143",
  grpc.credentials.createInsecure()
);

const app = new Hono();

interface InfoResponse {
  value: string;
  // Add other fields that might be in the response
}

app.get("/", async (c) => {
  try {
    const response = await new Promise<InfoResponse>((resolve, reject) => {
      client.GetBalance({}, (error: Error | null, response: InfoResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
    return c.json(response);
  } catch (error: unknown) {
    console.error("Error calling getTipInfo:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
