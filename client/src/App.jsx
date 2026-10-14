// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import React, { useContext } from "react";
import Navbar from "./components/Navbar";
import Collector from "./pages/Collector";
import Transport from "./pages/Transport";
import Processing from "./pages/Processing";
import Lab from "./pages/Lab";
import Consumer from "./pages/Consumer";
import Login from "./pages/Login";
import Signin from "./pages/Signin";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import ChainDetails from "./pages/ChainDetails";
import Manufacturer from "./pages/Manufacturer";
import { UserContext } from "./context/UserContext";

function App() {
  const { user, loading } = useContext(UserContext);

  if (loading) return <div>Loading...</div>; // show while fetching user

  return (
    <Router>
      {user && <Navbar />} {/* show navbar only if logged in */}
      <div className="p-4">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/collector" /> : <Login />} />
          <Route path="/signin" element={user ? <Navigate to="/collector" /> : <Signin />} />

          {/* Protected routes */}
          <Route path="/" element={user ? <Collector /> : <Navigate to="/login" />} />
          <Route path="/collector" element={user ? <Collector /> : <Navigate to="/login" />} />
          <Route path="/transport" element={user ? <Transport /> : <Navigate to="/login" />} />
          <Route path="/processing" element={user ? <Processing /> : <Navigate to="/login" />} />
          <Route path="/lab" element={user ? <Lab /> : <Navigate to="/login" />} />
          <Route path="/consumer" element={user ? <Consumer /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/chains/:id" element={user ? <ChainDetails /> : <Navigate to="/login" />} />
          <Route path="/manufacturer" element={user ? <Manufacturer /> : <Navigate to="/login" />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to={user ? "/collector" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
