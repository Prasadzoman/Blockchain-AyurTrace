const http = require("http");
const path = require("path");
const fs = require("fs");
const { ethers } = require("../client/node_modules/ethers");

const PORT = 8545;
const CHAIN_ID = 31337;
const CHAIN_ID_HEX = "0x7a69";

// Load Contract ABI and address
const artifactPath = path.join(__dirname, "../client/src/contracts/AgastyaTrace.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const iface = new ethers.Interface(artifact.abi);
const CONTRACT_ADDRESS = artifact.address.toLowerCase();

console.log("====================================================");
console.log("    AgastyaTrace Local Ethereum Blockchain Server   ");
console.log("====================================================");
console.log(`Port:            http://127.0.0.1:${PORT}`);
console.log(`Chain ID:        ${CHAIN_ID} (${CHAIN_ID_HEX})`);
console.log(`Contract:        ${artifact.address}`);
console.log("====================================================\n");

// In-memory state for AgastyaTrace
const chainEvents = new Map(); // chainId -> TraceEvent[]
const latestHashes = new Map(); // chainId -> bytes32
const txReceipts = new Map(); // txHash -> receipt
let blockNumber = 1;

function jsonRpcSuccess(id, result) {
  return { jsonrpc: "2.0", id: id ?? 1, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id: id ?? 1, error: { code, message } };
}

const server = http.createServer(async (req, res) => {
  // Enable CORS for MetaMask & frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    let requests;
    try {
      requests = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jsonRpcError(null, -32700, "Parse error")));
      return;
    }

    const isBatch = Array.isArray(requests);
    const reqList = isBatch ? requests : [requests];
    const responses = [];

    for (const reqItem of reqList) {
      const { id, method, params } = reqItem;
      // console.log(`[RPC] ${method}`);

      try {
        switch (method) {
          case "eth_chainId":
            responses.push(jsonRpcSuccess(id, CHAIN_ID_HEX));
            break;

          case "net_version":
            responses.push(jsonRpcSuccess(id, String(CHAIN_ID)));
            break;

          case "eth_blockNumber":
            responses.push(jsonRpcSuccess(id, `0x${blockNumber.toString(16)}`));
            break;

          case "eth_getBalance":
            // Always return 10,000 ETH for any queried account so gas is never an issue
            responses.push(jsonRpcSuccess(id, "0x21e19e0c9bab2400000"));
            break;

          case "eth_getTransactionCount":
            responses.push(jsonRpcSuccess(id, "0x0"));
            break;

          case "eth_gasPrice":
            responses.push(jsonRpcSuccess(id, "0x3b9aca00")); // 1 gwei
            break;

          case "eth_maxPriorityFeePerGas":
            responses.push(jsonRpcSuccess(id, "0x3b9aca00"));
            break;

          case "eth_feeHistory":
            responses.push(
              jsonRpcSuccess(id, {
                oldestBlock: "0x1",
                baseFeePerGas: ["0x3b9aca00", "0x3b9aca00"],
                gasUsedRatio: [0.1],
                reward: [["0x3b9aca00"]],
              })
            );
            break;

          case "eth_estimateGas":
            responses.push(jsonRpcSuccess(id, "0x186a0")); // 100,000
            break;

          case "eth_sendRawTransaction": {
            const rawTx = params[0];
            const parsedTx = ethers.Transaction.from(rawTx);
            const txHash = parsedTx.hash;
            const from = parsedTx.from;
            const data = parsedTx.data;

            console.log(`\n[Tx Received] Hash: ${txHash}`);
            console.log(`[Tx Received] From: ${from}`);

            // Decode function call
            try {
              const decoded = iface.parseTransaction({ data, value: parsedTx.value });
              if (decoded && decoded.name === "addEvent") {
                const chainId = decoded.args[0];
                const eventType = decoded.args[1];
                const dataHash = decoded.args[2];

                if (!chainEvents.has(chainId)) {
                  chainEvents.set(chainId, []);
                }

                const prevHash = latestHashes.get(chainId) || ethers.ZeroHash;
                const timestamp = BigInt(Math.floor(Date.now() / 1000));

                // Cumulative hash according to contract logic
                const cumulativeHash = ethers.solidityPackedKeccak256(
                  ["string", "string", "bytes32", "bytes32", "uint256", "address"],
                  [chainId, eventType, dataHash, prevHash, timestamp, from]
                );

                const newEvent = {
                  eventType,
                  dataHash,
                  previousHash: prevHash,
                  timestamp,
                  actor: from,
                };

                chainEvents.get(chainId).push(newEvent);
                latestHashes.set(chainId, cumulativeHash);
                blockNumber++;

                console.log(`✓ [Proof Added] Stage: ${eventType} | Chain: ${chainId}`);
                console.log(`✓ Data Hash:     ${dataHash}`);
                console.log(`✓ Previous Hash: ${prevHash}`);
              }
            } catch (decodeErr) {
              console.warn("Could not decode function (or raw deployment):", decodeErr.message);
            }

            // Create receipt
            const receipt = {
              transactionHash: txHash,
              transactionIndex: "0x0",
              blockHash: ethers.keccak256(ethers.toUtf8Bytes(String(blockNumber))),
              blockNumber: `0x${blockNumber.toString(16)}`,
              from: from,
              to: parsedTx.to,
              cumulativeGasUsed: "0x5208",
              gasUsed: "0x5208",
              contractAddress: null,
              logs: [],
              logsBloom: "0x" + "0".repeat(512),
              status: "0x1", // 1 = success
              type: "0x2",
            };
            txReceipts.set(txHash, receipt);

            responses.push(jsonRpcSuccess(id, txHash));
            break;
          }

          case "eth_getTransactionReceipt": {
            const queryHash = params[0];
            const receipt = txReceipts.get(queryHash) || {
              transactionHash: queryHash,
              transactionIndex: "0x0",
              blockHash: "0x" + "1".repeat(64),
              blockNumber: "0x1",
              status: "0x1",
              cumulativeGasUsed: "0x5208",
              gasUsed: "0x5208",
              logs: [],
            };
            responses.push(jsonRpcSuccess(id, receipt));
            break;
          }

          case "eth_getTransactionByHash": {
            const queryHash = params[0];
            responses.push(
              jsonRpcSuccess(id, {
                hash: queryHash,
                blockNumber: "0x1",
                blockHash: "0x" + "1".repeat(64),
                transactionIndex: "0x0",
                from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                to: artifact.address,
                value: "0x0",
                gas: "0x186a0",
                gasPrice: "0x3b9aca00",
                input: "0x",
              })
            );
            break;
          }

          case "eth_call": {
            const txCall = params[0];
            const to = (txCall.to || "").toLowerCase();
            const data = txCall.data;

            if (data) {
              try {
                const decoded = iface.parseTransaction({ data });
                if (decoded) {
                  const fnName = decoded.name;
                  const chainId = decoded.args[0];

                  if (fnName === "getEvents") {
                    const events = chainEvents.get(chainId) || [];
                    const encodedResult = iface.encodeFunctionResult("getEvents", [events]);
                    responses.push(jsonRpcSuccess(id, encodedResult));
                    break;
                  }

                  if (fnName === "getEventCount") {
                    const count = BigInt((chainEvents.get(chainId) || []).length);
                    const encodedResult = iface.encodeFunctionResult("getEventCount", [count]);
                    responses.push(jsonRpcSuccess(id, encodedResult));
                    break;
                  }

                  if (fnName === "latestEventHash") {
                    const hash = latestHashes.get(chainId) || ethers.ZeroHash;
                    const encodedResult = iface.encodeFunctionResult("latestEventHash", [hash]);
                    responses.push(jsonRpcSuccess(id, encodedResult));
                    break;
                  }
                }
              } catch (e) {
                // If decoding fails, return empty result
              }
            }
            responses.push(jsonRpcSuccess(id, "0x"));
            break;
          }

          case "eth_getCode":
            // Return contract bytecode indicator so ethers knows a contract is at this address
            responses.push(jsonRpcSuccess(id, "0x608060405234801561001057600080fd5b50"));
            break;

          default:
            responses.push(jsonRpcSuccess(id, "0x0"));
            break;
        }
      } catch (err) {
        console.error(`Error processing ${method}:`, err);
        responses.push(jsonRpcError(id, -32603, err.message));
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(isBatch ? responses : responses[0]));
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✓ Local Blockchain Node listening on http://127.0.0.1:${PORT}`);
  console.log("Ready to accept MetaMask transactions and verify supply-chain proofs!\n");
});
