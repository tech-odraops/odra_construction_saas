import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ContractorNavbar from "../../Components/ContractorNavbar";
import { Box, TextField, Button, Typography, Paper, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import axiosInstance from "../../utils/axiosInstance";
import addWorkerArtwork from "../../assets/Add Worker.png";
import { useTranslation } from "react-i18next";

export default function AddWorkers() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dailyWage, setDailyWage] = useState("");
  const [payoutType, setPayoutType] = useState("daily");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {

  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a worker name");
      return;
    }
    setLoading(true);
    try {
      const res = await axiosInstance.post("/workers", {
        name: name.trim(),
        phone: phone.trim() || undefined,
        dailyWage,
        payoutType,
      });
      if (res.status === 201) {
        toast.success("Worker added successfully!");
        setName("");
        setPhone("");
        setDailyWage("");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to add worker");
    } finally {
      setLoading(false);
    }
  };

  const title = t("workers.add_worker");
  const splitAt = title.lastIndexOf(" ");

  return (
    <div className="add-worker-page" style={{ "--add-worker-art": `url("${addWorkerArtwork}")` }}>
      <ContractorNavbar />
      <main className="add-worker-main">
        <Paper className="add-worker-card" elevation={0}>
          <Typography component="h1" className="add-worker-title">
            {splitAt > 0 ? <>{title.slice(0, splitAt)} <span>{title.slice(splitAt + 1)}</span></> : <span>{title}</span>}
          </Typography>
          <Typography component="p" className="add-worker-subtitle">{t("workers.add_worker_desc")}</Typography>
          <form className="add-worker-form" onSubmit={handleSubmit}>
            <TextField className="add-worker-field" fullWidth placeholder={`${t("workers.worker_name")} *`} value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
            <TextField className="add-worker-field" fullWidth placeholder={t("workers.phone_optional")} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            <TextField className="add-worker-field" fullWidth placeholder="Daily Wage *" type="number" value={dailyWage} onChange={(e) => setDailyWage(e.target.value)} required disabled={loading} />
            <TextField className="add-worker-field add-worker-payout" select fullWidth label="Payout Type" value={payoutType} onChange={(e) => setPayoutType(e.target.value)} disabled={loading} SelectProps={{ native: true }}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </TextField>
            <div className="add-worker-actions">
              <Button className="add-worker-submit" type="submit" variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : t("workers.add_worker_btn")}
              </Button>
              <Button className="add-worker-cancel" type="button" variant="outlined" onClick={() => navigate(-1)} disabled={loading}>{t("workers.cancel")}</Button>
            </div>
          </form>
        </Paper>
      </main>
    </div>
  );
}
