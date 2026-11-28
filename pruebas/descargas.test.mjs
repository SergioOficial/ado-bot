import test from "node:test";
import assert from "node:assert/strict";
import { validarEnlaceDescarga } from "../lib/descargas.js";

test("acepta enlaces HTTPS de plataformas admitidas", () => {
  assert.equal(validarEnlaceDescarga("https://youtu.be/abc").startsWith("https://youtu.be/"), true);
  assert.equal(validarEnlaceDescarga("https://vm.tiktok.com/abc").startsWith("https://vm.tiktok.com/"), true);
  assert.equal(validarEnlaceDescarga("https://www.instagram.com/reel/abc/").includes("instagram.com"), true);
});

test("rechaza protocolos y hosts no admitidos", () => {
  assert.throws(() => validarEnlaceDescarga("file:///etc/passwd"), /HTTP\/HTTPS/);
  assert.throws(() => validarEnlaceDescarga("https://youtube.com.evil.test/video"), /dominio no está admitido/);
  assert.throws(() => validarEnlaceDescarga("http://127.0.0.1/"), /dominio no está admitido/);
});
