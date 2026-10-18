import assert from "node:assert/strict";
import { test } from "node:test";
import { auditChanges, auditDetails, auditValue } from "./audit.ts";

test("affiche l’ancien et le nouvel état sensible du compte", () => {
  assert.deepEqual(auditChanges({ before: { status: "active" }, after: { status: "suspended" } }), [
    { key: "status", before: "active", after: "suspended" },
  ]);
});

test("ne divulgue pas la valeur des paramètres confidentiels", () => {
  assert.equal(auditValue("[REDACTED]"), "Valeur confidentielle");
});

test("ne présente pas les champs inchangés comme des changements", () => {
  assert.deepEqual(
    auditChanges({ before: { stock: 10, status: "active" }, after: { stock: 10, status: "hidden" } }),
    [{ key: "status", before: "active", after: "hidden" }],
  );
});

test("accepte les enregistrements historiques sans instantané", () => {
  assert.deepEqual(auditDetails(null), {});
  assert.deepEqual(auditChanges({ value: "active", note: null }), []);
});
