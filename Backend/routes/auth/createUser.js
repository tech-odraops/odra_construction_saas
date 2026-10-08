const express = require('express')
const { query, validationResult, body } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('../../models/user');
const User = require('../../models/user');
const env = require('dotenv').config();
const Organization = require("../../models/Organization");

// signup
const signup = express.Router()
signup.post('/signUp', [
    body('email').isEmail().withMessage("Enter a valid email"),
    body('name').notEmpty().withMessage("Please enter a valid name"),
    body('password')
        .isLength({ min: 5 }).withMessage("Password too short")
        .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/).withMessage("Password must contain at least one letter, one number, and no spaces"),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error(`Validation Error: ${errors.array()}`)
        return res.status(422).json({ success: false, error: errors.array() })
    }

    try {
        const { email, password, name } = req.body;

        // check if the user already exists
        const response = await user.findOne({ email })  //if the email/user is not there then it will give null .. but if the mongodb connection error isther the  throws error
        if (response) {
            console.error('The user already exits');
            return res.status(409).json({success:false , error: "The user already exists"});
        } else {
            const hassedPw = await bcrypt.hash(password, 12)
            
            // Step 1: Create user (temporary without organizationId)
            const newUser = await User.create({
                name,
                email,
                role : "manager",
                password: hassedPw
            })

            // Step 2: Create organization
            const organization = await Organization.create({
                name: `${name}'s Organization`,
                ownerId: newUser._id
             });

            // Step 3: Link user to organization
            newUser.organizationId = organization._id;
            await newUser.save();

            // Step 4: Generate JWT including organizationId
            if (newUser) {
                const token = jwt.sign({
                    User_id: newUser._id,
                    isLoggedIn: true,
                    role:newUser.role,
                    organizationId:organization._id
                }, process.env.secret_key, { expiresIn: '1h' });
                return res.status(200).json({ success: true, token,User_id: newUser._id ,role:newUser.role,name });
            } 
        }

    } catch (e) {
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }

})

// signin
const signin = express.Router()
signin.post('/signIn',[
    body('email').isEmail().withMessage("Enter a valid email"),
    body('password')
        .isLength({ min: 5 }).withMessage("Password too short")
        .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/).withMessage("Password must contain at least one letter, one number, and no spaces"),
    body('role')
        .notEmpty()
        .withMessage("Please enter a role")
        .isIn(['manager', 'site engineer'])
        .withMessage("Role must be either 'manager' or 'site engineer'")
],async (req,res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        console.error("Validation Error",errors.array());
        return res.status(422).json({ success: false, error: errors.array() })
    }
    try{
        const {email, role , password} = req.body;
        const response = await User.findOne({email});

        if(!response){
            console.error("The user doesnot exit please singup first");
            return res.status(404).json({success:false , error:"The user doesnot exist"});
        }

        const isMatchPassword = await bcrypt.compare(password,response.password);
        const isMatchRole = (role == response.role);

        if(!isMatchPassword || !isMatchRole){
            console.error("The credentials don't match");
            return res.status(401).json({success:false,error:"Credentials mismatched"});
        }
        console.log("Org id =",response.organizationId)
        const token = jwt.sign({
            User_id: response._id,
            isLoggedIn: true,
            role:response.role,
            organizationId: response.organizationId
        },process.env.secret_key,{expiresIn:'1h'});
        console.log(`Token = ${token}`);
        return res.status(200).json({success:true,token,User_id:response._id,role,name:response.name});
    }catch(e){
        console.error('Internal server error',e);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
})

module.exports = {signup,signin}
