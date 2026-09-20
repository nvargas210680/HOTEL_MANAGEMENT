"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function ReportsPage() {
  const [bookingReport, setBookingReport] = useState(null);
  const [addonReport, setAddonReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // BOOKING REVENUE FILTER
  const [bookingFromDate, setBookingFromDate] = useState("");
  const [bookingToDate, setBookingToDate] = useState("");
  const [appliedBookingFromDate, setAppliedBookingFromDate] = useState("");
  const [appliedBookingToDate, setAppliedBookingToDate] = useState("");

  // ADD-ON SALES FILTER
  const [addonFromDate, setAddonFromDate] = useState("");
  const [addonToDate, setAddonToDate] = useState("");
  const [appliedAddonFromDate, setAppliedAddonFromDate] = useState("");
  const [appliedAddonToDate, setAppliedAddonToDate] = useState("");

  const bookingFromDateRef = useRef(null);
  const bookingToDateRef = useRef(null);
  const addonFromDateRef = useRef(null);
  const addonToDateRef = useRef(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const openDatePicker = (ref) => {
    if (!ref.current) return;

    if (typeof ref.current.showPicker === "function") {
      ref.current.showPicker();
    } else {
      ref.current.focus();
    }
  };

  const buildQuery = (from, to) => {
    const queryParams = new URLSearchParams();

    if (from) {
      queryParams.append("from_date", from);
    }

    if (to) {
      queryParams.append("to_date", to);
    }

    const queryString = queryParams.toString();

    return queryString ? `?${queryString}` : "";
  };

  const fetchReports = async (
    bookingFrom = appliedBookingFromDate,
    bookingTo = appliedBookingToDate,
    addonFrom = appliedAddonFromDate,
    addonTo = appliedAddonToDate,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const bookingQuery = buildQuery(bookingFrom, bookingTo);
      const addonQuery = buildQuery(addonFrom, addonTo);

      const [bookingResponse, addonResponse] = await Promise.all([
        apiFetch(`/api/admin/reports/bookings/${bookingQuery}`),
        apiFetch(`/api/admin/reports/add-ons/${addonQuery}`),
      ]);

      if (!bookingResponse.ok) {
        throw new Error(
          `Booking report error ${bookingResponse.status}: ${bookingResponse.statusText}`,
        );
      }

      if (!addonResponse.ok) {
        throw new Error(
          `Add-on report error ${addonResponse.status}: ${addonResponse.statusText}`,
        );
      }

      const bookingData = await bookingResponse.json();
      const addonData = await addonResponse.json();

      setBookingReport(bookingData);
      setAddonReport(addonData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingFilter = () => {
    if (
      bookingFromDate &&
      bookingToDate &&
      bookingFromDate > bookingToDate
    ) {
      setError("Booking Revenue: From Date cannot be later than To Date.");
      return;
    }

    setAppliedBookingFromDate(bookingFromDate);
    setAppliedBookingToDate(bookingToDate);

    fetchReports(
      bookingFromDate,
      bookingToDate,
      appliedAddonFromDate,
      appliedAddonToDate,
    );
  };

  const handleClearBookingFilter = () => {
    setBookingFromDate("");
    setBookingToDate("");
    setAppliedBookingFromDate("");
    setAppliedBookingToDate("");

    fetchReports(
      "",
      "",
      appliedAddonFromDate,
      appliedAddonToDate,
    );
  };

  const handleAddonFilter = () => {
    if (
      addonFromDate &&
      addonToDate &&
      addonFromDate > addonToDate
    ) {
      setError("Add-On Sales: From Date cannot be later than To Date.");
      return;
    }

    setAppliedAddonFromDate(addonFromDate);
    setAppliedAddonToDate(addonToDate);

    fetchReports(
      appliedBookingFromDate,
      appliedBookingToDate,
      addonFromDate,
      addonToDate,
    );
  };

  const handleClearAddonFilter = () => {
    setAddonFromDate("");
    setAddonToDate("");
    setAppliedAddonFromDate("");
    setAppliedAddonToDate("");

    fetchReports(
      appliedBookingFromDate,
      appliedBookingToDate,
      "",
      "",
    );
  };

  const handleRefresh = () => {
    fetchReports(
      appliedBookingFromDate,
      appliedBookingToDate,
      appliedAddonFromDate,
      appliedAddonToDate,
    );
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
    });
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-0" style={{ color: "#1e293b" }}>
            Admin Reports
          </h1>

          <p className="text-muted small mb-0">
            Review booking revenue and additional sales
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleRefresh}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </button>
      </div>

      {/* BOOKING REVENUE REPORT */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1 fw-bold">Booking Revenue</h5>

              <small className="text-muted">
                Revenue calculated at 30% of the raw room booking cost
              </small>
            </div>

            <span
              className="d-inline-flex align-items-center justify-content-center px-3 py-2 fw-semibold"
              style={{
                height: "40px",
                minWidth: "130px",
                borderRadius: "8px",
                backgroundColor: "#f1f5f9",
                color: "#334155",
                fontSize: "0.9rem",
                border: "1px solid #e2e8f0",
              }}
            >
              {bookingReport?.summary?.total_bookings || 0} Completed
            </span>
          </div>
        </div>

        {/* BOOKING DATE FILTER */}
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label
                htmlFor="bookingFromDate"
                className="form-label fw-semibold"
                style={{ color: "#334155" }}
              >
                From Date
              </label>

              <div className="input-group">
                <button
                  type="button"
                  className="input-group-text bg-white border-end-0"
                  onClick={() =>
                    openDatePicker(bookingFromDateRef)
                  }
                  aria-label="Open Booking Revenue From Date calendar"
                >
                  <i className="bi bi-calendar3 text-secondary"></i>
                </button>

                <input
                  ref={bookingFromDateRef}
                  id="bookingFromDate"
                  type="date"
                  className="form-control"
                  value={bookingFromDate}
                  onChange={(e) =>
                    setBookingFromDate(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-md-4">
              <label
                htmlFor="bookingToDate"
                className="form-label fw-semibold"
                style={{ color: "#334155" }}
              >
                To Date
              </label>

              <div className="input-group">
                <button
                  type="button"
                  className="input-group-text bg-white border-end-0"
                  onClick={() =>
                    openDatePicker(bookingToDateRef)
                  }
                  aria-label="Open Booking Revenue To Date calendar"
                >
                  <i className="bi bi-calendar3 text-secondary"></i>
                </button>

                <input
                  ref={bookingToDateRef}
                  id="bookingToDate"
                  type="date"
                  className="form-control"
                  value={bookingToDate}
                  onChange={(e) =>
                    setBookingToDate(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-md-4 d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBookingFilter}
                disabled={loading}
              >
                <i className="bi bi-funnel me-2"></i>
                Apply Filter
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleClearBookingFilter}
                disabled={loading}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear
              </button>
            </div>
          </div>

          {(appliedBookingFromDate || appliedBookingToDate) && (
            <div className="mt-3">
              <small className="text-muted">
                Showing booking revenue
                {appliedBookingFromDate &&
                  ` from ${appliedBookingFromDate}`}
                {appliedBookingToDate &&
                  ` to ${appliedBookingToDate}`}
              </small>
            </div>
          )}
        </div>

        {/* BOOKING SUMMARY */}
        <div className="card-body border-bottom">
          <div className="row g-3">
            <div className="col-md-6">
              <div
                className="p-3 rounded border h-100"
                style={{ backgroundColor: "#f8fafc" }}
              >
                <div className="text-muted small mb-1">
                  Raw Booking Sales
                </div>

                <div
                  className="fs-4 fw-bold"
                  style={{ color: "#1e293b" }}
                >
                  {formatCurrency(
                    bookingReport?.summary?.total_raw_booking_cost,
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div
                className="p-3 rounded border h-100"
                style={{ backgroundColor: "#f8fafc" }}
              >
                <div className="text-muted small mb-1">
                  30% Revenue
                </div>

                <div
                  className="fs-4 fw-bold"
                  style={{ color: "#1e293b" }}
                >
                  {formatCurrency(
                    bookingReport?.summary?.total_revenue_30_percent,
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOOKING TABLE */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table
              className="table table-hover align-middle mb-0"
              style={{ fontSize: "0.88rem" }}
            >
              <thead className="table-light text-uppercase text-secondary">
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th className="text-center">Nights</th>
                  <th>Room Rate</th>
                  <th>Raw Cost</th>
                  <th className="text-end pe-3">30% Revenue</th>
                </tr>
              </thead>

              <tbody>
                {bookingReport?.bookings?.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="text-center py-4 text-muted"
                    >
                      No completed bookings available.
                    </td>
                  </tr>
                ) : (
                  bookingReport?.bookings?.map((booking) => (
                    <tr key={booking.invoice_id}>
                      <td className="fw-bold">
                        #{booking.booking_id}
                      </td>

                      <td>{booking.guest_name}</td>

                      <td>
                        <span className="badge bg-secondary">
                          Room {booking.room_number}
                        </span>
                      </td>

                      <td>{booking.check_in_date || "N/A"}</td>

                      <td>{booking.check_out_date || "N/A"}</td>

                      <td className="text-center">
                        {booking.room_nights}
                      </td>

                      <td>
                        {formatCurrency(booking.room_rate)}
                      </td>

                      <td className="fw-semibold">
                        {formatCurrency(
                          booking.raw_booking_cost,
                        )}
                      </td>

                      <td className="text-end pe-3 fw-bold">
                        {formatCurrency(
                          booking.revenue_30_percent,
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD-ON SALES REPORT */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1 fw-bold">Add-On Sales</h5>

              <small className="text-muted">
                Additional charges recorded during guest checkout
              </small>
            </div>

            <span
              className="d-inline-flex align-items-center justify-content-center px-3 py-2 fw-semibold"
              style={{
                height: "40px",
                minWidth: "130px",
                borderRadius: "8px",
                backgroundColor: "#f1f5f9",
                color: "#334155",
                fontSize: "0.9rem",
                border: "1px solid #e2e8f0",
              }}
            >
              {addonReport?.summary?.total_addon_items || 0} Add-Ons
            </span>
          </div>
        </div>

        {/* ADD-ON DATE FILTER */}
        <div className="card-body border-bottom">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label
                htmlFor="addonFromDate"
                className="form-label fw-semibold"
                style={{ color: "#334155" }}
              >
                From Date
              </label>

              <div className="input-group">
                <button
                  type="button"
                  className="input-group-text bg-white border-end-0"
                  onClick={() =>
                    openDatePicker(addonFromDateRef)
                  }
                  aria-label="Open Add-On From Date calendar"
                >
                  <i className="bi bi-calendar3 text-secondary"></i>
                </button>

                <input
                  ref={addonFromDateRef}
                  id="addonFromDate"
                  type="date"
                  className="form-control"
                  value={addonFromDate}
                  onChange={(e) =>
                    setAddonFromDate(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-md-4">
              <label
                htmlFor="addonToDate"
                className="form-label fw-semibold"
                style={{ color: "#334155" }}
              >
                To Date
              </label>

              <div className="input-group">
                <button
                  type="button"
                  className="input-group-text bg-white border-end-0"
                  onClick={() =>
                    openDatePicker(addonToDateRef)
                  }
                  aria-label="Open Add-On To Date calendar"
                >
                  <i className="bi bi-calendar3 text-secondary"></i>
                </button>

                <input
                  ref={addonToDateRef}
                  id="addonToDate"
                  type="date"
                  className="form-control"
                  value={addonToDate}
                  onChange={(e) =>
                    setAddonToDate(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="col-md-4 d-flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddonFilter}
                disabled={loading}
              >
                <i className="bi bi-funnel me-2"></i>
                Apply Filter
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleClearAddonFilter}
                disabled={loading}
              >
                <i className="bi bi-x-circle me-2"></i>
                Clear
              </button>
            </div>
          </div>

          {(appliedAddonFromDate || appliedAddonToDate) && (
            <div className="mt-3">
              <small className="text-muted">
                Showing add-on sales
                {appliedAddonFromDate &&
                  ` from ${appliedAddonFromDate}`}
                {appliedAddonToDate &&
                  ` to ${appliedAddonToDate}`}
              </small>
            </div>
          )}
        </div>

        {/* ADD-ON SUMMARY */}
        <div className="card-body border-bottom">
          <div
            className="p-3 rounded border"
            style={{ backgroundColor: "#f8fafc" }}
          >
            <div className="text-muted small mb-1">
              Total Add-On Sales
            </div>

            <div
              className="fs-4 fw-bold"
              style={{ color: "#1e293b" }}
            >
              {formatCurrency(
                addonReport?.summary?.total_addon_sales,
              )}
            </div>
          </div>
        </div>

        {/* ADD-ON TABLE */}
        <div className="card-body p-0">
          <div className="table-responsive">
            <table
              className="table table-hover align-middle mb-0"
              style={{ fontSize: "0.88rem" }}
            >
              <thead className="table-light text-uppercase text-secondary">
                <tr>
                  <th>Invoice</th>
                  <th>Booking</th>
                  <th>Date</th>
                  <th>Guest</th>
                  <th>Add-On</th>
                  <th className="text-end pe-3">Amount</th>
                </tr>
              </thead>

              <tbody>
                {addonReport?.add_ons?.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-4 text-muted"
                    >
                      No add-on sales recorded.
                    </td>
                  </tr>
                ) : (
                  addonReport?.add_ons?.map((addon) => (
                    <tr
                      key={`${addon.invoice_id}-${addon.description}`}
                    >
                      <td className="fw-bold">
                        #{addon.invoice_id}
                      </td>

                      <td>#{addon.booking_id}</td>

                      <td>{addon.invoice_date}</td>

                      <td>{addon.guest_name}</td>

                      <td>{addon.description}</td>

                      <td className="text-end pe-3 fw-semibold">
                        {formatCurrency(addon.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          className="text-center py-5"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(255, 255, 255, 0.65)",
            zIndex: 1040,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">
              Loading reports...
            </span>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && !loading && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>

          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={handleRefresh}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}