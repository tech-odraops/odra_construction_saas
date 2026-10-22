const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projectSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Ongoing', 'Completed'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, default:null },

  contractor: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  siteEngineer: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default:null
  },

  // Multiple Site Engineers assigned to this project
  siteEngineers: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],

  reports: [
    {
      type: Schema.Types.ObjectId,
      ref: "Report"
    }
  ],

  miscellaneousItems: [
    {
      itemName: {
        type: String,
        required: true
      },

      purchaseDate: {
        type: Date,
        required: true
      },

      unit: {
        type: String,
        required: true
      },

      quantity: {
        type: Number,
        required: true
      },

      pricePerUnit: {
        type: Number,
        required: true
      },

      totalCost: {
        type: Number,
        required: true
      },

      status: {
        type: String,
        enum: ["Pending", "Approved","Rejected"],
        default: "Pending"
      },

      rejectionReason: {
        type: String,
        default: ""
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    }
  ],

  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  }
},
  { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
