import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../context/UserContext";
import {
  recordProofOnBlockchain,
  canonicalizeManufacturer,
  formatTxHash,
  getExplorerUrl,
} from "../utils/blockchain";

const Manufacturer = () => {
  const { user } = useContext(UserContext);
  const [labBatches, setLabBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [weightPerProduct, setWeightPerProduct] = useState(0);
  const [vedaUsed, setVedaUsed] = useState(""); // ✅ new state
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchLabBatches = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/lab-batches", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setLabBatches(data.batches);
        }
      } catch (err) {
        console.error("Error fetching lab batches:", err);
      }
    };

    fetchLabBatches();
  }, [user]);

  const toggleBatchSelection = (id) => {
    setSelectedBatches((prev) =>
      prev.includes(id) ? prev.filter((batchId) => batchId !== id) : [...prev, id]
    );
  };

  const handleCreateProductBatch = async () => {
    if (!user) {
      alert("Please login first");
      return;
    }
    if (!productName || selectedBatches.length === 0 || !vedaUsed) {
      alert("Enter product name, select at least one batch, and choose a Veda");
      return;
    }

    try {
      setLoading(true);
      setBlockchainError("");
      setBlockchainStatus(null);

      const res = await fetch("http://localhost:5000/api/product-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchIds: selectedBatches,
          productName,
          manufacturerId: user._id,
          quantity,
          weightPerProduct,
          vedaUsed, // ✅ send vedaUsed to backend
          location: "Factory/Plant location", // replace with actual if needed
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCodeUrl);
        const batchId = data.productBatch._id;

        // Record proof on Ethereum via MetaMask
        try {
          setBlockchainLoading(true);
          const canonical = canonicalizeManufacturer(data.productBatch);
          const bcResult = await recordProofOnBlockchain(batchId, "MANUFACTURED", canonical);
          setBlockchainStatus(bcResult);
        } catch (bcErr) {
          console.error("Blockchain recording notice:", bcErr);
          setBlockchainError(bcErr.message || "Failed to record on Ethereum. MongoDB record was saved.");
        } finally {
          setBlockchainLoading(false);
        }

        alert(`Product batch created: ${data.productBatch._id}`);
        setSelectedBatches([]);
        setProductName("");
        setQuantity(0);
        setWeightPerProduct(0);
        setVedaUsed(""); // ✅ reset
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Server error while creating product batch");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p className="text-center mt-8">Please login to continue</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Create Product Batch</h1>

        {/* Product Name */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Product Name</label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
        </div>

        {/* Quantity + Weight */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              min={0}
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Weight per Product (kg)</label>
            <input
              type="number"
              value={weightPerProduct}
              onChange={(e) => setWeightPerProduct(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              min={0}
            />
          </div>
        </div>

        {/* ✅ Veda Used Dropdown */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">Veda Used</label>
          <select
            value={vedaUsed}
            onChange={(e) => setVedaUsed(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            required
          >
            <option value="">Select Veda</option>
            <option value="Rig Veda">Rig Veda</option>
            <option value="Sama Veda">Sama Veda</option>
            <option value="Yajur Veda">Yajur Veda</option>
            <option value="Atharva Veda">Atharva Veda</option>
          </select>
        </div>

        {/* Lab Batches */}
        <h2 className="text-lg font-semibold mb-2">Select Lab-Tested Batches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto mb-4">
          {labBatches.map((batch) => (
            <div
              key={batch._id}
              className={`p-3 border rounded-lg cursor-pointer ${
                selectedBatches.includes(batch._id)
                  ? "bg-blue-100 border-blue-400"
                  : "bg-gray-50 border-gray-200"
              }`}
              onClick={() => toggleBatchSelection(batch._id)}
            >
              <p className="font-medium">Batch ID: {batch._id}</p>
              <p className="text-sm text-gray-600">
                Collector: {batch.collectorId?.species || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Tested Quantity: {batch.testedQuantityKg} kg
              </p>
              <p className="text-sm text-gray-600">
                Test Type: {batch.testType}
              </p>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          onClick={handleCreateProductBatch}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {loading ? "Creating..." : "Create Product Batch & Generate QR"}
        </button>

        {/* QR Code & Blockchain Proof */}
        {qrCode && (
          <div className="mt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Product Batch QR Code</h3>
            <img src={qrCode} alt="Product Batch QR" className="mx-auto border rounded-lg" />

            {/* Blockchain Status Display */}
            {blockchainLoading && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 flex items-center justify-center space-x-2 text-sm font-medium">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                <span>Waiting for MetaMask confirmation to record on Ethereum...</span>
              </div>
            )}

            {blockchainStatus && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-left">
                <div className="flex items-center space-x-2 font-semibold text-emerald-800">
                  <span className="text-emerald-600 font-bold text-base">✓</span>
                  <span>Recorded on Ethereum</span>
                </div>
                <div className="mt-2 text-xs space-y-1 font-mono text-gray-700">
                  <div>
                    <span className="font-sans font-medium text-gray-500">Transaction: </span>
                    <a
                      href={getExplorerUrl(blockchainStatus.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {formatTxHash(blockchainStatus.txHash)}
                    </a>
                  </div>
                  <div>
                    <span className="font-sans font-medium text-gray-500">Data Hash: </span>
                    <span className="break-all">{blockchainStatus.dataHash}</span>
                  </div>
                </div>
              </div>
            )}

            {blockchainError && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                ⚠️ {blockchainError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Manufacturer;

