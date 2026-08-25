"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

type OpportunityQrCodeProps = {
  opportunityId: string;
  title: string;
};

function fileSafeTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function OpportunityQrCode({
  opportunityId,
  title,
}: OpportunityQrCodeProps) {
  const [signupUrl, setSignupUrl] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const url = `${window.location.origin}/signup/${opportunityId}`;

    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    })
      .then((dataUrl) => {
        if (isMounted) {
          setSignupUrl(url);
          setQrCodeUrl(dataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSignupUrl(url);
          setError("Could not generate the QR code.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [opportunityId]);

  const downloadName = `${fileSafeTitle(title) || "opportunity"}-qr.png`;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">QR Code</h2>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-52 w-52 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white p-3">
          {qrCodeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={`QR code for ${title}`}
              className="h-full w-full"
              height={184}
              src={qrCodeUrl}
              width={184}
            />
          ) : (
            <p className="text-center text-sm text-zinc-500">
              Generating QR code...
            </p>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="break-all rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700">
            {signupUrl}
          </p>

          {error ? (
            <p
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            {qrCodeUrl ? (
              <a
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
                download={downloadName}
                href={qrCodeUrl}
              >
                Download QR
              </a>
            ) : null}

            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium transition hover:bg-zinc-100"
              onClick={() => window.print()}
              type="button"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
