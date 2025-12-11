require('dotenv').config();
const express=require('express');
const mongoose=require('mongoose');
const cors = require('cors');
const app=express();
app.use(express.json());

app.use(cors({
  origin: [
    'https://beatmatchfrontweb.onrender.com',  // Production
    'http://localhost:5173',                    // Local development
    'http://127.0.0.1:5173'                     // Alternative localhost
  ],
  credentials: true
}));


const uri = process.env.MONGODB_URI;
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
mongoose.connect(uri, clientOptions)
.then(() => console.log('mongoDB connected succesfully ✅'))
.catch(err => console.error('mongoDB faild connection ❌', err));



let UserRouter = require('./Routers/UserRouter');
app.use('/user', UserRouter);


// ניתוב לאירועים
let EventRouter = require('./Routers/EventRouter');
app.use('/event', EventRouter);


// ניתוב לביקורות
let ReviewRouter = require('./Routers/ReviewRouter');
app.use('/review', ReviewRouter);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
}); 