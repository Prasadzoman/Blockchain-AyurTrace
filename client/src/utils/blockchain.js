import { ethers } from "ethers";
import contractArtifact from "../contracts/AgastyaTrace.json";

// Contract address resolution priority:
// 1. VITE_CONTRACT_ADDRESS in .env
// 2. Exported address in AgastyaTrace.json
// 3. Fallback placeholder
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  contractArtifact.address ||
  "0x0000000000000000000000000000000000000000";

export const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const CONTRACT_ABI = contractArtifact.abi;

/**
 * Format address for UI display (e.g. 0x1234...abcd)
 */
export function formatAddress(address) {
  if (!address || typeof address !== "string") return "";
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Format transaction hash for UI display
 */
export function formatTxHash(hash) {
  if (!hash || typeof hash !== "string") return "";
  if (hash.length <= 12) return hash;
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
}

/**
 * Get Etherscan link for Sepolia
 */
export function getExplorerUrl(hashOrAddress, type = "tx") {
  if (!hashOrAddress) return "#";
  return `https://sepolia.etherscan.io/${type}/${hashOrAddress}`;
}

/**
 * Get read-only or browser Web3 provider
 */
export function getProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
}

/**
 * Connect to MetaMask wallet
 */
export async function connectWallet() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to interact with Ethereum.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock MetaMask.");
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
    networkName: network.name,
  };
}

/**
 * Get contract instance
 */
export function getAgastyaContract(signerOrProvider) {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("AgastyaTrace contract address is not configured. Please deploy and set VITE_CONTRACT_ADDRESS.");
  }
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}

// ----------------------------------------------------
// Deterministic Canonical Field Formatting & Hashing
// ----------------------------------------------------

/**
 * Sort object keys alphabetically for deterministic JSON serialization
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(",")}]`;
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map((key) => {
    return `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`;
  });
  return `{${entries.join(",")}}`;
}

/**
 * Compute cryptographic Keccak-256 hash of canonical data object
 */
export function hashCanonicalData(canonicalObj) {
  const canonicalString = canonicalJsonStringify(canonicalObj);
  const utf8Bytes = ethers.toUtf8Bytes(canonicalString);
  return ethers.keccak256(utf8Bytes);
}

/**
 * Canonical representation for COLLECTED event
 */
export function canonicalizeCollector(data) {
  if (!data) return null;
  const chainId = String(data._id || data.chainId || "");
  const lat = data.location?.lat != null ? Number(data.location.lat).toFixed(6) : "0.000000";
  const lng = data.location?.lng != null ? Number(data.location.lng).toFixed(6) : "0.000000";

  return {
    stage: "COLLECTED",
    chainId,
    species: String(data.species || "").trim(),
    quantity: Number(data.quantity || 0),
    farmingType: String(data.farmingType || "").trim(),
    plantPart: String(data.plantPart || "").trim(),
    lat,
    lng,
  };
}

/**
 * Canonical representation for TRANSPORTED event
 */
export function canonicalizeTransport(data) {
  if (!data) return null;
  const chainId = String(data.collectorId?._id || data.collectorId || "");
  const lat = data.location?.lat != null ? Number(data.location.lat).toFixed(6) : "0.000000";
  const lng = data.location?.lng != null ? Number(data.location.lng).toFixed(6) : "0.000000";

  return {
    stage: "TRANSPORTED",
    chainId,
    quantityKg: Number(data.quantityKg || 0),
    destination: String(data.destination || "").trim(),
    lat,
    lng,
  };
}

/**
 * Canonical representation for PROCESSED event
 */
export function canonicalizeProcessing(data) {
  if (!data) return null;
  const chainId = String(data.collectorId?._id || data.collectorId || "");
  const lat = data.location?.lat != null ? Number(data.location.lat).toFixed(6) : "0.000000";
  const lng = data.location?.lng != null ? Number(data.location.lng).toFixed(6) : "0.000000";

  return {
    stage: "PROCESSED",
    chainId,
    receivedQuantityKg: Number(data.receivedQuantityKg || 0),
    processedQuantityKg: Number(data.processedQuantityKg || 0),
    processingType: String(data.processingType || "").trim(),
    lat,
    lng,
  };
}

/**
 * Canonical representation for LAB_TESTED event
 */
export function canonicalizeLab(data) {
  if (!data) return null;
  const chainId = String(data.collectorId?._id || data.collectorId || "");
  const lat = data.location?.lat != null ? Number(data.location.lat).toFixed(6) : "0.000000";
  const lng = data.location?.lng != null ? Number(data.location.lng).toFixed(6) : "0.000000";

  return {
    stage: "LAB_TESTED",
    chainId,
    testedQuantityKg: Number(data.testedQuantityKg || 0),
    testType: String(data.testType || "").trim(),
    result: String(data.result || "").trim(),
    lat,
    lng,
  };
}

/**
 * Canonical representation for MANUFACTURED event
 */
export function canonicalizeManufacturer(data) {
  if (!data) return null;
  const chainId = String(data._id || data.chainId || "");

  return {
    stage: "MANUFACTURED",
    chainId,
    productName: String(data.productName || "").trim(),
    quantity: Number(data.quantity || 0),
    weightPerProduct: Number(data.weightPerProduct || 0),
    vedaUsed: String(data.vedaUsed || "").trim(),
    location: String(data.location || "").trim(),
  };
}

