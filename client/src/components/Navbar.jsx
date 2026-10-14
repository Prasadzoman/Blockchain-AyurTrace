// src/components/Navbar.jsx
import { useState, useEffect, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { connectWallet, formatAddress } from "../utils/blockchain";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [networkName, setNetworkName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  useEffect(() => {
    // Check if window.ethereum is already connected
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(console.error);

      window.ethereum.on?.("accountsChanged", (accounts) => {
        setWalletAddress(accounts[0] || "");
      });

      window.ethereum.on?.("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const res = await connectWallet();
      setWalletAddress(res.address);
      setNetworkName(res.networkName);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert(err.message || "Failed to connect MetaMask wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Links depending on auth
  const authLinks = [
    { name: "Collector", path: "/collector" },
    { name: "Transport", path: "/transport" },
    { name: "Processing", path: "/processing" },
    { name: "Lab", path: "/lab" },
    { name: "Manufacturer", path: "/manufacturer" },
    { name: "Consumer", path: "/consumer" },
    { name: "Profile", path: "/profile" },
    { name: "Dashboard", path: "/dashboard" },
  ];

  const guestLinks = [
    { name: "Login", path: "/login" },
    { name: "Sign In", path: "/signin" },
  ];

  const linksToShow = user ? authLinks : guestLinks;

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
        {/* Logo & Chain Badge */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="text-lg font-bold flex items-center space-x-2">
            <span className="text-xl">🌿</span>
            <span>Agastya Trace</span>
          </Link>
          <span className="text-xs bg-indigo-900/60 border border-indigo-400/30 text-indigo-200 px-2 py-0.5 rounded-full font-mono">
            Ethereum Layer
          </span>
        </div>

        {/* Hamburger for Mobile */}
        <button
          className="md:hidden block text-white focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Links & Wallet */}
        <div
          className={`w-full md:flex md:items-center md:w-auto ${
            isOpen ? "block" : "hidden"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:gap-3 mt-4 md:mt-0">
            {linksToShow.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "bg-blue-800 text-white shadow-inner"
                    : "hover:bg-blue-700/80 text-blue-50"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* MetaMask Wallet Button */}
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-sm"
              title={walletAddress ? `Connected: ${walletAddress}` : "Connect MetaMask Wallet"}
            >
              <span>🦊</span>
              <span>
                {isConnecting
                  ? "Connecting..."
                  : walletAddress
                  ? formatAddress(walletAddress)
                  : "Connect Wallet"}
              </span>
            </button>

            {/* Logout button for authenticated users */}
            {user && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg text-sm bg-red-600/80 hover:bg-red-700 text-white transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
