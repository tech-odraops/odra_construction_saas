import React, { useState } from "react";
import { toast } from "react-toastify";
import Navbar from "../Components/Navbar";
import axiosInstance from "../utils/axiosInstance";
import constructionArt from "../assets/Pre-Launch Registration.png";
import waitlistBackground from "../assets/waitlist bg image.png";

const fields = [
  { name: "companyName", label: "Company Name", type: "text", icon: "▦", autoComplete: "organization" },
  { name: "phone", label: "Phone Number", type: "tel", icon: "☎", autoComplete: "tel" },
  { name: "ownerName", label: "Owner Name", type: "text", icon: "♙", autoComplete: "name" },
  { name: "email", label: "Email ID", type: "email", icon: "✉", autoComplete: "email" },
];

export default function Waitlist() {
  const [formData, setFormData] = useState({ companyName: "", ownerName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.values(formData).some((value) => !value.trim())) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.post("/waitlist", formData);
      toast.success(response?.data?.message || "You’re on the pre-launch list!");
      setSubmittedData({ ...formData });
      setFormData({ companyName: "", ownerName: "", email: "", phone: "" });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="waitlist-page" style={{ "--waitlist-art": `url("${constructionArt}")`, "--waitlist-background": `url("${waitlistBackground}")` }}>
      <div className="waitlist-layout">
        <section className="waitlist-copy" aria-labelledby="waitlist-title">
          <p className="waitlist-kicker">Construction ERP</p>
          <h1 className="waitlist-headline" id="waitlist-title">BUILD<span className="smart">SMARTER</span><span className="manage">MANAGE BETTER</span></h1>
          <p className="waitlist-description">ODRAOPS is an all-in-one platform to simplify your construction operations — from project management and workforce tracking to inventory control and site operations.</p>

          <section className="waitlist-form-card" aria-label="Pre-launch registration">
            {submittedData ? (
              <div className="waitlist-success" role="status">
                <div className="waitlist-success-mark" aria-hidden="true">✓</div>
                <h2>You're on the list!</h2>
                <p>Thanks, <strong>{submittedData.ownerName}</strong>. We’ve received your registration for <strong>{submittedData.companyName}</strong> and will be in touch at {submittedData.email}.</p>
              </div>
            ) : <>
              <h2>Join the Pre-Launch List</h2>
              <form onSubmit={handleSubmit}>
                <div className="waitlist-fields">
                  {fields.map(({ name, label, type, icon, autoComplete }) => (
                    <label className="waitlist-field" key={name}>
                      <span className="waitlist-field-icon" aria-hidden="true">{icon}</span>
                      <input name={name} type={type} placeholder={label} aria-label={label} autoComplete={autoComplete} value={formData[name]} onChange={(event) => setFormData({ ...formData, [name]: event.target.value })} required />
                    </label>
                  ))}
                </div>
                <button className="waitlist-submit" type="submit" disabled={loading}>{loading ? "SIGNING YOU UP…" : <>SIGN UP <span aria-hidden="true">→</span></>}</button>
                <div className="waitlist-privacy">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2ZM9 6a3 3 0 0 1 6 0v2H9Z" /></svg>
                  <span>We respect your privacy.</span>
                </div>
              </form>
            </>}
          </section>
        </section>
      </div>
      </main>
    </>
  );
}
