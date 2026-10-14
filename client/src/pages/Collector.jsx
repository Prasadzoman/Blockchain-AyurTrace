import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  recordProofOnBlockchain,
  canonicalizeCollector,
  formatTxHash,
  getExplorerUrl,
} from "../utils/blockchain";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Ayurvedic herbs with rarity mapping
const AYURVEDIC_HERBS = {
  "Ashwagandha": { rarity: "common", parts: ["Root", "Leaves", "Berries"] },
  "Turmeric": { rarity: "common", parts: ["Rhizome", "Root"] },
  "Neem": { rarity: "common", parts: ["Leaves", "Bark", "Seeds", "Oil"] },
  "Tulsi": { rarity: "common", parts: ["Leaves", "Seeds", "Whole Plant"] },
  "Ginger": { rarity: "common", parts: ["Rhizome", "Root"] },
  "Brahmi": { rarity: "uncommon", parts: ["Leaves", "Whole Plant"] },
  "Shankhpushpi": { rarity: "uncommon", parts: ["Leaves", "Flowers", "Whole Plant"] },
  "Giloy": { rarity: "uncommon", parts: ["Stem", "Root", "Leaves"] },
  "Shatavari": { rarity: "uncommon", parts: ["Root", "Tubers"] },
  "Arjuna": { rarity: "uncommon", parts: ["Bark", "Leaves"] },
  "Jatamansi": { rarity: "rare", parts: ["Root", "Rhizome"] },
  "Black Musli": { rarity: "rare", parts: ["Root", "Tubers"] },
  "Kutki": { rarity: "rare", parts: ["Root", "Rhizome"] },
  "Cordyceps": { rarity: "rare", parts: ["Whole Fungus", "Mycelium"] },
  "Snow Lotus": { rarity: "rare", parts: ["Flowers", "Leaves", "Whole Plant"] },
  "Red Sandalwood": { rarity: "rare", parts: ["Heartwood", "Bark"] },
  "Himalayan Yew": { rarity: "rare", parts: ["Bark", "Leaves"] },
  "Kashmiri Saffron": { rarity: "rare", parts: ["Stigma", "Petals"] },
};

