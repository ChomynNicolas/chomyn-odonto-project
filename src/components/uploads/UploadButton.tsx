// src/components/uploads/UploadButton.tsx
"use client";

import { useState } from "react";

type CloudinaryUploadResult = {
  event: "success" | "close" | "abort" | "display-changed" | "queues-end" | "source-changed";
  info?: {
    public_id: string;
    secure_url: string;
    bytes: number;
    format?: string;
    width?: number;
    height?: number;
    resource_type?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type CloudinaryUploadError = {
  message?: string;
  status?: number;
  [key: string]: unknown;
} | null;

export default function UploadButton(props: {
  pacienteId?: number;
  procedimientoId?: number;
  tipo: "FOTO" | "RX" | "LAB" | "OTRO";
  onUploaded?: (payload: { publicId: string; secureUrl: string; bytes: number }) => void;
}) {
  const [loading, setLoading] = useState(false);

  const openWidget = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const sign = await res.json();
      if (!sign.ok) throw new Error("No se pudo firmar");

      // @ts-expect-error - widget global (agrega en _app head el script de Cloudinary)
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: sign.cloudName,
          apiKey: sign.apiKey,
          uploadSignatureTimestamp: sign.timestamp,
          uploadSignature: sign.signature,
          folder: sign.folder,
          sources: ["local", "camera"],
          multiple: false,
          showPoweredBy: false,
          // authenticated / public
          access_mode: sign.accessMode.toLowerCase(),
        },
        (error: CloudinaryUploadError, result: CloudinaryUploadResult | null) => {
          if (!error && result && result.event === "success" && result.info) {
            props.onUploaded?.({
              publicId: result.info.public_id,
              secureUrl: result.info.secure_url,
              bytes: result.info.bytes,
            });
          }
        }
      );
      widget.open();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={openWidget} disabled={loading} className="btn btn-primary">
      {loading ? "Preparando..." : "Subir adjunto"}
    </button>
  );
}
