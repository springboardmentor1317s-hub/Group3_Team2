const express = require('express');
const mongoose = require('mongoose');  
const cors = require('cors');
const dotenv= require('dotenv');
//const roleRoute = require('./routes/role.js');
//const { APP_ID } = require('@angular/core');
const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());
//app.use("/api/role",roleRoute);

const connectMongoDB = async () =>{
    try{
         await mongoose.connect(process.env.MONGO_URL);
         console.log("Connected to Database!")
    }catch(error){
        throw error;

    }
}
//MongoDB Connection
/*mongoose.connect('mongodb://127.0.0.1:27017/campusEventHub',{
    useNewUrlParser: true,
    useUnifiedTopology:true
})
.then(() => console.log("MongoDB Connected"))
.catch(error => console.log(error));*/

//Routes
app.use('/api/role',require('./routes/role'));







/*app.use('/', (req,res) =>{
   return res.send("Hello,Welcome to MEAN Stack Project!!");
})*/

app.listen(8800, () =>{
    connectMongoDB();
    console.log("connected to backend");
});