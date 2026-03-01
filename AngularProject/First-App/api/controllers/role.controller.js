/*const Role = require("../models/Role.js");
 const createRole = async(req,res,next)=>{
    try{
        if(req.body.role && req.body.role !== ''){
            const newRole = new Role(req.body);
            await newRole.save();
            return res.send("Role Created!");
        }else{
            return res.status(400).send("Bad Request");
        }
    }catch(error){
        return res.status(500).send("Internal Server Error!");
    }

};

 const updateRole = async (req,res,next)=>{
    try{
        const role = await Role.findById( req.params.id);  
        if(role){
            const newData = await Role.findByIdAndUpdate(
                req.params.id,
                {$set: req.body},
                {new: true}
            );   
            return res.status(200).send("Role Updated");
          }else{
            return res.status(404).send("Role not found!");
          }
    }catch (error){
        return res.status(500).send("Internal Server Error!");
    }
};

 const getAllRoles = async (req,res,next)=>{
    try{
        const roles = await Role.find({});
        return res.status(200).send(roles);
    }catch(error){
        return res.status(500).send("Internal Server Error!");
    }
};

module.exports = {createRole,updateRole,getAllRoles};*/