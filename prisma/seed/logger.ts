export const log = {
info: (...a: any[]) => console.log("ℹ️", ...a),
ok: (...a: any[]) => console.log("✅", ...a),
warn: (...a: any[]) => console.warn("⚠️", ...a),
err: (...a: any[]) => console.error("❌", ...a),
};