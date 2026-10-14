import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const Consumer = () => {
  const [scanning, setScanning] = useState(false);
  const [qrData, setQrData] = useState("");
  const [chainInfo, setChainInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScan = (result) => {
    if (result && result[0]?.rawValue) {
      try {
        const scannedValue = result[0].rawValue;
        console.log("Raw QR data:", scannedValue);

        const parsed = JSON.parse(scannedValue);
        const batchId = parsed.productBatchId;

        setQrData(batchId);
        setScanning(false);
        setError("");

        fetchChainInfo(batchId);
      } catch (err) {
        console.error("Failed to parse QR code:", err);
        setError("Invalid QR code format");
      }
    }
  };

  const fetchChainInfo = async (batchId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/trace/product-batch/${batchId}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setChainInfo(data);
      } else {
        setError(data.message || "Failed to fetch product chain info");
        setChainInfo(null);
      }
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error. Please check your connection and try again.");
      setChainInfo(null);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getMarkers = () => {
    if (!chainInfo) return [];
    const markers = [];

    // Add collectors
    chainInfo.collectors?.forEach((collector, idx) => {
      if (collector.location) {
        markers.push({
          type: `Collector ${idx + 1}`,
          coords: [collector.location.lat, collector.location.lng],
          name: collector.userId?.username || 'Unknown Collector',
          details: `Species: ${collector.species}, Quantity: ${collector.quantity}kg`,
          stage: 'collector',
          data: collector,
        });
      }
    });

    // Add transport
    chainInfo.transport?.forEach((transport, idx) => {
      if (transport.location) {
        markers.push({
          type: `Transport ${idx + 1}`,
          coords: [transport.location.lat, transport.location.lng],
          name: transport.transporter?.username || 'Unknown Transporter',
          details: `Destination: ${transport.destination}, Quantity: ${transport.quantityKg}kg`,
          stage: 'transport',
          data: transport,
        });
      }
    });

    // Add processing
    chainInfo.processing?.forEach((processing, idx) => {
      if (processing.location) {
        markers.push({
          type: `Processing ${idx + 1}`,
          coords: [processing.location.lat, processing.location.lng],
          name: processing.processor?.username || 'Unknown Processor',
          details: `Type: ${processing.processingType}, Input: ${processing.receivedQuantityKg}kg → Output: ${processing.processedQuantityKg}kg`,
          stage: 'processing',
          data: processing,
        });
      }
    });

    // Add lab tests
    chainInfo.productBatch?.labTests?.forEach((lab, idx) => {
      if (lab.location) {
        markers.push({
          type: `Lab Test ${idx + 1}`,
          coords: [lab.location.lat, lab.location.lng],
          name: lab.labTechnician?.username || 'Unknown Lab Tech',
          details: `Test: ${lab.testType}, Result: ${lab.result}`,
          stage: 'lab',
          data: lab,
        });
      }
    });

    return markers;
  };

  const getStageColor = (stage) => {
    const colors = {
      collector: 'from-green-500 to-green-600',
      transport: 'from-blue-500 to-blue-600',
      processing: 'from-orange-500 to-orange-600',
      lab: 'from-purple-500 to-purple-600',
      manufacturer: 'from-red-500 to-red-600',
    };
    return colors[stage] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Product Traceability Platform
          </h1>
          <p className="text-gray-600">
            Scan QR code to track entire product chain from Collector → Transport → Processing → Lab → Manufacturer
          </p>
        </div>

        {/* QR Scanner */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          {!scanning ? (
            <button
              onClick={() => setScanning(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Start QR Scanner
            </button>
          ) : (
            <div className="relative">
              <div className="rounded-2xl overflow-hidden border-4 border-purple-200 shadow-lg">
                <Scanner
                  onScan={handleScan}
                  onError={(err) => console.error("QR Scanner error:", err)}
                  constraints={{ facingMode: "environment" }}
                  styles={{ container: { width: "100%", height: "400px" } }}
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

        {/* QR Data */}
        {qrData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Scanned Product Batch ID</h3>
            <code className="text-sm font-mono break-all text-gray-800">{qrData}</code>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center mb-6">
            <div className="flex items-center justify-center space-x-3 text-purple-600">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent"></div>
              <span className="text-lg font-medium">Loading full product chain...</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-4 mb-6 text-red-700">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Chain Info */}
        {chainInfo && (
          <div className="space-y-6">
            {/* Product Batch Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className={`bg-gradient-to-r ${getStageColor('manufacturer')} text-white px-4 py-2 rounded-lg mb-4 inline-block`}>
                <h3 className="text-xl font-bold">Product Batch Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p><strong>Product Name:</strong> {chainInfo.productBatch?.productName}</p>
                  <p><strong>Quantity:</strong> {chainInfo.productBatch?.quantity} units</p>
                  <p><strong>Weight per Product:</strong> {chainInfo.productBatch?.weightPerProduct}kg</p>
                  <p><strong>Manufacturer:</strong> {chainInfo.productBatch?.manufacturerId?.username}</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Veda Used:</strong> {chainInfo.productBatch?.vedaUsed}</p>
                  <p><strong>Location:</strong> {chainInfo.productBatch?.location}</p>
                  <p><strong>Created:</strong> {formatDate(chainInfo.productBatch?.createdAt)}</p>
                  <p><strong>Last Updated:</strong> {formatDate(chainInfo.productBatch?.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Collectors */}
            {chainInfo.collectors?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className={`bg-gradient-to-r ${getStageColor('collector')} text-white px-4 py-2 rounded-lg mb-4 inline-block`}>
                  <h3 className="text-xl font-bold">Collection Stage</h3>
                </div>
                <div className="space-y-4">
                  {chainInfo.collectors.map((collector, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-2">Collector {idx + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>Farmer:</strong> {collector.userId?.username}</p>
                          <p><strong>Species:</strong> {collector.species}</p>
                          <p><strong>Quantity:</strong> {collector.quantity}kg</p>
                          <p><strong>Farming Type:</strong> {collector.farmingType}</p>
                          <p><strong>Part used:</strong> {collector.plantPart}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Temperature:</strong> {collector.sensors?.temperature}°C</p>
                          <p><strong>Humidity:</strong> {collector.sensors?.humidity}%</p>
                          <p><strong>Soil Moisture:</strong> {collector.sensors?.soilMoisture}%</p>
                          <p><strong>pH Level:</strong> {collector.sensors?.pH}</p>
                          <p><strong>Timestamp:</strong> {formatDate(collector.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transport */}
            {chainInfo.transport?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className={`bg-gradient-to-r ${getStageColor('transport')} text-white px-4 py-2 rounded-lg mb-4 inline-block`}>
                  <h3 className="text-xl font-bold">Transport Stage</h3>
                </div>
                <div className="space-y-4">
                  {chainInfo.transport.map((transport, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-2">Transport {idx + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>Transporter:</strong> {transport.transporter?.username}</p>
                          <p><strong>Quantity:</strong> {transport.quantityKg}kg</p>
                          <p><strong>Destination:</strong> {transport.destination}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Timestamp:</strong> {formatDate(transport.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing */}
            {chainInfo.processing?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className={`bg-gradient-to-r ${getStageColor('processing')} text-white px-4 py-2 rounded-lg mb-4 inline-block`}>
                  <h3 className="text-xl font-bold">Processing Stage</h3>
                </div>
                <div className="space-y-4">
                  {chainInfo.processing.map((processing, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-2">Processing {idx + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>Processor:</strong> {processing.processor?.username}</p>
                          <p><strong>Processing Type:</strong> {processing.processingType}</p>
                          <p><strong>Input Quantity:</strong> {processing.receivedQuantityKg}kg</p>
                          <p><strong>Output Quantity:</strong> {processing.processedQuantityKg}kg</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Timestamp:</strong> {formatDate(processing.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lab Tests */}
            {chainInfo.productBatch?.labTests?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className={`bg-gradient-to-r ${getStageColor('lab')} text-white px-4 py-2 rounded-lg mb-4 inline-block`}>
                  <h3 className="text-xl font-bold">Lab Testing Stage</h3>
                </div>
                <div className="space-y-4">
                  {chainInfo.productBatch.labTests.map((lab, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-2">Lab Test {idx + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p><strong>Lab Technician:</strong> {lab.labTechnician?.username}</p>
                          <p><strong>Test Type:</strong> {lab.testType}</p>
                          <p><strong>Tested Quantity:</strong> {lab.testedQuantityKg}kg</p>
                          <p><strong>Result:</strong> {lab.result}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong>Certificates:</strong></p>
                          <div className="pl-4">
                            {lab.certificateLinks?.map((link, linkIdx) => (
                              <p key={linkIdx} className="text-sm text-blue-600 break-all">• {link}</p>
                            ))}
                          </div>
                          <p><strong>Timestamp:</strong> {formatDate(lab.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {chainInfo && getMarkers().length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Supply Chain Map</h3>
            <div className="h-96 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm">
              <MapContainer center={getMarkers()[0].coords} zoom={6} style={{ height: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {getMarkers().map((marker, i) => (
                  <Marker key={i} position={marker.coords}>
                    <Popup>
                      <div className="text-center font-medium">
                        <div className="text-gray-900 font-semibold">{marker.type}</div>
                        <div className="text-sm">{marker.name}</div>
                        <div className="text-sm text-gray-600">{marker.details}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Consumer;

