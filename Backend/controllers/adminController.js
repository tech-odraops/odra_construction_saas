const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();

exports.adminLogin = async (req,res)=>{
    try{
        const {email , password} = req.body;
        const admin = await User.findOne({email});

        if(!admin || admin.role != "admin"){
            return res.status(401).json({
                success: false,
                error: "Invalid admin credentials"
            });
        }
        
        const isMatch = await bcrypt.compare(password,admin.password);

        if(!isMatch){
            return res.status(401).json({
                success: false,
                error: "Invalid admin credentials"
            });
        }

        const token = jwt.sign({
            User_id: admin._id,
            role: admin.role,
            name:admin.name,
            isLoggedIn: true,
            email
        },
            process.env.secret_key,
            { expiresIn: "1h" }
        );

        return res.status(200).json({
            success: true,
            token,
            role: admin.role,
            name: admin.name
        });
    }catch (error) {

        console.error("Admin login error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });

    }
}