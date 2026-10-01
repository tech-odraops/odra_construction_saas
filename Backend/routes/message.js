const express = require("express");
const { body, validationResult } = require('express-validator');
const Message = require('../models/message');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (from, to, subject, msg, html = "") => {
  try {
    const { data, error } = await resend.emails.send({
      from: "OdraOps <noreply@odraops.com>",
      to,
      subject,
      text: msg,
      html,
      reply_to: from,
    });
    if (error) throw error;
    console.log("Email sent:", data.id);
    return true;
  } catch (err) {
    console.error("Error while sending mail:", err);
    return false;
  }
};

const messagePost = express.Router();

messagePost.post(
  '/contact-us',
  [
    body('name').notEmpty().withMessage("Name can't be empty"),
    body('message').escape().notEmpty().withMessage("Message can't be empty"),
    body('email').isEmail().withMessage("Invalid email address"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error(`Validation Error: ${errors.array()}`);
      return res.status(400).json({ success: false, error: errors.array() });
    }

    try {
      const { name, email, message } = req.body;

      // Check if user already has messages
      const existingUser = await Message.findOne({ email });

      if (existingUser) {
        await Message.findOneAndUpdate(
          { email },
          { $push: { messages: { msg: message, createdDate: new Date() } } },
          { new: true }
        );
      } else {
        await Message.create({
          name,
          email,
          messages: [{ msg: message, createdDate: new Date() }]
        });
      }

      // Send notification email to admin
      const mailSuccess = await sendEmail(
        email,
        "nitinmohapatra26@gmail.com",
        "📩 New Contact Message",
        `From: ${name}\nEmail: ${email}\nMessage: ${message}`
      );

      if (!mailSuccess) {
        return res.status(500).json({success: false,error: "Internal Server Error. Message Couldn't be send"})
      }

      return res.status(200).json({ success: true, message: "Message received successfully" });

    } catch (err) {
      console.error("Error handling message:", err);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }
);

module.exports = { messagePost };
