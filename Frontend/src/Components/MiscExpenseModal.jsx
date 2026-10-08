import React, { useMemo, useState,useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  TextField
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";

export default function MiscExpenseModal({
  open,
  onClose,
  project,
  refreshProject
}) {

  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();



  const approvedTotal = useMemo(() => {

    return (
      project?.miscellaneousItems
        ?.filter(item => item.status === "Approved")
        ?.reduce((sum, item) => sum + item.totalCost, 0)
    );

  }, [project]);

  const updateStatus = async (itemId, status) => {

    try {

      await axiosInstance.patch(
        `/projects/${project._id}/miscellaneous/${itemId}/status`,
        {
          status,
          rejectionReason: reason
        }
      );

      toast.success(`Item ${status.toLowerCase()} successfully`);

      setRejectingId(null);
      setReason("");

      refreshProject();

    } catch (error) {

      console.log(error);

      toast.error("Failed to update item");

    }

  };

  return (

    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >

      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 2.5,
          px: 3,
          background: "#f9fafb",
          borderBottom: "1px solid #f2d6c5",
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        <Box
          component="span"
          sx={{
            display: "inline-block",
            width: 5,
            height: "1.05em",
            background: "#F97316",
            borderRadius: "2px",
          }}
        />
        <Box
          component="span"
          sx={{
            fontSize: { xs: "1.4rem", sm: "1.8rem" },
            letterSpacing: "-0.04em",
            color: "#111827",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "baseline",
            gap: 0.7,
            whiteSpace: "nowrap",
          }}
        >
          <Box component="span" sx={{ color: "#111827" }}>
            Miscellaneous
          </Box>
          <Box component="span" sx={{ color: "#F97316" }}>
            Expenses
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>

        {project?.miscellaneousItems?.length === 0 ? (

          <Typography>
            No miscellaneous expenses added.
          </Typography>

        ) : (

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >

            {project?.miscellaneousItems?.map(item => (

              <Box
                key={item._id}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  p: 2
                }}
              >

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >

                  <Typography fontWeight={600}>
                    {item.itemName}
                  </Typography>

                  <Chip
                    label={item.status}
                    sx={{
                      backgroundColor:
                        item.status === "Approved"
                          ? "#fff0e7"
                          : item.status === "Rejected"
                            ? "#fde2e2"
                            : "#fff1d9",
                      color:
                        item.status === "Approved"
                          ? "#F97316"
                          : item.status === "Rejected"
                            ? "#d64545"
                            : "#c77a00",
                      fontWeight: 700,
                      borderRadius: "999px",
                      px: 1,
                      fontSize: "0.72rem",
                      height: "28px",
                    }}
                  />

                </Box>

                <Typography variant="body2" mt={1}>
                  Quantity: {item.quantity} {item.unit}
                </Typography>

                <Typography variant="body2">
                  Price Per Unit: ₹{item.pricePerUnit}
                </Typography>

                <Typography variant="body2">
                  Total Cost: ₹{item.totalCost}
                </Typography>

                <Typography variant="body2">
                  Purchase Date: {
                    new Date(item.purchaseDate)
                      .toLocaleDateString()
                  }
                </Typography>

                {item.status === "Rejected" &&
                  item.rejectionReason && (

                    <Typography
                      variant="body2"
                      color="error"
                      mt={1}
                    >
                      Reason: {item.rejectionReason}
                    </Typography>

                  )}

                {item.status === "Pending" && (

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      mt: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}
                    >
                      <Button
                        variant="contained"
                        onClick={() =>
                          updateStatus(item._id, "Approved")
                        }
                        sx={{
                          backgroundColor: "#F97316",
                          "&:hover": { backgroundColor: "#E65E0C" },
                        }}
                      >
                        Approve
                      </Button>

                      {!rejectingId || rejectingId !== item._id ? (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() =>
                            setRejectingId(item._id)
                          }
                        >
                          Reject
                        </Button>
                      ) : null}
                    </Box>

                    {rejectingId === item._id && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: {
                            xs: "column",
                            sm: "row"
                          },
                          gap: 2,
                          width: "100%"
                        }}
                      >
                        <TextField
                          size="small"
                          label="Reason"
                          fullWidth
                          value={reason}
                          onChange={(e) =>
                            setReason(e.target.value)
                          }
                        />

                        <Button
                          variant="contained"
                          color="error"
                          onClick={() =>
                            updateStatus(item._id, "Rejected")
                          }
                        >
                          Confirm Reject
                        </Button>
                      </Box>
                    )}
                  </Box>

                )}

              </Box>

            ))}

            <Divider />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 2
              }}
            >

              <Typography fontWeight={700}>
                Approved Total Cost
              </Typography>

              <Typography fontWeight={700}>
                ₹{approvedTotal}
              </Typography>

            </Box>

          </Box>

        )}

      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>

        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: "#F97316",
            color: "#fff",
            fontWeight: 600,
            borderRadius: "8px",
            px: 2.5,
            "&:hover": {
              backgroundColor: "#e9650e",
            },
          }}
        >
          Close
        </Button>

      </DialogActions>

    </Dialog>

  );

}
