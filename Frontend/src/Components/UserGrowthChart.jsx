import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { Card, CardContent, Typography } from "@mui/material";
import { popupToast as toast } from "../utils/popupToast.js";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";

export default function UserGrowthChart() {

    const [data, setData] = useState([]);

    useEffect(() => {

        async function fetchData() {

            try {

                const res = await axiosInstance.get("/admin/user-growth");
                console.log(res)
                setData(res.data.data);

            } catch (err) {
                toast.error("Unable to fetch data")
                console.log(err);

            }

        }

        fetchData();

    }, [])

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />

                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />

                <Tooltip
                    contentStyle={{
                        borderRadius: "10px",
                        border: "none",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
                    }}
                />

                <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#ffcc00"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </LineChart>
        </ResponsiveContainer>

    )

}