import { useEffect, useState } from "react";
import { useRoute } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type Details = { status: string; wechatPayQr: string | null; alipayQr: string | null };

export default function QrPaymentPage() {
  const [, params] = useRoute("/qr-payment/:token");
  const token = params?.token ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [method, setMethod] = useState("wechat_pay");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/external/qr-payment/${encodeURIComponent(token)}`).then(async r => {
      if (!r.ok) throw new Error("This payment confirmation link is invalid or no longer available.");
      return r.json();
    }).then(setDetails).catch(e => setError(e.message));
  }, [token]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      let receiptObjectPath: string | undefined;
      if (receipt) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(receipt.type) || receipt.size > 10 * 1024 * 1024) throw new Error("Use a PNG, JPEG, or WebP receipt under 10 MB.");
        const upload = await fetch(`${BASE}/api/external/qr-payment/${encodeURIComponent(token)}/receipt-upload-url`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: receipt.name, size: receipt.size, contentType: receipt.type }) });
        if (!upload.ok) throw new Error("Unable to prepare receipt upload.");
        const { uploadURL, objectPath } = await upload.json();
        const put = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": receipt.type }, body: receipt });
        if (!put.ok) throw new Error("Receipt upload failed.");
        receiptObjectPath = objectPath;
      }
      const response = await fetch(`${BASE}/api/external/qr-payment/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentMethod: method, paymentReference: reference, receiptObjectPath }) });
      if (!response.ok) throw new Error("This confirmation could not be submitted.");
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to submit confirmation."); }
    finally { setSaving(false); }
  };
  return <main className="min-h-screen bg-slate-50 p-5 flex justify-center"><div className="w-full max-w-xl my-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-600">ReMynd Student Services</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Confirm alternative payment</h1>
    {error ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : !details ? <p className="mt-5 text-sm text-slate-500">Loading payment options…</p> : done || details.status !== "awaiting_submission" ? <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Your payment confirmation is pending verification. Access will be granted only after an administrator approves it.</div> : <form onSubmit={submit} className="mt-6 space-y-5">
      <p className="text-sm text-slate-600">Pay using an approved option, then provide the transaction reference below. Submission does not activate access.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{details.wechatPayQr && <label className="border rounded-xl p-3 cursor-pointer"><input type="radio" name="method" value="wechat_pay" checked={method === "wechat_pay"} onChange={e => setMethod(e.target.value)} /> <span className="ml-2 font-medium">WeChat Pay</span><img className="mt-3 w-full max-h-52 object-contain" src={details.wechatPayQr} /></label>}{details.alipayQr && <label className="border rounded-xl p-3 cursor-pointer"><input type="radio" name="method" value="alipay" checked={method === "alipay"} onChange={e => setMethod(e.target.value)} /> <span className="ml-2 font-medium">Alipay</span><img className="mt-3 w-full max-h-52 object-contain" src={details.alipayQr} /></label>}</div>
      <label className="block text-sm font-medium text-slate-700">Payment reference<input required maxLength={200} value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Receipt image <span className="font-normal text-slate-400">(optional)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setReceipt(e.target.files?.[0] ?? null)} className="mt-1 block text-sm" /></label>
      <button disabled={saving} className="w-full rounded-lg bg-violet-700 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Submitting…" : "I've Paid — submit for verification"}</button>
    </form>}
  </div></main>;
}