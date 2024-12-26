const { Schema, model } = require('mongoose');

const summarySchema = new Schema({
  summary: {
    type: String,
    required: true
  },
  pdfName: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  }
}, { timestamps: true });

const Summary = model('Summary', summarySchema);

module.exports = Summary;
