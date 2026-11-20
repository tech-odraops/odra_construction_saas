import { Avatar, Box, IconButton, MenuItem, Paper, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "../../Components/atoms/Button/Button";
import { Icon } from "../../Components/atoms/Icon/Icon";

const surfaceSx = { bgcolor: "var(--color-dashboard-surface)", border: "1px solid var(--color-dashboard-border)", borderRadius: "var(--dashboard-container-radius)", boxShadow: "none" };

function POStatus({ label }) {
  return <Box component="span" sx={{ px: 1.1, py: 0.35, borderRadius: "var(--input-border-radius)", bgcolor: "var(--color-dashboard-nav-active)", color: "var(--palette-primary-main)", fontSize: "var(--font-caption-font-size)", fontWeight: "var(--font-weight-semibold)" }}>{label}</Box>;
}

function FinancialRow({ label, value }) {
  return <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>{label}</Typography><Typography sx={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-caption-font-size)" }}>{value}</Typography></Box>;
}

export default function CreatePurchaseOrderStep1({ item, quantity, setQuantity, unitPrice, setUnitPrice, discount, setDiscount, taxRate, setTaxRate, additionalDiscount, setAdditionalDiscount, roundOff, setRoundOff, taxable, tax, orderAmount, onBack, onNext }) {
  const money = (value) => `\u20b9${value.toFixed(2)}`;
  const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "var(--input-border-radius)", minHeight: 54 }, "& .MuiInputLabel-root": { color: "var(--color-dashboard-muted-text)" } };
  const panelSx = { ...surfaceSx, overflow: "hidden", display: "flex", flexDirection: "column" };
  const panelTitleSx = { px: 2, py: 1.25, fontSize: "var(--font-body-font-size)", bgcolor: "var(--gray-100)", fontWeight: "var(--font-weight-bold)", color: "var(--color-organization-profile-text)" };
  return (
    <Box sx={{ height: "calc(100dvh - var(--dashboard-header-height))", boxSizing: "border-box", p: { xs: 1, md: 1.5 }, bgcolor: "var(--color-dashboard-canvas)", overflow: "hidden" }}>
      <Box sx={{ width: "100%", maxWidth: 1440, height: "100%", mx: "auto", display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25, flexShrink: 0 }}>
          <IconButton aria-label="Back to indent" onClick={onBack} size="small"><ArrowBackIcon /></IconButton>
          <Box><Typography sx={{ color: "var(--palette-primary-main)", fontSize: 10, fontWeight: "var(--font-weight-bold)" }}>CREATE PURCHASE ORDER / STEP 1 OF 2</Typography><Typography variant="h5" sx={{ lineHeight: 1.2, fontWeight: "var(--font-weight-bold)" }}>Add Quantity &amp; financial details</Typography></Box>
        </Box>
        <Paper sx={{ ...surfaceSx, px: 2, py: 1.25, mb: 1.5, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>Linked Indent</Typography><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>{item.id}</Typography><POStatus label={item.status} /><Box sx={{ flex: 1 }} /><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>Bibhuti Complex</Typography>
        </Paper>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.8fr) minmax(300px, .95fr)" }, gap: 1.5, flex: 1, minHeight: 0, alignItems: "stretch" }}>
          <Paper sx={panelSx}>
            <Typography sx={panelTitleSx}><Icon variant="universal-material" size="sm" gradient="primary" sx={{ mr: 1, verticalAlign: "middle" }} />Additional details on Material</Typography>
            <Box sx={{ p: { xs: 1.5, md: 2.5 }, flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, mb: 2 }}><Avatar variant="rounded" sx={{ width: 60, height: 60, bgcolor: "var(--color-organization-profile-avatar-surface)", color: "var(--palette-primary-main)" }}><Icon variant="universal-material" size="lg" gradient="primary" /></Avatar><Box><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>{item.material || "Brick"}</Typography><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>vbb {"\u00b7"} Item code: 23345</Typography><Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: "var(--font-caption-font-size)" }}>In stock <Box component="span" sx={{ color: "var(--palette-success-main, #2eae68)", fontWeight: "var(--font-weight-bold)", ml: 1 }}>26.0 set</Box><Box component="span" sx={{ ml: { xs: 1, sm: 7 } }}>Balance estimated qty <b>100.0 set</b></Box></Typography></Box></Box>
              <Box sx={{ borderTop: "1px solid var(--color-dashboard-border)", pt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField label="Qty for delivery *" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputProps={{ min: 0, step: "0.1" }} InputProps={{ endAdornment: <Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: 12 }}>set</Typography> }} sx={fieldSx} />
                <TextField label="Unit Price *" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} inputProps={{ min: 0, step: "0.01" }} sx={fieldSx} />
                <TextField label="Discount" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} inputProps={{ min: 0, max: 100 }} InputProps={{ endAdornment: <Typography sx={{ color: "var(--color-dashboard-muted-text)", fontSize: 12 }}>%</Typography> }} sx={fieldSx} />
                <TextField select label="SGST / CGST" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} sx={fieldSx}><MenuItem value="0">0.0%</MenuItem><MenuItem value="5">5.0%</MenuItem><MenuItem value="12">12.0%</MenuItem><MenuItem value="18">18.0%</MenuItem><MenuItem value="28">28.0%</MenuItem></TextField>
              </Box>
              <Typography sx={{ mt: 1, fontSize: 10, color: "var(--color-dashboard-muted-text)" }}>Taxes are calculated automatically based on the selected GST rate.</Typography>
            </Box>
          </Paper>
          <Paper sx={panelSx}>
            <Typography sx={panelTitleSx}>Financial Details</Typography>
            <Box sx={{ p: { xs: 1.5, md: 2.5 }, display: "grid", gap: 2, alignContent: "start", flex: 1 }}>
              <FinancialRow label="Total Taxable Value" value={money(taxable)} /><FinancialRow label="Total CGST" value={money(tax / 2)} /><FinancialRow label="Total SGST" value={money(tax / 2)} />
              <Box sx={{ borderTop: "1px solid var(--color-dashboard-border)", pt: 1.2 }}><TextField fullWidth label="Additional Discount" type="number" value={additionalDiscount} onChange={(e) => setAdditionalDiscount(e.target.value)} inputProps={{ min: 0, step: "0.01" }} sx={fieldSx} /></Box>
              <Box sx={{ borderTop: "1px solid var(--color-dashboard-border)", pt: 1.2, display: "flex", alignItems: "center", justifyContent: "space-between" }}><Typography sx={{ fontWeight: "var(--font-weight-bold)" }}>Order Amount</Typography><Typography sx={{ color: "var(--palette-primary-main)", fontWeight: "var(--font-weight-bold)" }}>{money(roundOff ? Math.round(orderAmount) : orderAmount)}</Typography></Box>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-dashboard-muted-text)", fontSize: 13 }}><input type="checkbox" checked={roundOff} onChange={(e) => setRoundOff(e.target.checked)} />Round off amount</label>
            </Box>
          </Paper>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.25, pt: 1.25, flexShrink: 0, borderTop: "1px solid var(--color-dashboard-border)" }}><Button variant="outlined" onClick={onBack} style={{ minWidth: "7.5rem", color: "var(--color-dashboard-muted-text)" }}>Back</Button><Button variant="contained" onClick={onNext} style={{ minWidth: "11rem", backgroundColor: "var(--palette-primary-main)", color: "var(--button-primary-hover-text-color)" }}>Next</Button></Box>
      </Box>
    </Box>
  );
}
