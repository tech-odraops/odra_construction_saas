import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Divider
} from "@mui/material";

export default function WageModal({ open, onClose, projectId }) {

    useEffect(() => {

    }, []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    if (!open) return;

    const fetchWages = async () => {
      setLoading(true);
      try {

        const res = await axiosInstance.get(
          `/projects/${projectId}/wages`
        );

        setData(res.data.data);

      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWages();

  }, [open, projectId]);

  return (

    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >

      <DialogTitle sx={{ fontWeight: 700 }}>
        Worker Wage Summary
      </DialogTitle>

      <DialogContent>

        {loading ? (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (

          <>
            {/* HEADER ROW */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
                mb: 2
              }}
            >
              <Typography>Worker</Typography>
              <Typography>Type</Typography>
              <Typography>Total Wage</Typography>
            </Box>

            <Divider />

            {/* DATA */}
            {data?.workers?.map((worker) => (

              <Box
                key={worker.workerId}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 2,
                  borderBottom: "1px solid #eee"
                }}
              >
                <Typography>{worker.name}</Typography>

                <Typography sx={{ textTransform: "capitalize" }}>
                  {worker.payoutType}
                </Typography>

                <Typography fontWeight={600}>
                  ₹{worker.totalWage}
                </Typography>
              </Box>

            ))}

            {/* TOTAL */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 3,
                pt: 2,
                borderTop: "2px solid #ddd"
              }}
            >
              <Typography fontWeight={700}>
                Total Labour Cost
              </Typography>

              <Typography fontWeight={700}>
                ₹{data?.totalProjectWage}
              </Typography>
            </Box>

          </>
        )}

      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>

    </Dialog>

  );
}
