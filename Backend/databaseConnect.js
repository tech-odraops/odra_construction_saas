const mongoose = require('mongoose');
const dns = require('dns');

// Fix: Force Node.js to use reliable DNS servers (Google & Cloudflare) to bypass Windows/c-ares ECONNREFUSED SRV errors
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

 const connectionString = process.env.MONGODB_URI;

const connectDb = () => {
    mongoose.connect(connectionString);
    const db = mongoose.connection;
    db.on("error", (err) => {
        console.error("Database connection error:", err);
    });
    db.once("open", () => {
        console.log("Connected succefully with db");
    });
}

module.exports = connectDb;
