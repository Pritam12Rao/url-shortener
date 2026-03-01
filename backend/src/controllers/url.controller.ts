import Url from '../models/url.models';;
import { nanoid } from 'nanoid';
import { Request, Response } from "express";


export const createShortUrl = async (req: Request , res: Response): Promise<void> => {
    try {
        const {originalUrl} = req.body;

        if(!originalUrl) {
            res.status(400).json({message: "Original URL is required"});
            return;
        }

        const shortCode = nanoid(7);

        const newUrl = await new Url({
            originalUrl,
            shortCode
        });

        const baseUrl = `${req.protocol}://${req.get('host')}`;

        res.status(201).json({
            message: "Short URL created successfully",
            shortUrl: `${baseUrl}/${newUrl.shortCode}`,
        });
    }catch(error){
        console.error("Error creating short URL:",error);
        res.status(500).json({message:"Internal Server Error"});
    }
}