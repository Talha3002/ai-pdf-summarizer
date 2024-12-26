const { Schema, model } = require('mongoose');


const ImagesSchema = new Schema({
   coverImageURL: {
    type: String,
    required: false,
   },
   createdBy: {
    type: Schema.Types.ObjectId,
    ref: "user",
   }
}, { timestamps: true })

const Images = model('images', ImagesSchema);
module.exports = Images;