const Collector = () => {
  const [form, setForm] = useState({
    species: "",
    quantity: "",
    farmingType: "",
    plantPart: "",
  });
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [displayLocation, setDisplayLocation] = useState({ lat: null, lng: null });
  const [qrCodeURL, setQrCodeURL] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [sensorData, setSensorData] = useState(null);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [blockchainStatus, setBlockchainStatus] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "species") {
      const species = AYURVEDIC_HERBS[value];
      setSelectedSpecies(species);
      setForm({ ...form, [name]: value, plantPart: "" });
      
      // Update display location based on rarity
      if (species?.rarity === "rare" && location.lat && location.lng) {
        const randomOffset = () => (Math.random() - 0.5) * 0.9;
        setDisplayLocation({
          lat: location.lat + randomOffset(),
          lng: location.lng + randomOffset()
        });
      } else if (location.lat && location.lng) {
        setDisplayLocation({ lat: location.lat, lng: location.lng });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const exactLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(exactLocation);
          setDisplayLocation(exactLocation);
          setLocationLoading(false);
        },
        (err) => {
          console.error("Location access denied:", err);
          setLocationError("Unable to access your location. Please enable location services.");
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSpecies && location.lat && location.lng) {
      if (selectedSpecies.rarity === "rare") {
        const randomOffset = () => (Math.random() - 0.5) * 0.9;
        setDisplayLocation({
          lat: location.lat + randomOffset(),
          lng: location.lng + randomOffset()
        });
      } else {
        setDisplayLocation({ lat: location.lat, lng: location.lng });
      }
    }
  }, [selectedSpecies, location]);

  const generateSensorData = () => ({
    temperature: (20 + Math.random() * 10).toFixed(1),
    humidity: (40 + Math.random() * 40).toFixed(1),
    soilMoisture: (10 + Math.random() * 20).toFixed(1),
    pH: (5 + Math.random() * 2).toFixed(2),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setBlockchainError("");
    setBlockchainStatus(null);
    
    const sensors = generateSensorData();
    setSensorData(sensors);

    const payload = { 
      ...form, 
      location: selectedSpecies?.rarity === "rare" ? displayLocation : location,
      rarity: selectedSpecies?.rarity,
      sensors, 
      timestamp: new Date().toISOString() 
    };

    try {
      const res = await fetch("http://localhost:5000/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();
      
      if (res.ok) {
        if (data.collector?._id) {
          const qrData = data.collector._id;
          const qrURL = await QRCode.toDataURL(qrData);
          setQrCodeURL(qrURL);

          // Prompt & record proof on Ethereum via MetaMask
          try {
            setBlockchainLoading(true);
            const canonical = canonicalizeCollector(data.collector);
            const bcResult = await recordProofOnBlockchain(data.collector._id, "COLLECTED", canonical);
            setBlockchainStatus(bcResult);
          } catch (bcErr) {
            console.error("Blockchain recording notice:", bcErr);
            setBlockchainError(bcErr.message || "Failed to record on Ethereum. MongoDB record was saved.");
          } finally {
            setBlockchainLoading(false);
          }
        }
        
        setTimeout(() => {
          alert("Collection data submitted successfully!");
        }, 100);
      } else {
        alert(`Error: ${data.message || "Failed to submit data"}`);
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryLocation = () => {
    setLocationLoading(true);
    setLocationError("");
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const exactLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(exactLocation);
          setDisplayLocation(exactLocation);
          setLocationLoading(false);
        },
        (err) => {
          console.error("Location access denied:", err);
          setLocationError("Unable to access your location. Please enable location services.");
          setLocationLoading(false);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setLocationLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case "rare": return "text-red-600 bg-red-50 border-red-200";
      case "uncommon": return "text-orange-600 bg-orange-50 border-orange-200";
      case "common": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ayurvedic Herb Collection</h1>
            <p className="text-gray-600">Record your herb collection data for supply chain tracking</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Collection Details</h2>
              <p className="text-sm text-gray-500 mt-1">Fill in the information about your herb collection</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Ayurvedic Herb Species
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="species"
                  value={form.species}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white"
                >
                  <option value="">Select an Ayurvedic herb</option>
                  {Object.keys(AYURVEDIC_HERBS).map((herb) => (
                    <option key={herb} value={herb}>
                      {herb} ({AYURVEDIC_HERBS[herb].rarity})
                    </option>
                  ))}
                </select>
                
                {selectedSpecies && (
                  <div className={`mt-3 p-3 rounded-lg border ${getRarityColor(selectedSpecies.rarity)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Species Information</span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium uppercase tracking-wide">
                        {selectedSpecies.rarity}
                      </span>
                    </div>
                    {selectedSpecies.rarity === "rare" && (
                      <p className="text-xs mb-2">
                        ⚠️ This is a rare species. Location will be generalized to a 50km area for conservation protection.
                      </p>
                    )}
                    <p className="text-xs">
                      Common parts used: {selectedSpecies.parts.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {form.species && selectedSpecies && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Plant Part Used
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    name="plantPart"
                    value={form.plantPart}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white"
                  >
                    <option value="">Select plant part</option>
                    {selectedSpecies.parts.map((part) => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quantity (kg)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity in kilograms"
                  required
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Farming Type
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="farmingType"
                  value={form.farmingType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white"
                >
                  <option value="">Choose farming method</option>
                  <option value="Organic">Organic</option>
                  <option value="Conventional">Conventional</option>
                  <option value="Wild">Wild Collected</option>
                </select>
              </div>

              {sensorData && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-900 mb-3">Environmental Conditions (Auto-generated)</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Temperature:</span>
                      <span className="font-medium text-blue-900">{sensorData.temperature}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Humidity:</span>
                      <span className="font-medium text-blue-900">{sensorData.humidity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Soil Moisture:</span>
                      <span className="font-medium text-blue-900">{sensorData.soilMoisture}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">pH Level:</span>
                      <span className="font-medium text-blue-900">{sensorData.pH}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Collection Location
                  {selectedSpecies?.rarity === "rare" && (
                    <span className="ml-2 text-xs text-red-600">(Generalized for rare species protection)</span>
                  )}
                </label>
                
                {locationLoading && (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent"></div>
                      <span>Getting your location...</span>
                    </div>
                  </div>
                )}

                {locationError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center space-x-2 text-red-700">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-sm font-medium">Location Error</span>
                        <p className="text-sm mt-1">{locationError}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={retryLocation}
                      className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {displayLocation.lat && displayLocation.lng && (
                  <>
                    <div className="h-64 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      <MapContainer 
                        center={[displayLocation.lat, displayLocation.lng]} 
                        zoom={selectedSpecies?.rarity === "rare" ? 8 : 13} 
                        style={{ height: "100%" }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        
                        {selectedSpecies?.rarity === "rare" ? (
                          <>
                            <Circle 
                              center={[displayLocation.lat, displayLocation.lng]} 
                              radius={50000}
                              pathOptions={{ 
                                color: 'red', 
                                fillColor: 'red', 
                                fillOpacity: 0.2,
                                weight: 2 
                              }}
                            />
                            <Marker position={[displayLocation.lat, displayLocation.lng]}>
                              <Popup>Approximate Collection Area (50km radius) - Rare Species Protection</Popup>
                            </Marker>
                          </>
                        ) : (
                          <Marker position={[displayLocation.lat, displayLocation.lng]}>
                            <Popup>Your Exact Collection Location</Popup>
                          </Marker>
                        )}
                      </MapContainer>
                    </div>
                    
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Latitude:</span>
                          <span className="ml-2 font-medium text-gray-900">{displayLocation.lat.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Longitude:</span>
                          <span className="ml-2 font-medium text-gray-900">{displayLocation.lng.toFixed(6)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {selectedSpecies?.rarity === "rare" 
                          ? "Location generalized within 50km area for species protection"
                          : "Location accuracy: High precision GPS coordinates"
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !displayLocation.lat || !form.plantPart}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
                  isSubmitting || !displayLocation.lat || !form.plantPart
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Submitting Collection Data...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Submit Collection Data</span>
                  </div>
                )}
              </button>
              
              {(!displayLocation.lat && !locationLoading) && (
                <p className="text-xs text-red-500 text-center">
                  Location is required to submit collection data
                </p>
              )}
              {(!form.plantPart && form.species) && (
                <p className="text-xs text-red-500 text-center">
                  Please select the plant part used
                </p>
              )}
            </div>
          </div>

          {qrCodeURL && (
            <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Collection QR Code Generated</h3>
                <p className="text-gray-600 mb-6">Share this QR code with the transporter to continue the supply chain</p>
                <div className="inline-block p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <img src={qrCodeURL} alt="Collection QR Code" className="mx-auto" />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  This QR code contains your unique collection ID and will be used to track this batch throughout the supply chain.
                </p>
              </div>

              <div className="mt-6 bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="text-sm font-medium text-green-900 mb-3">Collection Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <span className="block text-green-700">Species</span>
                    <span className="font-medium text-green-900">{form.species}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-green-700">Plant Part</span>
                    <span className="font-medium text-green-900">{form.plantPart}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-green-700">Quantity</span>
                    <span className="font-medium text-green-900">{form.quantity} kg</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-green-700">Method</span>
                    <span className="font-medium text-green-900">{form.farmingType}</span>
                  </div>
                </div>
              </div>

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

              <button 
                onClick={() => {
                  setQrCodeURL("");
                  setForm({ species: "", quantity: "", farmingType: "", plantPart: "" });
                  setSensorData(null);
                  setSelectedSpecies(null);
                  setBlockchainStatus(null);
                  setBlockchainError("");
                }}
                className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Record Another Collection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collector;

