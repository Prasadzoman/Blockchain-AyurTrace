import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  recordProofOnBlockchain,
  canonicalizeTransport,
  formatTxHash,
  getExplorerUrl,
} from "../utils/blockchain";

// Fix marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const Transport = () => {
  const [collectorId, setCollectorId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [scanning, setScanning] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [qrCodeURL, setQrCodeURL] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  // Fetch current geolocation
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setLoadingLocation(true);
    setLocationError("");
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoadingLocation(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        setLocationError("Unable to access your location. Please enable location services.");
        setLoadingLocation(false);
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleSubmit = async () => {
    if (!collectorId || !quantity) {
      alert("Please provide both Collector ID and Quantity");
      return;
    }

    setIsSubmitting(true);
    setBlockchainError("");
    setBlockchainStatus(null);

    const payload = {
      collectorId,
      quantityKg: parseFloat(quantity),
      location,
      destination: "Processing Plant A",
    };

    try {
      const res = await fetch("http://localhost:5000/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setQrCodeURL(data.qrCodeURL || "");
        const savedCollectorId = collectorId;
        setCollectorId("");
        setQuantity("");

        // Record proof on Ethereum via MetaMask
        try {
          setBlockchainLoading(true);
          const canonical = canonicalizeTransport(data.transport || payload);
          const bcResult = await recordProofOnBlockchain(savedCollectorId, "TRANSPORTED", canonical);
          setBlockchainStatus(bcResult);
        } catch (bcErr) {
          console.error("Blockchain recording notice:", bcErr);
          setBlockchainError(bcErr.message || "Failed to record on Ethereum. MongoDB record was saved.");
        } finally {
          setBlockchainLoading(false);
        }

        alert("Transport recorded successfully!");
      } else {
        alert(`Error: ${data.message || "Failed to record transport"}`);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = (result) => {
    if (result && result[0]?.rawValue) {
      setCollectorId(result[0].rawValue);
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transport Recording</h1>
            <p className="text-gray-600">Record transport details and continue the supply chain</p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Transport Details</h2>
              <p className="text-sm text-gray-500 mt-1">Scan QR code or enter collector ID manually</p>
            </div>

            <div className="p-8 space-y-6">
              {/* QR Scanner Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Scan Collection QR Code
                </label>
                
                {!scanning ? (
                  <button
                    onClick={() => setScanning(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01m0 0h3.99" />
                      </svg>
                      <span>Start QR Scanner</span>
                    </div>
                  </button>
                ) : (
                  <div className="relative">
                    <div className="rounded-xl overflow-hidden border-4 border-blue-200 shadow-lg">
                      <Scanner
                        onScan={handleScan}
                        onError={(err) => console.error("QR Scanner error:", err)}
                        constraints={{ facingMode: "environment" }}
                        styles={{ container: { width: "100%", height: "300px" } }}
                      />
                    </div>
                    <button
                      onClick={() => setScanning(false)}
                      className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg"
                    >
                      Stop Scanner
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Collector ID Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Collector ID
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter collector ID or scan QR code"
                  value={collectorId}
                  onChange={(e) => setCollectorId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
                />
                <p className="text-xs text-gray-500">This should match the ID from the collector's QR code</p>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quantity (kg)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter quantity being transported"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
                />
              </div>

              {/* Location Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Current Location
                </label>
                
                {loadingLocation && (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                      <span>Getting your location...</span>
                    </div>
                  </div>
                )}

                {locationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center space-x-2 text-red-700">
                      <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <span className="text-sm font-medium">Location Error</span>
                        <p className="text-sm mt-1">{locationError}</p>
                      </div>
                    </div>
                    <button
                      onClick={getLocation}
                      className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {location.lat && location.lng && (
                  <>
                    <div className="h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      <MapContainer
                        center={[location.lat, location.lng]}
                        zoom={13}
                        style={{ height: "100%" }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[location.lat, location.lng]}>
                          <Popup>Your current transport location</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Latitude:</span>
                          <span className="ml-2 font-medium text-gray-900">{location.lat.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Longitude:</span>
                          <span className="ml-2 font-medium text-gray-900">{location.lng.toFixed(6)}</span>
                        </div>
                      </div>
                      <button
                        onClick={getLocation}
                        disabled={loadingLocation}
                        className="mt-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {loadingLocation ? 'Updating...' : 'Update Location'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !collectorId || !quantity || !location.lat}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                  isSubmitting || !collectorId || !quantity || !location.lat
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Recording Transport...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Record Transport</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* QR Code Display */}
          {qrCodeURL && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Transport QR Code Generated</h3>
                <p className="text-gray-600 mb-6">Share this QR code with the processing facility</p>
                <div className="inline-block p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <img src={qrCodeURL} alt="Transport QR Code" className="mx-auto" />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  This QR code contains the updated collection ID for the next stage in the supply chain.
                </p>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transport;

