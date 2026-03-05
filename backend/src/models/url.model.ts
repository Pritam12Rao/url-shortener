import mongoose, { Schema, Document } from "mongoose";

export interface IUrl extends Document {
  originalUrl: string;
  shortCode: string;
  clicks: number;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const urlSchema = new Schema<IUrl>({
  originalUrl: {
    type: String,
    required: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
  },
  clicks: {
    type: Number,
    default: 0,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
} , {timestamps: true});

const Url = mongoose.model<IUrl>("Url" , urlSchema);

export default Url;