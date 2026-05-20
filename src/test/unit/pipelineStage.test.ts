import { describe, it, expect } from "vitest";
import { stageMeta } from "@/components/chat/pipelineStage";

describe("stageMeta", () => {
  it("retorna meta de PENDING para null", () => {
    const meta = stageMeta(null);
    expect(meta.label).toBe("Nuevo");
  });

  it("retorna meta de PENDING para undefined", () => {
    const meta = stageMeta(undefined);
    expect(meta.label).toBe("Nuevo");
  });

  it("retorna meta de PENDING para string vacío", () => {
    const meta = stageMeta("");
    expect(meta.label).toBe("Nuevo");
  });

  it("retorna meta de PENDING para status desconocido", () => {
    const meta = stageMeta("UNKNOWN_STATUS");
    expect(meta.label).toBe("Nuevo");
  });

  it("retorna el label correcto para REVIEWING", () => {
    expect(stageMeta("REVIEWING").label).toBe("Revisión");
  });

  it("retorna el label correcto para INTERVIEW", () => {
    expect(stageMeta("INTERVIEW").label).toBe("Entrevista");
  });

  it("retorna el label correcto para ACCEPTED", () => {
    expect(stageMeta("ACCEPTED").label).toBe("Aceptado");
  });

  it("retorna el label correcto para REJECTED", () => {
    expect(stageMeta("REJECTED").label).toBe("Rechazado");
  });

  it("cada status tiene color y bg definidos", () => {
    const statuses = [
      "PENDING",
      "REVIEWING",
      "INTERVIEW",
      "ACCEPTED",
      "REJECTED",
    ];
    for (const s of statuses) {
      const meta = stageMeta(s);
      expect(meta.color).toBeDefined();
      expect(meta.bg).toBeDefined();
    }
  });
});
