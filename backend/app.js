if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo");
const User = require("./model/user");
const Collector = require("./model/collection");
const Transport = require("./model/transporter");
const Processing = require("./model/processing");
const LabTesting = require("./model/lab");
const QRCode = require("qrcode");
const ProductBatch=require("./model/ProductBatch")
const app = express();
const cors = require("cors");
app.set('trust proxy', 1);
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://agastyatrace-client.onrender.com",
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// ------------------ MIDDLEWARE ------------------
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // permissive fallback for dev demo
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/agastyatrace";
mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
}).then(() => {
  console.log("MongoDB connected successfully");
}).catch((err) => {
  console.warn("MongoDB connection warning:", err.message);
});

const isProd = process.env.NODE_ENV === "production";
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysecretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    },
  })
);


app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ------------------ AUTH ROUTES ------------------

// Signup
app.post("/signup", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    User.register({ username, role }, password, (err, user) => {
      if (err) return res.status(500).json({ message: err.message });

      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: err.message });
        return res.status(201).json({
          message: "User registered",
          user: { id: user._id, username, role },
        });
      });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!user)
      return res
        .status(400)
        .json({ message: info?.message || "Invalid credentials" });

    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: err.message });
      return res.json({ message: "Login successful", user });
    });
  })(req, res, next);
});

// Logout
app.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user
app.get("/me", (req, res) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ message: "Not authenticated" });
  res.json({ user: req.user });
});

// ------------------ PRODUCT CHAIN ROUTES ------------------

// Collector submission
app.post("/collector", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const collectorData = {
      ...req.body,
      userId: req.user._id, // logged-in collector
    };

    const collector = await Collector.create(collectorData);

    const qrData = collector._id.toString();
    const qrCodeURL = await QRCode.toDataURL(qrData);

    res
      .status(201)
      .json({ message: "Collector record created", collector, qrCodeURL });
  } catch (err) {
    console.error(err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({ 
      message: err.message || "Failed to record collection", 
      error: err.message 
    });
  }
});

// Transport submission

