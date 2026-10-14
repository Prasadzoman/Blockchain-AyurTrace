const mongoose = require("mongoose");

const ProcessingSchema = new mongoose.Schema({
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collector",
    required: true,
  }, // Direct link to collection

  processor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }, // User role = Processing Plant

  receivedQuantityKg: {
    type: Number,
    required: true,
  }, // Quantity actually received

  processedQuantityKg: {
    type: Number,
    required: true,
  }, // Quantity after processing

  processingType: {
    type: String,
    enum: ["sorting", "grading", "drying", "packing", "other"],
    required: true,
  }, // Processing type

  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  }, // Processing plant location

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Processing", ProcessingSchema);
