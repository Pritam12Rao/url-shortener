import mongoose, { Schema, Document } from "mongoose";

export interface IUrl extends Document {
  originalUrl: string;
  shortCode: string;
  createdAt: Date;
  clicks: number;
  userId?: string;
  expiresAt?: Date; // ✅ IMPORTANT
}

const urlSchema = new Schema<IUrl>({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  clicks: { type: Number, default: 0 },
  userId: { type: String }, // ✅ fix this too
  expiresAt: { type: Date }, // ✅ REQUIRED FIX
});

const Url = mongoose.model<IUrl>("Url", urlSchema);

export default Url;
