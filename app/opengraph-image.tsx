import { ImageResponse } from "next/og";

export const alt = "TaxGraph — See the tax questions hiding inside an AI deal.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 78px",
        color: "#f4f4ef",
        background: "#183f35",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #9fc8b8",
              borderRadius: "16px",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            TG
          </div>
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 700 }}>
            TaxGraph
          </div>
        </div>
        <div
          style={{
            display: "flex",
            color: "#9fc8b8",
            fontSize: "22px",
            letterSpacing: "0.08em",
          }}
        >
          SERBIA → EU · MVP
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <div
          style={{
            display: "flex",
            maxWidth: "950px",
            fontFamily: "Georgia, serif",
            fontSize: "78px",
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
          }}
        >
          See the tax questions hiding inside an AI deal.
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: "920px",
            color: "#c6d5cf",
            fontSize: "27px",
            lineHeight: 1.35,
          }}
        >
          Source-backed touchpoints, missing facts, evidence and adviser
          questions — before the deal is signed.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#9fc8b8",
          fontSize: "19px",
        }}
      >
        <span>Pre-sale research workspace</span>
        <span>Sources pending human review</span>
      </div>
    </div>,
    size,
  );
}
