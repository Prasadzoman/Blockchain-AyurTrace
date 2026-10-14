const mongoose = require("mongoose");

const TransportSchema = new mongoose.Schema({
  collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Collector", required: true },
  transporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quantityKg: { type: Number, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  destination: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transport", TransportSchema);
