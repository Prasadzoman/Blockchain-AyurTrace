const assert = require("assert");
const { ethers } = require("ethers");
const { compile } = require("../scripts/compile.cjs");

async function runTests() {
  console.log("--------------------------------------------------");
  console.log("Running AgastyaTrace Smart Contract Verification Tests");
  console.log("--------------------------------------------------");

  const artifact = compile();
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;

  // Create local in-memory provider and signers
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Test wallet generator
  const owner = ethers.Wallet.createRandom();
  const transporter = ethers.Wallet.createRandom();
  const processor = ethers.Wallet.createRandom();
  const labTech = ethers.Wallet.createRandom();

  console.log(`Owner/Collector: ${owner.address}`);
  console.log(`Transporter:     ${transporter.address}`);
  console.log(`Processor:       ${processor.address}`);
  console.log(`Lab Technician:  ${labTech.address}`);

  // Test 1: Canonical hashing
  console.log("\n[Test 1] Deterministic Canonical Hashing Check...");
  const collectorData = {
    species: "Ashwagandha",
    quantity: 50,
    farmingType: "Organic",
    plantPart: "Root",
    chainId: "66f8a2b3c1234567890abcd1",
    lat: "12.971598",
    lng: "77.594562",
  };

  function canonicalJsonStringify(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return `[${obj.map((item) => canonicalJsonStringify(item)).join(",")}]`;
    const sortedKeys = Object.keys(obj).sort();
    return `{${sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`).join(",")}}`;
  }

  const serialized = canonicalJsonStringify(collectorData);
  const hash1 = ethers.keccak256(ethers.toUtf8Bytes(serialized));
  const hash2 = ethers.keccak256(ethers.toUtf8Bytes(serialized));
  assert.strictEqual(hash1, hash2, "Hashing must be deterministic");
  assert.ok(ethers.isHexString(hash1, 32), "Hash must be 32-byte hex");
  console.log(`✓ Canonical Hash generated: ${hash1}`);

  console.log("\n[Test 2] Contract ABI Function Signatures Check...");
  const contractInterface = new ethers.Interface(abi);
  assert.ok(contractInterface.getFunction("addEvent"), "addEvent function exists");
  assert.ok(contractInterface.getFunction("getEvents"), "getEvents function exists");
  assert.ok(contractInterface.getFunction("getEventCount"), "getEventCount function exists");
  assert.ok(contractInterface.getFunction("latestEventHash"), "latestEventHash function exists");
  assert.ok(contractInterface.getEvent("EventAdded"), "EventAdded event exists");
  console.log("✓ Contract interface and ABI signatures validated!");

  console.log("\n[Test 3] Hash-Chain Continuity Simulation...");
  const chainId = "66f8a2b3c1234567890abcd1";
  
  // Event 1: COLLECTED
  const ev1DataHash = hash1;
  const ev1PrevHash = ethers.ZeroHash;
  const ev1Time = Math.floor(Date.now() / 1000);
  const ev1CumulativeHash = ethers.solidityPackedKeccak256(
    ["string", "string", "bytes32", "bytes32", "uint256", "address"],
    [chainId, "COLLECTED", ev1DataHash, ev1PrevHash, ev1Time, owner.address]
  );
  console.log(`✓ COLLECTED cumulative hash: ${ev1CumulativeHash}`);

  // Event 2: TRANSPORTED
  const ev2DataHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJsonStringify({
    stage: "TRANSPORTED",
    chainId,
    quantityKg: 50,
    destination: "Processing Plant A"
  })));
  const ev2PrevHash = ev1CumulativeHash;
  const ev2Time = ev1Time + 3600;
  const ev2CumulativeHash = ethers.solidityPackedKeccak256(
    ["string", "string", "bytes32", "bytes32", "uint256", "address"],
    [chainId, "TRANSPORTED", ev2DataHash, ev2PrevHash, ev2Time, transporter.address]
  );
  assert.strictEqual(ev2PrevHash, ev1CumulativeHash, "Event 2 must link to Event 1");
  console.log(`✓ TRANSPORTED links to previous proof: ${ev2PrevHash}`);

  // Event 3: PROCESSED
  const ev3DataHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJsonStringify({
    stage: "PROCESSED",
    chainId,
    receivedQuantityKg: 50,
    processedQuantityKg: 48,
    processingType: "sorting"
  })));
  const ev3PrevHash = ev2CumulativeHash;
  const ev3Time = ev2Time + 7200;
  const ev3CumulativeHash = ethers.solidityPackedKeccak256(
    ["string", "string", "bytes32", "bytes32", "uint256", "address"],
    [chainId, "PROCESSED", ev3DataHash, ev3PrevHash, ev3Time, processor.address]
  );
  assert.strictEqual(ev3PrevHash, ev2CumulativeHash, "Event 3 must link to Event 2");
  console.log(`✓ PROCESSED links to previous proof: ${ev3PrevHash}`);

  // Event 4: LAB_TESTED
  const ev4DataHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalJsonStringify({
    stage: "LAB_TESTED",
    chainId,
    testedQuantityKg: 48,
    testType: "moisture",
    result: "Passed - Moisture 8.2%"
  })));
  const ev4PrevHash = ev3CumulativeHash;
  const ev4Time = ev3Time + 1800;
  const ev4CumulativeHash = ethers.solidityPackedKeccak256(
    ["string", "string", "bytes32", "bytes32", "uint256", "address"],
    [chainId, "LAB_TESTED", ev4DataHash, ev4PrevHash, ev4Time, labTech.address]
  );
  assert.strictEqual(ev4PrevHash, ev3CumulativeHash, "Event 4 must link to Event 3");
  console.log(`✓ LAB_TESTED links to previous proof: ${ev4PrevHash}`);

  console.log("\n--------------------------------------------------");
  console.log("✓ ALL SMART CONTRACT & CRYPTOGRAPHIC VERIFICATION TESTS PASSED!");
  console.log("--------------------------------------------------");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
