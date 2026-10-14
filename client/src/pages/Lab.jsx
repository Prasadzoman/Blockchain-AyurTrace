import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  recordProofOnBlockchain,
  canonicalizeLab,
  formatTxHash,
  getExplorerUrl,
} from "../utils/blockchain";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const Lab = () => {
  const [collectorId, setCollectorId] = useState("");
  const [testedQuantity, setTestedQuantity] = useState("");
  const [testType, setTestType] = useState("");
  const [result, setResult] = useState("");
  const [certificateLinks, setCertificateLinks] = useState([""]);
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
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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

  const handleCertificateChange = (index, value) => {
    const newLinks = [...certificateLinks];
    newLinks[index] = value;
    setCertificateLinks(newLinks);
  };

  const addCertificateField = () => {
    setCertificateLinks([...certificateLinks, ""]);
  };

  const removeCertificateField = (index) => {
    if (certificateLinks.length > 1) {
      const newLinks = certificateLinks.filter((_, i) => i !== index);
      setCertificateLinks(newLinks);
    }
  };

  const handleSubmit = async () => {
    if (!collectorId || !testedQuantity || !testType || !result) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setBlockchainError("");
    setBlockchainStatus(null);

    const payload = {
      collectorId,
      labTechnician: "66f8a2b3c1234567890abcd3", // replace with logged-in user ID
      testedQuantityKg: parseFloat(testedQuantity),
      testType,
      result,
      certificateLinks: certificateLinks.filter((link) => link.trim()),
      location,
    };

    try {
      const res = await fetch("http://localhost:5000/labtesting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setQrCodeURL(data.qrCodeURL);
        const savedCollectorId = collectorId;
        setCollectorId("");
        setTestedQuantity("");
        setTestType("");
        setResult("");
        setCertificateLinks([""]);

        // Record proof on Ethereum via MetaMask
        try {
          setBlockchainLoading(true);
          const canonical = canonicalizeLab(data.labTest || payload);
          const bcResult = await recordProofOnBlockchain(savedCollectorId, "LAB_TESTED", canonical);
          setBlockchainStatus(bcResult);
        } catch (bcErr) {
          console.error("Blockchain recording notice:", bcErr);
          setBlockchainError(bcErr.message || "Failed to record on Ethereum. MongoDB record was saved.");
        } finally {
          setBlockchainLoading(false);
        }

        alert("Lab test recorded successfully!");
      } else {
        alert(`Error: ${data.message || "Failed to record lab test"}`);
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

  const testTypeOptions = [
    { value: "moisture", label: "💧 Moisture Content", description: "Moisture level analysis" },
    { value: "contamination", label: "🧪 Contamination Test", description: "Heavy metals and pesticides" },
    { value: "pH", label: "⚡ pH Level", description: "Acidity/alkalinity measurement" },
    { value: "chemical", label: "🔬 Chemical Analysis", description: "Active compound testing" },
    { value: "microbial", label: "🦠 Microbial Testing", description: "Bacterial and fungal analysis" },
    { value: "other", label: "🔬 Other", description: "Custom testing procedure" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Laboratory Testing</h1>
            <p className="text-gray-600">Conduct quality analysis and certification for processed herbs</p>
          </div>

          {/* Main Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Lab Test Recording</h2>
              <p className="text-sm text-gray-500 mt-1">Record detailed testing results and certifications</p>
            </div>

            <div className="p-8 space-y-6">
              {/* QR Scanner Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Scan Processing QR Code
                </label>
                
                {!scanning ? (
                  <button
                    onClick={() => setScanning(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
                    <div className="rounded-xl overflow-hidden border-4 border-red-200 shadow-lg">
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

              {/* Collector ID Input */}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-400"
                />
              </div>

              {/* Tested Quantity Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tested Quantity (kg)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Quantity tested in laboratory"
                  value={testedQuantity}
                  onChange={(e) => setTestedQuantity(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-400"
                />
              </div>

              {/* Test Type Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Test Type
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
                >
                  <option value="">Select test type</option>
                  {testTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Test Result Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Test Result
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  placeholder="Enter detailed test results and observations"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-400 resize-none"
                />
                <p className="text-xs text-gray-500">Include numerical values, pass/fail status, and any observations</p>
              </div>

              {/* Certificate Links Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Certificate Links (Optional)
                </label>
                
                {certificateLinks.map((link, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="url"
                      placeholder={`Certificate URL ${index + 1}`}
                      value={link}
                      onChange={(e) => handleCertificateChange(index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-400"
                    />
                    {certificateLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCertificateField(index)}
                        className="px-3 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addCertificateField}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Another Certificate</span>
                </button>
              </div>

              {/* Location Section */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Lab Location
                </label>
                
                {loadingLocation && (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent"></div>
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
                          <Popup>Laboratory testing location</Popup>
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
                disabled={isSubmitting || !collectorId || !testedQuantity || !testType || !result || !location.lat}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                  isSubmitting || !collectorId || !testedQuantity || !testType || !result || !location.lat
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Recording Lab Test...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Record Lab Test</span>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Lab Test Complete</h3>
                <p className="text-gray-600 mb-6">Final QR code for consumer traceability</p>
                <div className="inline-block p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <img src={qrCodeURL} alt="Lab Test QR Code" className="mx-auto" />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  This final QR code contains the complete supply chain information for consumer verification.
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

export default Lab;

