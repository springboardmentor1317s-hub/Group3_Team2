const mongoose = require("mongoose");
//const {Schema} = mongoose;
//const bcrypt = require("bcryptjs");
//const { timestamp } = require("rxjs");

const UserSchema = mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            trim: true
        },
        password:{
            type: String,
            required: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        college:{
            type: String
        },
        role:{
            type: String,
            enum: ["student","admin","super_admin"],
            default: "student"
        }

    }, { timestamps: true }

);

//Hash password before save
/*userSchema.pre('save', async function(next){
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});*/

//method to compare passwords
/*userSchema.methods.comparePassword = async function(plain) {
    return bcrypt.compare(plain, this.password);
};*/
module.exports = mongoose.model("User",UserSchema);