import mongoose , { Schema, Document } from "mongoose";

export interface IAnalytics extends Document {
    shortCode: string;
    ip: string;
    country: string;
    userAgent: string;
}

const analyticsSchema = new Schema<IAnalytics>({
    shortCode: {
        type: String,
        required: true,
    },

    ip: {
        type: String,
        required: true,
    },

    country: {
        type: String,
        required: true,
    },

    userAgent: {
        type: String,
        required: true,
    }    
} , {timestamps: true});

const Analytics = mongoose.model<IAnalytics>("Analytics" , analyticsSchema);

export default Analytics;