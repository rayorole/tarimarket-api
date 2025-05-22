import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the proto path relative to this file
const PROTO_PATH = path.resolve(__dirname, "../../proto/wallet.proto");

// Define typings for the service and messages
export interface WalletClient {
  GetBalance: (
    request: GetBalanceRequest,
    callback: (error: Error | null, response: GetBalanceResponse) => void
  ) => void;

  GetVersion: (
    request: GetVersionRequest,
    callback: (error: Error | null, response: GetVersionResponse) => void
  ) => void;

  GetState: (
    request: GetStateRequest,
    callback: (error: Error | null, response: GetStateResponse) => void
  ) => void;

  GetAddress: (
    request: GetAddressRequest,
    callback: (error: Error | null, response: GetAddressResponse) => void
  ) => void;

  GetCompleteAddress: (
    request: GetCompleteAddressRequest,
    callback: (
      error: Error | null,
      response: GetCompleteAddressResponse
    ) => void
  ) => void;

  GetPaymentIdAddress: (
    request: GetPaymentIdAddressRequest,
    callback: (
      error: Error | null,
      response: GetCompleteAddressResponse
    ) => void
  ) => void;

  GetTransactionInfo: (
    request: GetTransactionInfoRequest,
    callback: (
      error: Error | null,
      response: GetTransactionInfoResponse
    ) => void
  ) => void;

  GetCompletedTransactions: (
    request: GetCompletedTransactionsRequest
  ) => grpc.ClientReadableStream<GetCompletedTransactionsResponse>;

  Transfer: (
    request: TransferRequest,
    callback: (error: Error | null, response: TransferResponse) => void
  ) => void;
}

// Message interface definitions
export interface GetBalanceRequest {}

export interface GetBalanceResponse {
  available_balance: string;
  pending_incoming_balance: string;
  pending_outgoing_balance: string;
}

export interface GetVersionRequest {}

export interface GetVersionResponse {
  version: string;
}

export interface GetStateRequest {}

export interface GetStateResponse {
  scanned_height: number;
  balance: {
    available_balance: string;
    pending_incoming_balance: string;
    pending_outgoing_balance: string;
  };
  network: {
    status: string;
    avg_latency_ms: number;
    num_node_connections: number;
  };
}

export interface GetAddressRequest {}

export interface GetAddressResponse {
  address: string;
}

export interface GetCompleteAddressRequest {}

export interface GetCompleteAddressResponse {
  interactive_address: string;
  one_sided_address: string;
  interactive_address_base58: string;
  one_sided_address_base58: string;
  interactive_address_emoji: string;
  one_sided_address_emoji: string;
}

export interface GetPaymentIdAddressRequest {
  payment_id: Buffer;
}

export interface GetTransactionInfoRequest {
  transaction_ids: number[]; // uint64 in the protobuf, represented as numbers in JavaScript
}

export interface TransactionDetails {
  tx_id: number;
  source_address: string;
  dest_address: string;
  status: string;
  direction: string;
  amount: number;
  fee: number;
  is_cancelled: boolean;
  excess_sig: string;
  timestamp: number;
  payment_id: string;
  mined_in_block_height: number;
}

export interface GetTransactionInfoResponse {
  transactions: TransactionDetails[];
}

export interface UserPaymentId {
  u256?: string;
  utf8_string?: string;
  user_bytes?: Buffer;
}

export interface GetCompletedTransactionsRequest {
  payment_id?: UserPaymentId;
  block_hash?: string;
  block_height?: number;
}

export interface GetCompletedTransactionsResponse {
  transaction: TransactionDetails;
}

export enum PaymentType {
  STANDARD_MIMBLEWIMBLE = 0,
  ONE_SIDED = 1,
  ONE_SIDED_TO_STEALTH_ADDRESS = 2,
}

export interface PaymentRecipient {
  address: string; // Base58 Tari address of the recipient
  amount: number; // Amount to send in microTari (1 T = 1_000_000 µT)
  fee_per_gram: number; // Fee rate per gram
  payment_type?: PaymentType; // The type of payment to perform
  payment_id?: Buffer; // Optional encrypted payment ID for reference (max 256 bytes)
}

export interface TransferRequest {
  recipients: PaymentRecipient[];
}

export interface TransferResult {
  address: string;
  transaction_id: number;
  is_success: boolean;
  failure_message: string;
}

export interface TransferResponse {
  results: TransferResult[];
}

// Create a type-safe wrapper for making gRPC calls
export function createClient(
  address: string = "127.0.0.1:18143"
): WalletClient {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
  const walletProto = protoDescriptor.tari.rpc.Wallet;

  return new walletProto(
    address,
    grpc.credentials.createInsecure()
  ) as WalletClient;
}

// Helper function to promisify gRPC calls
export function promisify<TRequest, TResponse>(
  method: (
    request: TRequest,
    callback: (error: Error | null, response: TResponse) => void
  ) => void,
  request: TRequest
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    method(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}
