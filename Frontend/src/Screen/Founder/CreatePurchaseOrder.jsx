import React from "react";
import CreatePurchaseOrderStep1 from "./CreatePurchaseOrderStep1";
import CreatePurchaseOrderStep2 from "./CreatePurchaseOrderStep2";

export default function CreatePurchaseOrder({ item, step, onStepChange, onBack }) {
  const [quantity, setQuantity] = React.useState("1.0");
  const [unitPrice, setUnitPrice] = React.useState("2.00");
  const [discount, setDiscount] = React.useState("");
  const [taxRate, setTaxRate] = React.useState("0");
  const [additionalDiscount, setAdditionalDiscount] = React.useState("0");
  const [roundOff, setRoundOff] = React.useState(false);
  const [vendor, setVendor] = React.useState("");
  const [deliveryMode, setDeliveryMode] = React.useState("site");
  const [deliveryDate, setDeliveryDate] = React.useState("");
  const [deliveryAddress, setDeliveryAddress] = React.useState("Bibhuti Nagar");
  const [billingAddress, setBillingAddress] = React.useState("");
  const [remarks, setRemarks] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [attachment, setAttachment] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const discountPct = Math.min(100, Math.max(0, Number(discount) || 0));
  const taxable = Math.max(0, qty * price * (1 - discountPct / 100));
  const tax = taxable * (Number(taxRate) || 0) / 100;
  const orderAmount = Math.max(0, taxable + tax - (Number(additionalDiscount) || 0));

  if (step === 2) {
    return <CreatePurchaseOrderStep2 item={item} orderAmount={roundOff ? Math.round(orderAmount) : orderAmount} vendor={vendor} setVendor={setVendor} deliveryMode={deliveryMode} setDeliveryMode={setDeliveryMode} deliveryDate={deliveryDate} setDeliveryDate={setDeliveryDate} deliveryAddress={deliveryAddress} setDeliveryAddress={setDeliveryAddress} billingAddress={billingAddress} setBillingAddress={setBillingAddress} remarks={remarks} setRemarks={setRemarks} agreed={agreed} setAgreed={setAgreed} attachment={attachment} setAttachment={setAttachment} notice={notice} setNotice={setNotice} onBack={onBack} />;
  }

  return <CreatePurchaseOrderStep1 item={item} quantity={quantity} setQuantity={setQuantity} unitPrice={unitPrice} setUnitPrice={setUnitPrice} discount={discount} setDiscount={setDiscount} taxRate={taxRate} setTaxRate={setTaxRate} additionalDiscount={additionalDiscount} setAdditionalDiscount={setAdditionalDiscount} roundOff={roundOff} setRoundOff={setRoundOff} taxable={taxable} tax={tax} orderAmount={orderAmount} onBack={onBack} onNext={() => onStepChange(2)} />;
}
