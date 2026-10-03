import { NextResponse } from "next/server";
import { supabase, Order } from "@/lib/supabase";

const FALLBACK_ORDERS: Order[] = [
  {
    order_id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    value: "₹699",
    status: "Out for Delivery",
    notes: "BlueDart — BD-982103. Expected by 6 PM today",
  },
  {
    order_id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    value: "₹499",
    status: "Delivered",
    notes: "Delhivery — DL-441029. Delivered 14 days ago",
  },
  {
    order_id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    value: "₹850",
    status: "Processing",
    notes: "Ordered 3 hours ago. Eligible for cancellation",
  },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("order_id", { ascending: true });

    if (error) {
      console.warn("Supabase orders query error, falling back to mock orders:", error.message);
      return NextResponse.json({ orders: FALLBACK_ORDERS, source: "fallback" });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ orders: FALLBACK_ORDERS, source: "fallback" });
    }

    return NextResponse.json({ orders: data, source: "supabase" });
  } catch (err: any) {
    console.error("Orders API route error:", err);
    return NextResponse.json({ orders: FALLBACK_ORDERS, source: "fallback" });
  }
}
