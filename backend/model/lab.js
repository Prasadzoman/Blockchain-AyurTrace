const mongoose = require("mongoose");

const LabTestingSchema = new mongoose.Schema({
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collector",
    required: true,
  }, // Direct link to collection

  labTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // User role = Lab Technician

  testedQuantityKg: {
    type: Number,
    required: true,
  }, // Quantity actually tested

  testType: {
    type: String,
    enum: ["moisture", "contamination", "pH", "chemical", "other"],
    required: true,
  }, // Type of lab test

  result: {
    type: String,
    required: true,
  }, // Test result

  certificateLinks: {
    type: [String],
    default: [],
  }, // Array of certificate URLs

  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  }, // Lab location

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("LabTesting", LabTestingSchema);
