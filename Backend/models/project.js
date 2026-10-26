const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const normalizeSiteEngineerIds = (siteEngineer, siteEngineers = []) => {
  const ids = [];

  if (siteEngineer) {
    ids.push(siteEngineer.toString());
  }

  if (Array.isArray(siteEngineers)) {
    for (const engineer of siteEngineers) {
      if (engineer) {
        ids.push(engineer.toString());
      }
    }
  }

  return [...new Set(ids.filter(Boolean))];
};

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

projectSchema.pre('save', function (next) {
  const uniqueSiteEngineerIds = normalizeSiteEngineerIds(this.siteEngineer, this.siteEngineers);

  if (uniqueSiteEngineerIds.length) {
    this.siteEngineers = uniqueSiteEngineerIds.map((id) => new mongoose.Types.ObjectId(id));
    if (!this.siteEngineer) {
      this.siteEngineer = this.siteEngineers[0];
    }
  } else {
    this.siteEngineers = [];
  }

  next();
});

module.exports = mongoose.model('Project', projectSchema);
