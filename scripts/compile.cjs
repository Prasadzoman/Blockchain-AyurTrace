const fs = require("fs");
const path = require("path");
const solc = require("solc");

function compile() {
  console.log("Compiling AgastyaTrace.sol using solc...");
  const contractPath = path.join(__dirname, "../contracts/AgastyaTrace.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "AgastyaTrace.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    output.errors.forEach((err) => {
      console.log(err.formattedMessage);
      if (err.severity === "error") hasError = true;
    });
    if (hasError) {
      throw new Error("Solidity compilation failed.");
    }
  }

  const contractData = output.contracts["AgastyaTrace.sol"]["AgastyaTrace"];
  const abi = contractData.abi;
  const bytecode = contractData.evm.bytecode.object;

  const artifactDir = path.join(__dirname, "../artifacts/contracts/AgastyaTrace.sol");
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const artifact = {
    contractName: "AgastyaTrace",
    abi: abi,
    bytecode: bytecode,
  };

  fs.writeFileSync(
    path.join(artifactDir, "AgastyaTrace.json"),
    JSON.stringify(artifact, null, 2),
    "utf8"
  );

  const clientContractDir = path.join(__dirname, "../client/src/contracts");
  if (!fs.existsSync(clientContractDir)) {
    fs.mkdirSync(clientContractDir, { recursive: true });
  }

  let existingAddress = "0x0000000000000000000000000000000000000000";
  const clientContractPath = path.join(clientContractDir, "AgastyaTrace.json");
  if (fs.existsSync(clientContractPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(clientContractPath, "utf8"));
      if (existing.address) existingAddress = existing.address;
    } catch (e) {}
  }

  const clientExport = {
    address: existingAddress,
    network: {
      name: "sepolia",
      chainId: 11155111,
    },
    abi: abi,
  };

  fs.writeFileSync(clientContractPath, JSON.stringify(clientExport, null, 2), "utf8");

  console.log("✓ Contract compiled successfully! ABI and bytecode generated.");
  return artifact;
}

if (require.main === module) {
  compile();
}

module.exports = { compile };
