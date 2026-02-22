import 'dotenv/config';
import app from './app';
import connectDB from './config/db';

const PORT = Number(process.env.PORT) || 5001;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
}

startServer();