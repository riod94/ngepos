import { beforeAll, afterAll, afterEach } from "vitest";
import { cleanup } from "@testing-library/preact";
import "@testing-library/jest-dom";

beforeAll(() => {
  process.env.NODE_ENV = "test";
});

afterEach(() => {
  cleanup();
});

global.fetch = vi.fn();
