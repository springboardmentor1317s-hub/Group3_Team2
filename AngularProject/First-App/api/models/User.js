const mongoose = require("mongoose");
const {Schema} = mongoose;

const UserSchema = mongoose.Schema(
    {
        username:{
            type: String,
            required: true
        },
        password:{
            type: String,
            required: true
        },
        email:{
            type: String,
            required: true,
            unique: true
        },
        college:{
            type: String
        },
        role:{
            type: String,
            enum: ['student','admin','super_admin'],
            default: 'student'
        },
        createAt:{
            type: Date,
            default: Date.now
        }
        
    }
    
            
        
);
    
        

module.exports = mongoose.model("User",UserSchema);