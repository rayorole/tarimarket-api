import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createClient, promisify, PaymentType } from "./utils/grpc.js";

// Create a typed client instance
const client = createClient("127.0.0.1:18143");

const app = new Hono();

app.get("/", async (c) => {
  try {
    // Use the promisify helper to make the gRPC call with proper typing
    const response = await promisify(client.GetVersion.bind(client), {});
    return c.json({
      status: "ok",
      node_version: response.version,
    });
  } catch (error: unknown) {
    console.error("Error calling GetVersion:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

app.get("/state", async (c) => {
  try {
    // Use the promisify helper to make the gRPC call with proper typing
    const response = await promisify(client.GetState.bind(client), {});
    return c.json(response);
  } catch (error: unknown) {
    console.error("Error calling GetState:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

app.get("/address", async (c) => {
  try {
    // Use the promisify helper to make the gRPC call with proper typing
    const response = await promisify(
      client.GetCompleteAddress.bind(client),
      {}
    );
    return c.json(response);
  } catch (error: unknown) {
    console.error("Error calling GetCompleteAddress:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

app.get("/address/payment", async (c) => {
  try {
    const paymentId = c.req.query("payment_id");
    if (!paymentId) {
      return c.json({ error: "payment_id query parameter is required" }, 400);
    }

    // Convert the payment ID string to a properly encoded Buffer
    const paymentIdBuffer = Buffer.from(paymentId, "utf-8");

    // Use the promisify helper to make the gRPC call with proper typing
    const response = await promisify(client.GetPaymentIdAddress.bind(client), {
      payment_id: paymentIdBuffer,
    });

    return c.json({
      interactive_address: response.interactive_address_base58,
      one_sided_address: response.one_sided_address_base58,
      one_sided_address_emoji: response.one_sided_address_emoji,
      interactive_address_emoji: response.interactive_address_emoji,
    });
  } catch (error: unknown) {
    console.error("Error calling GetPaymentIdAddress:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

app.get("/transactions", async (c) => {
  try {
    // Get transaction IDs from query parameter
    const txIdsParam = c.req.query("tx_ids");
    if (!txIdsParam) {
      return c.json({ error: "tx_ids query parameter is required" }, 400);
    }

    // Parse transaction IDs from comma-separated list
    const transactionIds = txIdsParam.split(",").map((id) => {
      const parsedId = parseInt(id.trim(), 10);
      if (isNaN(parsedId)) {
        throw new Error(`Invalid transaction ID: ${id}`);
      }
      return parsedId;
    });

    if (transactionIds.length === 0) {
      return c.json({ error: "At least one transaction ID is required" }, 400);
    }

    // Use the promisify helper to make the gRPC call with proper typing
    const response = await promisify(client.GetTransactionInfo.bind(client), {
      transaction_ids: transactionIds,
    });

    return c.json(response);
  } catch (error: unknown) {
    console.error("Error calling GetTransactionInfo:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

// New endpoint using streaming GetCompletedTransactions
app.get("/completed-transactions", async (c) => {
  try {
    // Get optional query parameters
    const paymentId = c.req.query("payment_id");
    const blockHash = c.req.query("block_hash");
    const blockHeightStr = c.req.query("block_height");

    // Prepare the request object
    const request: any = {};

    // Add payment_id if provided
    if (paymentId) {
      request.payment_id = {
        utf8_string: paymentId,
      };
    }

    // Add block_hash if provided
    if (blockHash) {
      request.block_hash = blockHash;
    }

    // Add block_height if provided and valid
    if (blockHeightStr) {
      const blockHeight = parseInt(blockHeightStr, 10);
      if (!isNaN(blockHeight)) {
        request.block_height = blockHeight;
      } else {
        return c.json({ error: "Invalid block_height parameter" }, 400);
      }
    }

    // Create a stream from the gRPC call
    const stream = client.GetCompletedTransactions(request);

    // Collect all transactions
    const transactions: any[] = [];

    // Process the stream - we need to manually handle the streaming response
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (response) => {
        // Add the transaction to our collection
        const transaction = response.transaction;

        transactions.push(transaction);
      });

      stream.on("error", (err) => {
        reject(err);
      });

      stream.on("end", () => {
        resolve();
      });
    });

    // Return the collected transactions
    return c.json({
      transactions,
      total_found: transactions.length,
    });
  } catch (error: unknown) {
    console.error("Error in completed-transactions:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

// New transfer endpoint
app.post("/transfer", async (c) => {
  try {
    // Get the transfer details from the request body
    const body = await c.req.json();

    // Validate required fields
    if (!body.destination || !body.amount || body.fee_per_gram === undefined) {
      return c.json(
        {
          error:
            "Missing required fields: destination, amount, and fee_per_gram are required",
        },
        400
      );
    }

    // Create a payment recipient object
    const recipient: {
      address: string;
      amount: number;
      fee_per_gram: number;
      payment_type?: PaymentType;
      payment_id?: Buffer;
    } = {
      address: body.destination,
      amount: Number(body.amount),
      fee_per_gram: Number(body.fee_per_gram),
      payment_type: body.payment_type || PaymentType.ONE_SIDED,
    };

    // Add optional payment_id if provided
    if (body.payment_id) {
      recipient.payment_id = Buffer.from(body.payment_id, "utf-8");
    }

    // Create the transfer request
    const transferRequest = {
      recipients: [recipient],
    };

    // Make the gRPC call
    const response = await promisify(
      client.Transfer.bind(client),
      transferRequest
    );

    // Return the response
    return c.json({
      success: true,
      transaction_results: response.results,
    });
  } catch (error: unknown) {
    console.error("Error in transfer:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ error: errorMessage }, 500);
  }
});

serve(
  {
    fetch: app.fetch,
    port: 5000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
