import { useEffect, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { formatCurrencyAmount } from "../lib/formatters";

export interface PaymentSuccessModalProps {
  open: boolean;
  orderId: string;
  total?: number;
  currency?: string;
  trackingUrl?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  expectedDeliveryAt?: string;
  onClose: () => void;
  title?: string;
  body?: string;
  closeLabel?: string;
  copyLabel?: string;
  successBadge?: string;
  trackingLabel?: string;
  etaLabel?: string;
  shippedLabel?: string;
  noTrackingLabel?: string;
}

type CopyState = "idle" | "copied" | "error";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "rgba(15, 23, 42, 0.56)",
  zIndex: 50
};

const modalStyle: CSSProperties = {
  width: "min(100%, 420px)",
  borderRadius: "24px",
  background: "#ffffff",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  overflow: "hidden"
};

const headerStyle: CSSProperties = {
  padding: "24px 24px 16px",
  background: "linear-gradient(180deg, rgba(16, 185, 129, 0.14), rgba(255, 255, 255, 0))"
};

const successBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(16, 185, 129, 0.12)",
  color: "#047857",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase"
};

const bodyStyle: CSSProperties = {
  padding: "0 24px 24px",
  color: "#0f172a"
};

const titleStyle: CSSProperties = {
  margin: "14px 0 8px",
  fontSize: "24px",
  lineHeight: 1.15,
  fontWeight: 700,
  letterSpacing: "-0.02em"
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#475569"
};

const detailCardStyle: CSSProperties = {
  marginTop: "20px",
  padding: "16px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0"
};

const detailLabelStyle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b"
};

const orderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0"
};

const orderIdStyle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  fontWeight: 700,
  color: "#0f172a",
  wordBreak: "break-word"
};

const copyButtonStyle: CSSProperties = {
  flexShrink: 0,
  border: "1px solid #cbd5e1",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#0f172a",
  padding: "8px 12px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer"
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "14px"
};

const metaItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  fontSize: "14px",
  color: "#334155"
};

const closeButtonStyle: CSSProperties = {
  marginTop: "20px",
  width: "100%",
  border: "none",
  borderRadius: "14px",
  background: "#0f172a",
  color: "#ffffff",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer"
};

const iconShellStyle: CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  display: "grid",
  placeItems: "center",
  background: "rgba(16, 185, 129, 0.14)",
  color: "#059669",
  fontSize: "30px",
  fontWeight: 700
};

const checkMark = "Paid";

function getCopyActionLabel(state: CopyState, copyLabel: string): string {
  if (state === "copied") {
    return "Copied";
  }

  if (state === "error") {
    return "Copy failed";
  }

  return copyLabel;
}

export function PaymentSuccessModal({
  open,
  orderId,
  total,
  currency = "USD",
  trackingUrl,
  trackingCarrier,
  trackingNumber,
  shippedAt,
  expectedDeliveryAt,
  onClose,
  title = "Your order is confirmed",
  body = "We've received your payment and queued your order for processing.",
  closeLabel = "Close",
  copyLabel = "Copy order ID",
  successBadge = "Payment successful",
  trackingLabel = "Track shipment",
  etaLabel = "Estimated arrival",
  shippedLabel = "Shipped on",
  noTrackingLabel = "Tracking will be available after dispatch."
}: PaymentSuccessModalProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const amountLabel = total === undefined ? "" : formatCurrencyAmount(total, currency);
  const formatMonthDay = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleOverlayClick = () => {
    onClose();
  };

  const handleDialogClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleCopyOrderId = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyState("error");
      return;
    }

    try {
      await navigator.clipboard.writeText(orderId);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <div aria-modal="true" role="dialog" style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle} onClick={handleDialogClick}>
        <div style={headerStyle}>
          <div style={iconShellStyle}>{checkMark}</div>
          <div style={successBadgeStyle}>{successBadge}</div>
          <h2 style={titleStyle}>{title}</h2>
          <p style={descriptionStyle}>{body}</p>
        </div>

        <div style={bodyStyle}>
          <div style={detailCardStyle}>
            <p style={detailLabelStyle}>Order ID</p>
            <div style={orderRowStyle}>
              <p style={orderIdStyle}>{orderId}</p>
              <button type="button" style={copyButtonStyle} onClick={handleCopyOrderId}>
                {getCopyActionLabel(copyState, copyLabel)}
              </button>
            </div>

            {total !== undefined ? (
              <div style={metaGridStyle}>
                <div style={metaItemStyle}>
                  <span>Total paid</span>
                  <strong>{amountLabel}</strong>
                </div>
                {expectedDeliveryAt ? (
                  <div style={metaItemStyle}>
                    <span>{etaLabel}</span>
                    <strong>{formatMonthDay(expectedDeliveryAt)}</strong>
                  </div>
                ) : null}
                {shippedAt ? (
                  <div style={metaItemStyle}>
                    <span>{shippedLabel}</span>
                    <strong>{formatMonthDay(shippedAt)}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}
            {trackingUrl ? (
              <div style={{ marginTop: "12px" }}>
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    textDecoration: "none",
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: "1px solid #0f172a",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                >
                  {trackingLabel}
                  {trackingCarrier || trackingNumber ? ` · ${[trackingCarrier, trackingNumber].filter(Boolean).join(" ")}` : ""}
                </a>
              </div>
            ) : (
              <p style={{ ...descriptionStyle, marginTop: "12px", fontSize: "13px" }}>{noTrackingLabel}</p>
            )}
          </div>

          <button type="button" style={closeButtonStyle} onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
