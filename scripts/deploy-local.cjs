const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { compile } = require("./compile.cjs");

async function deploy() {
  console.log("------------------------------------------");
  console.log("Deploying AgastyaTrace to Local Blockchain");
  console.log("------------------------------------------");

  // 1. Compile contract
  const artifact = compile();
  const abi = artifact.abi;
  const bytecode = artifact.bytecode;

  // 2. Connect to local RPC node
  const rpcUrl = "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // 3. Get first account from provider
  const signer = await provider.getSigner(0);
  const deployerAddress = await signer.getAddress();
  console.log(`Deployer address: ${deployerAddress}`);

  // 4. Deploy contract
  console.log("Sending deployment transaction...");
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`\n🎉 AgastyaTrace deployed successfully!`);
  console.log(`Contract Address: ${contractAddress}`);

  // 5. Update client/src/contracts/AgastyaTrace.json
  const clientArtifactPath = path.join(__dirname, "../client/src/contracts/AgastyaTrace.json");
  const clientExport = {
    address: contractAddress,
    network: {
      name: "localhost",
      chainId: 31337,
    },
    abi: abi,
  };
  fs.writeFileSync(clientArtifactPath, JSON.stringify(clientExport, null, 2), "utf8");
  console.log(`✓ Updated ${clientArtifactPath}`);

  // 6. Update client/.env
  const clientEnvPath = path.join(__dirname, "../client/.env");
  let envContent = "";
  if (fs.existsSync(clientEnvPath)) {
    envContent = fs.readFileSync(clientEnvPath, "utf8");
  }

  if (envContent.includes("VITE_CONTRACT_ADDRESS=")) {
    envContent = envContent.replace(
      /VITE_CONTRACT_ADDRESS=.*/,
      `VITE_CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    envContent += `\nVITE_CONTRACT_ADDRESS=${contractAddress}`;
  }

  if (envContent.includes("VITE_SEPOLIA_RPC_URL=")) {
    envContent = envContent.replace(
      /VITE_SEPOLIA_RPC_URL=.*/,
      `VITE_SEPOLIA_RPC_URL=${rpcUrl}`
    );
  } else {
    envContent += `\nVITE_SEPOLIA_RPC_URL=${rpcUrl}`;
  }

  fs.writeFileSync(clientEnvPath, envContent, "utf8");
  console.log(`✓ Updated ${clientEnvPath}`);

  console.log("\n------------------------------------------");
  console.log("Ready for MetaMask interaction on Localhost:8545!");
  console.log("------------------------------------------");
}

if (require.main === module) {
  deploy().catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });
}

module.exports = { deploy };
