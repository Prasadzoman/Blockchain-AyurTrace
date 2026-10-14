// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/me", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5000/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
        navigate("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="flex items-center space-x-3 text-blue-600">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-lg font-medium">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center border border-gray-100">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M6.938 19h10.124c1.54 0 2.502-1.667 1.732-2.5L13.732 5c-.77-.833-2.694-.833-3.464 0L4.34 16.5C3.57 17.333 4.432 19 5.972 19z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access your profile
          </p>
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Role icons & colors
  const roleIcons = {
    collector: { icon: "🌿", color: "bg-green-100 text-green-800" },
    transporter: { icon: "🚚", color: "bg-blue-100 text-blue-800" },
    processing_plant: { icon: "🏭", color: "bg-purple-100 text-purple-800" },
    lab_testing: { icon: "🔬", color: "bg-red-100 text-red-800" },
    consumer: { icon: "👤", color: "bg-gray-100 text-gray-800" },
  };

  const roleInfo = roleIcons[user.role] || {
    icon: "👤",
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg border-4 border-blue-100 mb-4">
            <span className="text-3xl">{roleInfo.icon}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your supply chain account</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-gray-900">
              Account Information
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Your supply chain network details
            </p>
          </div>
          <div className="p-8 space-y-6">
            {/* Username */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">Username</p>
              <p className="text-lg font-semibold text-gray-900">
                {user.username}
              </p>
            </div>

            {/* Role */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">Role</p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${roleInfo.color}`}
              >
                {roleInfo.icon} {user.role.replace("_", " ")}
              </span>
            </div>

            {/* User ID */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">User ID</p>
              <p className="text-sm font-mono text-gray-600">
                {user._id || "N/A"}
              </p>
            </div>

            {/* Status */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm font-medium text-gray-700">Account Status</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-2">
                ✅ Active
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard"
              className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center">
                📊
              </div>
              <div>
                <p className="font-medium text-gray-900">View Dashboard</p>
                <p className="text-sm text-gray-600">Supply chain overview</p>
              </div>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center">
                🚪
              </div>
              <div>
                <p className="font-medium text-gray-900">Sign Out</p>
                <p className="text-sm text-gray-600">End current session</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

