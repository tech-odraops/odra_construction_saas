import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from "@mui/material";

import axiosInstance from "../utils/axiosInstance";
import { toast } from "react-toastify";

export default function AddMiscExpenseModal({
  open,
  onClose,
  projectId,
  onSuccess
}) {

  const navigate = useNavigate();


  const [formData, setFormData] = useState({
    itemName: "",
    purchaseDate: "",
    unit: "",
    quantity: "",
    pricePerUnit: ""
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async () => {

    try {

      await axiosInstance.post(
        `/projects/${projectId}/miscellaneous`,
        formData
      );

      toast.success("Expense added successfully");

      onSuccess();

      onClose();

    } catch (error) {

      console.log(error);

      toast.error(
        error.response?.data?.message ||
        "Failed to add expense"
      );

    }

  };

  return (

    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >

      <DialogTitle>
        Add Miscellaneous Expense
      </DialogTitle>

      <DialogContent>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mt: 1
          }}
        >

          <TextField
            label="Item Name"
            name="itemName"
            fullWidth
            onChange={handleChange}
          />

          <TextField
            type="date"
            name="purchaseDate"
            fullWidth
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Unit"
            name="unit"
            fullWidth
            onChange={handleChange}
          />

          <TextField
            label="Quantity"
            name="quantity"
            type="number"
            fullWidth
            onChange={handleChange}
          />

          <TextField
            label="Price Per Unit"
            name="pricePerUnit"
            type="number"
            fullWidth
            onChange={handleChange}
          />

        </Box>

      </DialogContent>

      <DialogActions>

        <Button onClick={onClose}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSubmit}
        >
          Add Expense
        </Button>

      </DialogActions>

    </Dialog>

  );

}
