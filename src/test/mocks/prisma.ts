import { vi } from "vitest";

const createModelMock = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  upsert: vi.fn(),
});

export const prismaMock = {
  user: createModelMock(),
  studentProfile: createModelMock(),
  companyProfile: createModelMock(),
  internship: createModelMock(),
  application: createModelMock(),
};

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
