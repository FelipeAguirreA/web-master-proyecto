import { vi } from "vitest";

const createModelMock = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  upsert: vi.fn(),
});

const baseMock = {
  user: createModelMock(),
  studentProfile: createModelMock(),
  companyProfile: createModelMock(),
  internship: createModelMock(),
  application: createModelMock(),
  conversation: createModelMock(),
  message: createModelMock(),
  interview: createModelMock(),
  notification: createModelMock(),
  refreshToken: createModelMock(),
  aTSConfig: createModelMock(),
  aTSModule: createModelMock(),
};

export const prismaMock = baseMock as typeof baseMock & {
  $transaction: ReturnType<typeof vi.fn>;
};

// $transaction no es enumerable: queda fuera de Object.values(prismaMock)
// para no romper los reset loops de tests legacy que iteran modelos.
Object.defineProperty(prismaMock, "$transaction", {
  value: vi.fn((arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    if (typeof arg === "function") {
      return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
    }
    return Promise.resolve(arg);
  }),
  enumerable: false,
  writable: true,
  configurable: true,
});

export function resetPrismaMock() {
  for (const value of Object.values(baseMock)) {
    for (const fn of Object.values(value)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
  prismaMock.$transaction.mockReset();
}

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
