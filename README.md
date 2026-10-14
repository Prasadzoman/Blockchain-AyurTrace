# 🌿 AgastyaTrace: Botanical Traceability System for Ayurvedic Herbs Using Blockchain

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-blue.svg)](https://soliditylang.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia%20%2F%20Local%20EVM-purple.svg)](https://ethereum.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg)](https://vitejs.dev/)

> **AgastyaTrace** is a decentralized, end-to-end botanical supply-chain traceability platform for Ayurvedic medicinal herbs. It combines an operational database with an immutable Ethereum blockchain layer to eliminate counterfeit herbs, authenticate botanical species origin, enforce multi-stage quality gates, and empower consumers and regulators with instant cryptographic verification.

---

## 📌 Table of Contents

- [Problem Statement & Background](#-problem-statement--background)
- [System Architecture](#-system-architecture)
- [Supply Chain Lifecycle](#-supply-chain-lifecycle)
- [Cryptographic Verification Engine](#-cryptographic-verification-engine)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Quick Start](#-installation--quick-start)
- [MetaMask Configuration](#-metamask-configuration)
- [Smart Contract Deployment](#-smart-contract-deployment)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Academic & Project Details](#-academic--project-details)

---

## 🚨 Problem Statement & Background

The global Ayurvedic medicine market was valued at **USD $9.71 Billion in 2022** and is projected to reach **$21.5 Billion by 2030 (CAGR 16.14%)**. However, the industry suffers from severe supply-chain vulnerabilities:

* **Species Adulteration & Substitution**: Over 40% of herbal medicines face adulteration (WHO). For example, authentic *Withania somnifera* (Ashwagandha) is frequently substituted with pharmacologically inferior *Withania coagulans*.
* **Opaque Multi-Tiered Intermediaries**: Herbs harvested in remote tribal forests pass through 5 to 7 unmonitored middlemen, with no verifiable chain-of-custody documentation.
* **Economic Injustice**: Primary tribal collectors and rural farmers receive less than 15% of the final product Maximum Retail Price (MRP).
* **Centralized Database Flaws**: Traditional relational databases maintain isolated silos vulnerable to unauthorized modification and single-point-of-failure tampering.

**AgastyaTrace** resolves these challenges by establishing an immutable, tamper-evident cryptographic chain of custody from the geo-tagged point of harvest to the retail consumer bottle.

---

## 🏗️ System Architecture

AgastyaTrace utilizes a **Hybrid Dual-Storage Architecture**:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (React 18 + Vite)                       │
│  Collector.jsx │ Transport.jsx │ Processing.jsx │ Lab.jsx │ Manufacturer.jsx │ ChainDetails.jsx │
│                    MetaMask Web3 Provider (Ethers.js v6)                               │
└─────────────────────────────────┬──────────────────────────┬───────────────────────────┘
                                  │                          │
                 HTTP REST (JSON) │                          │ Signed Tx / eth_call
                                  ▼                          ▼
┌──────────────────────────────────────────────┐  ┌──────────────────────────────────────┐
│          OPERATIONAL BACKEND LAYER           │  │      BLOCKCHAIN PROOF LAYER          │
│   Node.js + Express 5 (Port 5000)            │  │   Ethereum EVM / Local Node (8545)   │
│   - Session Auth & Cookie Management         │  │   Contract: AgastyaTrace.sol         │
│   - Mongoose ORM Models                      │  │   - Compact 32-byte Keccak-256 Proofs│
│   - Dynamic QR Code Generation (qrcode)      │  │   - Cumulative Previous-Hash Linkage │
│   - MongoDB WiredTiger Engine (Port 27017)   │  │   - Immutable Event Emissions        │
└──────────────────────────────────────────────┘  └──────────────────────────────────────┘
```

1. **Off-Chain Operational Layer (MongoDB)**: Stores full supply-chain data (GPS coordinates, sensor telemetry, farmer information, batch weights, lab certificates).
2. **On-Chain Cryptographic Layer (Ethereum)**: Stores **only compact 32-byte Keccak-256 state hashes (`bytes32`)** linked via a recursive previous-hash chain.
3. **Efficiency Advantage**: Zero ledger bloat, minimal gas fees, high operational throughput, and 100% cryptographic tamper detection.

---

## 🔄 Supply Chain Lifecycle

| Stage | Actor | Event Type | Description |
|---|---|---|---|
| **1. Collection** | Collector / Farmer | `COLLECTED` | Logs botanical species, plant part used, farming type (Organic/Wild), GPS coordinates, and IoT sensor telemetry (temperature, humidity, moisture, pH). |
| **2. Transport** | Logistics Provider | `TRANSPORTED` | Scans collector QR code, registers transport vehicle, dispatch quantity, route waypoints, and destination facility. |
| **3. Processing** | Processing Unit | `PROCESSED` | Records received vs. processed quantities (yield-loss audit) and processing method (Drying, Grinding, Sorting, Grading). |
| **4. Lab Testing** | Quality Laboratory | `LAB_TESTED` | Performs phytochemical assays, moisture tests, heavy metals analysis, and DNA barcoding authentication; uploads test certificates. |
| **5. Manufacturing** | Ayurvedic Manufacturer | `MANUFACTURED` | Aggregates validated lab batches into finished product formulations adhering to classical Veda standards (Charaka, Sushruta, Ashtanga Hridaya); generates consumer QR code. |
| **6. Consumer / Audit** | Consumer / AYUSH | `VERIFIED` | Scans bottle QR code to inspect complete provenance and executes real-time cryptographic audit against Ethereum. |

---

## 🔐 Cryptographic Verification Engine

### 1. Deterministic Canonical Serialization
To guarantee identical serialization across diverse browsers and platforms, object keys are sorted lexicographically, and floating-point coordinates are normalized to 6 decimal places:

$$S_i = \text{Canonicalize}(D_i) = \{ k_1: v_1, k_2: v_2, \dots, k_n: v_n \} \quad \text{where } k_1 < k_2 < \dots < k_n$$

### 2. Stage Data Hash (Keccak-256)
$$H_{\text{data}, i} = \text{Keccak256}(\text{UTF8Encode}(\text{CanonicalJsonStringify}(S_i))) \in \{0, 1\}^{256}$$

### 3. Cumulative Hash-Chain Recurrence
Each new milestone on the blockchain encapsulates the cumulative proof of the preceding milestone:

$$P_0 = \text{0x0000000000000000000000000000000000000000000000000000000000000000}$$
$$P_i = \text{Keccak256}(\text{chainId} \parallel \text{eventType}_i \parallel H_{\text{data}, i} \parallel P_{i-1} \parallel \text{Timestamp}_i \parallel \text{Actor}_i)$$

* **Tamper Proof**: If any past database record $D_j$ is modified, $H_{\text{data}, j}$ diverges, breaking the chain $P_k$ for all $k \ge j$. The verification engine flags the exact stage of divergence.

---

## 💻 Technology Stack

* **Smart Contracts & Blockchain**:
  * Solidity `^0.8.20` (`contracts/AgastyaTrace.sol`)
  * Hardhat Development Suite & Toolbox
  * Ethers.js v6 (Web3 BrowserProvider, Contract Factory & Interfaces)
  * MetaMask Browser Extension
* **Backend Services**:
  * Node.js & Express.js 5
  * MongoDB Atlas / Community Edition (WiredTiger Engine)
  * Mongoose ODM
  * Passport.js (Authentication & Local Strategy)
  * QR Code Generation (`qrcode`)
* **Frontend Web Application**:
  * React 18 SPA (Vite 7 bundler)
  * Tailwind CSS
  * Leaflet & React-Leaflet (Interactive GIS Mapping & Polyline Journey Routing)
  * HTML5 QR Scanner (`@yudiel/react-qr-scanner`)

---

## 📁 Project Directory Structure

```text
AgastyaTrace2-main/
├── contracts/
│   └── AgastyaTrace.sol           # Solidity smart contract for chained proofs
├── scripts/
│   ├── compile.cjs                # Standalone solc compilation script
│   ├── deploy.cjs                 # Hardhat deployment script (Sepolia / Localhost)
│   ├── deploy-local.cjs           # Direct ethers.js local deployment script
│   └── local-rpc.cjs              # High-performance local Ethereum JSON-RPC server
├── test/
│   ├── AgastyaTrace.test.cjs      # Hardhat / Mocha test suite
│   └── run-test.cjs               # Standalone cryptographic verification test suite
├── backend/
│   ├── model/                     # Mongoose database schemas
│   │   ├── collection.js          # Collector stage schema with 18 plant parts
│   │   ├── transporter.js         # Transport stage schema
│   │   ├── processing.js          # Processing stage schema
│   │   ├── lab.js                 # Lab testing & certification schema
│   │   ├── ProductBatch.js        # Manufacturer formulation schema
│   │   └── user.js                # Passport authentication user schema
│   ├── app.js                     # Express REST API & session middleware
│   └── package.json               # Backend dependencies
├── client/
│   ├── src/
│   │   ├── components/            # Reusable UI components (Navbar, etc.)
│   │   ├── context/               # React Context (UserContext.jsx)
│   │   ├── contracts/             # Contract ABIs & deployed addresses
│   │   ├── pages/                 # React Pages (Collector, Transport, Lab, ChainDetails...)
│   │   └── utils/                 # blockchain.js (Canonical hashing & Web3 helpers)
│   ├── .env                       # Frontend environment configuration
│   ├── package.json               # Frontend dependencies
│   └── vite.config.js             # Vite build configuration
├── hardhat.config.cjs             # Hardhat network configuration
├── package.json                   # Root dependencies (Hardhat, Ethers, Dotenv)
└── README.md                      # Project documentation
```

---

## ⚙️ Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: v18.x, v20.x, or v22.x (Node v20 LTS recommended)
* **npm**: v9.x or later
* **MongoDB**: Community Server (v6.0 or v7.0) or MongoDB Atlas URI
* **MetaMask**: Browser Extension installed on Chrome, Brave, or Firefox

---

## 🚀 Installation & Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/AgastyaTrace.git
cd AgastyaTrace
```

### 2. Install Dependencies

Install root dependencies (Hardhat, Ethers.js, compiler tools):
```bash
npm install
```

Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

Install client dependencies:
```bash
cd client
npm install
cd ..
```

---

### 3. Start All Services

You will need **4 terminal windows** (or background processes):

#### Terminal 1: Start MongoDB
Ensure MongoDB is running locally on port `27017`:
```powershell
# Windows
mongod --dbpath "C:\Users\<username>\mongodb_data" --port 27017
```

#### Terminal 2: Start Local Ethereum Blockchain Node
AgastyaTrace includes a built-in local EVM JSON-RPC server running on port `8545`:
```powershell
cd AgastyaTrace
node ./scripts/local-rpc.cjs
```
* **RPC URL**: `http://127.0.0.1:8545`
* **Chain ID**: `31337` (`0x7a69`)
* **Contract Address**: `0x516fc149b2A7e4D6f0913678CcdBBaEFa2Cb020C`

#### Terminal 3: Start Backend API Server
```powershell
cd AgastyaTrace/backend
node app.js
```
* **Backend API**: `http://localhost:5000`

#### Terminal 4: Start Frontend Development Server
```powershell
cd AgastyaTrace/client
npm run dev
```
* **Frontend Application**: `http://localhost:5173/`

---

## 🦊 MetaMask Configuration

To test transactions on the local blockchain:

### 1. Add Local Network Manually
1. Open MetaMask $\to$ click the **Network Selector** (top left).
2. Click **Add network** $\to$ **Add a network manually**.
3. Enter the network parameters:
   * **Network Name**: `Agastya Localhost`
   * **New RPC URL**: `http://127.0.0.1:8545`
   * **Chain ID**: `31337`
   * **Currency Symbol**: `ETH`
4. Click **Save** and switch to `Agastya Localhost`.

### 2. Import Pre-Funded Test Account
1. In MetaMask, click your profile icon $\to$ **Add account or hardware wallet** $\to$ **Import account**.
2. Paste the test private key (pre-funded with 10,000 ETH):
   ```text
   0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. Your account will immediately show a balance of **10,000 ETH**.

---

## 🌐 Smart Contract Deployment

### Deploying to Localhost
When running `node ./scripts/local-rpc.cjs`, the contract is pre-configured. Alternatively, via Hardhat:
```bash
npx hardhat run scripts/deploy.cjs --network localhost
```

### Deploying to Ethereum Sepolia Testnet
1. In the root directory, configure `.env`:
   ```env
   SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
   PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY"
   ```
2. Run deployment from the root directory:
   ```bash
   npx hardhat run scripts/deploy.cjs --network sepolia
   ```
   *(The script automatically compiles the contract and updates `client/.env` and `client/src/contracts/AgastyaTrace.json` with the new address).*

---

## 🧪 Testing & Quality Assurance

Run the comprehensive offline cryptographic and smart contract test suite:
```bash
node ./test/run-test.cjs
```

**Expected Output:**
```text
✓ Canonical Hash generated: 0xbc70bdea5cfd3d2c909ff6cacd670ebf1c2403c0c201a4725e3755cb20d00bd5
✓ Contract interface and ABI signatures validated!
✓ COLLECTED cumulative hash: 0x3d818ff861d5842acd714c51e9a3024aa948fe4f9c63d6b7a8c18c3b313e6e3f
✓ TRANSPORTED links to previous proof: ✓
✓ PROCESSED links to previous proof: ✓
✓ LAB_TESTED links to previous proof: ✓
✓ ALL SMART CONTRACT & CRYPTOGRAPHIC VERIFICATION TESTS PASSED!
```

---

## 🎓 Academic & Project Details

* **Institution**: JSPM's Rajarshi Shahu College of Engineering, Tathawade, Pune - 33  
  *(An Autonomous Institute Affiliated to Savitribai Phule Pune University)*
* **Department**: Department of Information Technology
* **Project Team ID**: B3
* **Project Guide**: Dr. Rupali T. Umbare
* **Head of Department**: Dr. Nihar M. Ranjan
* **Team Members**:
  * **Parth Mirajkar** (RBT23IT066)
  * **Kuldeep Khartude** (RBT23IT096)
  * **Prasad Zoman** (RBT23IT110)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
