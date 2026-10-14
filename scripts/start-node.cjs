process.env.HARDHAT_DISABLE_TELEMETRY = "true";
const hre = require("hardhat");

async function main() {
  console.log("Starting Hardhat local Ethereum node on port 8545...");
  await hre.run("node", { port: 8545 });
}

main().catch((err) => {
  console.error("Hardhat node error:", err);
  process.exit(1);
});