/**
 * Execute MetaMask transaction to record event proof on Ethereum
 */
export async function recordProofOnBlockchain(chainId, eventType, canonicalData) {
  if (!chainId) {
    throw new Error("Chain ID is required for recording on Ethereum.");
  }
  if (!canonicalData) {
    throw new Error("Canonical data is required for computing data hash.");
  }

  const { signer, address } = await connectWallet();
  const contract = getAgastyaContract(signer);

  const dataHash = hashCanonicalData(canonicalData);
  console.log(`[Blockchain] Recording ${eventType} for chain ${chainId}`);
  console.log(`[Blockchain] Computed Data Hash: ${dataHash}`);

  const tx = await contract.addEvent(chainId, eventType, dataHash);
  console.log(`[Blockchain] Transaction submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`[Blockchain] Transaction confirmed in block: ${receipt.blockNumber}`);

  return {
    success: true,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    dataHash,
    actor: address,
    eventType,
    chainId,
  };
}

/**
 * Retrieve on-chain events for a chainId
 */
export async function fetchOnChainEvents(chainId) {
  try {
    const provider = getProvider();
    const contract = getAgastyaContract(provider);
    const events = await contract.getEvents(chainId);
    
    return events.map((ev) => ({
      eventType: ev.eventType,
      dataHash: ev.dataHash,
      previousHash: ev.previousHash,
      timestamp: Number(ev.timestamp),
      actor: ev.actor,
    }));
  } catch (err) {
    console.error("Error fetching on-chain events:", err);
    return [];
  }
}

/**
 * Full supply-chain cryptographic verification against Ethereum
 */
export async function verifySupplyChain(chainId, mongoChain) {
  const result = {
    isVerified: false,
    totalOnChainEvents: 0,
    stages: [],
    message: "",
    hasMismatch: false,
  };

  if (!chainId) {
    result.message = "Invalid Chain ID provided for verification.";
    return result;
  }

  try {
    const onChainEvents = await fetchOnChainEvents(chainId);
    result.totalOnChainEvents = onChainEvents.length;

    if (onChainEvents.length === 0) {
      result.message = "No blockchain events found on Ethereum for this Chain ID.";
      return result;
    }

    // Build ordered expected stages from MongoDB
    const expectedStages = [];

    if (mongoChain?.collector) {
      const canonical = canonicalizeCollector({ ...mongoChain.collector, _id: chainId });
      expectedStages.push({
        stageKey: "collector",
        stageName: "COLLECTED",
        canonical,
        hash: hashCanonicalData(canonical),
        data: mongoChain.collector,
      });
    }

    if (mongoChain?.transport && (Array.isArray(mongoChain.transport) ? mongoChain.transport.length > 0 : true)) {
      const transportItem = Array.isArray(mongoChain.transport) ? mongoChain.transport[0] : mongoChain.transport;
      const canonical = canonicalizeTransport({ ...transportItem, collectorId: chainId });
      expectedStages.push({
        stageKey: "transport",
        stageName: "TRANSPORTED",
        canonical,
        hash: hashCanonicalData(canonical),
        data: transportItem,
      });
    }

    if (mongoChain?.processing) {
      const canonical = canonicalizeProcessing({ ...mongoChain.processing, collectorId: chainId });
      expectedStages.push({
        stageKey: "processing",
        stageName: "PROCESSED",
        canonical,
        hash: hashCanonicalData(canonical),
        data: mongoChain.processing,
      });
    }

    if (mongoChain?.lab) {
      const canonical = canonicalizeLab({ ...mongoChain.lab, collectorId: chainId });
      expectedStages.push({
        stageKey: "lab",
        stageName: "LAB_TESTED",
        canonical,
        hash: hashCanonicalData(canonical),
        data: mongoChain.lab,
      });
    }

    let allMatch = true;
    let mismatchCount = 0;

    // Compare each on-chain event with expected data
    for (let i = 0; i < onChainEvents.length; i++) {
      const onChain = onChainEvents[i];
      const expected = expectedStages[i];

      const stageReport = {
        index: i + 1,
        eventType: onChain.eventType,
        actor: onChain.actor,
        timestamp: onChain.timestamp,
        onChainDataHash: onChain.dataHash,
        onChainPreviousHash: onChain.previousHash,
        recalculatedDataHash: expected ? expected.hash : null,
        hashMatches: expected ? expected.hash === onChain.dataHash : false,
        stageName: onChain.eventType,
        canonicalData: expected ? expected.canonical : null,
      };

      if (!stageReport.hashMatches) {
        allMatch = false;
        mismatchCount++;
      }

      result.stages.push(stageReport);
    }

    // Verify hash-chain continuity
    for (let i = 1; i < onChainEvents.length; i++) {
      if (onChainEvents[i].previousHash === ethers.ZeroHash) {
        allMatch = false;
      }
    }

    result.isVerified = allMatch && onChainEvents.length > 0;
    result.hasMismatch = !allMatch;

    if (result.isVerified) {
      result.message = "All supply-chain records match their immutable Ethereum proofs.";
    } else {
      result.message = `Data integrity mismatch detected (${mismatchCount} record${mismatchCount > 1 ? "s" : ""} modified or unverified).`;
    }

    return result;
  } catch (err) {
    console.error("Verification error:", err);
    result.message = `Verification failed: ${err.message}`;
    return result;
  }
}