// ---------------- TRANSPORT ----------------
app.post("/transport", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const transport = await Transport.create({
      ...req.body,
      transporter: req.user._id, // logged-in transporter
    });

    // Generate QR for the collector ID
    const collectorId = req.body.collectorId; // make sure collectorId is sent in body
    const qrCodeURL = await QRCode.toDataURL(collectorId);

    res.status(201).json({
      message: "Transport recorded",
      transport,
      qrCodeURL,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ---------------- PROCESSING ----------------
app.post("/processing", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const { collectorId, receivedQuantityKg, processedQuantityKg, processingType, location } = req.body;

    if (!collectorId || !receivedQuantityKg || !processedQuantityKg || !processingType || !location?.lat || !location?.lng)
      return res.status(400).json({ message: "All required fields must be provided" });

    const processing = await Processing.create({
      collectorId,
      processor: req.user._id, // logged-in processor
      receivedQuantityKg,
      processedQuantityKg,
      processingType,
      location,
    });

    // Generate QR for the collector ID
    const qrCodeURL = await QRCode.toDataURL(collectorId);

    res.status(201).json({
      message: "Processing recorded",
      processing,
      qrCodeURL,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
// Lab Testing submission
app.post("/labtesting", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });

    const { collectorId, testedQuantityKg, testType, result, certificateLinks, location } = req.body;

    if (!collectorId || !testedQuantityKg || !testType || !result || !location?.lat || !location?.lng)
      return res.status(400).json({ message: "All required fields must be provided" });

    const labTest = await LabTesting.create({
      collectorId,
      labTechnician: req.user._id, // logged-in lab technician
      testedQuantityKg,
      testType,
      result,
      certificateLinks,
      location,
    });

    const qrData = `LabTestID:${labTest._id}`;
    const qrCodeURL = await QRCode.toDataURL(qrData);

    res.status(201).json({ message: "Lab test recorded", labTest, qrCodeURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Trace product chain
/*
app.get("/trace/:id", async (req, res) => {
  try {
    const collector = await Collector.findById(req.params.id).populate("userId", "username");
    if (!collector) return res.status(404).json({ message: "Collector not found" });

    const transport = await Transport.find({ collectorId: collector._id }).populate("transporter", "username");
    const processing = await Processing.findOne({ collectorId: collector._id }).populate("processor", "username");
    const lab = await LabTesting.findOne({ collectorId: collector._id }).populate("labTechnician", "username");

    res.json({ collector, transport, processing, lab });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
*/
// Trace full chain by LabTest ID
app.get("/trace/lab/:id", async (req, res) => {
  try {
    // Strip prefix if present
    let labId = req.params.id;
    if (labId.startsWith("LabTestID:")) {
      labId = labId.replace("LabTestID:", "");
    }

    // Find lab test by proper ObjectId
    const lab = await LabTesting.findById(labId).populate("labTechnician", "username");
    if (!lab) return res.status(404).json({ message: "Lab test not found" });

    const collector = await Collector.findById(lab.collectorId).populate("userId", "username");
    if (!collector) return res.status(404).json({ message: "Collector not found" });

    const transport = await Transport.find({ collectorId: collector._id }).populate("transporter", "username");
    const processing = await Processing.findOne({ collectorId: collector._id }).populate("processor", "username");

    res.json({ lab, collector, transport, processing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/*imp-----------------------------------------------------------------------------------------*/
app.get("/trace/product-batch/:batchId", async (req, res) => {
  try {
    const batchId = req.params.batchId;

    // 1. Find ProductBatch
    const batch = await ProductBatch.findById(batchId)
      .populate("manufacturerId", "username email")
      .populate({
        path: "labTests",
        populate: { path: "labTechnician", select: "username email" },
      })
      .lean();

    if (!batch) return res.status(404).json({ message: "Product batch not found" });

    // 2. Get collectors from labTests
    let collectorIds = batch.labTests.map(lab => lab.collectorId);
    collectorIds = [...new Set(collectorIds.map(id => id.toString()))]; // unique

    const collectors = await Collector.find({ _id: { $in: collectorIds } })
  .populate("userId", "username email")
  .select("species quantity farmingType location sensors timestamp plantPart userId") // include plantPart
  .lean();

    // 3. Get transport linked to those collectors
    const transport = await Transport.find({ collectorId: { $in: collectorIds } })
      .populate("transporter", "username email")
      .lean();

    // 4. Get processing linked to those collectors
    const processing = await Processing.find({ collectorId: { $in: collectorIds } })
      .populate("processor", "username email")
      .lean();

    // 5. Return everything
    res.json({
      productBatch: batch,
      collectors,
      transport,
      processing,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// GET /dashboard - fetch all chains
// ------------------ GET /chains ------------------
// Returns all chains with their stages in a single array
app.get("/chains", async (req, res) => {
  try {
    // Fetch everything
    const collectors = await Collector.find().populate("userId", "username");
    const transports = await Transport.find().populate("transporter", "username");
    const processings = await Processing.find().populate("processor", "username");
    const labs = await LabTesting.find().populate("labTechnician", "username");

    // Build chain array
    const chains = collectors.map((collector) => {
      const chainId = collector._id.toString();

      const transportStage = transports.filter(
        (t) => t.collectorId?.toString() === chainId
      );
      const processingStage = processings.find(
        (p) => p.collectorId?.toString() === chainId
      );
      const labStage = labs.find(
        (l) => l.collectorId?.toString() === chainId
      );

      return {
        _id: collector._id,
        collector,
        transport: transportStage,
        processing: processingStage || null,
        lab: labStage || null,
        completed: Boolean(processingStage && labStage),
      };
    });

    res.json(chains);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Trace full chain by Collector or Lab ID
app.get("/chains/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Try finding a Lab first
    let lab = await LabTesting.findById(id).populate("labTechnician", "username");
    let collectorId;

    if (lab) {
      collectorId = lab.collectorId;
    } else {
      // If not a lab ID, treat it as a collector ID
      collectorId = id;
      lab = await LabTesting.findOne({ collectorId }).populate("labTechnician", "username");
    }

    const collector = await Collector.findById(collectorId).populate("userId", "username");
    if (!collector) return res.status(404).json({ message: "Collector not found" });

    const transport = await Transport.find({ collectorId }).populate("transporter", "username");
    const processing = await Processing.findOne({ collectorId }).populate("processor", "username");

    res.json({ collector, transport, processing, lab });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Express.js example
app.get("/api/lab-batches", async (req, res) => {
  try {
    // Get all lab-tested batches
    const labBatches = await LabTesting.find({}).populate("collectorId").sort({ timestamp: -1 }); 

    // Map to return only required info
    const batches = labBatches.map(batch => ({
      _id: batch._id,
      labTestId: batch._id, // or any other ID you want to expose
      collectorId: batch.collectorId,
      testedQuantityKg: batch.testedQuantityKg,
      testType: batch.testType,
      result: batch.result,
      createdAt: batch.timestamp,
    }));

    res.json({ batches });
  } catch (err) {
    console.error("Error fetching lab batches:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// POST /api/product-batch
app.post("/api/product-batch", async (req, res) => {
  try {
    const { batchIds, productName, manufacturerId, quantity, weightPerProduct, location, vedaUsed } = req.body;

    if (!batchIds || batchIds.length === 0) {
      return res.status(400).json({ error: "Select at least one batch" });
    }

    if (!vedaUsed) {
      return res.status(400).json({ error: "Select veda used" });
    }

    // Validate lab batches
    const labBatches = await LabTesting.find({ _id: { $in: batchIds } });
    if (labBatches.length !== batchIds.length) {
      return res.status(400).json({ error: "Some batches are invalid" });
    }

    // Create product batch
    const productBatch = await ProductBatch.create({
      productName,
      labTests: batchIds, // store selected LabTesting IDs
      manufacturerId,
      quantity: quantity || labBatches.reduce((sum, b) => sum + b.testedQuantityKg, 0),
      weightPerProduct: weightPerProduct || 1,
      location: location || "Default Location",
      vedaUsed, // <-- NEW field added
    });

    // Generate QR code containing manufacturerId
    const qrData = JSON.stringify({ productBatchId: productBatch._id, manufacturerId});
    const qrCodeUrl = await QRCode.toDataURL(qrData);

    res.json({ productBatch, qrCodeUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
