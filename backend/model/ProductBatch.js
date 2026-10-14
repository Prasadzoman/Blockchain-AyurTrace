const mongoose = require("mongoose");

const productBatchSchema = new mongoose.Schema(
  {
    manufacturerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    weightPerProduct: {
      type: Number,
      required: true,
      min: 0,
    },
    location: {
      type: String,
      required: true,
    },
    labTests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LabTesting", // <-- Make sure this matches your model name
      },
    ],
    vedaUsed: {
      type: String, // or [String] if you want multiple selections
      enum: ["Rig Veda", "Sama Veda", "Yajur Veda", "Atharva Veda"], // restrict to valid values
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductBatch", productBatchSchema);
