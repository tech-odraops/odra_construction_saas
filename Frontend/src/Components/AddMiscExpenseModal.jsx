import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from "@mui/material";

import Input from "./atoms/Input/Input";
import axiosInstance from "../utils/axiosInstance";
import { requiredValidator } from "../utils/validation";
import { toast } from "react-toastify";

export default function AddMiscExpenseModal({
  open,
  onClose,
  projectId,
  onSuccess,
}) {
  // const navigate = useNavigate();

  const [formData, setFormData] = useState({
    itemName: "",
    purchaseDate: "",
    unit: "",
    quantity: "",
    pricePerUnit: "",
  });
  const [validationStates, setValidationStates] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setValidationStates((prev) => ({
      ...prev,
      [name]: requiredValidator(value) ? "success" : "error",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextValidationStates = Object.fromEntries(
      fields.map(({ name }) => [
        name,
        requiredValidator(formData[name]) ? "success" : "error",
      ]),
    );
    setValidationStates(nextValidationStates);

    if (Object.values(nextValidationStates).includes("error")) return;

    try {
      await axiosInstance.post(
        `/projects/${projectId}/miscellaneous`,
        formData,
      );

      toast.success("Expense added successfully");

      onSuccess();

      onClose();
    } catch (error) {
      console.log(error);

      toast.error(error.response?.data?.message || "Failed to add expense");
    }
  };

  const fields = [
    { name: "itemName", label: "Item Name", type: "text" },
    { name: "purchaseDate", label: "Purchase Date", type: "date" },
    { name: "unit", label: "Unit", type: "text" },
    { name: "quantity", label: "Quantity", type: "number" },
    { name: "pricePerUnit", label: "Price Per Unit", type: "number" },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Miscellaneous Expense</DialogTitle>

      <DialogContent>
        <Box
          component="form"
          id="misc-expense-form"
          noValidate
          onSubmit={handleSubmit}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 1,
            }}
          >
            {fields.map(({ name, label, type }) => (
              <Box key={name} sx={{ width: "100%" }}>
                <Input
                  id={`misc-expense-${name}`}
                  label={label}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleChange}
                  required
                  validationState={validationStates[name]}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button variant="contained" type="submit" form="misc-expense-form">
          Add Expense
        </Button>
      </DialogActions>
    </Dialog>
  );
}
