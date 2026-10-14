import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  fetchOnChainEvents,
  verifySupplyChain,
  formatAddress,
  formatTxHash,
  getExplorerUrl,
  CONTRACT_ADDRESS,
} from "../utils/blockchain";

// Fix default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const stages = [
  { name: "Collector", icon: "🌿", color: "bg-green-500" },
  { name: "Transport", icon: "🚚", color: "bg-blue-500" },
  { name: "Processing", icon: "🏭", color: "bg-purple-500" },
  { name: "Lab", icon: "🔬", color: "bg-red-500" }
];

const ChainDetails = () => {
  const { id } = useParams();
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onChainEvents, setOnChainEvents] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    const fetchChain = async () => {
      try {
        const res = await fetch(`http://localhost:5000/chains/${id}`, {
          credentials: "include",
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        setChain(data);

        // Fetch Ethereum on-chain events for this chain
        try {
          const events = await fetchOnChainEvents(id);
          setOnChainEvents(events);
        } catch (bcErr) {
          console.warn("Could not fetch on-chain events:", bcErr);
        }
      } catch (err) {
        console.error("Error fetching chain:", err);
        setError("Failed to load chain details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchChain();
  }, [id]);

  const handleVerify = async () => {
    if (!chain) return;
    setIsVerifying(true);
    try {
      const result = await verifySupplyChain(id, chain);
      setVerificationResult(result);
      // Also refresh on-chain events
      const events = await fetchOnChainEvents(id);
      setOnChainEvents(events);
    } catch (err) {
      console.error("Verification failed:", err);
      setVerificationResult({
        isVerified: false,
        hasMismatch: true,
        message: err.message || "Verification process failed",
        stages: [],
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-blue-600">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-lg font-medium">Loading chain details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Chain</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Chain Not Found</h2>
          <p className="text-gray-600 mb-6">The requested supply chain could not be found.</p>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Extract locations for map polyline
  const getLocationsPath = () => {
    const path = [];
    if (chain.collector?.location)
      path.push([chain.collector.location.lat, chain.collector.location.lng]);

    if (chain.transport?.length > 0) {
      chain.transport.forEach((t) => {
        if (t.location) path.push([t.location.lat, t.location.lng]);
      });
    }

    if (chain.processing?.location)
      path.push([chain.processing.location.lat, chain.processing.location.lng]);

    if (chain.lab?.location) path.push([chain.lab.location.lat, chain.lab.location.lng]);

    return path;
  };

  const renderValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item, index) => (
        <div
          key={index}
          className="p-4 mb-3 bg-gray-50 rounded-xl border border-gray-100"
        >
          {Object.entries(item).map(([k, v]) => (
            <div key={k} className="flex justify-between py-1">
              <span className="text-sm font-medium text-gray-600 capitalize">
                {k.replace(/([A-Z])/g, ' $1').trim()}:
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {typeof v === "object" ? JSON.stringify(v) : v.toString()}
              </span>
            </div>
          ))}
        </div>
      ));
    } else if (typeof value === "object") {
      return Object.entries(value).map(([k, v]) => (
        <div key={k} className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
          <span className="text-sm font-medium text-gray-600 capitalize">
            {k.replace(/([A-Z])/g, ' $1').trim()}:
          </span>
          <span className="text-sm text-gray-900 font-medium text-right max-w-xs break-words">
            {typeof v === "object" ? JSON.stringify(v) : v.toString()}
          </span>
        </div>
      ));
    } else {
      return <span className="text-sm text-gray-900 font-medium">{value.toString()}</span>;
    }
  };

  const locationsPath = getLocationsPath();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Supply Chain Details</h1>
                <p className="text-gray-600">Complete traceability for Chain ID: {id}</p>
              </div>
              <a 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </a>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Supply Chain Progress</h3>
            <div className="flex items-center justify-between">
              {stages.map((stage, index) => {
                const isCompleted = !!chain[stage.name.toLowerCase()];
                const isActive = index === stages.findIndex(s => !chain[s.name.toLowerCase()]);
                
                return (
                  <div key={stage.name} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                        isCompleted ? stage.color : isActive ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}>
                        {isCompleted ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-lg">{stage.icon}</span>
                        )}
                      </div>
                      <span className={`text-xs font-medium mt-2 ${
                        isCompleted ? 'text-green-600' : isActive ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        {stage.name}
                      </span>
                    </div>
                    {index < stages.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded-full ${
                        isCompleted ? 'bg-green-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* BLOCKCHAIN VERIFICATION SECTION */}
          <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-100 gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">⛓️</span>
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                    Blockchain Verification
                  </h2>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-medium">
                    Immutable Proofs
                  </span>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-700">Network: </span>
                    <span className="text-indigo-600 font-medium">Ethereum Sepolia</span>
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Blockchain Events: </span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-gray-900">
                      {onChainEvents.length}
                    </span>
                  </p>
                  {CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000" && (
                    <p className="hidden sm:block">
                      <span className="font-semibold text-gray-700">Contract: </span>
                      <a
                        href={getExplorerUrl(CONTRACT_ADDRESS, "address")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {formatAddress(CONTRACT_ADDRESS)}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              {/* Verify Action Button */}
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Recalculating & Verifying...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Verify Supply Chain</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className="mt-6">
                {verificationResult.isVerified ? (
                  <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-emerald-900 uppercase tracking-wide">
                          ✓ VERIFIED ON ETHEREUM
                        </h4>
                        <p className="font-medium text-emerald-800 mt-0.5">
                          Blockchain Verified: All supply-chain records match their immutable Ethereum proofs.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-red-50 border-2 border-red-300 rounded-2xl text-red-950">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg">
                        ✗
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-red-900 uppercase tracking-wide">
                          ✗ VERIFICATION FAILED
                        </h4>
                        <p className="font-medium text-red-800 mt-0.5">
                          Data integrity mismatch detected. Operational data does not match on-chain cryptographic proofs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage Comparison Details */}
                {verificationResult.stages && verificationResult.stages.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs text-left bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                      <thead className="bg-gray-100 text-gray-700 font-semibold uppercase">
                        <tr>
                          <th className="p-3">Stage</th>
                          <th className="p-3">Recalculated Data Hash</th>
                          <th className="p-3">On-Chain Ethereum Hash</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-mono">
                        {verificationResult.stages.map((st, i) => (
                          <tr key={i} className={st.hashMatches ? "bg-emerald-50/40" : "bg-red-50/40"}>
                            <td className="p-3 font-sans font-bold text-gray-900">{st.eventType}</td>
                            <td className="p-3 text-gray-700 break-all">{st.recalculatedDataHash || "N/A"}</td>
                            <td className="p-3 text-gray-700 break-all">{st.onChainDataHash}</td>
                            <td className="p-3 text-center font-sans">
                              {st.hashMatches ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                  ✓ MATCH
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  ✗ MISMATCH
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Blockchain Timeline */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <span>📜</span>
                <span>Immutable Proof Timeline on Ethereum</span>
              </h4>

              {onChainEvents.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-500">
                  No Ethereum transactions recorded yet for this chain ID.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {onChainEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 text-slate-100 p-4 rounded-xl shadow border border-slate-800 relative flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-emerald-400 text-xs tracking-wider uppercase">
                          {ev.eventType}
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="my-3 space-y-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 font-sans block text-[10px]">Actor:</span>
                          <span className="text-indigo-300 font-semibold">{formatAddress(ev.actor)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans block text-[10px]">Time:</span>
                          <span className="text-slate-300">{new Date(ev.timestamp * 1000).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans block text-[10px]">Data Hash:</span>
                          <span className="text-emerald-300 break-all text-[10px]">
                            {formatTxHash(ev.dataHash)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans block text-[10px]">Previous Hash:</span>
                          <span className="text-slate-400 break-all text-[10px]">
                            {formatTxHash(ev.previousHash)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Chained Proof</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          {locationsPath.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Geographic Journey</h3>
                <p className="text-sm text-gray-500 mt-1">Track the physical movement through the supply chain</p>
              </div>
              <div className="h-96">
                <MapContainer center={locationsPath[0]} zoom={6} style={{ height: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  {/* Markers */}
                  {chain.collector?.location && (
                    <Marker
                      position={[chain.collector.location.lat, chain.collector.location.lng]}
                    >
                      <Popup>
                        <div className="text-center font-medium">
                          <div className="text-green-600">Collection Point</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {chain.collector.species} - {chain.collector.quantity}kg
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {chain.transport?.map(
                    (t, i) =>
                      t.location && (
                        <Marker key={i} position={[t.location.lat, t.location.lng]}>
                          <Popup>
                            <div className="text-center font-medium">
                              <div className="text-blue-600">Transport Stop {i + 1}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {t.quantityKg}kg to {t.destination}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      )
                  )}
                  {chain.processing?.location && (
                    <Marker
                      position={[chain.processing.location.lat, chain.processing.location.lng]}
                    >
                      <Popup>
                        <div className="text-center font-medium">
                          <div className="text-purple-600">Processing Facility</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {chain.processing.processingType}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {chain.lab?.location && (
                    <Marker position={[chain.lab.location.lat, chain.lab.location.lng]}>
                      <Popup>
                        <div className="text-center font-medium">
                          <div className="text-red-600">Lab Testing</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {chain.lab.testType} - {chain.lab.result}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Enhanced polyline */}
                  <Polyline 
                    positions={locationsPath} 
                    pathOptions={{ 
                      color: "#3b82f6", 
                      dashArray: "10,10", 
                      weight: 4,
                      opacity: 0.8
                    }} 
                  />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Stage Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${stage.color} rounded-lg flex items-center justify-center`}>
                      <span className="text-white text-lg">{stage.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{stage.name}</h3>
                      <p className="text-sm text-gray-500">
                        {chain[stage.name.toLowerCase()] ? 'Completed' : 'Not yet started'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {chain[stage.name.toLowerCase()] ? (
                    <div className="space-y-2">
                      {renderValue(chain[stage.name.toLowerCase()])}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 text-gray-500 py-8">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Stage not completed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChainDetails

