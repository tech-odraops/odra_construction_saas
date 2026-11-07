import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../../utils/axiosInstance";
import { Box, Typography, Paper, Tabs, Tab } from "@mui/material";
import Button from "../../Components/atoms/Button/Button";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { useTranslation } from "react-i18next";
import Input from "../../Components/atoms/Input/Input";

function MaterialIcon({ name = "" }) {
  const material = name.toLowerCase();
  if (material.includes("wire") || material.includes("cable")) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="9" rx="14" ry="5"/><path d="M10 9v25c0 3 6 5 14 5s14-2 14-5V9M10 16c0 3 6 5 14 5s14-2 14-5M10 22c0 3 6 5 14 5s14-2 14-5M10 28c0 3 6 5 14 5s14-2 14-5"/><ellipse cx="24" cy="39" rx="14" ry="5"/></svg>;
  }
  if (material.includes("pipe")) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m9 35 21-21a8 8 0 0 1 11 11L29 37H15"/><path d="m28 12 9 9M12 32l5 5M15 37a6 6 0 1 1-8 8 6 6 0 0 1 8-8ZM31 14l5-5 8 8-5 5"/></svg>;
  }
  if (material.includes("wood") || material.includes("timber")) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m7 28 16-16h17L24 28H7ZM24 28v8H7v-8M24 28h16l-16 16H7l7-7M23 12v8M30 12 14 28M40 28v8L24 48"/><path d="M11 33h9M12 40h10"/></svg>;
  }
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m24 5 18 9v20l-18 9-18-9V14l18-9Z"/><path d="m6 14 18 10 18-10M24 24v19"/></svg>;
}

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
};

export default function InventoryHistory() {
  const { t } = useTranslation();
  const { id: projectId } = useParams();
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState(0);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterItem, setFilterItem] = useState("");

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const [usageRes, purchaseRes, inventoryRes] = await Promise.all([
          axios.get(`/inventory/history/${projectId}`),
          axios.get(`/inventory/purchase-history/${projectId}`),
          axios.get(`/inventory/${projectId}`),
        ]);
        if (!active) return;
        setHistory(usageRes.data.history || []);
        setPurchaseHistory(purchaseRes.data.history || []);
        setInventoryItems(inventoryRes.data.items || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
    return () => { active = false; };
  }, [projectId]);

  const inventoryById = useMemo(() => new Map(inventoryItems.map((item) => [String(item._id), item])), [inventoryItems]);
  const purchaseByItem = useMemo(() => {
    const map = new Map();
    purchaseHistory.forEach((purchase) => {
      const key = String(purchase.inventoryItemId?._id || purchase.inventoryItemId);
      if (!map.has(key)) map.set(key, purchase);
    });
    return map;
  }, [purchaseHistory]);

  const materialOptions = [...new Set([
    ...history.map((entry) => entry.inventoryItemId?.name).filter(Boolean),
    ...purchaseHistory.map((entry) => entry.inventoryItemId?.name).filter(Boolean),
  ])];

  const filteredHistory = history.filter((entry) => {
    const item = entry.inventoryItemId;
    const matchDate = !filterDate || new Date(entry.date).toISOString().slice(0, 10) === filterDate;
    const matchItem = !filterItem || item?.name === filterItem;
    return matchDate && matchItem;
  });
  const filteredPurchases = purchaseHistory.filter((entry) => {
    const matchDate = !filterDate || new Date(entry.purchaseDate).toISOString().slice(0, 10) === filterDate;
    const matchItem = !filterItem || entry.inventoryItemId?.name === filterItem;
    return matchDate && matchItem;
  });

  const title = t("inventory.usage_history");
  const titleSplit = title.lastIndexOf(" ");

  const renderRecord = (entry, isPurchase = false) => {
    const itemId = String(entry.inventoryItemId?._id || entry.inventoryItemId || "");
    const inventoryItem = inventoryById.get(itemId) || {};
    const latestPurchase = purchaseByItem.get(itemId) || {};
    const item = entry.inventoryItemId && typeof entry.inventoryItemId === "object" ? entry.inventoryItemId : {};
    const recordDate = isPurchase ? entry.purchaseDate : entry.date;
    const quantity = isPurchase ? entry.quantity : entry.usedQty;
    const price = isPurchase ? entry.pricePerUnit : inventoryItem.pricePerUnit;
    const supplier = isPurchase ? entry.supplierName : inventoryItem.supplierName;
    const company = isPurchase ? entry.companyName : inventoryItem.companyName;
    const purchasedBy = isPurchase ? entry.createdBy?.name : latestPurchase.createdBy?.name;
    const purchaseDate = isPurchase ? entry.purchaseDate : latestPurchase.purchaseDate;
    const userName = isPurchase ? entry.createdBy?.name : entry.usedBy?.name;

    return (
      <article className="inventory-history-row" key={entry._id}>
        <div className="inventory-material-icon"><MaterialIcon name={item.name} /></div>
        <div className="inventory-material-main">
          <Typography component="h2">{item.name || t("inventory.material_name")}</Typography>
          <p>Quantity : <span>{quantity} {item.unit || inventoryItem.unit || ""}</span></p>
          {price != null && <p>Price Per Unit : ₹{price}</p>}
          {supplier && <p>Supplier : {supplier}</p>}
        </div>
        <div className="inventory-material-purchase">
          {company && <p>Company : {company}</p>}
          {purchasedBy && <p>Purchased By : <span>{purchasedBy}</span></p>}
          {purchaseDate && <p>Purchase Date : {formatDate(purchaseDate)}</p>}
        </div>
        <div className="inventory-material-used">
          <p>{isPurchase ? "Purchased By" : "Used by"} : <span>{userName || "—"}</span></p>
          <time>{formatDate(recordDate)}</time>
        </div>
        <Button iconOnly className="inventory-date-icon" aria-label={`Record date ${formatDate(recordDate)}`} title={formatDate(recordDate)}>
          <CalendarMonthOutlinedIcon />
        </Button>
      </article>
    );
  };

  return (
    <div className="inventory-history-page">
      <main className="inventory-history-main">
        <header className="inventory-history-heading">
          <Typography component="h1" className="inventory-history-title">
            {titleSplit > 0 ? <>{title.slice(0, titleSplit)} <span>{title.slice(titleSplit + 1)}</span></> : <span>{title}</span>}
          </Typography>
          <Typography component="p">{t("inventory.usage_history_desc")}</Typography>
        </header>

        <Tabs className="inventory-history-tabs" value={tab} onChange={(_event, value) => setTab(value)}>
          <Tab label="Usage History" />
          <Tab label="Purchase History" />
        </Tabs>

        <Paper className="inventory-history-filters" elevation={0}>
          <Input type="date" label={t("inventory.filter_by_date")} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <Input select label={t("inventory.filter_by_material")} value={filterItem} onChange={(e) => setFilterItem(e.target.value)}>
            <option value="">{t("inventory.all_materials")}</option>
            {materialOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </Input>
        </Paper>

        <Paper className="inventory-history-list" elevation={0}>
          {tab === 0 ? (
            filteredHistory.length ? filteredHistory.map((entry) => renderRecord(entry)) : <Typography className="inventory-history-empty">{t("inventory.no_usage_records")}</Typography>
          ) : (
            filteredPurchases.length ? filteredPurchases.map((entry) => renderRecord(entry, true)) : <Typography className="inventory-history-empty">No purchase records found.</Typography>
          )}
        </Paper>
      </main>
    </div>
  );
}
